import { describe, expect, it } from 'vitest'
import { getExampleProject, listExampleProjects } from '../src'

describe('example catalog', () => {
  it('lists example projects for HU-002', () => {
    const examples = listExampleProjects()

    expect(examples.length).toBeGreaterThan(0)
    expect(examples[0]).toMatchObject({
      id: 'aws-serverless-api',
      userStoryIds: ['HU-002', 'HU-005'],
    })
    expect(examples[0]?.files.every((file) => file.path.endsWith('.tf'))).toBe(
      true,
    )
  })

  it('loads examples by id', () => {
    const example = getExampleProject('aws-serverless-api')

    expect(example.name).toBe('AWS Serverless API')
  })

  it('fails on unknown examples', () => {
    expect(() => getExampleProject('missing')).toThrow(
      'Unknown example project: missing',
    )
  })
})
