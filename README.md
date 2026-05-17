# IaC Board

> Generate interactive AWS architecture diagrams directly from Terraform files — no cloud execution required.

IaC Board parses `.tf` files, builds a cloud resource graph, lays it out automatically, and renders it as an interactive SVG diagram. No Terraform plan, no cloud credentials, no drift.

## Demo

Drop any `.tf` file — or use one of the bundled examples — and get an interactive diagram in seconds.

**Features:**
- Drag-and-drop or browse `.tf` / `.tfvars` files from your local machine
- 4 bundled example projects (Serverless API, IoT Pipeline, VPC + RDS, ECS Microservices)
- Interactive diagram: pan, zoom, node drag, keyboard navigation (arrow keys)
- Node inspector: click any resource to see type, category, source file, and connection count
- Minimap for large diagrams
- Edge legend with relationship types
- Export as SVG or PNG (2× resolution)
- EN / ES interface

## Pipeline

```
.tf files → HCL lexer + parser → resource extractor → cloud graph
         → layout engine (Sugiyama + force) → canvas drafts → SVG diagram
```

## Supported AWS Resources

| Category | Resources |
|---|---|
| Compute | `aws_lambda_function`, `aws_ecs_cluster`, `aws_ecs_service`, `aws_ecs_task_definition`, `aws_eks_cluster`, `aws_autoscaling_group`, `aws_instance` |
| Network | `aws_vpc`, `aws_subnet`, `aws_internet_gateway`, `aws_nat_gateway`, `aws_lb` / `aws_alb`, `aws_cloudfront_distribution`, `aws_route53_zone` |
| Storage | `aws_s3_bucket`, `aws_s3_object` |
| Database | `aws_db_instance`, `aws_rds_cluster`, `aws_dynamodb_table`, `aws_elasticache_cluster`, `aws_elasticache_replication_group`, `aws_redshift_cluster` |
| Integration | `aws_api_gateway_rest_api`, `aws_sqs_queue`, `aws_sns_topic`, `aws_kinesis_stream`, `aws_kinesis_firehose_delivery_stream`, `aws_eventbridge_rule` |
| Security | `aws_iam_role`, `aws_iam_policy`, `aws_security_group`, `aws_cognito_user_pool`, `aws_secretsmanager_secret`, `aws_kms_key` |
| AI/ML | `aws_sagemaker_endpoint`, `aws_sagemaker_model` |
| IoT | `aws_iot_topic_rule` |

Resources not in the table are still rendered with an inferred category.

## Quick Start

```bash
git clone https://github.com/AndresGuido9820/iac-board
cd iac-board
npm install
npm run dev
```

Open `http://localhost:5173`.

## Running Tests

```bash
npm test
```

99 tests across 14 test files — unit + integration.

## Project Structure

```
apps/web/                  # React app (Vite)
packages/
  terraform-parser/        # HCL lexer, parser, resource extractor
  cloud-graph/             # Resource → CloudNode, edge inference
  layout-engine/           # Sugiyama + force layout, group placement
  canvas-engine/           # Layout → canvas element drafts
  visual-engine/           # React SVG renderer (CloudBoard)
  pipeline/                # Orchestrates parser → graph → layout → canvas
  example-catalog/         # Bundled .tf example projects
  core-types/              # Shared TypeScript types + Zod schemas
```

## Architecture

The diagram pipeline is fully client-side. No server, no cloud calls.

```
TerraformFile[]
  │
  ▼ terraform-parser
TerraformParseResult { resources, diagnostics }
  │
  ▼ cloud-graph
CloudGraph { nodes, edges, groups }
  │
  ▼ layout-engine
PositionedGraph { layout (x/y/w/h per node/group) }
  │
  ▼ canvas-engine
CanvasElementDraft[]
  │
  ▼ visual-engine (CloudBoard)
Interactive SVG diagram
```

## Contributing

See [docs/git-workflow.md](docs/git-workflow.md) for branch conventions and [docs/product/user-stories.md](docs/product/user-stories.md) for the backlog.

## License

MIT
