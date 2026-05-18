import React, { useEffect, useRef, useState } from 'react'
import type {
  Viewport,
  BoardElement,
  BoardNode,
  BoardGroup,
  BoardEdge,
  Rect,
} from './types'
import { useViewport } from './use-viewport'
import { NodeRenderer } from './node-renderer'
import { GroupRenderer } from './group-renderer'
import {
  EdgeRenderer,
  ArrowMarker,
  EdgeLegend,
  LEGEND_H,
} from './edge-renderer'
import { categoryColors } from './icons/aws'
import type { AwsCategory } from './icons/aws'

const MMAP_W = 120
const MMAP_H = 80

type MinimapProps = {
  nodes: BoardNode[]
  groups: BoardGroup[]
  contentRect: Rect
  viewport: Viewport
  viewW: number
  viewH: number
  x: number
  y: number
}

function Minimap({
  nodes,
  groups,
  contentRect,
  viewport,
  viewW,
  viewH,
  x,
  y,
}: MinimapProps) {
  const cW = contentRect.width || 800
  const cH = contentRect.height || 480
  const sx = MMAP_W / cW
  const sy = MMAP_H / cH
  const toMmX = (cx: number) => x + (cx - contentRect.x) * sx
  const toMmY = (cy: number) => y + (cy - contentRect.y) * sy

  // Visible content area in content coordinates
  const visX = -viewport.x / viewport.zoom
  const visY = -viewport.y / viewport.zoom
  const visW = viewW / viewport.zoom
  const visH = viewH / viewport.zoom

  return (
    <g data-testid="iac-minimap" pointerEvents="none">
      {/* Background */}
      <rect
        fill="white"
        fillOpacity={0.9}
        height={MMAP_H}
        rx={4}
        stroke="#e2e8f0"
        strokeWidth={0.75}
        width={MMAP_W}
        x={x}
        y={y}
      />
      {/* Groups */}
      {groups.map((g) => (
        <rect
          key={g.id}
          fill={g.kind === 'vpc' ? '#2563eb18' : '#8b5cf618'}
          height={g.rect.height * sy}
          rx={1}
          stroke={g.kind === 'vpc' ? '#2563eb' : '#8b5cf6'}
          strokeOpacity={0.4}
          strokeWidth={0.5}
          width={g.rect.width * sx}
          x={toMmX(g.rect.x)}
          y={toMmY(g.rect.y)}
        />
      ))}
      {/* Nodes */}
      {nodes.map((n) => {
        const cat =
          (n.category as AwsCategory) in categoryColors
            ? (n.category as AwsCategory)
            : 'unknown'
        return (
          <rect
            key={n.id}
            fill={categoryColors[cat]}
            fillOpacity={0.8}
            height={Math.max(2, n.rect.height * sy)}
            rx={0.5}
            width={Math.max(4, n.rect.width * sx)}
            x={toMmX(n.rect.x)}
            y={toMmY(n.rect.y)}
          />
        )
      })}
      {/* Viewport indicator */}
      <rect
        fill="#2563eb"
        fillOpacity={0.08}
        height={Math.min(MMAP_H, visH * sy)}
        rx={1.5}
        stroke="#2563eb"
        strokeOpacity={0.7}
        strokeWidth={0.75}
        width={Math.min(MMAP_W, visW * sx)}
        x={Math.max(x, toMmX(visX))}
        y={Math.max(y, toMmY(visY))}
      />
    </g>
  )
}

type CloudBoardProps = {
  elements: BoardElement[]
  className?: string
  onNodeSelect?: (id: string | null) => void
  /** Positions from a previously saved layout (e.g. localStorage or .iac-board.json). */
  initialOverrides?: Record<string, Rect>
  /** Called after every drag-end with the latest override map. */
  onOverridesChange?: (overrides: Record<string, Rect>) => void
  /** Show relation labels on edges (default: true). */
  showEdgeLabels?: boolean
}

