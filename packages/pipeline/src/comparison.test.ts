import {
  compareArchitectures,
  generateDiagramFromTerraformFiles,
  generateDiagramFromPlanJson,
} from './index'

const diagram = (content: string, path = 'main.tf') =>
  generateDiagramFromTerraformFiles([{ path, content }])

describe('architecture comparison', () => {
  it('detects configuration changes, additions and removals while preserving deleted topology', () => {
    const before = diagram(`resource "aws_iam_role" "role" { name = "worker" }
resource "aws_lambda_function" "worker" {
  memory_size = 128
  role = aws_iam_role.role.arn
}
resource "aws_s3_bucket" "old" { bucket = "old" }`)
    const after =
      diagram(`resource "aws_lambda_function" "worker" { memory_size = 512 }
resource "aws_sqs_queue" "new" { name = "jobs" }`)
    const result = compareArchitectures(before, after)
    expect(result.summary).toEqual({
      added: 1,
      removed: 2,
      changed: 1,
      unchanged: 0,
    })
    expect(
      result.changes.find((c) => c.id === 'aws_lambda_function.worker')
        ?.reasons,
    ).toEqual(['configuration', 'connections'])
    expect(result.graph.edges).toHaveLength(before.graph.edges.length)
    expect(result.drafts.filter((d) => d.type === 'node')).toHaveLength(4)
    expect(
      result.graph.edges.every(
        (e) =>
          result.graph.nodes.some((n) => n.id === e.from) &&
          result.graph.nodes.some((n) => n.id === e.to),
      ),
    ).toBe(true)
  })

  it('ignores file moves, comments, attribute order and object key order', () => {
    const before = diagram(`resource "aws_lambda_function" "worker" {
 memory_size = 128
 tags = { a = "one", b = "two" }
}`)
    const after = diagram(
      `# moved\n\nresource "aws_lambda_function" "worker" {
 tags = { b = "two", a = "one" }
 memory_size = 128 # unchanged
}`,
      'moved.tf',
    )
    expect(compareArchitectures(before, after).summary.unchanged).toBe(1)
  })

  it('preserves meaningful string whitespace and list order', () => {
    const before = diagram('resource "aws_s3_bucket" "data" { bucket = "a b" }')
    const after = diagram('resource "aws_s3_bucket" "data" { bucket = "a  b" }')
    expect(compareArchitectures(before, after).summary.changed).toBe(1)
    expect(
      compareArchitectures(
        diagram('resource "aws_s3_bucket" "data" { x = [1, 2] }'),
        diagram('resource "aws_s3_bucket" "data" { x = [2, 1] }'),
      ).summary.changed,
    ).toBe(1)
  })

  it('detects changed connections on otherwise unchanged neighbours', () => {
    const before = diagram('resource "aws_iam_role" "role" { name = "worker" }')
    const after = diagram(
      'resource "aws_iam_role" "role" { name = "worker" }\nresource "aws_lambda_function" "worker" { role = aws_iam_role.role.arn }',
    )
    expect(
      compareArchitectures(before, after).changes.find(
        (c) => c.id === 'aws_iam_role.role',
      )?.reasons,
    ).toEqual(['connections'])
  })

  it('compares plan values recursively without depending on JSON key order', () => {
    const plan = (values: object) =>
      generateDiagramFromPlanJson(
        JSON.stringify({
          format_version: '1.2',
          planned_values: {
            root_module: {
              resources: [
                {
                  address: 'aws_s3_bucket.data',
                  type: 'aws_s3_bucket',
                  name: 'data',
                  values,
                },
              ],
            },
          },
        }),
      )
    expect(
      compareArchitectures(
        plan({ bucket: 'a', tags: { x: 1, y: 2 } }),
        plan({ tags: { y: 2, x: 1 }, bucket: 'a' }),
      ).summary.unchanged,
    ).toBe(1)
    expect(
      compareArchitectures(plan({ bucket: 'a' }), plan({ bucket: 'b' })).summary
        .changed,
    ).toBe(1)
    expect(generateDiagramFromPlanJson('null').diagnostics[0].code).toBe(
      'PLAN002',
    )
  })

  it('keeps empty comparisons valid and detects removal of all resources', () => {
    expect(compareArchitectures(diagram(''), diagram('')).changes).toEqual([])
    expect(
      compareArchitectures(
        diagram('resource "aws_s3_bucket" "data" {}'),
        diagram(''),
      ).summary.removed,
    ).toBe(1)
  })

  it('merges group members so removed resources remain inside their groups', () => {
    const before = diagram(
      'resource "aws_vpc" "main" {}\nresource "aws_subnet" "old" { vpc_id = aws_vpc.main.id }',
    )
    const after = diagram(
      'resource "aws_vpc" "main" {}\nresource "aws_subnet" "new" { vpc_id = aws_vpc.main.id }',
    )
    const result = compareArchitectures(before, after)
    const vpc = result.graph.groups.find((g) => g.kind === 'vpc')
    expect(vpc?.children).toContain('aws_subnet.old')
    expect(vpc?.children).toContain('aws_subnet.new')
    expect(result.changes.find((c) => c.id === 'aws_vpc.main')?.status).toBe(
      'changed',
    )
  })
})
