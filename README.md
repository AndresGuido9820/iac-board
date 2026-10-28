# IaC Board

> Generate interactive AWS architecture diagrams directly from Terraform files — no cloud execution required.

IaC Board parses `.tf` files, builds a semantic cloud resource graph, lays it out automatically with a Sugiyama-style algorithm, and renders an interactive SVG diagram. Works fully in the browser. No Terraform plan, no cloud credentials, no drift.

---

## Features

- **Zero-execution parsing** — reads `.tf` and `.tfvars` files as text; never calls `terraform` or any cloud API
- **`terraform show -json` mode** — import a plan JSON for exact dependency edges (no inference)
- **5 bundled examples** — Serverless API, IoT Pipeline, VPC + RDS, ECS Microservices, Modular App
- **Interactive SVG canvas** — pan, zoom, drag nodes, keyboard navigation (arrow keys)
- **Node inspector** — click any resource to see type, category, source file reference, and edge count
- **Group containers** — VPCs and subnets rendered as visual boundaries with constrained layout
- **Smart edge routing** — bezier paths arc around intermediate nodes and group boundaries
- **Edge labels** — toggleable relation labels (triggers, invokes, writes to, uses role, ...)
- **Minimap** — thumbnail overview for large diagrams
- **Export** — SVG (lossless) and PNG (2x resolution)
- **Save / load layout** — positions persist in `.iac-board.json`; load a saved file to restore a layout
- **Architecture comparison** — pin a baseline or load previous `.tf` / plan JSON files, inspect added/modified/removed resources in a combined diagram, and export a value-free JSON summary
- **Parser diagnostics** — unsupported resources surface with file and line references
- **EN / ES interface** — full bilingual UI

---

## Quick Start

```bash
git clone https://github.com/AndresGuido9820/iac-board
cd iac-board
npm install
npm run dev
```

Open **http://localhost:5173**.

Drop any `.tf` file onto the import zone, or click one of the bundled example buttons to get a diagram immediately.

---

## Compare two versions

1. Load the previous `.tf` files using the import zone, then choose **Use current as baseline**. Alternatively, choose **Load baseline files** to select previous `.tf` files or one plan JSON.
2. Import the updated version in the main import zone. The baseline remains fixed while the current diagram changes.
3. Review the `+ Added`, `~ Modified`, and `− Removed` cards and node markers. Removed nodes retain their old connections in the combined diagram.
4. Select a resource in the list or diagram to inspect before/after configuration and connections. Choose **Export change summary** to download `architecture-diff.json` without attribute values.

**Try comparison demo** supplies a complete example without requiring files. The comparison UI supports English and Spanish.

Comparison is based on parsed resource configuration, connections, and group membership. It ignores comments, source locations, attribute order and object-key order; list and repeated-block order remain significant. It does not execute Terraform or predict create/update/replace actions. Plan inputs compare known `planned_values`; unknown values are not evaluated. Comparing HCL against plan JSON uses different representations and may report configuration changes even when they describe the same infrastructure. Use matching input formats for meaningful results.

Parser coverage limits apply: `.tfvars`, remote modules, unresolved expressions and dependencies outside the imported files are not fully evaluated. Preserve local-module paths when using the parser API; the browser file picker currently provides file names only. A renamed resource appears as removed plus added. Baselines stay in memory for the current session. Cloud graph JSON import and CI/PR integration are future work.

## Using `terraform show -json`

For exact dependency edges (as declared in Terraform, not inferred):

```bash
terraform init
terraform plan -out=tfplan
terraform show -json tfplan > plan.json
```

Drop `plan.json` onto the import zone. The diagram uses exact references from `configuration.root_module` and marks edges `confidence: exact`.

---

## Pipeline

```
.tf files / plan.json
        |
        v  @iac-board/terraform-parser
TerraformParseResult { resources[], diagnostics[] }
        |
        v  @iac-board/cloud-graph
CloudGraph { nodes[], edges[], groups[], diagnostics[] }
        |
        v  @iac-board/layout-engine
PositionedCloudGraph { layout: Record<id, {x,y,w,h}> }
        |
        v  @iac-board/canvas-engine
CanvasElementDraft[]
        |
        v  @iac-board/visual-engine  (CloudBoard)
Interactive SVG diagram
```

Each stage is an independent npm workspace package with its own tests. See [`docs/engineering/architecture.md`](docs/engineering/architecture.md) for the full design.

---

## Supported AWS Resources

