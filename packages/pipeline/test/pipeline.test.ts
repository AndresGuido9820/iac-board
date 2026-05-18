import { describe, expect, it } from 'vitest'
import { getExampleProject } from '@iac-board/example-catalog'
import { generateDiagramFromTerraformFiles, generateDiagramFromPlanJson } from '../src'

describe('generateDiagramFromTerraformFiles', () => {
  it('generates canvas drafts from the bundled serverless example', () => {
    const example = getExampleProject('aws-serverless-api')
    const result = generateDiagramFromTerraformFiles(example.files)

    expect(result.parsed.resources).toHaveLength(4)
    expect(result.graph.nodes.map((node) => node.id)).toContain(
      'aws_api_gateway_rest_api.public_api',
    )
    expect(result.graph.nodes.map((node) => node.id)).toContain(
      'aws_lambda_function.handler',
    )
    expect(result.graph.nodes.map((node) => node.id)).toContain(
      'aws_dynamodb_table.sessions',
    )
    expect(result.graph.nodes.map((node) => node.id)).toContain(
      'aws_iam_role.lambda_exec',
    )
    expect(result.canvasDrafts).toHaveLength(4)
    expect(result.diagnostics).toEqual([])
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

  it('generates a valid DiagramPipelineResult from a plan JSON string', () => {
    const planJson = JSON.stringify({
      format_version: '1.1',
      planned_values: {
        root_module: {
          resources: [
            { address: 'aws_lambda_function.handler', type: 'aws_lambda_function', name: 'handler' },
            { address: 'aws_iam_role.exec', type: 'aws_iam_role', name: 'exec' },
          ],
        },
      },
      configuration: {
        root_module: {
          resources: [
            {
              address: 'aws_lambda_function.handler',
              type: 'aws_lambda_function',
              name: 'handler',
              expressions: {
                role: { references: ['aws_iam_role.exec.arn', 'aws_iam_role.exec'] },
              },
            },
            {
              address: 'aws_iam_role.exec',
              type: 'aws_iam_role',
              name: 'exec',
            },
          ],
        },
      },
    })

    const result = generateDiagramFromPlanJson(planJson)

    expect(result.parsed.resources).toHaveLength(2)
    expect(result.graph.nodes.map((n) => n.id)).toContain('aws_lambda_function.handler')
    expect(result.graph.nodes.map((n) => n.id)).toContain('aws_iam_role.exec')
    expect(result.canvasDrafts.length).toBeGreaterThan(0)
    // Edge from lambda → role (depends-on / uses-role)
    expect(result.graph.edges.length).toBeGreaterThan(0)
    // No diagnostics — exact plan input
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([])
  })

  it('VPC group spans at most 2 columns after group-constrained layout (HU-033)', () => {
    const example = getExampleProject('aws-vpc-rds')
    const result = generateDiagramFromTerraformFiles(example.files)

    const vpcGroup = result.graph.groups.find((g) => g.kind === 'vpc')
    expect(vpcGroup).toBeDefined()

    const layout = result.positionedGraph.layout
    const COL_W = 300 // NODE_W(220) + COL_GAP(80)
    const childCols = vpcGroup!.children
      .filter((id) => layout[id] !== undefined)
      .map((id) => Math.round((layout[id]!.x - 60) / COL_W))
    const minCol = Math.min(...childCols)
    const maxCol = Math.max(...childCols)

    expect(maxCol - minCol).toBeLessThanOrEqual(1)
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
