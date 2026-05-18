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
  // Existing types
  aws_api_gateway_rest_api: 'integration',
  aws_apigatewayv2_api: 'integration',
  aws_athena_workgroup: 'database',
  aws_db_instance: 'database',
  aws_db_subnet_group: 'network',
  aws_dynamodb_table: 'database',
  aws_glue_catalog_database: 'database',
  aws_iam_role: 'security',
  aws_internet_gateway: 'network',
  aws_iot_topic_rule: 'integration',
  aws_kinesis_stream: 'integration',
  aws_lambda_event_source_mapping: 'integration',
  aws_lambda_function: 'compute',
  aws_nat_gateway: 'network',
  aws_s3_bucket: 'storage',
  aws_security_group: 'security',
  aws_sns_topic: 'integration',
  aws_sqs_queue: 'integration',
  aws_subnet: 'network',
  aws_vpc: 'network',
  // Compute
  aws_instance: 'compute',
  aws_autoscaling_group: 'compute',
  aws_launch_template: 'compute',
  aws_ecs_cluster: 'compute',
  aws_ecs_service: 'compute',
  aws_ecs_task_definition: 'compute',
  aws_eks_cluster: 'compute',
  aws_eks_node_group: 'compute',
  // Storage
  aws_s3_bucket_versioning: 'storage',
  aws_s3_bucket_policy: 'storage',
  aws_efs_file_system: 'storage',
  aws_elasticache_cluster: 'storage',
  aws_elasticache_replication_group: 'storage',
  // Database
  aws_rds_cluster: 'database',
  aws_rds_cluster_instance: 'database',
  aws_redshift_cluster: 'database',
  // Network
  aws_lb: 'network',
  aws_alb: 'network',
  aws_lb_listener: 'network',
  aws_lb_target_group: 'network',
  aws_route53_zone: 'network',
  aws_route53_record: 'network',
  aws_cloudfront_distribution: 'network',
  aws_eip: 'network',
  aws_vpc_endpoint: 'network',
  // Integration
  aws_cloudwatch_event_rule: 'integration',
  aws_cloudwatch_event_target: 'integration',
  aws_scheduler_schedule: 'integration',
  aws_sfn_state_machine: 'integration',
  aws_ses_email_identity: 'integration',
  aws_kinesis_firehose_delivery_stream: 'integration',
  // Security
  aws_iam_policy: 'security',
  aws_iam_role_policy_attachment: 'security',
  aws_iam_instance_profile: 'security',
  aws_cognito_user_pool: 'security',
  aws_secretsmanager_secret: 'security',
  aws_ssm_parameter: 'security',
  aws_acm_certificate: 'security',
  aws_wafv2_web_acl: 'security',
  // Observability (mapped to integration for now)
  aws_cloudwatch_metric_alarm: 'integration',
  aws_cloudwatch_log_group: 'integration',
  aws_cloudwatch_dashboard: 'integration',
}

/**
 * Resource types that are pure configuration artifacts with no standalone
 * architectural meaning. They are excluded from graph nodes and edges but
 * are still used to propagate VPC/subnet group membership.
 */
const IMPLEMENTATION_DETAIL_TYPES = new Set([
  'aws_db_subnet_group', // RDS API grouping artifact — placement is communicated by subnet group membership
])

