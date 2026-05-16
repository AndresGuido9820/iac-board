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
  })
})