export function CloudBoard({
  elements,
  className,
  onNodeSelect,
  initialOverrides,
  onOverridesChange,
  showEdgeLabels = true,
}: CloudBoardProps) {
  const { viewport, transform, onWheel, onMouseDown, onMouseMove, onMouseUp } =
    useViewport()
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [overrides, setOverrides] = useState<Record<string, Rect>>(
    initialOverrides ?? {},
  )
  const [selected, setSelected] = useState<string | null>(null)
  const [svgClientSize, setSvgClientSize] = useState({ w: 0, h: 0 })

  // Track SVG element size via ResizeObserver so minimap has accurate viewport size.
  // This avoids reading svgRef.current during render (React Compiler warning).
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    setSvgClientSize({ w: el.clientWidth, h: el.clientHeight })
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      setSvgClientSize({ w: el.clientWidth, h: el.clientHeight })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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

  const onBoardClick = (e: React.MouseEvent) => {
    // Deselect when clicking on the background (not on a node — nodes stopPropagation)
    if ((e.target as Element).closest('[data-testid="iac-node"]')) return
    setSelected(null)
    onNodeSelect?.(null)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key))
      return
    if (resolvedNodes.length === 0) return
    e.preventDefault()
    const currentIdx = selected
      ? resolvedNodes.findIndex((n) => n.id === selected)
      : -1
    let nextIdx: number
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIdx = currentIdx < resolvedNodes.length - 1 ? currentIdx + 1 : 0
    } else {
      nextIdx = currentIdx > 0 ? currentIdx - 1 : resolvedNodes.length - 1
    }
    const nextNode = resolvedNodes[nextIdx]
    setSelected(nextNode.id)
    onNodeSelect?.(nextNode.id)
  }

  const onNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setSelected(id)
    onNodeSelect?.(id)
    const node = resolvedNodes.find((n) => n.id === id)
    if (!node) return
    dragging.current = {
      id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startRectX: node.rect.x,
      startRectY: node.rect.y,
    }
  }

  const onBoardMouseMove = (e: React.MouseEvent) => {
    onMouseMove(e)
    if (!dragging.current) return
    const { id, startMouseX, startMouseY, startRectX, startRectY } =
      dragging.current
    const dx = e.clientX - startMouseX
    const dy = e.clientY - startMouseY
    const node = nodes.find((n) => n.id === id)
    if (!node) return
    // Convert screen-pixel delta to SVG user-space delta.
    // SVG viewBox maps vw user units to svgClientWidth CSS pixels;
    // the CSS transform adds viewport.zoom on top of that.
    const svgW = svgClientSize.w || vw
    const scale = viewport.zoom * (svgW / vw)
    setOverrides((prev) => ({
      ...prev,
      [id]: {
        ...(overrides[id] ?? node.rect),
        x: startRectX + dx / scale,
        y: startRectY + dy / scale,
      },
    }))
  }

  const onBoardMouseUp = () => {
    onMouseUp()
    if (dragging.current) {
      onOverridesChange?.(overrides)
    }
    dragging.current = null
  }

  // Compute viewBox from all rects with generous padding
  const allRects = [
    ...resolvedNodes.map((n) => n.rect),
    ...groups.map((g) => g.rect),
  ]
  const PAD = 56
  const minX = allRects.length ? Math.min(...allRects.map((r) => r.x)) - PAD : 0
  const minY = allRects.length ? Math.min(...allRects.map((r) => r.y)) - PAD : 0
  const maxX = allRects.length
    ? Math.max(...allRects.map((r) => r.x + r.width)) + PAD
    : 800
  // Extend bottom to accommodate the edge legend below diagram content
  const contentMaxY = allRects.length
    ? Math.max(...allRects.map((r) => r.y + r.height)) + PAD
    : 480
  const maxY = contentMaxY + LEGEND_H + 24
  const vw = maxX - minX
  const vh = maxY - minY
  const legendY = contentMaxY + 8

  const dotGridId = 'iac-dot-grid'

  return (
    <div
      aria-label="Architecture diagram"
      className={className}
      data-pannable="true"
      onKeyDown={onKeyDown}
      onMouseDown={onMouseDown}
      onMouseLeave={onBoardMouseUp}
      onMouseMove={onBoardMouseMove}
      onMouseUp={onBoardMouseUp}
      onWheel={onWheel as unknown as React.WheelEventHandler}
      role="application"
      style={{
        cursor: 'default',
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
      }}
      tabIndex={0}
    >
      <svg
        aria-hidden="true"
        className="cloud-canvas"
        data-testid="iac-canvas"
        onClick={onBoardClick}
        ref={svgRef}
        style={{ display: 'block', width: '100%', minHeight: 300 }}
        viewBox={`${minX} ${minY} ${vw} ${vh}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Dot grid background pattern */}
          <pattern
            id={dotGridId}
            patternUnits="userSpaceOnUse"
            width={24}
            height={24}
          >
            <circle cx={1} cy={1} r={1} fill="#e2e8f0" />
          </pattern>
        </defs>

        {/* Background fill */}
        <rect fill="#f8fafc" height={vh} width={vw} x={minX} y={minY} />
        {/* Dot grid */}
        <rect
          fill={`url(#${dotGridId})`}
          height={vh}
          width={vw}
          x={minX}
          y={minY}
        />

        <ArrowMarker />

        {/* Edge legend — below diagram content, not affected by pan/zoom */}
        <EdgeLegend x={minX + 16} y={legendY} />

        {/* Minimap — bottom-right of legend row */}
        {allRects.length > 0 && (
          <Minimap
            contentRect={{
              x: minX + PAD,
              y: minY + PAD,
              width: maxX - minX - PAD * 2,
              height: contentMaxY - minY - PAD * 2,
            }}
            groups={groups}
            nodes={resolvedNodes}
            viewport={viewport}
            viewH={svgClientSize.h || vh}
            viewW={svgClientSize.w || vw}
            x={maxX - MMAP_W - 8}
            y={legendY}
          />
        )}

        <g style={{ transform, transformOrigin: '0 0' }}>
          {/* Groups first — nodes render on top */}
          {groups.map((g) => (
            <GroupRenderer group={g} key={g.id} />
          ))}
          {/* Edges below nodes */}
          <EdgeRenderer edges={edges} nodeMap={nodeMap} showEdgeLabels={showEdgeLabels} />
          {/* Nodes on top */}
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
