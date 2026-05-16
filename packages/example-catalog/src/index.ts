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
    'API Gateway, Lambda, IAM, and DynamoDB — a complete serverless REST backend.',
  userStoryIds: ['HU-002', 'HU-005'],
  files: [
    {
      path: 'examples/terraform/aws-serverless-api/main.tf',
      content: `resource "aws_iam_role" "lambda_exec" {
  name               = "lambda-exec-role"
  assume_role_policy = "{}"
}

resource "aws_dynamodb_table" "sessions" {
  name         = "sessions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"
}

resource "aws_lambda_function" "handler" {
  function_name = "api-handler"
  role          = aws_iam_role.lambda_exec.arn

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.sessions.name
    }
  }
}

resource "aws_api_gateway_rest_api" "public_api" {
  name            = "public-api"
  integration_uri = aws_lambda_function.handler.invoke_arn
}
`,
    },
  ],
}

const awsIotPipeline: ExampleProject = {
  id: 'aws-iot-pipeline',
  name: 'AWS IoT Pipeline',
  description:
    'IoT Core → Kinesis → Lambda → S3 → Glue → Athena event ingestion and analytics pipeline.',
  userStoryIds: ['HU-002', 'HU-007'],
  files: [
    {
      path: 'examples/terraform/aws-iot-pipeline/main.tf',
      content: `resource "aws_iot_topic_rule" "telemetry_ingest" {
  name           = "telemetry-ingest"
  kinesis_stream = aws_kinesis_stream.telemetry_events.arn
}

resource "aws_kinesis_stream" "telemetry_events" {
  name        = "telemetry-events"
  shard_count = 1
}

resource "aws_lambda_event_source_mapping" "kinesis_trigger" {
  event_source_arn  = aws_kinesis_stream.telemetry_events.arn
  function_name     = aws_lambda_function.normalizer.arn
  starting_position = "LATEST"
}

resource "aws_lambda_function" "normalizer" {
  function_name = "telemetry-normalizer"
  output_bucket = aws_s3_bucket.data_lake.bucket
  glue_database = aws_glue_catalog_database.telemetry_catalog.name
}

resource "aws_s3_bucket" "data_lake" {
  bucket = "iac-board-telemetry-lake"
}

resource "aws_glue_catalog_database" "telemetry_catalog" {
  name = "telemetry_catalog"
}

resource "aws_athena_workgroup" "analytics" {
  name                  = "telemetry-analytics"
  glue_catalog_database = aws_glue_catalog_database.telemetry_catalog.name
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
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
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
  name   = "database-access"
  vpc_id = aws_vpc.main.id
}

resource "aws_db_subnet_group" "database" {
  name       = "database-subnets"
  subnet_ids = [aws_subnet.private.id]
}

resource "aws_db_instance" "primary" {
  identifier             = "primary-db"
  db_subnet_group_name   = aws_db_subnet_group.database.name
  vpc_security_group_ids = [aws_security_group.database.id]
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
