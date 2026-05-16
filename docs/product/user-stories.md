# User Stories

This document defines the first product backlog for IaC Board.

Format:

```text
As a [persona], I want [capability], so that [outcome].
```

Each story includes acceptance criteria to keep implementation testable.

## Personas

### Cloud Engineer

Owns infrastructure repositories and needs fast architecture understanding,
reviews, and documentation.

### Backend Engineer

Works with services that depend on cloud resources but does not always know the
full infrastructure topology.

### DevOps / Platform Engineer

Maintains shared cloud modules, deployment patterns, and infrastructure
standards.

### Student / Portfolio Builder

Wants to show cloud and IaC skills through useful open source projects.

### Security Reviewer

Needs a quick view of public exposure, network paths, and sensitive resources.

### Open Source Maintainer

Maintains example infrastructure repositories and wants diagrams that stay close
to the source code.

## Epic 1: Import Infrastructure Code

### HU-001: Import Local Terraform Folder

As a cloud engineer, I want to select a local Terraform folder, so that IaC
Board can generate a diagram without uploading private code.

Acceptance criteria:

- User can select a local folder from the browser where supported.
- App detects `.tf` files.
- App shows number of files scanned.
- App does not send file contents to a remote service.
- Unsupported files are ignored with a diagnostic, not an error.

### HU-002: Import Example Project

As a new user, I want to open bundled example projects, so that I can understand
the product without having my own Terraform repository ready.

Acceptance criteria:

- App includes at least three examples: serverless API, IoT pipeline, VPC + RDS.
- Each example has source files and expected diagram output.
- User can generate a diagram from an example in one click.

### HU-003: Scan Repository Structure

As a platform engineer, I want the tool to detect modules and environments, so
that large IaC repositories are easier to navigate.

Acceptance criteria:

- App identifies root modules and local child modules.
- App groups files by folder.
- App displays module paths before generation.
- Missing module paths are reported as diagnostics.

### HU-004: Safe Parsing Mode

As a security reviewer, I want IaC Board to parse files without executing code,
so that repository analysis does not run untrusted commands.

Acceptance criteria:

- App never runs `terraform init`, `plan`, or external scripts in MVP.
- App parses text only.
- README documents the safe parsing limitation.
- Dynamic expressions are marked as unresolved when needed.

## Epic 2: Generate Architecture Diagrams

### HU-005: Generate AWS Serverless Diagram

As a backend engineer, I want IaC Board to generate a serverless architecture
diagram, so that I can understand API Gateway, Lambda, queues, and databases at a
glance.

Acceptance criteria:

- API Gateway, Lambda, SQS/SNS/EventBridge, DynamoDB, RDS, and S3 resources are
  rendered as nodes.
- Invocation and data-flow relationships are rendered as arrows.
- Unknown relationships are omitted with diagnostics.
- Diagram is generated deterministically for the same input.

### HU-006: Generate Network Topology Diagram

As a cloud engineer, I want VPC resources to be grouped visually, so that subnet
and routing structure is obvious.

Acceptance criteria:

- VPC appears as a group/container.
- Public and private subnets are separated when inferable.
- Internet gateway and NAT gateway are placed near edge of network group.
- Resources inside subnets are visually contained.

### HU-007: Generate Data Pipeline Diagram

As a data engineer, I want storage, queue, processing, and analytics resources
to be shown as a pipeline, so that data movement is easier to explain.

Acceptance criteria:

- Source, processing, and sink resources are arranged left to right.
- S3, Lambda, queues, streams, Glue, Athena, and databases get meaningful labels.
- Edges distinguish event flow from read/write relationships.

### HU-008: Generate IaC Summary

As an open source maintainer, I want a short generated architecture summary, so
that the diagram can be included in project documentation.

Acceptance criteria:

- Summary lists providers, regions if detected, resource counts, and main flows.
- Summary includes unsupported resource count.
- Summary can be copied as Markdown.

## Epic 3: Source-Aware Diagrams

### HU-009: Link Node To Source File

As a developer, I want every generated node to keep source file metadata, so that
I can jump from architecture to code.

Acceptance criteria:

- Node inspector shows file path.
- Node inspector shows resource address, e.g. `aws_lambda_function.api`.
- Line number is shown when parser supports it.
- Missing source metadata is clearly marked.

### HU-010: Show Parser Diagnostics

As a cloud engineer, I want clear parser diagnostics, so that I know what the
diagram could not infer.

Acceptance criteria:

- Diagnostics are shown in a dedicated panel.
- Diagnostics include severity: info, warning, error.
- Diagnostics include file/resource context when available.
- Unsupported resources do not block diagram generation.

### HU-011: Confidence Labels

As a reviewer, I want inferred relationships to show confidence, so that I know
which arrows came directly from code and which were guessed.

Acceptance criteria:

