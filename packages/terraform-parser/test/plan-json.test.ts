import { describe, expect, it } from 'vitest'
import { parsePlanJson } from '../src'

// Minimal valid plan JSON for testing
const MINIMAL_PLAN = JSON.stringify({
  format_version: '1.1',
  planned_values: {
    root_module: {
      resources: [
        {
          address: 'aws_lambda_function.api',
          type: 'aws_lambda_function',
          name: 'api',
        },
        {
          address: 'aws_iam_role.lambda_exec',
          type: 'aws_iam_role',
          name: 'lambda_exec',
        },
      ],
    },
  },
  configuration: {
    root_module: {
      resources: [
        {
          address: 'aws_lambda_function.api',
          type: 'aws_lambda_function',
          name: 'api',
          expressions: {
            role: {
              references: [
                'aws_iam_role.lambda_exec.arn',
                'aws_iam_role.lambda_exec',
              ],
            },
            function_name: { constant_value: 'api' },
          },
        },
        {
          address: 'aws_iam_role.lambda_exec',
          type: 'aws_iam_role',
          name: 'lambda_exec',
          expressions: {
            name: { constant_value: 'lambda-exec' },
          },
        },
      ],
    },
  },
})

describe('parsePlanJson', () => {
  it('extracts resources from planned_values', () => {
    const result = parsePlanJson(MINIMAL_PLAN)
    expect(result.diagnostics).toEqual([])
    expect(result.resources).toHaveLength(2)
    expect(result.resources.map((r) => r.address)).toContain(
      'aws_lambda_function.api',
    )
    expect(result.resources.map((r) => r.address)).toContain(
      'aws_iam_role.lambda_exec',
    )
  })

  it('sets type and name correctly on each resource', () => {
    const result = parsePlanJson(MINIMAL_PLAN)
    const lambda = result.resources.find(
      (r) => r.address === 'aws_lambda_function.api',
    )
    expect(lambda?.type).toBe('aws_lambda_function')
    expect(lambda?.name).toBe('api')
  })

  it('extracts refs from configuration.expressions', () => {
    const result = parsePlanJson(MINIMAL_PLAN)
    const lambda = result.resources.find(
      (r) => r.address === 'aws_lambda_function.api',
    )
    // Should resolve to resource address, deduped
    expect(lambda?.refs).toContain('aws_iam_role.lambda_exec')
    // constant_value attributes produce no refs
    expect(lambda?.refs).toHaveLength(1)
  })

  it('marks resources with confidence=exact in metadata', () => {
    const result = parsePlanJson(MINIMAL_PLAN)
    for (const resource of result.resources) {
      expect(resource.metadata?.confidence).toBe('exact')
    }
  })

  it('handles child_modules recursively', () => {
    const plan = JSON.stringify({
      format_version: '1.1',
      planned_values: {
        root_module: {
          resources: [
            { address: 'aws_vpc.main', type: 'aws_vpc', name: 'main' },
          ],
          child_modules: [
            {
              address: 'module.app',
              resources: [
                {
                  address: 'module.app.aws_lambda_function.handler',
                  type: 'aws_lambda_function',
                  name: 'handler',
                },
              ],
              child_modules: [
                {
                  address: 'module.app.module.db',
                  resources: [
                    {
                      address: 'module.app.module.db.aws_db_instance.main',
                      type: 'aws_db_instance',
                      name: 'main',
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    })

    const result = parsePlanJson(plan)
    const addresses = result.resources.map((r) => r.address)
    expect(addresses).toContain('aws_vpc.main')
    expect(addresses).toContain('module.app.aws_lambda_function.handler')
    expect(addresses).toContain('module.app.module.db.aws_db_instance.main')
    expect(result.resources).toHaveLength(3)
    expect(result.diagnostics).toEqual([])
  })

  it('returns PLAN001 error diagnostic for invalid JSON', () => {
    const result = parsePlanJson('not json {')
    expect(result.resources).toEqual([])
    expect(result.diagnostics).toHaveLength(1)
    expect(result.diagnostics[0].code).toBe('PLAN001')
    expect(result.diagnostics[0].severity).toBe('error')
  })

  it('returns PLAN002 error diagnostic for non-plan JSON', () => {
    const result = parsePlanJson(JSON.stringify({ some: 'data' }))
    expect(result.resources).toEqual([])
    expect(result.diagnostics).toHaveLength(1)
    expect(result.diagnostics[0].code).toBe('PLAN002')
    expect(result.diagnostics[0].severity).toBe('error')
  })

  it('ignores var.*, local.*, path.* in references', () => {
    const plan = JSON.stringify({
      format_version: '1.1',
      planned_values: {
        root_module: {
          resources: [
            {
              address: 'aws_lambda_function.fn',
              type: 'aws_lambda_function',
              name: 'fn',
            },
          ],
        },
      },
      configuration: {
        root_module: {
          resources: [
            {
              address: 'aws_lambda_function.fn',
              type: 'aws_lambda_function',
              name: 'fn',
              expressions: {
                env: {
                  references: [
                    'var.region',
                    'local.common_tags',
                    'path.module',
                    'each.key',
                    'aws_iam_role.exec',
                  ],
                },
              },
            },
          ],
        },
      },
    })

    const result = parsePlanJson(plan)
    const fn = result.resources[0]
    expect(fn.refs).toEqual(['aws_iam_role.exec'])
  })

  it('handles data source references correctly', () => {
    const plan = JSON.stringify({
      format_version: '1.1',
      planned_values: {
        root_module: {
          resources: [
            { address: 'aws_instance.web', type: 'aws_instance', name: 'web' },
          ],
        },
      },
      configuration: {
        root_module: {
          resources: [
            {
              address: 'aws_instance.web',
              expressions: {
                ami: {
                  references: ['data.aws_ami.ubuntu.id', 'data.aws_ami.ubuntu'],
                },
              },
            },
          ],
        },
      },
    })

    const result = parsePlanJson(plan)
    expect(result.resources[0].refs).toEqual(['data.aws_ami.ubuntu'])
  })
})