export function buildCloudGraph(parseResult: TerraformParseResult): CloudGraph {
  const visibleResources = parseResult.resources.filter(
    (r) => !IMPLEMENTATION_DETAIL_TYPES.has(r.type),
  )
  const nodes = visibleResources.map(resourceToNode)
  const groups = buildNetworkGroups(parseResult.resources) // use ALL resources for VPC propagation
  const edges = buildEdges(visibleResources)

  return {
    nodes,
    edges,
    groups,
    diagnostics: [
      ...parseResult.diagnostics,
      ...visibleResources
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

  // Build suffix index for cross-module ref resolution.
  // Maps "aws_subnet.private" -> "module.network.aws_subnet.private"
  // so that refs prefixed with the wrong module namespace still resolve.
  const suffixIndex = new Map<string, string>()
  for (const addr of addressSet) {
    const parts = addr.split('.')
    // Strip leading "module.<name>." prefix if present
    if (parts[0] === 'module' && parts.length >= 3) {
      const bare = parts.slice(2).join('.')
      if (!suffixIndex.has(bare)) suffixIndex.set(bare, addr)
    }
  }

  const resolveRef = (ref: string): string | null => {
    if (addressSet.has(ref)) return ref
    // Cross-module: strip "module.<any>." prefix from ref and re-resolve
    const parts = ref.split('.')
    if (parts[0] === 'module' && parts.length >= 3) {
      const bare = parts.slice(2).join('.')
      if (addressSet.has(bare)) return bare
      const resolved = suffixIndex.get(bare)
      if (resolved) return resolved
    }
    return null
  }

  const edges: CloudEdge[] = []
  for (const resource of resources) {
    const refs = extractReferences(resource)
      .map(resolveRef)
      .filter((ref): ref is string => ref !== null && ref !== resource.address)

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
  // Placement shortcuts — checked first for all types
  const isPlacement =
    toType === 'aws_vpc' ||
    toType === 'aws_subnet' ||
    toType === 'aws_db_subnet_group'
  const isSecurityGroup = toType === 'aws_security_group'
  const isIamRole = toType === 'aws_iam_role'

  // Event-source mapping bridges a stream/queue to a Lambda
  if (fromType === 'aws_lambda_event_source_mapping') return 'triggers'

  // API Gateway: connects to compute, deployed-in for network placement
  if (
    fromType === 'aws_api_gateway_rest_api' ||
    fromType === 'aws_apigatewayv2_api'
  ) {
    if (isPlacement) return 'deployed-in'
    if (isSecurityGroup) return 'secured-by'
    return 'connects'
  }

  // Load balancer family: placement and security always take priority
  if (
    fromType === 'aws_lb' ||
    fromType === 'aws_alb' ||
    fromType === 'aws_lb_listener'
  ) {
    if (isPlacement) return 'deployed-in'
    if (isSecurityGroup) return 'secured-by'
    return 'connects'
  }

  // CloudFront: connects to origins (S3, ALB), deployed-in for VPC
  if (fromType === 'aws_cloudfront_distribution') {
    if (isPlacement) return 'deployed-in'
    return 'connects'
  }

  // IoT Rule publishes to streams/queues
  if (fromType === 'aws_iot_topic_rule') return 'publishes-to'

  // EventBridge / scheduler trigger downstream
  if (
    fromType === 'aws_cloudwatch_event_rule' ||
    fromType === 'aws_cloudwatch_event_target' ||
    fromType === 'aws_scheduler_schedule'
  )
    return 'triggers'

  // Step Functions invokes state machine targets
  if (fromType === 'aws_sfn_state_machine') return 'invokes'

  // Lambda: role assumption, storage writes, network placement, generic invocations
  if (fromType === 'aws_lambda_function') {
    if (isIamRole) return 'uses-role'
    if (isPlacement) return 'deployed-in'
    if (isSecurityGroup) return 'secured-by'
    if (
      toType === 'aws_s3_bucket' ||
      toType === 'aws_dynamodb_table' ||
      toType === 'aws_kinesis_stream' ||
      toType === 'aws_sns_topic' ||
      toType === 'aws_sqs_queue' ||
      toType === 'aws_rds_cluster' ||
      toType === 'aws_db_instance' ||
      toType === 'aws_elasticache_cluster' ||
      toType === 'aws_elasticache_replication_group'
    )
      return 'writes-to'
    return 'invokes'
  }

  // ECS task definition: role assumption, everything else is a dependency
  if (fromType === 'aws_ecs_task_definition') {
    if (isIamRole) return 'uses-role'
    if (isPlacement) return 'deployed-in'
    if (
      toType === 'aws_rds_cluster' ||
      toType === 'aws_db_instance' ||
      toType === 'aws_elasticache_cluster' ||
      toType === 'aws_elasticache_replication_group' ||
      toType === 'aws_s3_bucket' ||
      toType === 'aws_dynamodb_table'
    )
      return 'writes-to'
    return 'depends-on'
  }

  // ECS service: cluster placement, task invocation, ALB connectivity, role/network
  if (fromType === 'aws_ecs_service') {
    if (toType === 'aws_ecs_cluster') return 'deployed-in'
    if (toType === 'aws_ecs_task_definition') return 'invokes'
    if (
      toType === 'aws_lb_target_group' ||
      toType === 'aws_lb' ||
      toType === 'aws_alb'
    )
      return 'connects'
    if (isIamRole) return 'uses-role'
    if (isPlacement) return 'deployed-in'
    if (isSecurityGroup) return 'secured-by'
    return 'depends-on'
  }

  // RDS cluster / instance: placement and security
  if (fromType === 'aws_rds_cluster' || fromType === 'aws_db_instance') {
    if (isPlacement) return 'deployed-in'
    if (isSecurityGroup) return 'secured-by'
    return 'depends-on'
  }

  // Network resources reference VPC/subnet as placement context
  if (isPlacement) return 'deployed-in'
  if (isSecurityGroup) return 'secured-by'
  if (isIamRole) return 'uses-role'

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
