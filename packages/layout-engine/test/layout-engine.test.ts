import { describe, expect, it } from 'vitest'
import { layoutCloudGraph } from '../src'

describe('layoutCloudGraph', () => {
  it('returns deterministic positions for graph nodes', () => {
    const positioned = layoutCloudGraph({
      nodes: [
        {
          id: 'aws_lambda_function.api',
          provider: 'aws',
          kind: 'aws_lambda_function',
          label: 'api',
          category: 'compute',
          metadata: {},
        },
      ],
      edges: [],
      groups: [],
      diagnostics: [],
    })

    expect(positioned.layout['aws_lambda_function.api']).toEqual({
      x: 80,
      y: 80,
      width: 200,
      height: 96,
    })
  })

  it('sorts nodes by cloud category before positioning', () => {
    const positioned = layoutCloudGraph({
      nodes: [
        {
          id: 'aws_lambda_function.api',
          provider: 'aws',
          kind: 'aws_lambda_function',
          label: 'api',
          category: 'compute',
          metadata: {},
        },
        {
          id: 'aws_vpc.main',
          provider: 'aws',
          kind: 'aws_vpc',
          label: 'main',
          category: 'network',
          metadata: {},
        },
      ],
      edges: [],
      groups: [],
      diagnostics: [],
    })

    expect(positioned.layout['aws_vpc.main']?.x).toBe(80)
    expect(positioned.layout['aws_lambda_function.api']?.x).toBe(340)
  })
})
