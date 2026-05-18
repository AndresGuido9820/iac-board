import { describe, expect, it } from 'vitest'
import { layoutCloudGraph, NODE_W } from '../src'
import type { CloudGraph, CloudGroup } from '@iac-board/core-types'

// ── Helpers ────────────────────────────────────────────────────────────────

function node(id: string, category: string = 'compute') {
  return {
    id,
    provider: 'aws' as const,
    kind: id,
    label: id,
    category: category as 'compute',
    metadata: {},
  }
}

function edge(
  from: string,
  to: string,
  relation: 'deployed-in' | 'secured-by' | 'connects' = 'deployed-in',
) {
  return {
    id: `${from}->${to}`,
    from,
    to,
    relation,
    confidence: 'inferred' as const,
    metadata: {},
  }
}

function group(
  id: string,
  kind: 'vpc' | 'subnet',
  children: string[],
): CloudGroup {
  return { id, label: id, kind, children, metadata: {} }
}

/** Column index from x position (col 0 = x=60, col 1 = x=60+220+80=360, …) */
function colOf(x: number): number {
  return Math.round((x - 60) / (NODE_W + 80))
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('group-constrained placement (HU-033)', () => {
  it('forces subnet group children into the same column', () => {
    // vpc at layer 0, subnet at layer 1, instance deployed-in subnet at layer 2
    const graph: CloudGraph = {
      nodes: [
        node('vpc', 'network'),
        node('subnet', 'network'),
        node('instance', 'compute'),
      ],
      edges: [
        edge('subnet', 'vpc', 'deployed-in'),
        edge('instance', 'subnet', 'deployed-in'),
      ],
      groups: [group('g:subnet', 'subnet', ['subnet', 'instance'])],
      diagnostics: [],
    }

    const result = layoutCloudGraph(graph)
    const colSubnet = colOf(result.layout['subnet']!.x)
    const colInstance = colOf(result.layout['instance']!.x)

    expect(colSubnet).toBe(colInstance)
  })

  it('forces VPC group children into at most 2 adjacent columns', () => {
    // vpc→col0, subnet→col1, instance deployed-in subnet→col2, db deployed-in subnet→col2
    // Also a resource at col3 deployed-in instance
    const graph: CloudGraph = {
      nodes: [
        node('vpc', 'network'),
        node('subnet', 'network'),
        node('instance', 'compute'),
        node('db', 'database'),
        node('deep', 'storage'),
      ],
      edges: [
        edge('subnet', 'vpc', 'deployed-in'),
        edge('instance', 'subnet', 'deployed-in'),
        edge('db', 'subnet', 'deployed-in'),
        edge('deep', 'instance', 'deployed-in'),
      ],
      groups: [
        group('g:subnet', 'subnet', ['subnet', 'instance', 'db', 'deep']),
        group('g:vpc', 'vpc', ['vpc', 'subnet', 'instance', 'db', 'deep']),
      ],
      diagnostics: [],
    }

    const result = layoutCloudGraph(graph)
    const vpcChildren = ['vpc', 'subnet', 'instance', 'db', 'deep']
    const cols = vpcChildren.map((id) => colOf(result.layout[id]!.x))
    const minCol = Math.min(...cols)
    const maxCol = Math.max(...cols)

    expect(maxCol - minCol).toBeLessThanOrEqual(1)
  })

  it('VPC group rect has aspect ratio ≤ 3:1 for the vpc-rds bundled example', () => {
    // Simulate the VPC+RDS topology directly
    const graph: CloudGraph = {
      nodes: [
        node('aws_vpc.main', 'network'),
        node('aws_subnet.public', 'network'),
        node('aws_subnet.private', 'network'),
        node('aws_internet_gateway.edge', 'network'),
        node('aws_security_group.database', 'security'),
        node('aws_nat_gateway.egress', 'network'),
        node('aws_db_instance.primary', 'database'),
      ],
      edges: [
        edge('aws_subnet.public', 'aws_vpc.main', 'deployed-in'),
        edge('aws_subnet.private', 'aws_vpc.main', 'deployed-in'),
        edge('aws_internet_gateway.edge', 'aws_vpc.main', 'deployed-in'),
        edge('aws_security_group.database', 'aws_vpc.main', 'deployed-in'),
        edge('aws_nat_gateway.egress', 'aws_subnet.public', 'deployed-in'),
        edge(
          'aws_db_instance.primary',
          'aws_security_group.database',
          'secured-by',
        ),
      ],
      groups: [
        group('g:subnet:public', 'subnet', [
          'aws_subnet.public',
          'aws_nat_gateway.egress',
        ]),
        group('g:subnet:private', 'subnet', [
          'aws_subnet.private',
          'aws_db_instance.primary',
        ]),
        group('g:vpc', 'vpc', [
          'aws_vpc.main',
          'aws_subnet.public',
          'aws_subnet.private',
          'aws_internet_gateway.edge',
          'aws_security_group.database',
          'aws_nat_gateway.egress',
          'aws_db_instance.primary',
        ]),
      ],
      diagnostics: [],
    }

    const result = layoutCloudGraph(graph)
    const vpcRect = result.layout['g:vpc']!
    expect(vpcRect).toBeDefined()

    const aspectRatio = vpcRect.width / vpcRect.height
    expect(aspectRatio).toBeLessThanOrEqual(3)
  })

  it('does not affect non-grouped nodes', () => {
    // Two independent graphs: grouped and ungrouped
    const graph: CloudGraph = {
      nodes: [
        node('vpc', 'network'),
        node('subnet', 'network'),
        node('standalone_a', 'compute'),
        node('standalone_b', 'storage'),
      ],
      edges: [
        edge('subnet', 'vpc', 'deployed-in'),
        edge('standalone_a', 'standalone_b', 'connects'),
      ],
      groups: [group('g:vpc', 'vpc', ['vpc', 'subnet'])],
      diagnostics: [],
    }

    const result = layoutCloudGraph(graph)

    // All nodes should have valid, defined positions
    for (const id of ['vpc', 'subnet', 'standalone_a', 'standalone_b']) {
      expect(result.layout[id]).toBeDefined()
      expect(Number.isFinite(result.layout[id]!.x)).toBe(true)
      expect(Number.isFinite(result.layout[id]!.y)).toBe(true)
    }

    // standalone_a should be to the left of standalone_b (connects edge)
    expect(result.layout['standalone_a']!.x).toBeLessThan(
      result.layout['standalone_b']!.x,
    )
  })

  it('handles groups with all children in the same layer (no-op)', () => {
    const graph: CloudGraph = {
      nodes: [node('a', 'network'), node('b', 'compute')],
      edges: [],
      groups: [group('g:subnet', 'subnet', ['a', 'b'])],
      diagnostics: [],
    }

    expect(() => layoutCloudGraph(graph)).not.toThrow()
    const result = layoutCloudGraph(graph)
    expect(colOf(result.layout['a']!.x)).toBe(colOf(result.layout['b']!.x))
  })

  it('handles empty groups and groups with unknown children gracefully', () => {
    const graph: CloudGraph = {
      nodes: [node('a', 'compute')],
      edges: [],
      groups: [
        group('g:empty', 'vpc', []),
        group('g:ghost', 'subnet', ['does_not_exist']),
      ],
      diagnostics: [],
    }

    expect(() => layoutCloudGraph(graph)).not.toThrow()
    expect(layoutCloudGraph(graph).layout['a']).toBeDefined()
  })
})
