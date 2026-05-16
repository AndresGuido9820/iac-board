import { describe, expect, it } from 'vitest'
import { toCanvasElementDrafts } from '../src'

describe('toCanvasElementDrafts', () => {
  it('converts positioned graph nodes to canvas element drafts', () => {
    const drafts = toCanvasElementDrafts({
      nodes: [
        {
          id: 'aws_s3_bucket.assets',
          provider: 'aws',
          kind: 'aws_s3_bucket',
          label: 'assets',
          category: 'storage',
          metadata: {},
        },
      ],
      edges: [],
      groups: [],
      diagnostics: [],
      layout: {
        'aws_s3_bucket.assets': {
          x: 80,
          y: 80,
          width: 200,
          height: 96,
        },
      },
    })

    expect(drafts).toEqual([
      {
        id: 'aws_s3_bucket.assets',
        type: 'node',
        label: 'assets',
        x: 80,
        y: 80,
        width: 200,
        height: 96,
      },
    ])
  })

  it('fails when positioned graph nodes are missing layout data', () => {
    expect(() =>
      toCanvasElementDrafts({
        nodes: [
          {
            id: 'aws_s3_bucket.assets',
            provider: 'aws',
            kind: 'aws_s3_bucket',
            label: 'assets',
            category: 'storage',
            metadata: {},
          },
        ],
        edges: [],
        groups: [],
        diagnostics: [],
        layout: {},
      }),
    ).toThrow('Missing layout for node aws_s3_bucket.assets')
  })
})
