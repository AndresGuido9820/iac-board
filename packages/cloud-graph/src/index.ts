import type {
  CloudEdge,
  CloudGraph,
  CloudGroup,
  CloudNode,
} from '@iac-board/core-types'
import type {
  TerraformParseResult,
  TerraformResource,
} from '@iac-board/terraform-parser'

const awsCategories: Record<string, CloudNode['category']> = {
  // Compute
  aws_ecs_cluster: 'compute',
  aws_ecs_service: 'compute',
  aws_ecs_task_definition: 'compute',
  aws_eks_cluster: 'compute',
  aws_lambda_function: 'compute',
  // Storage
  aws_ecr_repository: 'storage',
  aws_s3_bucket: 'storage',
  // Database
  aws_athena_workgroup: 'database',
  aws_db_instance: 'database',
  aws_dynamodb_table: 'database',
  aws_elasticache_cluster: 'database',
  aws_elasticache_replication_group: 'database',
  aws_glue_catalog_database: 'database',
  // Integration
  aws_api_gateway_rest_api: 'integration',
  aws_apigatewayv2_api: 'integration',
  aws_cloudfront_distribution: 'integration',
  aws_iot_topic_rule: 'integration',
  aws_kinesis_stream: 'integration',
  aws_lambda_event_source_mapping: 'integration',
  aws_sfn_state_machine: 'integration',
  aws_sns_topic: 'integration',
  aws_sqs_queue: 'integration',
  // Network
  aws_alb: 'network',
  aws_alb_listener: 'network',
  aws_alb_target_group: 'network',
  aws_db_subnet_group: 'network',
  aws_internet_gateway: 'network',
  aws_lb: 'network',
  aws_lb_listener: 'network',
  aws_lb_target_group: 'network',
  aws_nat_gateway: 'network',
  aws_route53_record: 'network',
  aws_route53_zone: 'network',
  aws_subnet: 'network',
  aws_vpc: 'network',
  // Security
  aws_acm_certificate: 'security',
  aws_cognito_user_pool: 'security',
  aws_cognito_user_pool_client: 'security',
  aws_iam_policy: 'security',
  aws_iam_role: 'security',
  aws_security_group: 'security',
  aws_wafv2_web_acl: 'security',
}

export function buildCloudGraph(parseResult: TerraformParseResult): CloudGraph {
  const nodes = parseResult.resources.map(resourceToNode)
  const groups = buildNetworkGroups(parseResult.resources)
  const edges = buildEdges(parseResult.resources)

  return {
    nodes,
    edges,
    groups,
    diagnostics: [
      ...parseResult.diagnostics,
      ...parseResult.resources
        .filter((resource) => !awsCategories[resource.type])
        .map((resource) => ({
          code: 'GRAPH001',
          severity: 'warning' as const,
          message: `Unsupported Terraform resource type: ${resource.type}`,
          source: resource.source,
        })),
    ],
  }
}

function buildNetworkGroups(resources: TerraformResource[]): CloudGroup[] {
  const vpcs = resources.filter((resource) => resource.type === 'aws_vpc')
  const subnets = resources.filter((resource) => resource.type === 'aws_subnet')
  const resourceReferences = new Map(
    resources.map((resource) => [
      resource.address,
      extractReferences(resource),
    ]),
  )
  const resourceToVpc = new Map<string, string>()
  const resourceToSubnet = new Map<string, string>()

  for (const vpc of vpcs) {
    resourceToVpc.set(vpc.address, vpc.address)
  }

  for (const subnet of subnets) {
    const referencedVpc = resourceReferences
      .get(subnet.address)
      ?.find((reference) => resourceToVpc.has(reference))
    if (referencedVpc) {
      resourceToVpc.set(subnet.address, referencedVpc)
      resourceToSubnet.set(subnet.address, subnet.address)
    }
  }

  let changed = true
  while (changed) {
    changed = false

    for (const resource of resources) {
      if (!resourceToVpc.has(resource.address)) {
        const referencedVpc = resourceReferences
          .get(resource.address)
          ?.map((reference) => resourceToVpc.get(reference))
          .find(Boolean)

        if (referencedVpc) {
          resourceToVpc.set(resource.address, referencedVpc)
          changed = true
        }
      }

      if (!resourceToSubnet.has(resource.address)) {
        const referencedSubnet = resourceReferences
          .get(resource.address)
          ?.map((reference) => resourceToSubnet.get(reference))
          .find(Boolean)

        if (referencedSubnet) {
          resourceToSubnet.set(resource.address, referencedSubnet)
          changed = true
        }
      }
    }
  }

  return [
    ...vpcs.map((vpc) => ({
      id: networkGroupId('vpc', vpc.address),
      label: `VPC ${vpc.name}`,
      kind: 'vpc' as const,
      children: resources
        .filter(
          (resource) => resourceToVpc.get(resource.address) === vpc.address,
        )
        .map((resource) => resource.address),
      metadata: {
        terraformAddress: vpc.address,
      },
    })),
    ...subnets.map((subnet) => ({
      id: networkGroupId('subnet', subnet.address),
      label: `${subnetVisibility(subnet)} subnet ${subnet.name}`,
      kind: 'subnet' as const,
      children: resources
        .filter(
          (resource) =>
            resourceToSubnet.get(resource.address) === subnet.address,
        )
        .map((resource) => resource.address),
      metadata: {
        terraformAddress: subnet.address,
        visibility: subnetVisibility(subnet).toLowerCase(),
        vpcAddress: resourceToVpc.get(subnet.address),
      },
    })),
  ].filter((group) => group.children.length > 0)
}