- Edges can have confidence: exact, inferred, uncertain.
- Uncertain edges use a different style.
- Inspector explains why the relationship was inferred.

## Epic 4: Editable Canvas

### HU-012: Edit Generated Diagram

As a cloud engineer, I want to move, resize, and annotate generated elements, so
that the diagram can be made presentation-ready.

Acceptance criteria:

- User can move generated nodes.
- User can add text notes.
- User can draw manual arrows.
- Manual edits do not destroy source metadata.

### HU-013: Save Manual Layout

As a maintainer, I want to save manual layout adjustments, so that regenerated
diagrams do not reset all my work.

Acceptance criteria:

- App exports `.iac-board.json`.
- Saved document includes graph, layout, notes, and diagnostics.
- Reopening document restores positions.

### HU-014: Regenerate While Preserving Edits

As a platform engineer, I want to regenerate a diagram after IaC changes, so that
manual annotations survive routine updates.

Acceptance criteria:

- Stable resource IDs are used across generations.
- Existing node positions are reused when resource IDs match.
- Deleted resources are marked or removed based on user choice.
- New resources are placed automatically.

### HU-015: Add Architecture Notes

As a backend engineer, I want to add notes to resources and flows, so that I can
explain decisions not visible in code.

Acceptance criteria:

- User can attach a note to a node or edge.
- Notes are saved in `.iac-board.json`.
- Notes can be exported in Markdown summary.

## Epic 5: Export And Documentation

### HU-016: Export Diagram As Image

As a student or maintainer, I want to export the diagram as PNG/SVG, so that I
can use it in README files, reports, and portfolio pages.

Acceptance criteria:

- PNG export works.
- SVG export works if supported by the engine.
- Export respects current theme.
- Exported image includes all visible diagram elements.

### HU-017: Export Architecture Report

As a cloud engineer, I want to export a Markdown report, so that I can commit
architecture documentation with my repository.

Acceptance criteria:

- Report includes summary, diagram metadata, resource table, and diagnostics.
- Report links resources to source paths.
- Report can be generated from current document state.

### HU-018: Create README Badge Or Link

As an open source maintainer, I want a simple generated badge or link, so that
visitors can discover the architecture diagram from the repository README.

Acceptance criteria:

- App provides Markdown snippet.
- Snippet can reference exported PNG or `.iac-board.json`.
- Documentation explains how to store generated assets in repo.

## Epic 6: Architecture Review

### HU-019: Highlight Public Exposure

As a security reviewer, I want public-facing resources highlighted, so that I can
quickly identify ingress points.

Acceptance criteria:

- Internet gateways, public load balancers, API gateways, and public subnets are
  visually marked.
- Security group rules with `0.0.0.0/0` are reported when statically visible.
- Findings are informational in MVP, not security claims.

### HU-020: Highlight Data Stores

As a reviewer, I want databases and storage resources highlighted, so that I can
focus on sensitive system boundaries.

Acceptance criteria:

- Databases and buckets use a distinct visual category.
- Inspector shows encryption-related attributes when available.
- Missing or unresolved attributes are marked unknown.

### HU-021: Architecture Diff

As a platform engineer, I want to compare two IaC states, so that I can see how a
pull request changes the architecture.

Acceptance criteria:

- User can load previous and current graph JSON.
- Added, removed, and changed nodes are visually distinguished.
- Diff summary can be exported.

## Epic 7: Developer Experience

### HU-022: CLI Diagram Generation

As a developer, I want a CLI command to generate diagrams, so that I can use IaC
Board in CI or scripts.

Acceptance criteria:

- Command accepts a path to an IaC folder.
- Command outputs `.iac-board.json`.
- Command can export PNG in a headless mode later.
- CLI returns non-zero only for fatal errors.

### HU-023: GitHub Action

As an open source maintainer, I want a GitHub Action, so that diagrams can be
updated automatically on pull requests.

Acceptance criteria:

- Action scans repository IaC files.
- Action uploads diagram artifact.
- Action can comment summary on PR.
- Action does not require cloud credentials for static parsing.

### HU-024: Example Gallery

As a contributor, I want example projects with expected diagrams, so that I can
learn the codebase and add support for new resource types.

Acceptance criteria:

- Examples are organized by provider and pattern.
- Each example includes IaC files, generated graph, and expected screenshot.
- Examples are used in tests.

## Epic 8: Terraform Depth

### HU-025: Support Local Terraform Modules

As a platform engineer, I want IaC Board to resolve local Terraform modules, so
that real repositories with reusable modules can still generate useful diagrams.

Acceptance criteria:

- Module blocks with local `source` paths are detected.
- Local module files are scanned.
- Resource addresses include module context.
- Missing module folders generate diagnostics.

### HU-026: Support Terraform Variables And Locals

As a cloud engineer, I want basic Terraform variables and locals to be resolved,
so that labels and relationships are more accurate.

