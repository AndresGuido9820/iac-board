import { describe, expect, it } from 'vitest'
import { layoutCloudGraph } from '../src'

describe('layoutCloudGraph', () => {
  it('returns deterministic positions for a single unconnected node', () => {
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
      x: 60,
      y: 60,
      width: 220,
      height: 92,
    })
  })

  it('places unconnected nodes in the same column, sorted by category', () => {
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

    // Both unconnected → same layer 0 → same x column
    expect(positioned.layout['aws_vpc.main']?.x).toBe(60)
    expect(positioned.layout['aws_lambda_function.api']?.x).toBe(60)
    // network sorts before compute → vpc has lower y than lambda
    expect(positioned.layout['aws_vpc.main']!.y).toBeLessThan(
      positioned.layout['aws_lambda_function.api']!.y,
    )
  })

  it('places dependent nodes to the right of their dependencies', () => {
    const positioned = layoutCloudGraph({
      nodes: [
        {
          id: 'aws_api_gateway_rest_api.api',
          provider: 'aws',
          kind: 'aws_api_gateway_rest_api',
          label: 'api',
          category: 'integration',
          metadata: {},
        },
        {
          id: 'aws_lambda_function.fn',
          provider: 'aws',
          kind: 'aws_lambda_function',
          label: 'fn',
          category: 'compute',
          metadata: {},
        },
      ],
      edges: [
        {
          id: 'e1',
          from: 'aws_api_gateway_rest_api.api',
          to: 'aws_lambda_function.fn',
          relation: 'connects',
          confidence: 'inferred',
          metadata: {},
        },
      ],
      groups: [],
      diagnostics: [],
    })

    // api_gw (from) comes before lambda (to) → api_gw.x < lambda.x
    expect(positioned.layout['aws_api_gateway_rest_api.api']!.x).toBeLessThan(
      positioned.layout['aws_lambda_function.fn']!.x,
    )
  })

  it('adds group bounds around child node positions', () => {
    const positioned = layoutCloudGraph({
      nodes: [
        {
          id: 'aws_vpc.main',
          provider: 'aws',
          kind: 'aws_vpc',
          label: 'main',
          category: 'network',
          metadata: {},
        },
        {
          id: 'aws_subnet.public',
          provider: 'aws',
          kind: 'aws_subnet',
          label: 'public',
          category: 'network',
          metadata: {},
        },
      ],
      edges: [],
      groups: [
        {
          id: 'group:vpc:aws_vpc.main',
          label: 'VPC main',
          kind: 'vpc',
          children: ['aws_vpc.main', 'aws_subnet.public'],
          metadata: {},
        },
      ],
      diagnostics: [],
    })

    const group = positioned.layout['group:vpc:aws_vpc.main']!
    expect(group).toBeDefined()
    // group bounds encompass both child nodes
    const vpc = positioned.layout['aws_vpc.main']!
    const subnet = positioned.layout['aws_subnet.public']!
    expect(group.x).toBeLessThan(Math.min(vpc.x, subnet.x))
    expect(group.y).toBeLessThan(Math.min(vpc.y, subnet.y))
    expect(group.x + group.width).toBeGreaterThan(Math.max(vpc.x + vpc.width, subnet.x + subnet.width))
    expect(group.y + group.height).toBeGreaterThan(Math.max(vpc.y + vpc.height, subnet.y + subnet.height))
  })
})
