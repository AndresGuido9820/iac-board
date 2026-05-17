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
          line: 12,
        }),
      }),
    )
  })

  it('generates diagrams for every bundled example', () => {
    const results = listExampleProjects().map((example) => ({
      example,
      result: generateDiagramFromTerraformFiles(example.files),
    }))

    expect(results).toHaveLength(4)
    expect(results.every(({ result }) => result.canvasDrafts.length > 0)).toBe(
      true,
    )
    // All examples must parse without diagnostics
    results.forEach(({ example, result }) => {
      expect(result.diagnostics, `${example.id} has diagnostics`).toHaveLength(
        0,
      )
    })
  })

  it('keeps network topology groups in canvas output', () => {
    const example = getExampleProject('aws-vpc-rds')
    const result = generateDiagramFromTerraformFiles(example.files)

    expect(result.graph.groups.map((group) => group.id)).toEqual([
      'group:vpc:aws_vpc.main',
      'group:subnet:aws_subnet.public',
      'group:subnet:aws_subnet.private',
    ])
    expect(result.canvasDrafts[0]).toMatchObject({
      id: 'group:vpc:aws_vpc.main',
      type: 'group',
      label: 'VPC main',
    })
  })

  it('generates ECS microservices diagram with expected resources', () => {
    const example = getExampleProject('aws-ecs-microservices')
    const result = generateDiagramFromTerraformFiles(example.files)

    expect(result.diagnostics).toHaveLength(0)
    expect(result.canvasDrafts).toContainEqual(
      expect.objectContaining({ id: 'aws_ecs_cluster.app', label: 'app' }),
    )
    expect(result.canvasDrafts).toContainEqual(
      expect.objectContaining({ id: 'aws_lb.api', label: 'api' }),
    )
    expect(result.canvasDrafts).toContainEqual(
      expect.objectContaining({
        id: 'aws_cloudfront_distribution.cdn',
        label: 'cdn',
      }),
    )
    expect(result.canvasDrafts).toContainEqual(
      expect.objectContaining({ id: 'aws_cognito_user_pool.users', label: 'users' }),
    )
  })
})