Acceptance criteria:

- Simple literal variables are resolved.
- Simple locals are resolved.
- Unresolved expressions are marked as unknown.
- Parser does not execute Terraform.

### HU-027: Support Terraform Plan JSON Later

As a reviewer, I want IaC Board to optionally read Terraform plan JSON, so that
computed values can improve diagrams when static parsing is not enough.

Acceptance criteria:

- Plan JSON import is optional.
- The app documents that users generate the plan themselves.
- Plan data can enrich resources without replacing source parsing.
- Sensitive values are not displayed by default.

## Epic 9: AI-Assisted Workflows

### HU-028: Explain Architecture

As a backend engineer, I want an optional AI-generated explanation, so that I can
understand unfamiliar infrastructure faster.

Acceptance criteria:

- AI feature is opt-in.
- User sees what data will be sent before using it.
- Generated explanation references graph nodes, not hallucinated resources.
- Local-only mode remains available.

### HU-029: Generate Review Questions

As a reviewer, I want generated architecture review questions, so that I can
prepare better technical discussions.

Acceptance criteria:

- Questions are generated from graph and diagnostics.
- Questions are grouped by reliability, security, cost, and operations.
- User can copy questions as Markdown.

### HU-030: Suggest Missing Documentation

As an open source maintainer, I want the tool to suggest missing architecture
docs, so that my repository is easier for contributors to understand.

Acceptance criteria:

- Tool detects missing exported diagram/report files.
- Tool suggests README section text.
- Suggestions can be copied, not auto-committed.

## Epic 10: Diagram Visual Quality

### HU-031: Correct Data Flow Layout and Edge Semantics

As a cloud engineer, I want the generated diagram to show resources in correct
left-to-right data flow order with meaningful edge styles, so that I can
understand architecture intent without having to manually rearrange every node.

**Diagnosis (from visual audit 2026-05-16):**

Three root-cause defects found across the three bundled examples:

1. **IoT pipeline layout inversion** — `aws_lambda_function.normalizer` was
   modelled with a fake `event_source = kinesis.arn` attribute. Because the
   consumer (Lambda) references the producer (Kinesis), the topology algorithm
   placed Lambda to the *left* of Kinesis. Real Terraform uses
   `aws_lambda_event_source_mapping` as a dedicated bridge resource; adding it
   produces the correct layout: IoT Rule → Kinesis → (mapping) → Lambda → S3 /
   Glue → Athena.

2. **Undifferentiated edge styles** — all edges from `aws_lambda_function` were
   tagged `invokes`, making role assumptions, storage writes, and function
   triggers visually identical. `inferRelation` needed to consider both the
   source *and* target resource type to emit the correct semantic relation.

3. **Missing resource type** — `aws_lambda_event_source_mapping` was absent from
   the `awsCategories` map, causing a GRAPH001 diagnostic on every IoT pipeline
   diagram.

Acceptance criteria:

- IoT pipeline diagram shows left-to-right flow: IoT Rule → Kinesis → Lambda →
  S3 / Glue → Athena (visual audit screenshot passes).
- Edges between Lambda and IAM Role use style `uses-role` (gray dashed).
- Edges between Lambda and storage (S3, DynamoDB, Kinesis) use style `writes-to`
  (green).
- Edges between an event-source mapping and its function use style `triggers`
  (purple).
- No GRAPH001 diagnostic for `aws_lambda_event_source_mapping`.
- All existing unit and integration tests pass (40/40).

### HU-032: Minimize Edge Crossings (Sugiyama Barycenter)

As a cloud engineer, I want diagram arrows to avoid unnecessary crossings, so
that I can follow data flow without visual confusion.

Acceptance criteria:

- Zero edge crossings for the Serverless API example (4 nodes, 3 edges).
- At most one crossing for the IoT Pipeline example (7 nodes, 6 edges).
- At most three crossings for the VPC+RDS example (8 nodes, 8 edges).
- Layout is deterministic (same input always produces same output).
- Layout of 50 nodes + 60 edges completes in under 50 ms.

### HU-033: Group-Constrained Node Placement

As a cloud engineer working with VPCs, I want nodes inside the same VPC or
subnet to be placed in adjacent columns, so that network topology is obvious at
a glance.

Acceptance criteria:

- Children of the same VPC group span at most two adjacent columns.
- Children of the same subnet group share one column.
- VPC group rectangle has aspect ratio at most 3:1 (width:height).
- No regressions in examples without groups (Serverless API, IoT Pipeline).

### HU-034: Intelligent Edge Routing Around Obstacles

As a cloud engineer, I want diagram arrows to route around nodes and group
boundaries instead of passing over them, so that diagrams remain readable with
many connections.

Acceptance criteria:

