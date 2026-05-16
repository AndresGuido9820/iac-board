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

  it('converts positioned graph groups before node drafts', () => {
    const drafts = toCanvasElementDrafts({
      nodes: [
        {
          id: 'aws_vpc.main',
          provider: 'aws',
          kind: 'aws_vpc',
          label: 'main',
          category: 'network',
          metadata: {},
        },
      ],
      edges: [],
      groups: [
        {
          id: 'group:vpc:aws_vpc.main',
          label: 'VPC main',
          kind: 'vpc',
          children: ['aws_vpc.main'],
          metadata: {},
        },
      ],
      diagnostics: [],
      layout: {
        'aws_vpc.main': {
          x: 80,
          y: 80,
          width: 200,
          height: 96,
        },
        'group:vpc:aws_vpc.main': {
          x: 48,
          y: 40,
          width: 264,
          height: 176,
        },
      },
    })

    expect(drafts[0]).toEqual({
      id: 'group:vpc:aws_vpc.main',
      type: 'group',
      label: 'VPC main',
      x: 48,
      y: 40,
      width: 264,
      height: 176,
    })
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

  it('fails when positioned graph groups are missing layout data', () => {
    expect(() =>
      toCanvasElementDrafts({
        nodes: [],
        edges: [],
        groups: [
          {
            id: 'group:vpc:aws_vpc.main',
            label: 'VPC main',
            kind: 'vpc',
            children: [],
            metadata: {},
          },
        ],
        diagnostics: [],
        layout: {},
      }),
    ).toThrow('Missing layout for group group:vpc:aws_vpc.main')
  })
})
