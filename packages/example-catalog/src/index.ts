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


const awsEcsMicroservices: ExampleProject = {
  id: 'aws-ecs-microservices',
  name: 'AWS ECS Microservices',
  description:
    'ECS Fargate cluster with ALB, CloudFront CDN, RDS Aurora, ElastiCache, Cognito auth, and Secrets Manager — a production-grade web app stack.',
  userStoryIds: ['HU-036'],
  files: [
    {
      path: 'examples/terraform/aws-ecs-microservices/main.tf',
      content: `resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true
}

resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = "us-east-1a"
}

resource "aws_internet_gateway" "edge" {
  vpc_id = aws_vpc.main.id
}

resource "aws_security_group" "alb" {
  name   = "alb-sg"
  vpc_id = aws_vpc.main.id
}

resource "aws_security_group" "ecs_tasks" {
  name   = "ecs-tasks-sg"
  vpc_id = aws_vpc.main.id
}

resource "aws_lb" "api" {
  name               = "api-alb"
  load_balancer_type = "application"
  subnets            = [aws_subnet.public_a.id]
  security_groups    = [aws_security_group.alb.id]
}

resource "aws_lb_target_group" "api" {
  name     = "api-tg"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
}

resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = aws_lb.api.dns_name
    origin_id   = "alb-origin"
  }
  enabled = true
}

resource "aws_ecs_cluster" "app" {
  name = "app-cluster"
}

resource "aws_ecs_task_definition" "api" {
  family                   = "api-task"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn
}

resource "aws_ecs_service" "api" {
  name            = "api-service"
  cluster         = aws_ecs_cluster.app.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 2

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8080
  }
}

resource "aws_iam_role" "ecs_execution" {
  name               = "ecs-execution-role"
  assume_role_policy = "{}"
}

resource "aws_iam_role" "ecs_task" {
  name               = "ecs-task-role"
  assume_role_policy = "{}"
}

resource "aws_rds_cluster" "db" {
  cluster_identifier     = "app-db"
  engine                 = "aurora-postgresql"
  master_username        = "admin"
  master_password        = aws_secretsmanager_secret.db_password.arn
  vpc_security_group_ids = [aws_security_group.ecs_tasks.id]
}

resource "aws_elasticache_replication_group" "cache" {
  replication_group_id = "app-cache"
  description          = "App session cache"
  node_type            = "cache.t3.micro"
  num_cache_clusters   = 2
}

resource "aws_cognito_user_pool" "users" {
  name = "app-users"
}

resource "aws_secretsmanager_secret" "db_password" {
  name = "app/db/password"
}

resource "aws_s3_bucket" "assets" {
  bucket = "app-static-assets"
}
`,
    },
  ],
}

export const exampleProjects = [
  awsServerlessApi,
  awsIotPipeline,
  awsVpcRds,
  awsEcsMicroservices,
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