- No edge passes through the interior of a node that is not its source or target.
- Edges that cross a group boundary follow the group border, not its interior.
- Feedback edges (right-to-left) route above or below the graph, not through it.
- Bezier curves remain visually smooth (no abrupt straight segments).

### HU-035: Edge Labels Showing Relation Semantics

As a cloud engineer, I want every arrow to show its relationship type (triggers,
writes to, deployed in), so that I understand architecture intent without
guessing from color alone.

Acceptance criteria:

- Each edge displays its relation as a text label near the bezier midpoint.
- Labels are legible (at least 8 px, sufficient contrast).
- Labels do not overlap source or target nodes.
- Labels can be toggled on/off in the UI (default: visible).

### HU-036: AWS Resource Type Expansion (20 New Types)

As a cloud engineer, I want ECS, EKS, ALB, CloudFront, Cognito, Step Functions,
ElastiCache, and other common services to appear with correct icons and
categories, so that real-world diagrams have no gray unknown boxes.

Acceptance criteria:

- Twenty new resource types supported with correct category in cloud-graph.
- Each type has a real SVG icon or uses category fallback without crash.
- A new bundled example uses at least five of the new types.
- Zero GRAPH001 diagnostics for any of the newly supported types.

### HU-037: Export Diagram as PNG and SVG

As a cloud engineer, I want to download the diagram as a PNG or SVG file, so
that I can embed it in documentation, pull requests, and presentations.

Acceptance criteria:

- Export PNG button downloads a .png of the visible diagram at 2× resolution.
- Export SVG button downloads a clean .svg (no scripts, valid XML, correct viewBox).
- Both formats include all visible elements (nodes, edges, groups, labels).
- File name includes the example or project name.

### HU-038: Import Local Terraform Files

As a cloud engineer, I want to drag and drop my .tf files into the browser to
generate a diagram of my own infrastructure, so that I am not limited to bundled
examples.

Acceptance criteria:

- Drag-and-drop zone accepts .tf files and folders.
- File picker allows multi-select of .tf files.
- Text area allows pasting HCL directly.
- Files are never sent to a remote server (verifiable in browser Network tab).
- After import the diagram generates automatically.
- Non-.tf files are ignored with a diagnostic, not an error.

### HU-039: Node Inspector Panel

As a cloud engineer, I want to click a diagram node to see its details (type,
parsed attributes, source file and line, relationships), so that I understand
each resource without leaving the diagram.

Acceptance criteria:

- Click on a node opens a sidebar panel with details.
- Panel shows resource address, type, name, and source file:line.
- Panel shows parsed body attributes as key-value pairs.
- Panel lists incoming and outgoing edges with their relation.
- Panel closes on outside click or Escape key.

### HU-040: Local Terraform Module Expansion

As a platform engineer with real repositories, I want IaC Board to expand local
modules (source = "./modules/vpc"), so that diagrams include all resources
instead of only root-module ones.

Acceptance criteria:

- Module blocks with local source paths are recursively expanded.
- Expanded resources have addresses prefixed with module path.
- Module input variables are resolved from the module block arguments.
- Nested modules expand up to three levels deep.
- Remote modules continue to emit diagnostic TF004 (not expanded).
- Missing module paths emit diagnostic TF005 without crashing.

### HU-041: Pipeline Performance Benchmark and Budget

As a project developer, I want automated benchmarks measuring each pipeline
phase, so that performance regressions are caught before deployment.

Acceptance criteria:

- Parse 20 .tf files totaling 500 resources in under 200 ms.
- Build cloud graph from 500 resources in under 50 ms.
- Layout 200 nodes with 300 edges in under 100 ms.
- Full pipeline from parse to canvas for 500 resources in under 500 ms.
- Benchmarks run in CI and fail when budget is exceeded by 2×.

### HU-042: Expanded Visual Regression Harness

As a developer using AI-assisted workflows, I want automated screenshots of each
example in multiple states (default, zoomed, after drag), so that Claude can
evaluate visual quality after every code change.

Acceptance criteria:

- Screenshot of each example at default view (already exists).
- Screenshot of each example at 150% zoom.
- Screenshot of the largest diagram with one node dragged.
- Screenshot of a new large example with fifteen or more nodes.
- All screenshots stored as baselines in the repository.
- Playwright visual tests pass when running the visual project.

## MVP Cut

The first MVP should include:

- HU-002: Import Example Project
- HU-005: Generate AWS Serverless Diagram
- HU-009: Link Node To Source File
- HU-010: Show Parser Diagnostics
- HU-012: Edit Generated Diagram
- HU-016: Export Diagram As Image
- HU-024: Example Gallery

The second MVP should add:

- HU-001: Import Local Terraform Folder
- HU-006: Generate Network Topology Diagram
- HU-013: Save Manual Layout
- HU-017: Export Architecture Report
- HU-019: Highlight Public Exposure
- HU-022: CLI Diagram Generation
