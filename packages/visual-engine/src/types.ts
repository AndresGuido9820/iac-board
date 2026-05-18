import type { CloudEdge, CloudGroup, CloudNode } from '@iac-board/core-types'
import type { CanvasElementDraft } from '@iac-board/canvas-engine'

export type Rect = { x: number; y: number; width: number; height: number }

export type BoardNode = {
  type: 'node'
  id: string
  resourceType: string
  label: string
  category: CloudNode['category']
  rect: Rect
  sourceRef?: string
}

export type BoardGroup = {
  type: 'group'
  id: string
  kind: CloudGroup['kind']
  label: string
  rect: Rect
  children: string[]
}

export type BoardEdge = {
  type: 'edge'
  id: string
  from: string
  to: string
  relation: CloudEdge['relation']
  confidence: CloudEdge['confidence']
}

export type BoardElement = BoardNode | BoardGroup | BoardEdge

export type BoardState = {
  elements: BoardElement[]
  /** node/group id → overridden rect (from user drag) */
  overrides: Record<string, Rect>
}

export type Viewport = {
  zoom: number
  x: number
  y: number
}

/** Convert canvas drafts + graph edges + graph nodes into BoardElement[]. */
export function toBoardElements(
  drafts: CanvasElementDraft[],
  nodes: CloudNode[],
  edges: CloudEdge[],
): BoardElement[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  const boardNodes: BoardNode[] = drafts
    .filter((d) => d.type === 'node')
    .map((d) => {
      const node = nodeMap.get(d.id)
      return {
        type: 'node',
        id: d.id,
        // c8 ignore next — split() always returns a string; ?? 'unknown' is unreachable
        resourceType: node?.kind ?? d.id.split('.')[0] ?? 'unknown',
        label: d.label,
        category: node?.category ?? 'unknown',
        rect: { x: d.x, y: d.y, width: d.width, height: d.height },
        sourceRef: node?.source
          ? `${node.source.filePath}:${node.source.line ?? 1}`
          : undefined,
      }
    })

  const boardGroups: BoardGroup[] = drafts
    .filter((d) => d.type === 'group')
    .map((d) => {
      return {
        type: 'group',
        id: d.id,
        kind: d.id.startsWith('group:vpc') ? 'vpc' : 'subnet',
        label: d.label,
        rect: { x: d.x, y: d.y, width: d.width, height: d.height },
        children: [],
      }
    })

  const boardEdges: BoardEdge[] = edges.map((e) => ({
    type: 'edge',
    id: e.id,
    from: e.from,
    to: e.to,
    relation: e.relation,
    confidence: e.confidence,
  }))

  return [...boardGroups, ...boardNodes, ...boardEdges]
}
