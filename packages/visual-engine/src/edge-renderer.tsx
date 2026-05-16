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

type Point = { x: number; y: number }

/** Cubic bezier S-curve path string from source right-center to target left-center. */
function bezierPath(from: Rect, to: Rect): string {
  const x1 = right(from)
  const y1 = cy(from)
  const x2 = to.x
  const y2 = cy(to)

  // If target is to the left (feedback edge), draw a curved arc going under
  if (x2 < x1 + 20) {
    const midY = Math.max(cy(from), cy(to)) + 80
    return `M ${x1},${y1} C ${x1 + 60},${y1} ${x1 + 60},${midY} ${cx(from) + (cx(to) - cx(from)) / 2},${midY} S ${x2 - 60},${y2} ${x2},${y2}`
  }

  const offset = Math.max(60, (x2 - x1) * 0.45)
  return `M ${x1},${y1} C ${x1 + offset},${y1} ${x2 - offset},${y2} ${x2},${y2}`
}

/**
 * Midpoint of the bezier at t=0.5.
 * For our symmetric S-curve the analytical midpoint simplifies to the linear average of endpoints.
 * For feedback edges the midpoint is placed at the bottom of the arc.
 */
function bezierMidpoint(from: Rect, to: Rect): Point {
  const x1 = right(from)
  const y1 = cy(from)
  const x2 = to.x
  const y2 = cy(to)

  if (x2 < x1 + 20) {
    // Feedback arc — label at the bottom of the arc
    const midY = Math.max(cy(from), cy(to)) + 80
    return {
      x: cx(from) + (cx(to) - cx(from)) / 2,
      y: midY + 14,
    }
  }

  return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }
}

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

/** Relations that get a visible text label — structural/placement edges are skipped. */
const LABELED_RELATIONS = new Set([
  'triggers',
  'invokes',
  'publishes-to',
  'connects',
  'writes-to',
  'uses-role',
])

/** Human-readable label text per relation. */
const RELATION_LABEL: Record<string, string> = {
  triggers: 'triggers',
  invokes: 'invokes',
  'publishes-to': 'publishes to',
  connects: 'connects',
  'writes-to': 'writes to',
  'uses-role': 'uses role',
}

/** Approximate pixel width of a monospace label at 9px. */
function labelWidth(text: string): number {
  return text.length * 5.5 + 8
}

type EdgeRendererProps = {
  edges: BoardEdge[]
  nodeMap: Map<string, BoardNode>
  showLabels?: boolean
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

export function EdgeRenderer({
  edges,
  nodeMap,
  showLabels = true,
}: EdgeRendererProps) {
  return (
    <>
      {edges.map((edge) => {
        const fromNode = nodeMap.get(edge.from)
        const toNode = nodeMap.get(edge.to)
        if (!fromNode || !toNode) return null

        const style =
          RELATION_STYLE[edge.relation] ??
          RELATION_STYLE[edge.confidence] ??
          DEFAULT_STYLE
        const d = bezierPath(fromNode.rect, toNode.rect)
        const markerId = style.dash ? MARKER_ID_DASHED : MARKER_ID

        const shouldLabel = showLabels && LABELED_RELATIONS.has(edge.relation)
        const labelText = RELATION_LABEL[edge.relation] ?? edge.relation
        const mid = shouldLabel
          ? bezierMidpoint(fromNode.rect, toNode.rect)
          : null
        const lw = shouldLabel && mid ? labelWidth(labelText) : 0

        return (
          <g data-testid="iac-edge" key={edge.id}>
            <path
              d={d}
              fill="none"
              markerEnd={`url(#${markerId})`}
              stroke={style.color}
              strokeDasharray={style.dash}
              strokeWidth={1.5}
              style={{ color: style.color }}
            />
            {shouldLabel && mid && (
              <>
                <rect
                  fill="white"
                  fillOpacity={0.88}
                  height={14}
                  rx={3}
                  stroke={style.color}
                  strokeOpacity={0.4}
                  strokeWidth={0.5}
                  width={lw}
                  x={mid.x - lw / 2}
                  y={mid.y - 9}
                />
                <text
                  dominantBaseline="middle"
                  fill={style.color}
                  fontFamily="ui-monospace, monospace"
                  fontSize={9}
                  textAnchor="middle"
                  x={mid.x}
                  y={mid.y - 1}
                >
                  {labelText}
                </text>
              </>
            )}
          </g>
        )
      })}
    </>
  )
}
