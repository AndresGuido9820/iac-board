import type { CloudGraph, CloudEdge } from '@iac-board/core-types'

export type Rectangle = {
  x: number
  y: number
  width: number
  height: number
}

export type PositionedCloudGraph = CloudGraph & {
  layout: Record<string, Rectangle>
}

// ── Constants ───────────────────────────────────────────────────────────────

const NODE_W = 220
const NODE_H = 92
const COL_GAP = 80 // horizontal gap between columns
const ROW_GAP = 28 // vertical gap between rows in same column
const PAD_X = 60
const PAD_Y = 60

// ── Topology-aware layout ───────────────────────────────────────────────────

/**
 * Assigns x/y positions using longest-path layering.
 *
 * If A → B (A references B), A is placed to the LEFT of B.
 * Nodes with no outgoing edges (pure leaves) go in the rightmost column.
 * Unconnected nodes are sorted by category and placed in column 0.
 */
export function layoutCloudGraph(graph: CloudGraph): PositionedCloudGraph {
  const layout: Record<string, Rectangle> = {}

  const nodeIds = graph.nodes.map((n) => n.id)
  const layers = computeLayers(nodeIds, graph.edges)

  // Group node IDs by layer
  const byLayer = new Map<number, string[]>()
  for (const [id, layer] of layers) {
    const arr = byLayer.get(layer) ?? []
    arr.push(id)
    byLayer.set(layer, arr)
  }

  // Sort each layer by category order then name for stable output
  const categoryOrder = [
    'network',
    'security',
    'integration',
    'compute',
    'database',
    'storage',
    'unknown',
  ]
  const nodeCategory = new Map(graph.nodes.map((n) => [n.id, n.category]))

  for (const [, ids] of byLayer) {
    ids.sort((a, b) => {
      const ca = categoryOrder.indexOf(nodeCategory.get(a) ?? 'unknown')
      const cb = categoryOrder.indexOf(nodeCategory.get(b) ?? 'unknown')
      return ca !== cb ? ca - cb : a.localeCompare(b)
    })
  }

  // Find tallest column to centre shorter ones vertically
  const maxCount = Math.max(
    ...[...byLayer.values()].map((ids) => ids.length),
    1,
  )
  const totalCanvasH = (maxCount - 1) * (NODE_H + ROW_GAP) + NODE_H

  // Assign node positions
  const sortedLayers = [...byLayer.keys()].sort((a, b) => a - b)
  for (const layer of sortedLayers) {
    const ids = byLayer.get(layer)!
    const colX = PAD_X + layer * (NODE_W + COL_GAP)
    const colH = (ids.length - 1) * (NODE_H + ROW_GAP) + NODE_H
    const offsetY = PAD_Y + (totalCanvasH - colH) / 2

    ids.forEach((id, idx) => {
      layout[id] = {
        x: colX,
        y: offsetY + idx * (NODE_H + ROW_GAP),
        width: NODE_W,
        height: NODE_H,
      }
    })
  }

  // Compute group bounds from children rects
  for (const group of [...graph.groups].sort((a, b) =>
    a.kind.localeCompare(b.kind),
  )) {
    const childRects = group.children
      .map((cid) => layout[cid])
      .filter((r): r is Rectangle => Boolean(r))

    if (childRects.length === 0) continue

    const left = Math.min(...childRects.map((r) => r.x))
    const top = Math.min(...childRects.map((r) => r.y))
    const right = Math.max(...childRects.map((r) => r.x + r.width))
    const bottom = Math.max(...childRects.map((r) => r.y + r.height))

    layout[group.id] = {
      x: left - 32,
      y: top - 44,
      width: right - left + 64,
      height: bottom - top + 88,
    }
  }

  return { ...graph, layout }
}

// ── Layer assignment ─────────────────────────────────────────────────────────

/**
 * Assigns each node a layer using longest-path-from-source DP.
 *
 * Edge semantics: from→to means "from references to", so from is placed
 * BEFORE to (lower layer number = leftmost column).
 * layer(to) = max(layer(from) for all edges from→to) + 1
 */
function computeLayers(
  nodeIds: string[],
  edges: CloudEdge[],
): Map<string, number> {
  // predecessors[to] = list of froms (nodes that point TO this node)
  const predecessors = new Map<string, string[]>(nodeIds.map((id) => [id, []]))
  for (const edge of edges) {
    predecessors.get(edge.to)?.push(edge.from)
  }

  const memo = new Map<string, number>()

  function getLayer(id: string, stack: Set<string>): number {
    if (memo.has(id)) return memo.get(id)!
    if (stack.has(id)) return 0 // cycle guard — break cycle at this node

    stack.add(id)
    const preds = predecessors.get(id) ?? []
    const layer =
      preds.length === 0
        ? 0
        : Math.max(...preds.map((p) => getLayer(p, stack) + 1))
    memo.set(id, layer)
    stack.delete(id)
    return layer
  }

  for (const id of nodeIds) getLayer(id, new Set())
  return memo
}

export { NODE_W, NODE_H }
