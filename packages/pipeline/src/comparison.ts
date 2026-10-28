import type { CloudGraph } from '@iac-board/core-types'
import { layoutCloudGraph } from '@iac-board/layout-engine'
import { toCanvasElementDrafts } from '@iac-board/canvas-engine'
import type { DiagramPipelineResult } from './index'

export type ChangeStatus = 'added' | 'removed' | 'changed' | 'unchanged'
export type ResourceChange = {
  id: string
  status: ChangeStatus
  reasons: ('configuration' | 'connections' | 'groups')[]
  before?: string
  after?: string
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

function connections(graph: CloudGraph, id: string): string {
  return stable(
    graph.edges
      .filter((e) => e.from === id || e.to === id)
      .map((e) => [e.from, e.to, e.relation])
      .sort(),
  )
}

function groups(graph: CloudGraph, id: string): string {
  return stable(
    graph.groups
      .filter((g) => g.children.includes(id))
      .map((g) => g.id)
      .sort(),
  )
}

/** Compare parsed configurations, not layout or source line numbers. No Terraform execution. */
export function compareArchitectures(
  before: DiagramPipelineResult,
  after: DiagramPipelineResult,
) {
  const oldResources = new Map(
    before.parsed.resources.map((r) => [r.address, r]),
  )
  const newResources = new Map(
    after.parsed.resources.map((r) => [r.address, r]),
  )
  const oldNodes = new Map(before.graph.nodes.map((n) => [n.id, n]))
  const newNodes = new Map(after.graph.nodes.map((n) => [n.id, n]))
  const ids = [...new Set([...oldNodes.keys(), ...newNodes.keys()])].sort()
  const changes: ResourceChange[] = ids.map((id) => {
    const old = oldResources.get(id)
    const next = newResources.get(id)
    const reasons: ResourceChange['reasons'] = []
    if (oldNodes.has(id) && newNodes.has(id)) {
      if (
        stable(old?.metadata?.configuration ?? old?.body) !==
        stable(next?.metadata?.configuration ?? next?.body)
      )
        reasons.push('configuration')
      if (connections(before.graph, id) !== connections(after.graph, id))
        reasons.push('connections')
      if (groups(before.graph, id) !== groups(after.graph, id))
        reasons.push('groups')
    }
    return {
      id,
      status: !oldNodes.has(id)
        ? 'added'
        : !newNodes.has(id)
          ? 'removed'
          : reasons.length
            ? 'changed'
            : 'unchanged',
      reasons,
      before: old
        ? old.body || JSON.stringify(old.metadata?.configuration, null, 2)
        : undefined,
      after: next
        ? next.body || JSON.stringify(next.metadata?.configuration, null, 2)
        : undefined,
    }
  })
  // Keep removed resources and connections visible alongside the current graph.
  const graph: CloudGraph = {
    nodes: ids.map((id) => (newNodes.get(id) ?? oldNodes.get(id))!),
    edges: [
      ...new Map(
        [...before.graph.edges, ...after.graph.edges].map((e) => [e.id, e]),
      ).values(),
    ],
    groups: [
      ...new Set(
        [...before.graph.groups, ...after.graph.groups].map((g) => g.id),
      ),
    ].map((id) => {
      const old = before.graph.groups.find((g) => g.id === id)
      const next = after.graph.groups.find((g) => g.id === id)
      return {
        ...(next ?? old)!,
        children: [
          ...new Set([...(old?.children ?? []), ...(next?.children ?? [])]),
        ],
      }
    }),
    diagnostics: [],
  }
  const positioned = layoutCloudGraph(graph)
  return {
    changes,
    graph,
    drafts: toCanvasElementDrafts(positioned),
    summary: Object.fromEntries(
      (['added', 'removed', 'changed', 'unchanged'] as const).map((status) => [
        status,
        changes.filter((c) => c.status === status).length,
      ]),
    ) as Record<ChangeStatus, number>,
  }
}
