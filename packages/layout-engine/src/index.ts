import type { CloudGraph, CloudEdge, CloudGroup } from '@iac-board/core-types'

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

  // Sort each layer by category order then name for stable initial ordering
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

  // Phase 2 — Barycenter crossing minimisation (Sugiyama)
  barycentreOrdering(byLayer, graph.edges)

  // Phase 3 — Group-constrained placement
  // Pull group members into adjacent columns so VPC/subnet rects stay compact.
  if (graph.groups.length > 0) {
    applyGroupConstraints(byLayer, graph.groups)
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

// ── Group-constrained placement ───────────────────────────────────────────────

/**
 * Post-processes `byLayer` so that nodes sharing a VPC or subnet group
 * are placed in a compact column range:
 *
 * - **Subnet groups** (kind='subnet'): all children forced to the minimum
 *   layer occupied by any child.
 * - **VPC groups** (kind='vpc'): children compressed to a span of at most 2
 *   adjacent layers (anchored at the minimum child layer).
 *
 * Subnet groups are processed first (finest granularity), so VPC compression
 * can take advantage of already-collapsed subnet members.
 *
 * After moving nodes, empty layers are deleted and layer numbers are
 * renormalised to a contiguous 0-based sequence.
 */
function applyGroupConstraints(
  byLayer: Map<number, string[]>,
  groups: CloudGroup[],
): void {
  // Build inverse map: nodeId → current layer number
  const nodeLayer = new Map<string, number>()
  for (const [layer, ids] of byLayer) {
    for (const id of ids) nodeLayer.set(id, layer)
  }

  /** Move a single node to targetLayer, updating both byLayer and nodeLayer. */
  function moveNode(id: string, targetLayer: number): void {
    const current = nodeLayer.get(id)
    if (current === undefined || current === targetLayer) return

    const src = byLayer.get(current)!
    const idx = src.indexOf(id)
    if (idx >= 0) src.splice(idx, 1)
    if (src.length === 0) byLayer.delete(current)

    if (!byLayer.has(targetLayer)) byLayer.set(targetLayer, [])
    byLayer.get(targetLayer)!.push(id)
    nodeLayer.set(id, targetLayer)
  }

  // 1. Subnet groups — collapse to min child layer
  for (const group of groups) {
    if (group.kind !== 'subnet') continue
    const knownChildren = group.children.filter((id) => nodeLayer.has(id))
    if (knownChildren.length === 0) continue
    const targetLayer = Math.min(...knownChildren.map((id) => nodeLayer.get(id)!))
    for (const id of knownChildren) moveNode(id, targetLayer)
  }

  // 2. VPC groups — compress to max 2 adjacent layers
  for (const group of groups) {
    if (group.kind !== 'vpc') continue
    const knownChildren = group.children.filter((id) => nodeLayer.has(id))
    if (knownChildren.length === 0) continue
    const minLayer = Math.min(...knownChildren.map((id) => nodeLayer.get(id)!))
    const maxLayer = Math.max(...knownChildren.map((id) => nodeLayer.get(id)!))
    if (maxLayer - minLayer <= 1) continue // already compact
    const targetMax = minLayer + 1
    for (const id of knownChildren) {
      const cur = nodeLayer.get(id)!
      if (cur > targetMax) moveNode(id, targetMax)
    }
  }

  // 3. Renormalise layer numbers to a contiguous 0-based sequence
  const sorted = [...byLayer.keys()].sort((a, b) => a - b)
  for (let i = 0; i < sorted.length; i++) {
    const old = sorted[i]
    if (old !== i) {
      const ids = byLayer.get(old)!
      byLayer.delete(old)
      byLayer.set(i, ids)
      for (const id of ids) nodeLayer.set(id, i)
    }
  }
}

// ── Barycenter crossing minimisation ─────────────────────────────────────────

/**
 * Reorders nodes within each layer to reduce edge crossings using the
 * barycenter heuristic (Sugiyama Phase 2).
 *
 * Each node's barycenter = average position-index of its neighbours in the
 * adjacent layer. Alternating forward/backward sweeps are repeated for
 * `iterations` passes. The initial category-order sort is used as a tiebreak
 * so identical barycenters remain stable.
 */
function barycentreOrdering(
  byLayer: Map<number, string[]>,
  edges: CloudEdge[],
  iterations = 6,
): void {
  if (byLayer.size < 2) return

  // Build adjacency: successors[id] = ids in the next layer this node points to
  //                  predecessors[id] = ids in the prev layer that point here
  const successors = new Map<string, string[]>()
  const predecessors = new Map<string, string[]>()
  for (const edge of edges) {
    if (!successors.has(edge.from)) successors.set(edge.from, [])
    if (!predecessors.has(edge.to)) predecessors.set(edge.to, [])
    successors.get(edge.from)!.push(edge.to)
    predecessors.get(edge.to)!.push(edge.from)
  }

  const sortedLayerNums = [...byLayer.keys()].sort((a, b) => a - b)

  /** Returns the barycenter of `id` relative to positions in `refLayer`. */
  function barycenter(
    _id: string,
    neighbours: string[],
    posOf: Map<string, number>,
  ): number {
    const refs = neighbours.filter((n) => posOf.has(n))
    if (refs.length === 0) return Infinity // no neighbours → keep at end
    return refs.reduce((sum, n) => sum + posOf.get(n)!, 0) / refs.length
  }

  for (let iter = 0; iter < iterations; iter++) {
    // Forward sweep: L=1..max, sort by predecessor barycenters in L-1
    for (let i = 1; i < sortedLayerNums.length; i++) {
      const prevLayerNum = sortedLayerNums[i - 1]
      const currLayerNum = sortedLayerNums[i]
      const prevIds = byLayer.get(prevLayerNum)!
      const currIds = byLayer.get(currLayerNum)!

      const posOf = new Map(prevIds.map((id, idx) => [id, idx]))
      currIds.sort((a, b) => {
        const ba = barycenter(a, predecessors.get(a) ?? [], posOf)
        const bb = barycenter(b, predecessors.get(b) ?? [], posOf)
        return ba - bb
      })
    }

    // Backward sweep: L=max-1..0, sort by successor barycenters in L+1
    for (let i = sortedLayerNums.length - 2; i >= 0; i--) {
      const nextLayerNum = sortedLayerNums[i + 1]
      const currLayerNum = sortedLayerNums[i]
      const nextIds = byLayer.get(nextLayerNum)!
      const currIds = byLayer.get(currLayerNum)!

      const posOf = new Map(nextIds.map((id, idx) => [id, idx]))
      currIds.sort((a, b) => {
        const ba = barycenter(a, successors.get(a) ?? [], posOf)
        const bb = barycenter(b, successors.get(b) ?? [], posOf)
        return ba - bb
      })
    }
  }
}

// ── Layer assignment ─────────────────────────────────────────────────────────

/**
 * Containment edges (deployed-in, secured-by) represent AWS resource hierarchy:
 * the container (VPC, subnet) should appear to the LEFT of the resources it holds.
 * For these edges we reverse the predecessor direction so the container ends up
 * at a lower layer number (leftmost column) instead of the rightmost.
 */
/** Relations where edge.to is the predecessor (provider/dependency precedes consumer).
 * 'deployed-in': container is placed left of contained resources.
 * 'secured-by': security resource is placed left of protected resources.
 * 'depends-on': dependency is placed left of the dependent (downstream consumer).
 */
const CONTAINMENT_RELATIONS = new Set<string>([
  'deployed-in',
  'secured-by',
  'depends-on',
])

/**
 * Assigns each node a layer using longest-path-from-source DP.
 *
 * For data-flow edges (from→to): from is placed BEFORE to.
 * For containment edges (from deployed-in to): to (the container) is placed
 * BEFORE from (the resource inside the container).
 */
function computeLayers(
  nodeIds: string[],
  edges: CloudEdge[],
): Map<string, number> {
  // predecessors[node] = list of nodes that must be placed before this node
  const predecessors = new Map<string, string[]>(nodeIds.map((id) => [id, []]))
  for (const edge of edges) {
    if (CONTAINMENT_RELATIONS.has(edge.relation)) {
      // Container (edge.to) is the predecessor: container goes left of contained
      predecessors.get(edge.from)?.push(edge.to)
    } else {
      predecessors.get(edge.to)?.push(edge.from)
    }
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
