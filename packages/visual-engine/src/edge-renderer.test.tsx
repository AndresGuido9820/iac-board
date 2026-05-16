import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { BoardEdge, BoardNode } from './types'
import { EdgeRenderer, ArrowMarker } from './edge-renderer'

const makeNode = (id: string, x: number, y: number): BoardNode => ({
  id,
  type: 'node',
  resourceType: 'aws_lambda_function',
  label: id,
  category: 'compute',
  rect: { x, y, width: 220, height: 92 },
})

const makeEdge = (
  id: string,
  from: string,
  to: string,
  relation: string,
  confidence = 'confirmed',
): BoardEdge =>
  ({
    id,
    type: 'edge',
    from,
    to,
    relation,
    confidence,
  }) as BoardEdge

describe('EdgeRenderer', () => {
  const nodeA = makeNode('a', 0, 0)
  const nodeB = makeNode('b', 400, 0)
  // nodeC is at x=0, nodeA right edge is at x=220 → 0 < 220+20 → feedback edge
  const nodeC = makeNode('c', 0, 200)

  it('renders a forward edge path', () => {
    const edges = [makeEdge('e1', 'a', 'b', 'triggers')]
    const nodeMap = new Map([
      ['a', nodeA],
      ['b', nodeB],
    ])
    render(
      <svg>
        <ArrowMarker />
        <EdgeRenderer edges={edges} nodeMap={nodeMap} />
      </svg>,
    )
    expect(screen.getByTestId('iac-edge')).toBeTruthy()
  })

  it('renders a feedback edge (target to the left of source)', () => {
    const edges = [makeEdge('e-feedback', 'a', 'c', 'depends-on')]
    const nodeMap = new Map([
      ['a', nodeA],
      ['c', nodeC],
    ])
    render(
      <svg>
        <ArrowMarker />
        <EdgeRenderer edges={edges} nodeMap={nodeMap} />
      </svg>,
    )
    const path = screen.getByTestId('iac-edge')
    // Feedback path uses S-curve with S command
    expect(path.getAttribute('d')).toMatch(/S /)
  })

  it('falls back to DEFAULT_STYLE for unknown relation and confidence', () => {
    const edges = [
      makeEdge('e-unknown', 'a', 'b', 'unknown-rel', 'unknown-conf'),
    ]
    const nodeMap = new Map([
      ['a', nodeA],
      ['b', nodeB],
    ])
    render(
      <svg>
        <ArrowMarker />
        <EdgeRenderer edges={edges} nodeMap={nodeMap} />
      </svg>,
    )
    // DEFAULT_STYLE color is '#94a3b8'
    expect(screen.getByTestId('iac-edge').getAttribute('stroke')).toBe(
      '#94a3b8',
    )
  })

  it('skips edges with missing nodes', () => {
    const edges = [makeEdge('e-missing', 'a', 'missing', 'triggers')]
    const nodeMap = new Map([['a', nodeA]])
    render(
      <svg>
        <EdgeRenderer edges={edges} nodeMap={nodeMap} />
      </svg>,
    )
    expect(screen.queryAllByTestId('iac-edge')).toHaveLength(0)
  })

  it('renders ArrowMarker defs', () => {
    const { container } = render(
      <svg>
        <ArrowMarker />
      </svg>,
    )
    // defs are in the SVG shadow DOM — check via container (defs are not accessible)
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    expect(container.querySelector('#iac-arrowhead')).toBeTruthy()
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    expect(container.querySelector('#iac-arrowhead-dashed')).toBeTruthy()
  })
})