function buildEdges(resources: TerraformResource[]): CloudEdge[] {
  const addressSet = new Set(resources.map((r) => r.address))
  const typeMap = new Map(resources.map((r) => [r.address, r.type]))
  const edges: CloudEdge[] = []

  for (const resource of resources) {
    const refs = extractReferences(resource).filter((ref) =>
      addressSet.has(ref),
    )
    for (const ref of refs) {
      const toType = typeMap.get(ref) ?? ''
      edges.push({
        id: `edge:${resource.address}→${ref}`,
        from: resource.address,
        to: ref,
        relation: inferRelation(resource.type, toType),
        confidence: 'inferred',
        metadata: {},
      })
    }
  }

  return edges
}

/** Infer edge semantic from both source and target resource types. */
function inferRelation(
  fromType: string,
  toType: string,
): CloudEdge['relation'] {
  // Event-source mapping bridges a stream/queue to a Lambda
  if (fromType === 'aws_lambda_event_source_mapping') return 'triggers'

  // Step Functions: assumes an IAM role to execute, orchestrates everything else
  if (fromType === 'aws_sfn_state_machine') {
    if (toType === 'aws_iam_role') return 'uses-role'
    return 'triggers'
  }

  // API Gateway / CloudFront / IoT route traffic to downstream compute
  if (
    fromType === 'aws_api_gateway_rest_api' ||
    fromType === 'aws_apigatewayv2_api' ||
    fromType === 'aws_cloudfront_distribution' ||
    fromType === 'aws_lb' ||
    fromType === 'aws_alb' ||
    fromType === 'aws_lb_listener' ||
    fromType === 'aws_alb_listener'
  )
    return 'connects'
  if (fromType === 'aws_iot_topic_rule') return 'publishes-to'

  // Lambda: distinguish role assumption, storage writes, and generic invocations
  if (fromType === 'aws_lambda_function') {
    if (toType === 'aws_iam_role') return 'uses-role'
    if (
      toType === 'aws_s3_bucket' ||
      toType === 'aws_dynamodb_table' ||
      toType === 'aws_kinesis_stream' ||
      toType === 'aws_sns_topic' ||
      toType === 'aws_sqs_queue' ||
      toType === 'aws_elasticache_cluster' ||
      toType === 'aws_elasticache_replication_group'
    )
      return 'writes-to'
    return 'invokes'
  }

  // ECS service: IAM → uses-role; task definition → depends-on (handled by general)
  if (fromType === 'aws_ecs_service' && toType === 'aws_iam_role')
    return 'uses-role'

  // Cognito client depends on user pool
  if (
    fromType === 'aws_cognito_user_pool_client' &&
    toType === 'aws_cognito_user_pool'
  )
    return 'depends-on'

  // WAF attached to CloudFront/ALB = security
  if (fromType === 'aws_wafv2_web_acl') return 'secured-by'

  // Network resources reference VPC/subnet as placement context
  if (
    toType === 'aws_vpc' ||
    toType === 'aws_subnet' ||
    toType === 'aws_db_subnet_group'
  )
    return 'deployed-in'
  if (toType === 'aws_security_group') return 'secured-by'
  if (toType === 'aws_iam_role') return 'uses-role'
  if (toType === 'aws_acm_certificate') return 'secured-by'

  return 'depends-on'
}

function extractReferences(resource: TerraformResource): string[] {
  return resource.refs ?? []
}

function networkGroupId(kind: 'vpc' | 'subnet', address: string): string {
  return `group:${kind}:${address}`
}

function subnetVisibility(resource: TerraformResource): 'Public' | 'Private' {
  if (
    resource.name.toLowerCase().includes('public') ||
    resource.body.includes('map_public_ip_on_launch = true')
  ) {
    return 'Public'
  }

  return 'Private'
}

function resourceToNode(resource: TerraformResource): CloudNode {
  return {
    id: resource.address,
    provider: resource.type.startsWith('aws_') ? 'aws' : 'unknown',
    kind: resource.type,
    label: resource.name,
    category: awsCategories[resource.type] ?? 'unknown',
    source: resource.source,
    metadata: {
      terraformAddress: resource.address,
    },
  }
}
