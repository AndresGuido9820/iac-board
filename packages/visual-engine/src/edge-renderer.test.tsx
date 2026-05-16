import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EdgeRenderer, ArrowMarker } from './edge-renderer'
import type { BoardEdge, BoardNode } from './types'

function makeNode(id: string, x: number, y: number): BoardNode {
  return {
    id,
    type: 'node',
    label: id,
    resourceType: 'aws_lambda_function',
    rect: { x, y, width: 200, height: 80 },
  } as BoardNode
}

function makeEdge(from: string, to: string, relation = 'invokes'): BoardEdge {
  return { id: `${from}-${to}`, type: 'edge', from, to, relation, confidence: 'high' } as BoardEdge
}

function makeNodeMap(...nodes: BoardNode[]): Map<string, BoardNode> {
  return new Map(nodes.map((n) => [n.id, n]))
}

describe('EdgeRenderer', () => {
  it('renders a path for a forward edge', () => {
    const a = makeNode('a', 0, 0)
    const b = makeNode('b', 400, 0)
    render(
      <svg>
        <EdgeRenderer edges={[makeEdge('a', 'b')]} nodeMap={makeNodeMap(a, b)} />
      </svg>,
    )
    expect(screen.getAllByTestId('iac-edge')).toHaveLength(1)
  })

  it('uses S-curve path for feedback edge (target to the left)', () => {
    const a = makeNode('a', 400, 100)  // a is at y=100
    const b = makeNode('b', 0, 0)     // b is to the left of a and at lower y
    const { container } = render(
      <svg>
        <EdgeRenderer edges={[makeEdge('a', 'b')]} nodeMap={makeNodeMap(a, b)} />
      </svg>,
    )
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const path = container.querySelector('[data-testid="iac-edge"]')
    // S-curve path starts with M and contains two C control point segments
    expect(path?.getAttribute('d')).toMatch(/M.*C.*S/)
  })

  it('applies default style for unknown relation', () => {
    const a = makeNode('a', 0, 0)
    const b = makeNode('b', 400, 0)
    const edge = makeEdge('a', 'b', 'unknown-relation')
    const { container } = render(
      <svg>
        <EdgeRenderer edges={[edge]} nodeMap={makeNodeMap(a, b)} />
      </svg>,
    )
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const path = container.querySelector('[data-testid="iac-edge"]')
    expect(path?.getAttribute('stroke')).toBe('#94a3b8')
  })

  it('renders nothing for edges with missing nodes', () => {
    const a = makeNode('a', 0, 0)
    const { container } = render(
      <svg>
        <EdgeRenderer edges={[makeEdge('a', 'missing')]} nodeMap={makeNodeMap(a)} />
      </svg>,
    )
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    expect(container.querySelectorAll('[data-testid="iac-edge"]')).toHaveLength(0)
  })

  it('uses dashed arrowhead marker for dashed relations like uses-role', () => {
    const a = makeNode('a', 0, 0)
    const b = makeNode('b', 400, 0)
    const edge = makeEdge('a', 'b', 'uses-role')
    const { container } = render(
      <svg>
        <EdgeRenderer edges={[edge]} nodeMap={makeNodeMap(a, b)} />
      </svg>,
    )
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const path = container.querySelector('[data-testid="iac-edge"]')
    expect(path?.getAttribute('marker-end')).toContain('iac-arrowhead-dashed')
  })

  it('ArrowMarker renders two marker defs', () => {
    const { container } = render(<svg><ArrowMarker /></svg>)
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    expect(container.querySelectorAll('marker')).toHaveLength(2)
  })
})
