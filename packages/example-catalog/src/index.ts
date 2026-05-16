import type { TerraformFile } from '@iac-board/terraform-parser'

export type ExampleProject = {
  id: string
  name: string
  description: string
  userStoryIds: string[]
  files: TerraformFile[]
}

const awsServerlessApi: ExampleProject = {
  id: 'aws-serverless-api',
  name: 'AWS Serverless API',
  description:
    'API Gateway, Lambda, and DynamoDB example for the first Terraform diagram pipeline.',
  userStoryIds: ['HU-002', 'HU-005'],
  files: [
    {
      path: 'examples/terraform/aws-serverless-api/main.tf',
      content: `resource "aws_api_gateway_rest_api" "public_api" {
  name = "public-api"
}

resource "aws_lambda_function" "handler" {
  function_name = "handler"
}

resource "aws_dynamodb_table" "sessions" {
  name = "sessions"
}
`,
    },
  ],
}

export const exampleProjects = [awsServerlessApi] as const

export function listExampleProjects(): ExampleProject[] {
  return [...exampleProjects]
}

export function getExampleProject(id: string): ExampleProject {
  const example = exampleProjects.find((project) => project.id === id)
  if (!example) {
    throw new Error(`Unknown example project: ${id}`)
  }
  return example
}
