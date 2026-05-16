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

const awsIotPipeline: ExampleProject = {
  id: 'aws-iot-pipeline',
  name: 'AWS IoT Pipeline',
  description:
    'IoT Core, Kinesis, Lambda, S3, Glue, and Athena example for event ingestion and analytics.',
  userStoryIds: ['HU-002', 'HU-007'],
  files: [
    {
      path: 'examples/terraform/aws-iot-pipeline/main.tf',
      content: `resource "aws_iot_topic_rule" "telemetry_ingest" {
  name = "telemetry-ingest"
}

resource "aws_kinesis_stream" "telemetry_events" {
  name = "telemetry-events"
}

resource "aws_lambda_function" "normalizer" {
  function_name = "telemetry-normalizer"
}

resource "aws_s3_bucket" "data_lake" {
  bucket = "iac-board-telemetry-lake"
}

resource "aws_glue_catalog_database" "telemetry_catalog" {
  name = "telemetry_catalog"
}

resource "aws_athena_workgroup" "analytics" {
  name = "telemetry-analytics"
}
`,
    },
  ],
}

const awsVpcRds: ExampleProject = {
  id: 'aws-vpc-rds',
  name: 'AWS VPC + RDS',
  description:
    'VPC, public/private subnets, gateways, security group, and RDS example for network topology.',
  userStoryIds: ['HU-002', 'HU-006'],
  files: [
    {
      path: 'examples/terraform/aws-vpc-rds/main.tf',
      content: `resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public" {
  vpc_id = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}

resource "aws_subnet" "private" {
  vpc_id = aws_vpc.main.id
  cidr_block = "10.0.2.0/24"
}

resource "aws_internet_gateway" "edge" {
  vpc_id = aws_vpc.main.id
}

resource "aws_nat_gateway" "egress" {
  subnet_id = aws_subnet.public.id
}

resource "aws_security_group" "database" {
  name = "database-access"
}

resource "aws_db_instance" "primary" {
  identifier = "primary-db"
}
`,
    },
  ],
}

export const exampleProjects = [
  awsServerlessApi,
  awsIotPipeline,
  awsVpcRds,
] as const

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
