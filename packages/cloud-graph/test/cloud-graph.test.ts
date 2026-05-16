import { describe, expect, it } from 'vitest'
import { parseTerraformFiles } from '@iac-board/terraform-parser'
import { buildCloudGraph } from '../src'

describe('buildCloudGraph', () => {
  it('maps Terraform AWS resources to cloud graph nodes', () => {
    const parseResult = parseTerraformFiles([
      {
        path: 'main.tf',
        content: 'resource "aws_s3_bucket" "assets" {}',
      },
    ])

    const graph = buildCloudGraph(parseResult)

    expect(graph.nodes).toMatchObject([
      {
        id: 'aws_s3_bucket.assets',
        provider: 'aws',
        category: 'storage',
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
