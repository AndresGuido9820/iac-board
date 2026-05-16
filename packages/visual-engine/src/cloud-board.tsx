import React, { useCallback, useRef, useState } from 'react'
import type { BoardElement, BoardNode, BoardGroup, BoardEdge, Rect } from './types'
import { useViewport } from './use-viewport'
import { NodeRenderer } from './node-renderer'
import { GroupRenderer } from './group-renderer'
import { EdgeRenderer, ArrowMarker } from './edge-renderer'

type CloudBoardProps = {
  elements: BoardElement[]
  className?: string
}

export function CloudBoard({ elements, className }: CloudBoardProps) {
  const { transform, onWheel, onMouseDown, onMouseMove, onMouseUp } = useViewport()
  const [overrides, setOverrides] = useState<Record<string, Rect>>({})
  const [selected, setSelected] = useState<string | null>(null)

  const dragging = useRef<{
    id: string
    startMouseX: number
    startMouseY: number
    startRectX: number
    startRectY: number
  } | null>(null)

  const nodes = elements.filter((e): e is BoardNode => e.type === 'node')
  const groups = elements.filter((e): e is BoardGroup => e.type === 'group')
  const edges = elements.filter((e): e is BoardEdge => e.type === 'edge')

  const resolvedNodes = nodes.map((n) => ({
    ...n,
    rect: overrides[n.id] ?? n.rect,
  }))
  const nodeMap = new Map(resolvedNodes.map((n) => [n.id, n]))

  const onNodeMouseDown = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      setSelected(id)
      const node = resolvedNodes.find((n) => n.id === id)
      if (!node) return
      dragging.current = {
        id,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startRectX: node.rect.x,
        startRectY: node.rect.y,
      }
    },
    [resolvedNodes],
  )

  const onBoardMouseMove = useCallback(
    (e: React.MouseEvent) => {
      onMouseMove(e)
      if (!dragging.current) return
      const { id, startMouseX, startMouseY, startRectX, startRectY } = dragging.current
      const dx = e.clientX - startMouseX
      const dy = e.clientY - startMouseY
      const node = nodes.find((n) => n.id === id)
      if (!node) return
      setOverrides((prev) => ({
        ...prev,
        [id]: {
          ...(overrides[id] ?? node.rect),
          x: startRectX + dx,
          y: startRectY + dy,
        },
      }))
    },
    [onMouseMove, nodes, overrides],
  )

  const onBoardMouseUp = useCallback(() => {
    onMouseUp()
    dragging.current = null
  }, [onMouseUp])

  // Compute viewBox from all element rects
  const allRects = [
    ...resolvedNodes.map((n) => n.rect),
    ...groups.map((g) => g.rect),
  ]
  const PAD = 48
  const minX = allRects.length ? Math.min(...allRects.map((r) => r.x)) - PAD : 0
  const minY = allRects.length ? Math.min(...allRects.map((r) => r.y)) - PAD : 0
  const maxX = allRects.length ? Math.max(...allRects.map((r) => r.x + r.width)) + PAD : 800
  const maxY = allRects.length ? Math.max(...allRects.map((r) => r.y + r.height)) + PAD : 600

  return (
    <div
      className={className}
      data-pannable="true"
      onMouseDown={onMouseDown}
      onMouseLeave={onBoardMouseUp}
      onMouseMove={onBoardMouseMove}
      onMouseUp={onBoardMouseUp}
      onWheel={onWheel as unknown as React.WheelEventHandler}
      style={{ cursor: 'default', overflow: 'hidden', position: 'relative', width: '100%' }}
    >
      <svg
        aria-hidden="true"
        style={{ display: 'block', width: '100%', minHeight: 320 }}
        viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <ArrowMarker />
        <g style={{ transform, transformOrigin: '0 0' }}>
          {/* Groups first — nodes render on top */}
          {groups.map((g) => (
            <GroupRenderer group={g} key={g.id} />
          ))}
          {/* Edges */}
          <EdgeRenderer edges={edges} nodeMap={nodeMap} />
          {/* Nodes */}
          {resolvedNodes.map((n) => (
            <NodeRenderer
              key={n.id}
              node={n}
              onMouseDown={onNodeMouseDown}
              selected={selected === n.id}
            />
          ))}
        </g>
      </svg>
    </div>
  )
}
