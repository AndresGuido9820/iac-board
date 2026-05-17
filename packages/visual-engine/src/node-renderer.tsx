import React from 'react'
import type { BoardNode } from './types'
import { categoryColors, categoryIcons } from './icons/aws'
import type { AwsCategory } from './icons/aws'
import { getIcon } from './icons/registry'

export const NODE_W = 220
export const NODE_H = 92
const ICON_SIZE = 36
const ICON_PAD = 14
const TEXT_X_OFFSET = ICON_PAD + ICON_SIZE + 12

/** Strip cloud provider prefix: aws_ / google_ / azurerm_ / azuread_ / etc. */
function stripProvider(type: string): string {
  return type.replace(
    /^(?:aws|google|azurerm|azuread|kubernetes|helm|random|tls|null|local|time|http)_/,
    '',
  )
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

type NodeRendererProps = {
  node: BoardNode
  selected?: boolean
  onMouseDown?: (e: React.MouseEvent, id: string) => void
}

export function NodeRenderer({
  node,
  selected,
  onMouseDown,
}: NodeRendererProps) {
  const { rect, resourceType, label, category } = node
  const cat =
    (category as AwsCategory) in categoryColors
      ? (category as AwsCategory)
      : 'unknown'
  const color = categoryColors[cat]
  const iconSvg = getIcon(resourceType)
  const iconX = rect.x + ICON_PAD
  const iconY = rect.y + (rect.height - ICON_SIZE) / 2
  const textX = rect.x + TEXT_X_OFFSET
  const typeLabel = truncate(stripProvider(resourceType), 26)
  const nameLabel = truncate(label, 18)

  return (
    <g cursor="grab" data-testid="iac-node" onMouseDown={(e) => onMouseDown?.(e, node.id)}>
      {/* Drop shadow */}
      <rect
        fill="rgba(0,0,0,0.06)"
        height={rect.height}
        rx={10}
        width={rect.width}
        x={rect.x + 2}
        y={rect.y + 4}
      />
      {/* Card background */}
      <rect
        fill="white"
        height={rect.height}
        rx={10}
        stroke={selected ? color : '#e2e8f0'}
        strokeWidth={selected ? 2 : 1}
        width={rect.width}
        x={rect.x}
        y={rect.y}
      />
      {/* Left accent bar */}
      <rect
        fill={color}
        height={rect.height - 4}
        rx={9}
        width={5}
        x={rect.x + 1}
        y={rect.y + 2}
      />
      {/* Service icon */}
      {iconSvg ? (
        <foreignObject height={ICON_SIZE} width={ICON_SIZE} x={iconX} y={iconY}>
          <div
            // @ts-expect-error xmlns required for foreignObject
            xmlns="http://www.w3.org/1999/xhtml"
            dangerouslySetInnerHTML={{ __html: iconSvg }}
            style={{
              width: ICON_SIZE,
              height: ICON_SIZE,
              display: 'flex',
              alignItems: 'center',
            }}
          />
        </foreignObject>
      ) : (
        /* Category fallback icon — colored path on tinted background */
        <g>
          <rect
            fill={`${color}18`}
            height={ICON_SIZE}
            rx={8}
            width={ICON_SIZE}
            x={iconX}
            y={iconY}
          />
          <svg
            fill={color}
            height={ICON_SIZE - 8}
            viewBox="0 0 24 24"
            width={ICON_SIZE - 8}
            x={iconX + 4}
            y={iconY + 4}
          >
            <path d={categoryIcons[cat]} fillRule="evenodd" />
          </svg>
        </g>
      )}
      {/* Service type — small, colored, above name */}
      <text
        dominantBaseline="middle"
        fill={color}
        fontSize={9.5}
        fontFamily="system-ui, sans-serif"
        fontWeight={700}
        letterSpacing="0.03em"
        x={textX}
        y={rect.y + rect.height / 2 - 12}
      >
        {typeLabel}
      </text>
      {/* Resource name — large, dark */}
      <text
        dominantBaseline="middle"
        fill="#0f172a"
        fontSize={14}
        fontFamily="system-ui, sans-serif"
        fontWeight={700}
        x={textX}
        y={rect.y + rect.height / 2 + 7}
      >
        {nameLabel}
      </text>
    </g>
  )
}
