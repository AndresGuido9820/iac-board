import { describe, expect, it } from 'vitest'
import { parseTerraformFiles } from '@iac-board/terraform-parser'
import { buildCloudGraph } from '../src'

describe('buildCloudGraph', () => {
  it('maps Terraform AWS resources to cloud graph nodes', () => {
    const parseResult = parseTerraformFiles([
      {
        path: 'main.tf',
        content: `resource "aws_s3_bucket" "assets" {}
resource "aws_iot_topic_rule" "telemetry" {}
resource "aws_nat_gateway" "egress" {}`,
      },
    ])

    const graph = buildCloudGraph(parseResult)

    expect(graph.nodes).toMatchObject([
      {
        id: 'aws_s3_bucket.assets',
        provider: 'aws',
        category: 'storage',
      },
      {
        id: 'aws_iot_topic_rule.telemetry',
        provider: 'aws',
        category: 'integration',
      },
      {
        id: 'aws_nat_gateway.egress',
        provider: 'aws',
        category: 'network',
      },
    ])
  })

  it('keeps unsupported resources visible with diagnostics', () => {
    const parseResult = parseTerraformFiles([
      {
        path: 'main.tf',
        content: 'resource "custom_service" "thing" {}',
      },
    ])

    const graph = buildCloudGraph(parseResult)

    expect(graph.nodes).toMatchObject([
      {
        id: 'custom_service.thing',
        provider: 'unknown',
        category: 'unknown',
      },
    ])
    expect(graph.diagnostics).toMatchObject([
      {
        code: 'GRAPH001',
        severity: 'warning',
      },
    ])
  })
})
