import React from 'react'
import type { BoardNode } from './types'
import { categoryColors } from './icons/aws'
import type { AwsCategory } from './icons/aws'
import { getIcon } from './icons/registry'

const NODE_W = 180
const NODE_H = 88
const ICON_SIZE = 32

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

type NodeRendererProps = {
  node: BoardNode
  selected?: boolean
  onMouseDown?: (e: React.MouseEvent, id: string) => void
}

export function NodeRenderer({ node, selected, onMouseDown }: NodeRendererProps) {
  const { rect, resourceType, label, category } = node
  const cat = (category as AwsCategory) in categoryColors ? (category as AwsCategory) : 'unknown'
  const color = categoryColors[cat]
  const iconSvg = getIcon(resourceType)
  const cx = rect.x + rect.width / 2
  const iconX = rect.x + 12
  const iconY = rect.y + (rect.height - ICON_SIZE) / 2

  return (
    <g
      cursor="grab"
      onMouseDown={(e) => onMouseDown?.(e, node.id)}
    >
      {/* Drop shadow */}
      <rect
        fill="rgba(0,0,0,0.07)"
        height={rect.height}
        rx={8}
        width={rect.width}
        x={rect.x + 2}
        y={rect.y + 3}
      />
      {/* Card background */}
      <rect
        fill="white"
        height={rect.height}
        rx={8}
        stroke={selected ? color : '#e2e8f0'}
        strokeWidth={selected ? 2.5 : 1.5}
        width={rect.width}
        x={rect.x}
        y={rect.y}
      />
      {/* Left accent bar */}
      <rect
        fill={color}
        height={rect.height - 2}
        rx={7}
        width={5}
        x={rect.x + 1}
        y={rect.y + 1}
      />
      {/* Service icon — real SVG from tf2d2/icons if available, else colored box */}
      {iconSvg ? (
        <foreignObject
          height={ICON_SIZE}
          width={ICON_SIZE}
          x={iconX}
          y={iconY}
        >
          <div
            // @ts-expect-error xmlns required for foreignObject
            xmlns="http://www.w3.org/1999/xhtml"
            dangerouslySetInnerHTML={{ __html: iconSvg }}
            style={{ width: ICON_SIZE, height: ICON_SIZE, display: 'flex', alignItems: 'center' }}
          />
        </foreignObject>
      ) : (
        <rect
          fill={`${color}22`}
          height={ICON_SIZE}
          rx={6}
          stroke={color}
          strokeWidth={1}
          width={ICON_SIZE}
          x={iconX}
          y={iconY}
        />
      )}
      {/* Resource type */}
      <text
        dominantBaseline="middle"
        fill={color}
        fontSize={9}
        fontWeight={700}
        letterSpacing="0.04em"
        textAnchor="middle"
        x={cx + 16}
        y={rect.y + 26}
      >
        {truncate(resourceType, 22)}
      </text>
      {/* Resource name */}
      <text
        dominantBaseline="middle"
        fill="#1e293b"
        fontSize={13}
        fontWeight={700}
        textAnchor="middle"
        x={cx + 16}
        y={rect.y + 52}
      >
        {truncate(label, 16)}
      </text>
    </g>
  )
}

export { NODE_W, NODE_H }
