import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EdgeRenderer } from './edge-renderer'
import type { BoardEdge, BoardNode } from './types'

const nodeA: BoardNode = {
  type: 'node',
  id: 'a',
  resourceType: 'aws_lambda_function',
  label: 'handler',
  category: 'compute',
  rect: { x: 0, y: 0, width: 220, height: 92 },
}

const nodeB: BoardNode = {
  type: 'node',
  id: 'b',
  resourceType: 'aws_s3_bucket',
  label: 'data',
  category: 'storage',
  rect: { x: 300, y: 0, width: 220, height: 92 },
}

const nodeMap = new Map<string, BoardNode>([
  ['a', nodeA],
  ['b', nodeB],
])

const edge = (relation: BoardEdge['relation']): BoardEdge => ({
  type: 'edge',
  id: `edge:a→b`,
  from: 'a',
  to: 'b',
  relation,
  confidence: 'inferred',
})

describe('EdgeRenderer — edge labels', () => {
  it('renders an edge group for each valid edge', () => {
    render(
      <svg>
        <EdgeRenderer edges={[edge('writes-to')]} nodeMap={nodeMap} />
      </svg>,
    )
    expect(screen.getAllByTestId('iac-edge').length).toBeGreaterThanOrEqual(1)
  })

  it('renders label text for labeled relations when showLabels=true', () => {
    render(
      <svg>
        <EdgeRenderer
          edges={[edge('writes-to')]}
          nodeMap={nodeMap}
          showLabels={true}
        />
      </svg>,
    )
    expect(screen.getByText('writes to')).toBeTruthy()
  })

  it('does not render label when showLabels=false', () => {
    render(
      <svg>
        <EdgeRenderer
          edges={[edge('writes-to')]}
          nodeMap={nodeMap}
          showLabels={false}
        />
      </svg>,
    )
    expect(screen.queryByText('writes to')).toBeNull()
  })

  it('does not render label for deployed-in (structural/noisy)', () => {
    render(
      <svg>
        <EdgeRenderer
          edges={[edge('deployed-in')]}
          nodeMap={nodeMap}
          showLabels={true}
        />
      </svg>,
    )
    expect(screen.queryByText('deployed-in')).toBeNull()
    expect(screen.queryByText('deployed in')).toBeNull()
  })

  it('renders triggers label for triggers relation', () => {
    render(
      <svg>
        <EdgeRenderer
          edges={[edge('triggers')]}
          nodeMap={nodeMap}
          showLabels={true}
        />
      </svg>,
    )
    expect(screen.getByText('triggers')).toBeTruthy()
  })

  it('skips rendering when source or target node is missing', () => {
    const emptyMap = new Map<string, BoardNode>()
    render(
      <svg>
        <EdgeRenderer
          edges={[edge('triggers')]}
          nodeMap={emptyMap}
          showLabels={true}
        />
      </svg>,
    )
    expect(screen.queryAllByTestId('iac-edge')).toHaveLength(0)
  })
})
