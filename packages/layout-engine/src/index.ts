import type { CloudGraph } from '@iac-board/core-types'

export type Rectangle = {
  x: number
  y: number
  width: number
  height: number
}

export type PositionedCloudGraph = CloudGraph & {
  layout: Record<string, Rectangle>
}

const categoryOrder = [
  'network',
  'security',
  'integration',
  'compute',
  'database',
  'storage',
  'unknown',
] as const

export function layoutCloudGraph(graph: CloudGraph): PositionedCloudGraph {
  const layout: Record<string, Rectangle> = {}

  const sortedNodes = [...graph.nodes].sort((a, b) => {
    const categoryDelta =
      categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category)
    return categoryDelta || a.id.localeCompare(b.id)
  })

  sortedNodes.forEach((node, index) => {
    layout[node.id] = {
      x: 80 + (index % 4) * 260,
      y: 80 + Math.floor(index / 4) * 160,
      width: 200,
      height: 96,
    }
  })

  return { ...graph, layout }
}