| Category    | Resource types                                                                                                                                                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compute     | `aws_lambda_function`, `aws_ecs_cluster`, `aws_ecs_service`, `aws_ecs_task_definition`, `aws_eks_cluster`, `aws_autoscaling_group`, `aws_instance`                                                                                  |
| Network     | `aws_vpc`, `aws_subnet`, `aws_internet_gateway`, `aws_nat_gateway`, `aws_lb`, `aws_alb`, `aws_cloudfront_distribution`, `aws_route53_zone`, `aws_db_subnet_group`                                                                   |
| Storage     | `aws_s3_bucket`, `aws_s3_object`                                                                                                                                                                                                    |
| Database    | `aws_db_instance`, `aws_rds_cluster`, `aws_dynamodb_table`, `aws_elasticache_cluster`, `aws_elasticache_replication_group`, `aws_redshift_cluster`, `aws_athena_workgroup`, `aws_glue_catalog_database`                             |
| Integration | `aws_api_gateway_rest_api`, `aws_apigatewayv2_api`, `aws_sqs_queue`, `aws_sns_topic`, `aws_kinesis_stream`, `aws_kinesis_firehose_delivery_stream`, `aws_eventbridge_rule`, `aws_lambda_event_source_mapping`, `aws_iot_topic_rule` |
| Security    | `aws_iam_role`, `aws_iam_policy`, `aws_security_group`, `aws_cognito_user_pool`, `aws_secretsmanager_secret`, `aws_kms_key`                                                                                                         |
| AI/ML       | `aws_sagemaker_endpoint`, `aws_sagemaker_model`                                                                                                                                                                                     |

Resources not in the table still render with an `unknown` category and surface a parser diagnostic.

---

## Project Structure

```
iac-board/
├── apps/
│   └── web/                        # React + Vite application
│       └── src/
│           ├── App.tsx             # Root component + ProductShell
│           ├── DiagramCanvas.tsx   # SVG export wrapper
│           ├── import-zone.tsx     # Drag-and-drop / file picker
│           └── translations.ts     # EN / ES string table
│
├── packages/
│   ├── core-types/                 # Shared Zod schemas + TypeScript types
│   ├── terraform-parser/           # HCL lexer, parser, resource extractor, plan-json parser
│   ├── cloud-graph/                # Resource -> CloudGraph (nodes, edges, groups)
│   ├── layout-engine/              # Sugiyama layering + group-constrained placement
│   ├── canvas-engine/              # PositionedGraph -> CanvasElementDraft[]
│   ├── visual-engine/              # React SVG renderer (CloudBoard, EdgeRenderer, ...)
│   ├── pipeline/                   # Single-call orchestration of all stages
│   └── example-catalog/            # Bundled Terraform fixture projects
│
├── examples/
│   └── terraform/                  # Raw .tf files for bundled examples
│
├── tests/
│   ├── e2e/                        # Playwright end-to-end tests
│   └── visual/                     # Playwright visual regression snapshots
│
└── docs/                           # Architecture, ADRs, testing strategy, git workflow
```

---

## Development

### Requirements

- Node.js 24
- npm

### Install

```bash
npm ci
```

### Run

```bash
npm run dev          # Vite dev server at http://localhost:5173
```

### Test

```bash
npm test                       # All Vitest unit + integration tests
npm run test:e2e               # Playwright E2E (requires build + server)
npm run test:visual            # Playwright visual regression
npm run test:visual:update     # Regenerate baseline snapshots
```

### Full quality gate

```bash
npm run check:ci     # typecheck + lint + format:check + test + build
```

Individual commands:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run build
```

### Visual regression snapshots

Snapshots are per-browser. On first run or after intentional UI changes:

```bash
npm run build
npm run test:visual:update
```

Commit the updated `.png` files under `tests/visual/`.

---

## Architecture decisions

Key design choices are recorded in [`docs/adr/`](docs/adr/):

| ADR                                                                 | Decision                                  |
| ------------------------------------------------------------------- | ----------------------------------------- |
| [0001](docs/adr/0001-use-drawnix-plait-as-visual-engine.md)         | Visual engine selection                   |
| [0002](docs/adr/0002-use-typescript-first-with-parser-adapter.md)   | TypeScript-first + parser adapter pattern |
| [0003](docs/adr/0003-local-first-safe-terraform-parsing.md)         | Local-only, zero-execution parsing        |
| [0004](docs/adr/0004-cloud-graph-schema-and-document-versioning.md) | Cloud graph schema + document versioning  |
| [0005](docs/adr/0005-testing-pyramid-and-fixture-contracts.md)      | Testing pyramid                           |

---

## Contributing

See [**docs/contributing.md**](docs/contributing.md) for the full contributor guide.

Short version:

1. Fork and clone the repo
2. `npm ci && npm run dev`
3. Branch: `feat/hu-NNN-short-description` or `fix/short-description`
4. Write tests alongside your change
5. `npm run check:ci` must pass locally
6. Open a PR with a clear summary and test plan

---

## License

MIT
