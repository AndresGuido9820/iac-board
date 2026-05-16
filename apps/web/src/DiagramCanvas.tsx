import type { CanvasElementDraft } from '@iac-board/canvas-engine'

const ACCENT_BY_PREFIX: [string, string][] = [
  ['aws_lambda', '#f97316'],
  ['aws_api_gateway', '#8b5cf6'],
  ['aws_apigatewayv2', '#8b5cf6'],
  ['aws_iot', '#8b5cf6'],
  ['aws_kinesis', '#8b5cf6'],
  ['aws_sns', '#8b5cf6'],
  ['aws_sqs', '#8b5cf6'],
  ['aws_dynamodb', '#10b981'],
  ['aws_db', '#10b981'],
  ['aws_glue', '#10b981'],
  ['aws_athena', '#10b981'],
  ['aws_s3', '#f59e0b'],
  ['aws_iam', '#ef4444'],
  ['aws_security_group', '#ef4444'],
  ['aws_vpc', '#2563eb'],
  ['aws_subnet', '#2563eb'],
  ['aws_internet_gateway', '#2563eb'],
  ['aws_nat_gateway', '#2563eb'],
]

function accentColor(resourceType: string): string {
  for (const [prefix, color] of ACCENT_BY_PREFIX) {
    if (resourceType.startsWith(prefix)) return color
  }
  return '#94a3b8'
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + '…' : text
}

type DiagramCanvasProps = {
  drafts: CanvasElementDraft[]
}

export function DiagramCanvas({ drafts }: DiagramCanvasProps) {
  if (drafts.length === 0) return null

  const PAD = 24
  const maxX = Math.max(...drafts.map((d) => d.x + d.width))
  const maxY = Math.max(...drafts.map((d) => d.y + d.height))
  const vw = maxX + PAD
  const vh = maxY + PAD

  const groups = drafts.filter((d) => d.type === 'group')
  const nodes = drafts.filter((d) => d.type === 'node')

  return (
    <svg
      aria-hidden="true"
      className="diagram-canvas"
      viewBox={`0 0 ${vw} ${vh}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Groups — rendered first so nodes appear on top */}
      {groups.map((g) => (
        <g key={g.id}>
          <rect
            fill="rgba(37,99,235,0.05)"
            height={g.height}
            rx={10}
            stroke="rgba(37,99,235,0.22)"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            width={g.width}
            x={g.x}
            y={g.y}
          />
          <text
            dominantBaseline="hanging"
            fill="rgba(37,99,235,0.6)"
            fontSize={10}
            fontWeight={700}
            letterSpacing="0.07em"
            x={g.x + 10}
            y={g.y + 10}
          >
            {g.label.toUpperCase()}
          </text>
        </g>
      ))}

      {/* Nodes */}
      {nodes.map((n) => {
        const dotIndex = n.id.indexOf('.')
        const resourceType =
          dotIndex !== -1 ? n.id.slice(0, dotIndex) : n.id
        const resourceName =
          dotIndex !== -1 ? n.id.slice(dotIndex + 1) : ''
        const accent = accentColor(resourceType)
        const cx = n.x + n.width / 2

        return (
          <g key={n.id}>
            {/* Card background */}
            <rect
              fill="white"
              height={n.height}
              rx={6}
              stroke="#e2e8f0"
              strokeWidth={1.5}
              width={n.width}
              x={n.x}
              y={n.y}
            />
            {/* Accent bar at top */}
            <rect
              fill={accent}
              height={4}
              rx={3}
              width={n.width - 2}
              x={n.x + 1}
              y={n.y + 1}
            />
            {/* Resource type */}
            <text
              dominantBaseline="middle"
              fill={accent}
              fontSize={9}
              fontWeight={700}
              letterSpacing="0.05em"
              textAnchor="middle"
              x={cx}
              y={n.y + 30}
            >
              {truncate(resourceType, 26)}
            </text>
            {/* Resource name */}
            <text
              dominantBaseline="middle"
              fill="#1e293b"
              fontSize={12}
              fontWeight={600}
              textAnchor="middle"
              x={cx}
              y={n.y + 52}
            >
              {truncate(resourceName || n.label, 20)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
