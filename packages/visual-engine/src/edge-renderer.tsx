import type { BoardEdge, BoardNode, Rect } from './types'

const MARKER_ID = 'iac-arrowhead'

function centerOf(rect: Rect) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
}

/** Find the point on the rect border closest to the target center */
function borderPoint(rect: Rect, target: { x: number; y: number }) {
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  const dx = target.x - cx
  const dy = target.y - cy
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return { x: cx, y: cy }

  const scaleX = (rect.width / 2) / Math.abs(dx)
  const scaleY = (rect.height / 2) / Math.abs(dy)
  const scale = Math.min(scaleX, scaleY)

  return { x: cx + dx * scale, y: cy + dy * scale }
}

type EdgeRendererProps = {
  edges: BoardEdge[]
  nodeMap: Map<string, BoardNode>
}

const RELATION_DASH: Record<string, string | undefined> = {
  'depends-on': '6 3',
  'inferred': '6 3',
}

export function ArrowMarker() {
  return (
    <defs>
      <marker
        id={MARKER_ID}
        markerHeight={8}
        markerUnits="strokeWidth"
        markerWidth={8}
        orient="auto"
        refX={8}
        refY={3}
      >
        <path d="M0,0 L0,6 L9,3 z" fill="#94a3b8" />
      </marker>
    </defs>
  )
}

export function EdgeRenderer({ edges, nodeMap }: EdgeRendererProps) {
  return (
    <>
      {edges.map((edge) => {
        const fromNode = nodeMap.get(edge.from)
        const toNode = nodeMap.get(edge.to)
        if (!fromNode || !toNode) return null

        const toCenter = centerOf(toNode.rect)
        const fromCenter = centerOf(fromNode.rect)
        const start = borderPoint(fromNode.rect, toCenter)
        const end = borderPoint(toNode.rect, fromCenter)

        const dash = RELATION_DASH[edge.relation] ?? RELATION_DASH[edge.confidence] ?? undefined

        return (
          <line
            key={edge.id}
            markerEnd={`url(#${MARKER_ID})`}
            stroke="#94a3b8"
            strokeDasharray={dash}
            strokeWidth={1.5}
            x1={start.x}
            x2={end.x}
            y1={start.y}
            y2={end.y}
          />
        )
      })}
    </>
  )
}
