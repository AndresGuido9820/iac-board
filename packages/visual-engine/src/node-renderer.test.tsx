import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NodeRenderer } from './node-renderer'
import type { BoardNode } from './types'

function makeNode(resourceType: string, label = 'test'): BoardNode {
  return {
    id: 'node-1',
    type: 'node',
    label,
    resourceType,
    rect: { x: 0, y: 0, width: 220, height: 92 },
  } as BoardNode
}

describe('NodeRenderer', () => {
  it('renders a node with a known resource type', () => {
    render(
      <svg>
        <NodeRenderer node={makeNode('aws_lambda_function')} />
      </svg>,
    )
    expect(screen.getByTestId('iac-node')).toBeDefined()
  })

  it('renders a fallback rect for an unknown resource type (no icon)', () => {
    const { container } = render(
      <svg>
        <NodeRenderer node={makeNode('unknown_resource_xyz')} />
      </svg>,
    )
    // The g element should still render; the icon slot is a rect placeholder
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    expect(container.querySelector('g[data-testid="iac-node"]')).toBeTruthy()
  })

  it('calls onMouseDown with the node id', () => {
    const handler = vi.fn()
    render(
      <svg>
        <NodeRenderer node={makeNode('aws_s3_bucket')} onMouseDown={handler} />
      </svg>,
    )
    screen.getByTestId('iac-node').dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true }),
    )
    expect(handler).toHaveBeenCalledOnce()
    expect(handler.mock.calls[0]?.[1]).toBe('node-1')
  })

  it('applies selected stroke when selected=true', () => {
    const { container } = render(
      <svg>
        <NodeRenderer node={makeNode('aws_lambda_function')} selected />
      </svg>,
    )
    // The card background rect has strokeWidth=2 when selected
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const rects = container.querySelectorAll('rect')
    const selectedRect = Array.from(rects).find(
      (r) => r.getAttribute('stroke-width') === '2',
    )
    expect(selectedRect).toBeTruthy()
  })
})
