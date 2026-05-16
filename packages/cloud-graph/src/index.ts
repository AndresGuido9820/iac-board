import type { CloudGraph, CloudNode } from '@iac-board/core-types'
import type {
  TerraformParseResult,
  TerraformResource,
} from '@iac-board/terraform-parser'

const awsCategories: Record<string, CloudNode['category']> = {
  aws_api_gateway_rest_api: 'integration',
  aws_apigatewayv2_api: 'integration',
  aws_athena_workgroup: 'database',
  aws_db_instance: 'database',
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

  return {
    nodes,
    edges: [],
    groups: [],
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
