import { describe, expect, it } from 'vitest'
import {
  getExampleProject,
  listExampleProjects,
} from '@iac-board/example-catalog'
import { generateDiagramFromTerraformFiles } from '@iac-board/pipeline'

describe('Terraform to canvas pipeline', () => {
  it('turns Terraform resources into canvas drafts', () => {
    const example = getExampleProject('aws-serverless-api')
    const result = generateDiagramFromTerraformFiles(example.files)

    expect(result.canvasDrafts).toContainEqual(
      expect.objectContaining({
        id: 'aws_api_gateway_rest_api.public_api',
        label: 'public_api',
      }),
    )
    expect(result.canvasDrafts).toContainEqual(
      expect.objectContaining({
        id: 'aws_lambda_function.handler',
        label: 'handler',
      }),
    )
    expect(result.canvasDrafts).toContainEqual(
      expect.objectContaining({
        id: 'aws_dynamodb_table.sessions',
        label: 'sessions',
      }),
    )
    expect(result.graph.nodes).toContainEqual(
      expect.objectContaining({
        id: 'aws_lambda_function.handler',
        source: expect.objectContaining({
          filePath: 'examples/terraform/aws-serverless-api/main.tf',
          line: 5,
        }),
      }),
    )
  })

  it('generates diagrams for every bundled example', () => {
    const results = listExampleProjects().map((example) => ({
      example,
      result: generateDiagramFromTerraformFiles(example.files),
    }))

    expect(results).toHaveLength(3)
    expect(results.every(({ result }) => result.canvasDrafts.length > 0)).toBe(
      true,
    )
    expect(results.map(({ result }) => result.diagnostics.length)).toEqual([
      0, 0, 0,
    ])
  })
})
