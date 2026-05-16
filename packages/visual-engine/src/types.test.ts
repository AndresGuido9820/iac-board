import { describe, expect, it } from 'vitest'
import { toBoardElements } from './types'
import type { CanvasElementDraft } from '@iac-board/canvas-engine'
import type { CloudNode, CloudEdge } from '@iac-board/core-types'

const nodeDraft: CanvasElementDraft = {
  id: 'aws_lambda_function.handler',
  type: 'node',
  label: 'handler',
  x: 0,
  y: 0,
  width: 220,
  height: 92,
}

describe('toBoardElements', () => {
  it('uses node.kind and category when the node is in the graph', () => {
    const node: CloudNode = {
      id: 'aws_lambda_function.handler',
      kind: 'aws_lambda_function',
      label: 'handler',
      category: 'compute',
      source: { filePath: 'main.tf', line: 1 },
    } as CloudNode
    const elements = toBoardElements([nodeDraft], [node], [])
    const boardNode = elements.find((e) => e.type === 'node')
    expect(boardNode).toMatchObject({
      resourceType: 'aws_lambda_function',
      category: 'compute',
    })
    if (boardNode && boardNode.type === 'node') {
      expect(boardNode.sourceRef).toBe('main.tf:1')
    }
  })

  it('falls back to id prefix and unknown category when node is absent', () => {
    const elements = toBoardElements([nodeDraft], [], [])
    const boardNode = elements.find((e) => e.type === 'node')
    expect(boardNode).toMatchObject({
      resourceType: 'aws_lambda_function',
      category: 'unknown',
    })
    if (boardNode && boardNode.type === 'node') {
      expect(boardNode.sourceRef).toBeUndefined()
    }
  })

  it('falls back to source line 1 when node.source.line is undefined', () => {
    const node: CloudNode = {
      id: 'aws_lambda_function.handler',
      kind: 'aws_lambda_function',
      label: 'handler',
      category: 'compute',
      source: { filePath: 'main.tf' }, // no line
    } as unknown as CloudNode
    const elements = toBoardElements([nodeDraft], [node], [])
    const boardNode = elements.find((e) => e.type === 'node')
    if (boardNode && boardNode.type === 'node') {
      expect(boardNode.sourceRef).toBe('main.tf:1')
    }
  })

  it('maps edges to BoardEdge elements', () => {
    const edge: CloudEdge = {
      id: 'e1',
      from: 'a',
      to: 'b',
      relation: 'invokes',
      confidence: 'high',
    } as CloudEdge
    const elements = toBoardElements([], [], [edge])
    expect(elements).toHaveLength(1)
    expect(elements[0]).toMatchObject({ type: 'edge', from: 'a', to: 'b', relation: 'invokes' })
  })

  it('classifies group drafts as vpc or subnet', () => {
    const vpcDraft: CanvasElementDraft = {
      id: 'group:vpc:main',
      type: 'group',
      label: 'VPC main',
      x: 0,
      y: 0,
      width: 800,
      height: 400,
    }
    const subnetDraft: CanvasElementDraft = {
      id: 'group:subnet:private',
      type: 'group',
      label: 'Private subnet',
      x: 0,
      y: 0,
      width: 400,
      height: 200,
    }
    const elements = toBoardElements([vpcDraft, subnetDraft], [], [])
    const vpc = elements.find((e) => e.type === 'group' && e.id === 'group:vpc:main')
    const subnet = elements.find((e) => e.type === 'group' && e.id === 'group:subnet:private')
    expect(vpc).toMatchObject({ kind: 'vpc' })
    expect(subnet).toMatchObject({ kind: 'subnet' })
  })
})
