# Roadmap

## Phase 0: Foundation

Purpose: make the repo look and feel like a serious open source project.

Tasks:

- Define product scope.
- Add license and attribution.
- Add architecture docs.
- Add contribution guide.
- Add issue templates.
- Add examples folder.
- Choose package manager and workspace layout.

Deliverable:

- Repo can be shared publicly as a real project, even before full MVP.

## Phase 1: Canvas Proof

Purpose: prove Drawnix/Plait can power our own product.

Tasks:

- Install Drawnix/Plait packages.
- Render canvas inside our own UI.
- Create `canvas-engine` adapter.
- Insert a generated sample graph.
- Export generated diagram.

Example button:

> Insert AWS Serverless API

Deliverable:

- A user sees a generated cloud diagram on the board.

## Phase 2: Cloud Graph Model

Purpose: establish the stable internal model.

Tasks:

- Define `CloudNode`, `CloudEdge`, `CloudGroup`, `Diagnostic`.
- Add JSON schema or Zod validators.
- Add sample AWS graphs.
- Add tests.

Deliverable:

- Renderer-independent architecture graph.

## Phase 3: Terraform MVP

Purpose: parse real infrastructure code.

Tasks:

- Parse `.tf` files.
- Support basic `resource` blocks.
- Support references like `aws_lambda_function.api.arn`.
- Support local modules at a basic level.
- Emit diagnostics for unsupported expressions.
- Convert AWS resources to graph.

Deliverable:

- Small Terraform examples become diagrams.

## Phase 4: Better Layout

Purpose: make generated diagrams useful without manual cleanup.

Tasks:

- Layered layout by service category.
- VPC/subnet containers.
- Event flow layout for serverless systems.
- Data flow layout for pipelines.
- Save manual node positions.

Deliverable:

- Diagrams are readable on first generation.

## Phase 5: Product UX

Purpose: make the app feel like a tool, not a demo.

Tasks:

- Import screen.
- Examples gallery.
- Diagnostics panel.
- Node inspector.
- Source file references.
- Export menu.
- Save/open `.iac-board.json`.

Deliverable:

- Developers can use the app for actual documentation work.

## Phase 6: Open Source Launch

Purpose: make the project attractive to contributors.

Tasks:

- README with screenshots/GIF.
- `CONTRIBUTING.md`.
- `CODE_OF_CONDUCT.md`.
- Good first issues.
- Architecture docs.
- Roadmap.
- CI.
- Demo deployment.

Deliverable:

- Public repo ready for stars, issues, and contributors.

## Phase 7: Advanced Features

Ideas after MVP:

- GitHub repo import.
- GitHub Actions diagram generation.
- Pull request comment with architecture diff.
- Terraform plan diff visualization.
- OpenTofu support through the Terraform/HCL pipeline.
- Live AWS inventory import.
- AI-assisted architecture explanations.
- Risk hints: public ingress, open security groups, unencrypted storage.
- Markdown architecture report export.
