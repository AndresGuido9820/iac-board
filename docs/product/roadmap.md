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

## Phase 1: Visual Engine — Own Canvas

Purpose: build our own SVG canvas engine inspired by Drawnix/Plait architecture,
without taking it as a dependency. Copy patterns, not code.

Decision: no `@drawnix/drawnix` or `@plait/*` npm deps.
Build `packages/visual-engine` from scratch with React + SVG:
- element-tree state model (nodes, groups, edges)
- viewport transform matrix for infinite pan/zoom
- per-type renderer components

No external AWS icon asset repo found locally. Icons will be inline SVG paths
inside `packages/visual-engine/src/icons/`. GCP/Azure as stubs for now.

Tasks:

- [x] Static SVG renderer (DiagramCanvas — baseline)
- [ ] `packages/visual-engine` package scaffold
- [ ] Infinite canvas: pan (drag background) + zoom (wheel)
- [ ] Cloud node templates: accent bar + inline SVG icon + service type + resource name
- [ ] AWS service icons — inline SVG paths by category (compute, storage, db, network, security, integration)
- [ ] GCP / Azure icon stubs (placeholder shapes)
- [ ] Group container renderer (VPC, subnet — dashed border + label)
- [ ] Edge/arrow renderer (straight line + arrowhead `<marker>`)
- [ ] Real edges in `cloud-graph` from Terraform resource references
- [ ] Adapter: pipeline output → CloudBoard elements
- [ ] Node drag to reposition
- [ ] Export as PNG
- [ ] Replace DiagramCanvas in web with CloudBoard

Deliverable:

- Interactive pannable/zoomable diagram with styled cloud nodes,
  group containers, and directional arrows between related resources.

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
