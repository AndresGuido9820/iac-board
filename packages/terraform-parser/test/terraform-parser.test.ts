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

  it('keeps each resource body separate', () => {
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

  it('extracts refs from resource references', () => {
    const result = parseTerraformFiles([
      {
        path: 'main.tf',
        content: `resource "aws_iam_role" "role" {
  name = "role"
}

resource "aws_lambda_function" "api" {
  role = aws_iam_role.role.arn
}
`,
      },
    ])

    expect(result.resources).toHaveLength(2)
    const lambda = result.resources.find(
      (r) => r.address === 'aws_lambda_function.api',
    )
    expect(lambda?.refs).toContain('aws_iam_role.role')
  })

  it('resolves variable defaults in resource attributes', () => {
    const result = parseTerraformFiles([
      {
        path: 'main.tf',
        content: `variable "bucket_name" {
  default = "my-bucket"
}

resource "aws_s3_bucket" "main" {
  bucket = var.bucket_name
}
`,
      },
    ])

    expect(result.resources).toHaveLength(1)
    expect(result.resources[0]?.body).toContain('my-bucket')
  })

  it('resolves locals in resource attributes', () => {
    const result = parseTerraformFiles([
      {
        path: 'main.tf',
        content: `locals {
  env = "prod"
}

resource "aws_s3_bucket" "main" {
  bucket = local.env
}
`,
      },
    ])

    expect(result.resources[0]?.body).toContain('prod')
  })

  it('resolves string interpolation with var and local', () => {
    const result = parseTerraformFiles([
      {
        path: 'main.tf',
        content: `variable "prefix" {
  default = "sento"
}

resource "aws_s3_bucket" "main" {
  bucket = "\${var.prefix}-assets"
}
`,
      },
    ])

    expect(result.resources[0]?.body).toContain('sento-assets')
  })

  it('handles nested blocks inside resources', () => {
    const result = parseTerraformFiles([
      {
        path: 'main.tf',
        content: `resource "aws_lambda_function" "api" {
  function_name = "api"
  environment {
    variables = {
      ENV = "prod"
    }
  }
}
`,
      },
    ])

    expect(result.resources).toHaveLength(1)
    expect(result.resources[0]?.body).toContain('environment')
    expect(result.resources[0]?.body).toContain('ENV')
  })

  it('extracts data sources with data. address prefix', () => {
    const result = parseTerraformFiles([
      {
        path: 'main.tf',
        content: `data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "main" {
  bucket = "assets"
}
`,
      },
    ])

    const dataSrc = result.resources.find(
      (r) => r.address === 'data.aws_caller_identity.current',
    )
    expect(dataSrc).toBeDefined()
    expect(dataSrc?.type).toBe('data.aws_caller_identity')
  })

  it('emits TF003 diagnostic for local modules', () => {
    const result = parseTerraformFiles([
      {
        path: 'main.tf',
        content: `module "vpc" {
  source = "./modules/vpc"
}
`,
      },
    ])

    expect(result.diagnostics).toMatchObject([
      { code: 'TF003', severity: 'info' },
    ])
  })

  it('emits TF004 diagnostic for remote modules', () => {
    const result = parseTerraformFiles([
      {
        path: 'main.tf',
        content: `module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
}
`,
      },
    ])

    expect(result.diagnostics).toMatchObject([
      { code: 'TF004', severity: 'info' },
    ])
  })

  it('parses multiple resources across multiple files', () => {
    const result = parseTerraformFiles([
      {
        path: 'network.tf',
        content: `resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}
`,
      },
      {
        path: 'compute.tf',
        content: `resource "aws_instance" "web" {
  vpc_id = aws_vpc.main.id
}
`,
      },
    ])

    expect(result.resources).toHaveLength(2)
    const instance = result.resources.find(
      (r) => r.address === 'aws_instance.web',
    )
    expect(instance?.refs).toContain('aws_vpc.main')
    expect(instance?.source.filePath).toBe('compute.tf')
  })

  it('handles heredoc values', () => {
    const result = parseTerraformFiles([
      {
        path: 'main.tf',
        content: `resource "aws_iam_policy" "policy" {
  policy = <<EOF
{"Version":"2012-10-17"}
EOF
}
`,
      },
    ])

    expect(result.resources).toHaveLength(1)
    expect(result.resources[0]?.body).toContain('Version')
  })

  it('does not include self-reference in refs', () => {
    const result = parseTerraformFiles([
      {
        path: 'main.tf',
        content: `resource "aws_s3_bucket" "main" {
  id = aws_s3_bucket.main.id
}
`,
      },
    ])

    expect(result.resources[0]?.refs).not.toContain('aws_s3_bucket.main')
  })
})
