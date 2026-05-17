import { describe, expect, it } from 'vitest'
import { getExampleProject, listExampleProjects } from '../src'

describe('example catalog', () => {
  it('lists example projects for HU-002', () => {
    const examples = listExampleProjects()

    expect(examples).toHaveLength(5)
    expect(examples.map((example) => example.id)).toEqual([
      'aws-serverless-api',
      'aws-iot-pipeline',
      'aws-vpc-rds',
      'aws-ecs-microservices',
      'aws-modular-app',
    ])
    expect(examples[0]).toMatchObject({
      id: 'aws-serverless-api',
      userStoryIds: ['HU-002', 'HU-005'],
    })
    expect(
      examples.every((example) =>
        example.files.every((file) => file.path.endsWith('.tf')),
      ),
    ).toBe(true)
  })

  it('loads examples by id', () => {
    const example = getExampleProject('aws-serverless-api')

    expect(example.name).toBe('AWS Serverless API')
  })

  it('loads the ECS microservices example', () => {
    const example = getExampleProject('aws-ecs-microservices')

    expect(example.name).toBe('AWS ECS Microservices')
    expect(example.userStoryIds).toContain('HU-036')
  })

  it('fails on unknown examples', () => {
    expect(() => getExampleProject('missing')).toThrow(
      'Unknown example project: missing',
    )
  })
})
