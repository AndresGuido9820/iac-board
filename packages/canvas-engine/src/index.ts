import type { PositionedCloudGraph } from '@iac-board/layout-engine'

export type CanvasElementDraft = {
  id: string
  type: 'group' | 'node'
  label: string
  x: number
  y: number
  width: number
  height: number
}

export function toCanvasElementDrafts(
  graph: PositionedCloudGraph,
): CanvasElementDraft[] {
  const groups = graph.groups.map((group) => {
    const rectangle = graph.layout[group.id]
    if (!rectangle) {
      throw new Error(`Missing layout for group ${group.id}`)
    }

    return {
      id: group.id,
      type: 'group' as const,
      label: group.label,
      ...rectangle,
    }
  })

  const nodes = graph.nodes.map((node) => {
    const rectangle = graph.layout[node.id]
    if (!rectangle) {
      throw new Error(`Missing layout for node ${node.id}`)
    }

    return {
      id: node.id,
      type: 'node' as const,
      label: node.label,
      ...rectangle,
    }
  })

  return [...groups, ...nodes]
}
