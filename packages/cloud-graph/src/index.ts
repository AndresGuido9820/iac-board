import type { CloudGraph, CloudGroup, CloudNode } from '@iac-board/core-types'
import type {
  TerraformParseResult,
  TerraformResource,
} from '@iac-board/terraform-parser'

const awsCategories: Record<string, CloudNode['category']> = {
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
  aws_lambda_function: 'compute',
  aws_nat_gateway: 'network',
  aws_s3_bucket: 'storage',
  aws_security_group: 'security',
  aws_sns_topic: 'integration',
  aws_sqs_queue: 'integration',
  aws_subnet: 'network',
  aws_vpc: 'network',
}

export function buildCloudGraph(parseResult: TerraformParseResult): CloudGraph {
  const nodes = parseResult.resources.map(resourceToNode)
  const groups = buildNetworkGroups(parseResult.resources)

  return {
    nodes,
    edges: [],
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

function extractReferences(resource: TerraformResource): string[] {
  return [...resource.body.matchAll(/\b(aws_[a-z0-9_]+)\.([A-Za-z0-9_-]+)\b/g)]
    .map((match) => `${match[1]}.${match[2]}`)
    .filter((reference) => reference !== resource.address)
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
