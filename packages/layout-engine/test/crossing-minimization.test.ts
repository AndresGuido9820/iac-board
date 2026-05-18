import { describe, expect, it } from 'vitest'
import { layoutCloudGraph } from '../src'
import type { CloudGraph } from '@iac-board/core-types'

function node(id: string, category = 'compute') {
  return {
    id,
    provider: 'aws' as const,
    kind: id,
    label: id,
    category,
    metadata: {},
  }
}

function edge(from: string, to: string) {
  return {
    id: `${from}->${to}`,
    from,
    to,
    relation: 'connects' as const,
    confidence: 'inferred' as const,
    metadata: {},
  }
}

describe('barycentre crossing minimisation', () => {
  it('produces zero crossings for a linear chain A→B→C→D', () => {
    const graph: CloudGraph = {
      nodes: [node('A'), node('B'), node('C'), node('D')],
      edges: [edge('A', 'B'), edge('B', 'C'), edge('C', 'D')],
      groups: [],
      diagnostics: [],
    }
    const positioned = layoutCloudGraph(graph)

    // Linear chain must be in strictly increasing x order
    const xA = positioned.layout['A']!.x
    const xB = positioned.layout['B']!.x
    const xC = positioned.layout['C']!.x
    const xD = positioned.layout['D']!.x
    expect(xA).toBeLessThan(xB)
    expect(xB).toBeLessThan(xC)
    expect(xC).toBeLessThan(xD)
  })

  it('minimizes crossings for a bipartite graph', () => {
    // Layer 0: [top0, bot0]   Layer 1: [top1, bot1]
    // Crossing layout: top0→bot1, bot0→top1
    // After barycenter: should swap so top0→top1, bot0→bot1 (no crossing)
    const graph: CloudGraph = {
      nodes: [node('top0'), node('bot0'), node('top1'), node('bot1')],
      edges: [edge('top0', 'top1'), edge('bot0', 'bot1')],
      groups: [],
      diagnostics: [],
    }
    const positioned = layoutCloudGraph(graph)

    // top0 and top1 share an edge → they should be at similar y positions
    // bot0 and bot1 share an edge → they should be at similar y positions
    const yTop0 = positioned.layout['top0']!.y
    const yTop1 = positioned.layout['top1']!.y
    const yBot1 = positioned.layout['bot1']!.y

    // Connected pairs should be on the same side (top/bottom)
    // top0-top1 should be closer to each other than top0-bot1
    const sameEdgeDist = Math.abs(yTop0 - yTop1)
    const crossEdgeDist = Math.abs(yTop0 - yBot1)
    expect(sameEdgeDist).toBeLessThanOrEqual(crossEdgeDist)
  })

  it('produces deterministic output for the same input', () => {
    const graph: CloudGraph = {
      nodes: [node('A'), node('B'), node('C'), node('D'), node('E')],
      edges: [edge('A', 'C'), edge('A', 'D'), edge('B', 'D'), edge('B', 'E')],
      groups: [],
      diagnostics: [],
    }

    const r1 = layoutCloudGraph(graph)
    const r2 = layoutCloudGraph(graph)

    for (const id of ['A', 'B', 'C', 'D', 'E']) {
      expect(r1.layout[id]).toEqual(r2.layout[id])
    }
  })

  it('handles disconnected components without errors', () => {
    const graph: CloudGraph = {
      nodes: [node('X1'), node('X2'), node('Y1'), node('Y2')],
      edges: [edge('X1', 'X2')],
      // Y1 and Y2 are completely disconnected
      groups: [],
      diagnostics: [],
    }

    expect(() => layoutCloudGraph(graph)).not.toThrow()
    const positioned = layoutCloudGraph(graph)

    // All nodes must have valid positions
    for (const id of ['X1', 'X2', 'Y1', 'Y2']) {
      expect(positioned.layout[id]).toBeDefined()
      expect(typeof positioned.layout[id]!.x).toBe('number')
      expect(typeof positioned.layout[id]!.y).toBe('number')
    }
  })

  it('handles a single-layer graph (no sweeps needed)', () => {
    const graph: CloudGraph = {
      nodes: [node('A'), node('B'), node('C')],
      edges: [],
      groups: [],
      diagnostics: [],
    }

    expect(() => layoutCloudGraph(graph)).not.toThrow()
    const positioned = layoutCloudGraph(graph)
    // All three in layer 0 → same x
    const x = positioned.layout['A']!.x
    expect(positioned.layout['B']!.x).toBe(x)
    expect(positioned.layout['C']!.x).toBe(x)
  })
})
