import type { BoardEdge, BoardNode, Rect } from './types'

const MARKER_ID = 'iac-arrowhead'
const MARKER_ID_DASHED = 'iac-arrowhead-dashed'

function cx(rect: Rect) {
  return rect.x + rect.width / 2
}
function cy(rect: Rect) {
  return rect.y + rect.height / 2
}
function right(rect: Rect) {
  return rect.x + rect.width
}

/** Cubic bezier S-curve path string from source right-center to target left-center. */
function bezierPath(from: Rect, to: Rect): string {
  const x1 = right(from)
  const y1 = cy(from)
  const x2 = to.x
  const y2 = cy(to)

  // Feedback edge (right-to-left): compact S-curve dropping below both nodes
  if (x2 < x1 + 20) {
    const midX = (x1 + x2) / 2
    const midY = Math.max(cy(from), cy(to)) + 44
    return `M ${x1},${y1} C ${x1 + 36},${y1} ${x1 + 36},${midY} ${midX},${midY} S ${x2 - 36},${y2} ${x2},${y2}`
  }

  const offset = Math.max(60, (x2 - x1) * 0.45)
  return `M ${x1},${y1} C ${x1 + offset},${y1} ${x2 - offset},${y2} ${x2},${y2}`
}

/** Relations that are hidden from the canvas (position communicates containment). */
const HIDDEN_RELATIONS = new Set(['deployed-in'])

const RELATION_STYLE: Record<string, { dash?: string; color: string }> = {
  triggers: { color: '#8b5cf6' }, // purple — event-source mapping fires lambda
  invokes: { color: '#f97316' }, // orange — direct invoke / call
  'publishes-to': { color: '#8b5cf6' }, // purple — async pub
  connects: { color: '#2563eb' }, // blue — API gateway
  'writes-to': { color: '#16a34a' }, // green — storage write
  'uses-role': { color: '#94a3b8', dash: '4 3' }, // gray dashed — IAM
  'deployed-in': { color: '#cbd5e1', dash: '3 5' }, // very light — network placement
  'secured-by': { color: '#f59e0b', dash: '5 3' }, // amber dashed — security group
  'depends-on': { color: '#94a3b8', dash: '6 3' },
  inferred: { color: '#cbd5e1', dash: '4 3' },
}

const DEFAULT_STYLE = { color: '#94a3b8', dash: '5 3' }

// ── Edge legend ───────────────────────────────────────────────────────────────

const LEGEND_ENTRIES: Array<{ label: string; color: string; dash?: string }> = [
  { label: 'connects', color: '#2563eb' },
  { label: 'triggers', color: '#8b5cf6' },
  { label: 'publishes', color: '#8b5cf6' },
  { label: 'invokes', color: '#f97316' },
  { label: 'writes to', color: '#16a34a' },
  { label: 'uses role', color: '#94a3b8', dash: '4 3' },
  { label: 'secured by', color: '#f59e0b', dash: '5 3' },
]

const LEGEND_ROW_H = 16
const LEGEND_PAD = 10
const LEGEND_W = 108
export const LEGEND_H = LEGEND_ENTRIES.length * LEGEND_ROW_H + LEGEND_PAD * 2 + 14 // +14 for title

type EdgeLegendProps = { x: number; y: number }

export function EdgeLegend({ x, y }: EdgeLegendProps) {
  return (
    <g data-testid="iac-edge-legend" pointerEvents="none">
      {/* Background */}
      <rect
        fill="white"
        fillOpacity={0.9}
        height={LEGEND_H}
        rx={6}
        stroke="#e2e8f0"
        strokeWidth={1}
        width={LEGEND_W}
        x={x}
        y={y}
      />
      {/* Title */}
      <text
        dominantBaseline="hanging"
        fill="#94a3b8"
        fontFamily="system-ui, sans-serif"
        fontSize={8}
        fontWeight={700}
        letterSpacing="0.08em"
        x={x + LEGEND_PAD}
        y={y + LEGEND_PAD}
      >
        RELATIONS
      </text>
      {/* Entries */}
      {LEGEND_ENTRIES.map(({ label, color, dash }, i) => {
        const rowY = y + LEGEND_PAD + 14 + i * LEGEND_ROW_H
        return (
          <g key={label}>
            {/* Line sample */}
            <line
              stroke={color}
              strokeDasharray={dash}
              strokeWidth={1.5}
              x1={x + LEGEND_PAD}
              x2={x + LEGEND_PAD + 18}
              y1={rowY + LEGEND_ROW_H / 2}
              y2={rowY + LEGEND_ROW_H / 2}
            />
            {/* Label */}
            <text
              dominantBaseline="middle"
              fill="#475569"
              fontFamily="system-ui, sans-serif"
              fontSize={8.5}
              x={x + LEGEND_PAD + 24}
              y={rowY + LEGEND_ROW_H / 2}
            >
              {label}
            </text>
          </g>
        )
      })}
    </g>
  )
}

