import { describe, expect, it } from 'vitest'
import {
  cloudGraphSchema,
  documentVersion,
  iacBoardDocumentSchema,
} from '../src'

describe('core schemas', () => {
  it('validates a minimal cloud graph', () => {
    const graph = cloudGraphSchema.parse({
      nodes: [
        {
          id: 'aws_lambda_function.api',
          provider: 'aws',
          kind: 'aws_lambda_function',
          label: 'api',
          category: 'compute',
        },
      ],
      edges: [],
    })

    expect(graph.diagnostics).toEqual([])
    expect(graph.nodes[0]?.metadata).toEqual({})
  })

  it('validates versioned documents', () => {
    const document = iacBoardDocumentSchema.parse({
      version: documentVersion,
      source: {
        type: 'example',
        name: 'aws-serverless-api',
        scannedAt: '2026-05-16T00:00:00.000Z',
      },
      graph: {
        nodes: [],
        edges: [],
      },
      layout: {},
    })

    expect(document.version).toBe(1)
  })
})
