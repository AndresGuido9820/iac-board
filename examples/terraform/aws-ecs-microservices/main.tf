# ── Network ────────────────────────────────────────────────────────────────
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true
}

resource "aws_subnet" "private" {
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

resource "aws_security_group" "tasks" {
  name   = "ecs-tasks-sg"
  vpc_id = aws_vpc.main.id
}

# ── CDN + Load balancer ─────────────────────────────────────────────────────
resource "aws_s3_bucket" "assets" {
  bucket = "app-static-assets"
}

resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = aws_lb.frontend.dns_name
    origin_id   = "alb-origin"
  }
  origin {
    domain_name = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id   = "s3-assets"
  }
  enabled = true
}

resource "aws_lb" "frontend" {
  name               = "app-alb"
  load_balancer_type = "application"
  subnets            = [aws_subnet.public.id]
  security_groups    = [aws_security_group.alb.id]
}

resource "aws_lb_target_group" "backend" {
  name        = "backend-tg"
  port        = 8080
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = aws_vpc.main.id
}

# ── ECS compute ─────────────────────────────────────────────────────────────
resource "aws_ecs_cluster" "app" {
  name = "app-cluster"
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "backend-task"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn
  db_endpoint              = aws_rds_cluster.db.endpoint
  cache_endpoint           = aws_elasticache_replication_group.cache.primary_endpoint_address
  secret_arn               = aws_secretsmanager_secret.db_password.arn
}

resource "aws_ecs_service" "backend" {
  name            = "backend-service"
  cluster         = aws_ecs_cluster.app.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 2

  network_configuration {
    subnets         = [aws_subnet.private.id]
    security_groups = [aws_security_group.tasks.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 8080
  }
}

# ── IAM ──────────────────────────────────────────────────────────────────────
resource "aws_iam_role" "ecs_execution" {
  name               = "ecs-execution-role"
  assume_role_policy = "{}"
}

resource "aws_iam_role" "ecs_task" {
  name               = "ecs-task-role"
  assume_role_policy = "{}"
}

# ── Data layer ───────────────────────────────────────────────────────────────
resource "aws_rds_cluster" "db" {
  cluster_identifier     = "app-db"
  engine                 = "aurora-postgresql"
  master_username        = "admin"
  master_password        = aws_secretsmanager_secret.db_password.name
  vpc_security_group_ids = [aws_security_group.tasks.id]
}

resource "aws_elasticache_replication_group" "cache" {
  replication_group_id = "app-cache"
  description          = "Session cache"
  node_type            = "cache.t3.micro"
  num_cache_clusters   = 2
}

# ── Auth + Secrets ───────────────────────────────────────────────────────────
resource "aws_cognito_user_pool" "users" {
  name = "app-users"
}

resource "aws_secretsmanager_secret" "db_password" {
  name = "app/db/password"
}
