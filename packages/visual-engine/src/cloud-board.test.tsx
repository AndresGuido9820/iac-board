import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CloudBoard } from './cloud-board'
import { toBoardElements } from './types'
import type { BoardElement } from './types'

const emptyElements: BoardElement[] = []

const twoNodeElements: BoardElement[] = [
  {
    type: 'node',
    id: 'aws_lambda_function.a',
    resourceType: 'aws_lambda_function',
    label: 'a',
    category: 'compute',
    rect: { x: 60, y: 60, width: 220, height: 92 },
  },
  {
    type: 'node',
    id: 'aws_s3_bucket.b',
    resourceType: 'aws_s3_bucket',
    label: 'b',
    category: 'storage',
    rect: { x: 360, y: 60, width: 220, height: 92 },
  },
  {
    type: 'edge',
    id: 'e1',
    from: 'aws_lambda_function.a',
    to: 'aws_s3_bucket.b',
    relation: 'writes-to',
    confidence: 'inferred',
  },
]

describe('CloudBoard', () => {
  it('renders without crashing with empty elements', () => {
    render(<CloudBoard elements={emptyElements} />)
    expect(screen.getByTestId('iac-canvas')).toBeInTheDocument()
  })

  it('renders nodes and edges', () => {
    render(<CloudBoard elements={twoNodeElements} />)
    expect(screen.getAllByTestId('iac-node')).toHaveLength(2)
    expect(screen.getAllByTestId('iac-edge')).toHaveLength(1)
  })

  it('calls onNodeSelect when a node is clicked', () => {
    const onNodeSelect = vi.fn()
    render(
      <CloudBoard elements={twoNodeElements} onNodeSelect={onNodeSelect} />,
    )
    const nodes = screen.getAllByTestId('iac-node')
    fireEvent.mouseDown(nodes[0])
    expect(onNodeSelect).toHaveBeenCalledWith('aws_lambda_function.a')
  })

  it('does not throw when onNodeSelect is not provided', () => {
    render(<CloudBoard elements={twoNodeElements} />)
    const nodes = screen.getAllByTestId('iac-node')
    expect(() => fireEvent.mouseDown(nodes[0])).not.toThrow()
  })

  it('renders edge legend', () => {
    render(<CloudBoard elements={twoNodeElements} />)
    expect(screen.getByTestId('iac-edge-legend')).toBeInTheDocument()
  })

  it('renders with a group element', () => {
    const withGroup: BoardElement[] = [
      ...twoNodeElements,
      {
        type: 'group',
        id: 'group:vpc:aws_vpc.main',
        kind: 'vpc',
        label: 'VPC main',
        rect: { x: 28, y: 16, width: 300, height: 200 },
        children: ['aws_lambda_function.a'],
      },
    ]
    render(<CloudBoard elements={withGroup} />)
    expect(screen.getAllByTestId('iac-node')).toHaveLength(2)
  })

  it('renders minimap when there are nodes', () => {
    render(<CloudBoard elements={twoNodeElements} />)
    expect(screen.getByTestId('iac-minimap')).toBeInTheDocument()
  })

  it('does not render minimap when elements is empty', () => {
    render(<CloudBoard elements={emptyElements} />)
    expect(screen.queryByTestId('iac-minimap')).not.toBeInTheDocument()
  })

  it('uses fallback viewBox when elements is empty', () => {
    render(<CloudBoard elements={emptyElements} />)
    const svg = screen.getByTestId('iac-canvas')
    // contentMaxY=480 + LEGEND_H(7*16+20+14=146) + 24 = 650
    expect(svg.getAttribute('viewBox')).toBe('0 0 800 650')
  })

  it('toBoardElements produces correct BoardEdge from CloudEdge', () => {
    const elements = toBoardElements(
      [],
      [],
      [
        {
          id: 'e1',
          from: 'a',
          to: 'b',
          relation: 'connects',
          confidence: 'inferred',
          metadata: {},
        },
      ],
    )
    expect(elements).toHaveLength(1)
    expect(elements[0]).toMatchObject({
      type: 'edge',
      from: 'a',
      to: 'b',
      relation: 'connects',
    })
  })

  it('toBoardElements maps draft node with source ref', () => {
    const elements = toBoardElements(
      [
        {
          type: 'node',
          id: 'aws_lambda_function.fn',
          label: 'fn',
          x: 0,
          y: 0,
          width: 220,
          height: 92,
        },
      ],
      [
        {
          id: 'aws_lambda_function.fn',
          kind: 'aws_lambda_function',
          category: 'compute',
          source: { filePath: 'main.tf', line: 5 },
        },
      ],
      [],
    )
    expect(elements).toHaveLength(1)
    const node = elements[0] as import('./types').BoardNode
    expect(node.resourceType).toBe('aws_lambda_function')
    expect(node.sourceRef).toBe('main.tf:5')
  })

  it('toBoardElements maps draft node without matching graph node', () => {
    const elements = toBoardElements(
      [
        {
          type: 'node',
          id: 'custom.thing',
          label: 'thing',
          x: 0,
          y: 0,
          width: 220,
          height: 92,
        },
      ],
      [],
      [],
    )
    const node = elements[0] as import('./types').BoardNode
    expect(node.resourceType).toBe('custom')
    expect(node.category).toBe('unknown')
    expect(node.sourceRef).toBeUndefined()
  })

  it('toBoardElements uses line=1 fallback when source has no line', () => {
    const elements = toBoardElements(
      [
        {
          type: 'node',
          id: 'aws_lambda_function.fn',
          label: 'fn',
          x: 0,
          y: 0,
          width: 220,
          height: 92,
        },
      ],
      [
        {
          id: 'aws_lambda_function.fn',
          kind: 'aws_lambda_function',
          category: 'compute',
          provider: 'aws',
          label: 'fn',
          source: { filePath: 'main.tf' },
          metadata: {},
        },
      ],
      [],
    )
    const node = elements[0] as import('./types').BoardNode
    expect(node.sourceRef).toBe('main.tf:1')
  })

  it('deselects node when clicking board background', () => {
    const onNodeSelect = vi.fn()
    render(
      <CloudBoard elements={twoNodeElements} onNodeSelect={onNodeSelect} />,
    )
    // Click a node first
    const nodes = screen.getAllByTestId('iac-node')
    fireEvent.mouseDown(nodes[0])
    expect(onNodeSelect).toHaveBeenCalledWith('aws_lambda_function.a')
    // Click the SVG background — should deselect
    const svg = screen.getByTestId('iac-canvas')
    fireEvent.click(svg)
    expect(onNodeSelect).toHaveBeenLastCalledWith(null)
  })

  it('drags a node with mouse events', () => {
    render(<CloudBoard elements={twoNodeElements} />)
    const nodes = screen.getAllByTestId('iac-node')
    const board = screen.getByRole('application')
    // Start drag on the node
    fireEvent.mouseDown(nodes[0], { clientX: 100, clientY: 100 })
    // Move — board mousemove updates position
    fireEvent.mouseMove(board, { clientX: 150, clientY: 120 })
    fireEvent.mouseUp(board)
    // Position updates occur without throwing; nodes remain rendered
    expect(nodes[0]).toBeInTheDocument()
  })

  it('ArrowRight selects first node when nothing is selected', () => {
    const onNodeSelect = vi.fn()
    render(
      <CloudBoard elements={twoNodeElements} onNodeSelect={onNodeSelect} />,
    )
    const board = screen.getByRole('application')
    fireEvent.keyDown(board, { key: 'ArrowRight' })
    expect(onNodeSelect).toHaveBeenCalledWith('aws_lambda_function.a')
  })

  it('ArrowRight moves to the next node', () => {
    const onNodeSelect = vi.fn()
    render(
      <CloudBoard elements={twoNodeElements} onNodeSelect={onNodeSelect} />,
    )
    const board = screen.getByRole('application')
    // Select first node via click
    fireEvent.mouseDown(screen.getAllByTestId('iac-node')[0])
    onNodeSelect.mockClear()
    // Arrow right moves to second node
    fireEvent.keyDown(board, { key: 'ArrowRight' })
    expect(onNodeSelect).toHaveBeenCalledWith('aws_s3_bucket.b')
  })

  it('ArrowRight wraps around from last to first node', () => {
    const onNodeSelect = vi.fn()
    render(
      <CloudBoard elements={twoNodeElements} onNodeSelect={onNodeSelect} />,
    )
    const board = screen.getByRole('application')
    // Select last node
    fireEvent.mouseDown(screen.getAllByTestId('iac-node')[1])
    onNodeSelect.mockClear()
    fireEvent.keyDown(board, { key: 'ArrowRight' })
    expect(onNodeSelect).toHaveBeenCalledWith('aws_lambda_function.a')
  })

  it('ArrowLeft wraps around from first to last node', () => {
    const onNodeSelect = vi.fn()
    render(
      <CloudBoard elements={twoNodeElements} onNodeSelect={onNodeSelect} />,
    )
    const board = screen.getByRole('application')
    // Select first node
    fireEvent.mouseDown(screen.getAllByTestId('iac-node')[0])
    onNodeSelect.mockClear()
    fireEvent.keyDown(board, { key: 'ArrowLeft' })
    expect(onNodeSelect).toHaveBeenCalledWith('aws_s3_bucket.b')
  })

  it('does not crash on arrow key with empty elements', () => {
    render(<CloudBoard elements={emptyElements} />)
    const board = screen.getByRole('application')
    expect(() => fireEvent.keyDown(board, { key: 'ArrowRight' })).not.toThrow()
  })

  it('initializes node position from initialOverrides', () => {
    const overrides = {
      'aws_lambda_function.a': { x: 500, y: 500, width: 220, height: 92 },
    }
    render(
      <CloudBoard elements={twoNodeElements} initialOverrides={overrides} />,
    )
    // The node group transform should reflect the overridden x/y position
    // We verify via the SVG viewBox being wider than default (node at x=500 + width + PAD)
    const svg = screen.getByTestId('iac-canvas')
    const vb = svg.getAttribute('viewBox') ?? ''
    const [, , w] = vb.split(' ').map(Number)
    // Default layout has node at x=60 → viewBox width ~360. With override at x=500 → much wider.
    expect(w).toBeGreaterThan(400)
  })

  it('calls onOverridesChange after a drag', () => {
    const onOverridesChange = vi.fn()
    render(
      <CloudBoard
        elements={twoNodeElements}
        onOverridesChange={onOverridesChange}
      />,
    )
    const nodes = screen.getAllByTestId('iac-node')
    const board = screen.getByRole('application')
    fireEvent.mouseDown(nodes[0], { clientX: 100, clientY: 100 })
    fireEvent.mouseMove(board, { clientX: 160, clientY: 130 })
    fireEvent.mouseUp(board)
    expect(onOverridesChange).toHaveBeenCalledOnce()
    const [result] = onOverridesChange.mock.calls[0]
    expect(result).toHaveProperty('aws_lambda_function.a')
  })
})
