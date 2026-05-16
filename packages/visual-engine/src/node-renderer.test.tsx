import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { BoardNode } from './types'
import { NodeRenderer } from './node-renderer'

const makeNode = (resourceType: string): BoardNode => ({
  id: 'n1',
  type: 'node',
  resourceType,
  label: 'test',
  category: 'compute',
  rect: { x: 0, y: 0, width: 220, height: 92 },
})

describe('NodeRenderer', () => {
  it('renders a node with a known resource type (has icon)', () => {
    render(
      <svg>
        <NodeRenderer node={makeNode('aws_lambda_function')} />
      </svg>,
    )
    expect(screen.getByTestId('iac-node')).toBeTruthy()
  })

  it('renders fallback rect when resource type has no icon', () => {
    // A made-up resource type with no registered icon — triggers icon fallback rect
    render(
      <svg>
        <NodeRenderer node={makeNode('aws_custom_unknown_resource_xyz')} />
      </svg>,
    )
    expect(screen.getByTestId('iac-node')).toBeTruthy()
  })

  it('calls onMouseDown with node id when g element is clicked', () => {
    const handler = vi.fn()
    render(
      <svg>
        <NodeRenderer node={makeNode('aws_s3_bucket')} onMouseDown={handler} />
      </svg>,
    )
    screen
      .getByTestId('iac-node')
      .dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
      )
    expect(handler).toHaveBeenCalledWith(expect.anything(), 'n1')
  })

  it('renders with selected state', () => {
    render(
      <svg>
        <NodeRenderer node={makeNode('aws_lambda_function')} selected />
      </svg>,
    )
    expect(screen.getByTestId('iac-node')).toBeTruthy()
  })
})
