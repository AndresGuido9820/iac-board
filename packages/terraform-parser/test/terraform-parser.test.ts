import { describe, expect, it } from 'vitest'
import { parseTerraformFiles } from '../src'

describe('parseTerraformFiles', () => {
  it('extracts Terraform resources without executing Terraform', () => {
    const result = parseTerraformFiles([
      {
        path: 'main.tf',
        content: `resource "aws_lambda_function" "api" {
  function_name = "api"
}
`,
      },
    ])

    expect(result.resources).toMatchObject([
      {
        address: 'aws_lambda_function.api',
        type: 'aws_lambda_function',
        name: 'api',
        source: { filePath: 'main.tf', line: 1 },
      },
    ])
    expect(result.diagnostics).toEqual([])
  })

  it('reports skipped non-Terraform files', () => {
    const result = parseTerraformFiles([
      {
        path: 'README.md',
        content: '# docs',
      },
    ])

    expect(result.resources).toEqual([])
    expect(result.diagnostics).toMatchObject([
      {
        code: 'TF001',
        severity: 'info',
        source: { filePath: 'README.md' },
      },
    ])
  })

  it('keeps each resource body bounded by the next resource block', () => {
    const result = parseTerraformFiles([
      {
        path: 'main.tf',
        content: `resource "aws_s3_bucket" "assets" {
  bucket = "assets"
}

resource "aws_lambda_function" "api" {}
`,
      },
    ])

    expect(result.resources).toHaveLength(2)
    expect(result.resources[0]?.body).toContain('bucket = "assets"')
    expect(result.resources[0]?.body).not.toContain('aws_lambda_function')
  })
})