/** Human-readable label per relation. Omitted relations get no label. */
const RELATION_LABEL: Partial<Record<string, string>> = {
  triggers: 'triggers',
  invokes: 'invokes',
  'publishes-to': 'publishes',
  connects: 'connects',
  'writes-to': 'writes to',
  'uses-role': 'uses role',
  'secured-by': 'secured by',
}

/**
 * Returns the visual midpoint of the bezier edge for label placement.
 * Returns null for feedback edges (right-to-left) to avoid label clutter.
 */
function labelAnchor(
  from: Rect,
  to: Rect,
): { x: number; y: number } | null {
  const x1 = right(from)
  const x2 = to.x
  if (x2 < x1 + 20) return null // feedback edge — skip label
  return { x: (x1 + x2) / 2, y: (cy(from) + cy(to)) / 2 }
}

type EdgeLabelProps = {
  text: string
  anchor: { x: number; y: number }
  color: string
}

function EdgeLabel({ text, anchor, color }: EdgeLabelProps) {
  const charW = 5.5
  const padX = 5
  const padY = 2
  const boxW = text.length * charW + padX * 2
  const boxH = 14
  return (
    <g data-testid="iac-edge-label" pointerEvents="none">
      <rect
        fill="white"
        fillOpacity={0.88}
        height={boxH}
        rx={3}
        stroke={color}
        strokeOpacity={0.35}
        strokeWidth={0.5}
        width={boxW}
        x={anchor.x - boxW / 2}
        y={anchor.y - boxH / 2 - padY}
      />
      <text
        dominantBaseline="middle"
        fill={color}
        fontFamily="system-ui, sans-serif"
        fontSize={8}
        fontWeight={500}
        textAnchor="middle"
        x={anchor.x}
        y={anchor.y - padY}
      >
        {text}
      </text>
    </g>
  )
}

type EdgeRendererProps = {
  edges: BoardEdge[]
  nodeMap: Map<string, BoardNode>
}

export function ArrowMarker() {
  return (
    <defs>
      {/* Solid arrowhead */}
      <marker
        id={MARKER_ID}
        markerHeight={7}
        markerUnits="strokeWidth"
        markerWidth={7}
        orient="auto"
        refX={7}
        refY={3.5}
      >
        <path d="M0,0 L0,7 L7,3.5 z" fill="currentColor" />
      </marker>
      {/* Dashed arrowhead — lighter */}
      <marker
        id={MARKER_ID_DASHED}
        markerHeight={7}
        markerUnits="strokeWidth"
        markerWidth={7}
        orient="auto"
        refX={7}
        refY={3.5}
      >
        <path d="M0,0 L0,7 L7,3.5 z" fill="#94a3b8" />
      </marker>
    </defs>
  )
}

export function EdgeRenderer({ edges, nodeMap }: EdgeRendererProps) {
  return (
    <>
      {edges.map((edge) => {
        if (HIDDEN_RELATIONS.has(edge.relation)) return null
        const fromNode = nodeMap.get(edge.from)
        const toNode = nodeMap.get(edge.to)
        if (!fromNode || !toNode) return null

        const style =
          RELATION_STYLE[edge.relation] ??
          RELATION_STYLE[edge.confidence] ??
          DEFAULT_STYLE
        const d = bezierPath(fromNode.rect, toNode.rect)
        const markerId = style.dash ? MARKER_ID_DASHED : MARKER_ID

        const labelText = RELATION_LABEL[edge.relation]
        const anchor = labelText
          ? labelAnchor(fromNode.rect, toNode.rect)
          : null

        return (
          <g key={edge.id} data-testid="iac-edge">
            <path
              d={d}
              data-testid="iac-edge-path"
              fill="none"
              markerEnd={`url(#${markerId})`}
              stroke={style.color}
              strokeDasharray={style.dash}
              strokeWidth={1.5}
              style={{ color: style.color }}
            />
            {anchor && (
              <EdgeLabel anchor={anchor} color={style.color} text={labelText!} />
            )}
          </g>
        )
      })}
    </>
  )
}
