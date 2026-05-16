import type { PositionedCloudGraph } from '@iac-board/layout-engine'

export type CanvasElementDraft = {
  id: string
  type: 'node'
  label: string
  x: number
  y: number
  width: number
  height: number
}

export function toCanvasElementDrafts(
  graph: PositionedCloudGraph,
): CanvasElementDraft[] {
  return graph.nodes.map((node) => {
    const rectangle = graph.layout[node.id]
    if (!rectangle) {
      throw new Error(`Missing layout for node ${node.id}`)
    }

    return {
      id: node.id,
      type: 'node',
      label: node.label,
      ...rectangle,
    }
  })
}
