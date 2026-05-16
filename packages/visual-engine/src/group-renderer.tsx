import type { BoardGroup } from './types'

const GROUP_COLORS: Record<string, { stroke: string; fill: string; text: string }> = {
  vpc: { stroke: '#2563eb', fill: 'rgba(37,99,235,0.04)', text: 'rgba(37,99,235,0.7)' },
  subnet: { stroke: '#7c3aed', fill: 'rgba(124,58,237,0.04)', text: 'rgba(124,58,237,0.7)' },
}

const DEFAULT_COLOR = { stroke: '#64748b', fill: 'rgba(100,116,139,0.04)', text: 'rgba(100,116,139,0.7)' }

type GroupRendererProps = {
  group: BoardGroup
}

export function GroupRenderer({ group }: GroupRendererProps) {
  const { rect, label, kind } = group
  const c = GROUP_COLORS[kind] ?? DEFAULT_COLOR

  return (
    <g>
      <rect
        fill={c.fill}
        height={rect.height}
        rx={12}
        stroke={c.stroke}
        strokeDasharray="8 4"
        strokeWidth={1.5}
        width={rect.width}
        x={rect.x}
        y={rect.y}
      />
      <text
        dominantBaseline="hanging"
        fill={c.text}
        fontSize={10}
        fontWeight={700}
        letterSpacing="0.08em"
        x={rect.x + 12}
        y={rect.y + 10}
      >
        {label.toUpperCase()}
      </text>
    </g>
  )
}
