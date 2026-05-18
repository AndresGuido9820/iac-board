import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EdgeRenderer, ArrowMarker } from './edge-renderer'
import type { BoardEdge, BoardNode, Rect } from './types'

function rect(x: number, y: number): Rect {
  return { x, y, width: 220, height: 92 }
}

function node(id: string, x: number, y: number): BoardNode {
  return {
    type: 'node',
    id,
    resourceType: 'aws_lambda_function',
    label: id,
    category: 'compute',
    rect: rect(x, y),
  }
}

function edge(
  id: string,
  from: string,
  to: string,
  relation: BoardEdge['relation'],
): BoardEdge {
  return { type: 'edge', id, from, to, relation, confidence: 'inferred' }
}

const nodeMap = new Map<string, BoardNode>([
  ['A', node('A', 60, 60)],
  ['B', node('B', 360, 60)],
])

describe('EdgeRenderer', () => {
  it('renders a path for a known edge', () => {
    render(
      <svg>
        <ArrowMarker />
        <EdgeRenderer
          edges={[edge('e1', 'A', 'B', 'connects')]}
          nodeMap={nodeMap}
        />
      </svg>,
    )
    expect(screen.getAllByTestId('iac-edge')).toHaveLength(1)
    expect(screen.getByTestId('iac-edge-path')).toBeInTheDocument()
  })

  it('renders an edge label for labelled relations', () => {
    render(
      <svg>
        <ArrowMarker />
        <EdgeRenderer
          edges={[edge('e1', 'A', 'B', 'triggers')]}
          nodeMap={nodeMap}
        />
      </svg>,
    )
    expect(screen.getByTestId('iac-edge-label')).toBeInTheDocument()
    expect(screen.getByText('triggers')).toBeInTheDocument()
  })

  it('renders correct label text per relation', () => {
    const cases: Array<[BoardEdge['relation'], string]> = [
      ['invokes', 'invokes'],
      ['publishes-to', 'publishes'],
      ['connects', 'connects'],
      ['writes-to', 'writes to'],
      ['uses-role', 'uses role'],
    ]

    for (const [relation, expectedText] of cases) {
      const { unmount } = render(
        <svg>
          <ArrowMarker />
          <EdgeRenderer
            edges={[edge('e1', 'A', 'B', relation)]}
            nodeMap={nodeMap}
          />
        </svg>,
      )
      expect(screen.getByText(expectedText)).toBeInTheDocument()
      unmount()
    }
  })

  it('does not render deployed-in edges (containment communicated by position)', () => {
    render(
      <svg>
        <ArrowMarker />
        <EdgeRenderer
          edges={[edge('e1', 'A', 'B', 'deployed-in')]}
          nodeMap={nodeMap}
        />
      </svg>,
    )
    expect(screen.queryByTestId('iac-edge')).not.toBeInTheDocument()
    expect(screen.queryByTestId('iac-edge-label')).not.toBeInTheDocument()
  })

  it('does not render secured-by edges (security group position communicates the relationship)', () => {
    render(
      <svg>
        <ArrowMarker />
        <EdgeRenderer
          edges={[edge('e1', 'A', 'B', 'secured-by')]}
          nodeMap={nodeMap}
        />
      </svg>,
    )
    expect(screen.queryByTestId('iac-edge')).not.toBeInTheDocument()
  })

  it('does not render a label for feedback edges (right-to-left)', () => {
    // B is to the LEFT of A — feedback edge
    const reverseMap = new Map<string, BoardNode>([
      ['A', node('A', 360, 60)],
      ['B', node('B', 60, 60)],
    ])
    render(
      <svg>
        <ArrowMarker />
        <EdgeRenderer
          edges={[edge('e1', 'A', 'B', 'triggers')]}
          nodeMap={reverseMap}
        />
      </svg>,
    )
    expect(screen.queryByTestId('iac-edge-label')).not.toBeInTheDocument()
  })

  it('skips edges with missing nodes', () => {
    render(
      <svg>
        <ArrowMarker />
        <EdgeRenderer
          edges={[edge('e1', 'A', 'MISSING', 'connects')]}
          nodeMap={nodeMap}
        />
      </svg>,
    )
    expect(screen.queryByTestId('iac-edge')).not.toBeInTheDocument()
  })

  it('renders depends-on edge as forward arc (dependency LEFT of dependent)', () => {
    // A (dependent, RIGHT at x=660) depends-on B (dependency, LEFT at x=60)
    // Visual direction should be reversed: arrow goes FROM B TO A (left→right)
    const dependsOnMap = new Map<string, BoardNode>([
      ['A', node('A', 660, 60)], // dependent — layout places it RIGHT
      ['B', node('B', 60, 60)], // dependency — layout places it LEFT
    ])
    render(
      <svg>
        <ArrowMarker />
        <EdgeRenderer
          edges={[edge('e1', 'A', 'B', 'depends-on')]}
          nodeMap={dependsOnMap}
        />
      </svg>,
    )
    // Edge renders (not hidden)
    expect(screen.getByTestId('iac-edge')).toBeInTheDocument()
    // The path starts at right(B)=280 and ends at left(A)=660 — a forward arc
    const path = screen.getByTestId('iac-edge-path').getAttribute('d') ?? ''
    expect(path.startsWith('M 280,')).toBe(true) // starts at right face of B (dependency)
  })

  it('hides edge label when showEdgeLabels=false', () => {
    render(
      <svg>
        <ArrowMarker />
        <EdgeRenderer
          edges={[edge('e1', 'A', 'B', 'triggers')]}
          nodeMap={nodeMap}
          showEdgeLabels={false}
        />
      </svg>,
    )
    expect(screen.getByTestId('iac-edge')).toBeInTheDocument()
    expect(screen.queryByTestId('iac-edge-label')).not.toBeInTheDocument()
    expect(screen.queryByText('triggers')).not.toBeInTheDocument()
  })

  it('shows edge labels by default (showEdgeLabels defaults to true)', () => {
    render(
      <svg>
        <ArrowMarker />
        <EdgeRenderer
          edges={[edge('e1', 'A', 'B', 'invokes')]}
          nodeMap={nodeMap}
        />
      </svg>,
    )
    expect(screen.getByTestId('iac-edge-label')).toBeInTheDocument()
  })

  it('uses group rect as obstacle when edge crosses group boundary', () => {
    // A → B where a group encloses only B — group rect should NOT block (both endpoints not inside)
    // The edge still renders; what we verify is it renders at all with groupRects provided.
    const groupRect = { x: 300, y: 40, width: 280, height: 120 }
    render(
      <svg>
        <ArrowMarker />
        <EdgeRenderer
          edges={[edge('e1', 'A', 'B', 'invokes')]}
          nodeMap={nodeMap}
          groupRects={[groupRect]}
        />
      </svg>,
    )
    expect(screen.getByTestId('iac-edge')).toBeInTheDocument()
    expect(screen.getByTestId('iac-edge-path')).toBeInTheDocument()
  })

  it('does not use group rect as obstacle when both nodes are inside the same group', () => {
    // Both A and B centers inside the group — group rect skipped as obstacle.
    // Edge path should be straight cubic (no routing detour), so it renders.
    const groupRect = { x: 0, y: 0, width: 700, height: 220 }
    render(
      <svg>
        <ArrowMarker />
        <EdgeRenderer
          edges={[edge('e1', 'A', 'B', 'invokes')]}
          nodeMap={nodeMap}
          groupRects={[groupRect]}
        />
      </svg>,
    )
    expect(screen.getByTestId('iac-edge')).toBeInTheDocument()
    // Path should start at right(A) = 60+220 = 280 — no group rerouting
    const d = screen.getByTestId('iac-edge-path').getAttribute('d') ?? ''
    expect(d.startsWith('M 280,')).toBe(true)
  })

  it('renders edge when an intermediate node blocks the direct path', () => {
    // A → C with B in between — edge should still render (obstacle avoidance path)
    const obstacleMap = new Map<string, BoardNode>([
      ['A', node('A', 60, 60)],
      ['B', node('B', 360, 60)], // intermediate node at same y level
      ['C', node('C', 660, 60)],
    ])
    render(
      <svg>
        <ArrowMarker />
        <EdgeRenderer
          edges={[edge('e1', 'A', 'C', 'invokes')]}
          nodeMap={obstacleMap}
        />
      </svg>,
    )
    expect(screen.getByTestId('iac-edge')).toBeInTheDocument()
    expect(screen.getByTestId('iac-edge-path')).toBeInTheDocument()
  })
})
