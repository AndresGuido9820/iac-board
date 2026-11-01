// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { listExampleProjects } from '../src'

const repoRoot = resolve(import.meta.dirname, '../../..')

describe('examples/terraform files', () => {
  const files = listExampleProjects().flatMap((example) => example.files)

  it.each(files.map((file) => [file.path, file.content]))(
    '%s matches the bundled example',
    (path, content) => {
      expect(readFileSync(resolve(repoRoot, path), 'utf8')).toBe(content)
    },
  )
})
