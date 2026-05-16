import { describe, expect, it } from 'vitest'
import { getExampleProject } from '@iac-board/example-catalog'
import { generateDiagramFromTerraformFiles } from '../src'

describe('generateDiagramFromTerraformFiles', () => {
  it('generates canvas drafts from the bundled serverless example', () => {
    const example = getExampleProject('aws-serverless-api')
    const result = generateDiagramFromTerraformFiles(example.files)

    expect(result.parsed.resources).toHaveLength(3)
    expect(result.graph.nodes.map((node) => node.id)).toEqual([
      'aws_api_gateway_rest_api.public_api',
      'aws_lambda_function.handler',
      'aws_dynamodb_table.sessions',
    ])
    expect(result.canvasDrafts).toHaveLength(3)
    expect(result.diagnostics).toEqual([])
    expect(result.graph.nodes[1]).toMatchObject({
      id: 'aws_lambda_function.handler',
      source: {
        filePath: 'examples/terraform/aws-serverless-api/main.tf',
        line: 5,
      },
    })
  })

  it('keeps unsupported Terraform resources visible with diagnostics', () => {
    const result = generateDiagramFromTerraformFiles([
      {
        path: 'infra/main.tf',
        content: 'resource "custom_service" "thing" {}',
      },
    ])

    expect(result.canvasDrafts).toContainEqual(
      expect.objectContaining({
        id: 'custom_service.thing',
        label: 'thing',
      }),
    )
    expect(result.diagnostics).toMatchObject([
      {
        code: 'GRAPH001',
        message: 'Unsupported Terraform resource type: custom_service',
        severity: 'warning',
        source: {
          filePath: 'infra/main.tf',
          line: 1,
        },
      },
    ])
  })

  it('generates network groups for the VPC and RDS example', () => {
    const example = getExampleProject('aws-vpc-rds')
    const result = generateDiagramFromTerraformFiles(example.files)

    expect(result.graph.groups).toContainEqual(
      expect.objectContaining({
        id: 'group:vpc:aws_vpc.main',
        label: 'VPC main',
      }),
    )
    expect(result.graph.groups).toContainEqual(
      expect.objectContaining({
        id: 'group:subnet:aws_subnet.private',
        label: 'Private subnet private',
      }),
    )
    expect(result.canvasDrafts).toContainEqual(
      expect.objectContaining({
        id: 'group:vpc:aws_vpc.main',
        type: 'group',
      }),
    )
  })
})
