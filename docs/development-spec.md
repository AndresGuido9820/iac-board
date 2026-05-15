# Development Spec

This document is the operating contract for IaC Board development.

Every feature, fix, refactor, test, workflow, and documentation change should be
evaluated against this spec. If this document conflicts with a more specific ADR,
the ADR wins and this spec must be updated.

## Canonical References

Product and scope:

- [README](../README.md)
- [Planning Index](README.md)
- [Product Brief](product/product-brief.md)
- [User Stories](product/user-stories.md)
- [Roadmap](product/roadmap.md)

Architecture and engineering:

- [Architecture](engineering/architecture.md)
- [Engine Extraction Plan](engineering/engine-extraction-plan.md)
- [Attribution And Licensing](engineering/attribution-and-licensing.md)
- [Test Strategy](testing/test-strategy.md)
- [ADR 0001: Use Drawnix/Plait As Visual Engine Foundation](adr/0001-use-drawnix-plait-as-visual-engine.md)

This spec owns the day-to-day rules that connect those documents.

## Product Boundary

IaC Board is Terraform-first.

Current product promise:

- parse Terraform files,
- build a normalized cloud graph,
- lay out AWS architecture diagrams,
- render editable diagrams through a canvas adapter,
- preserve source metadata and diagnostics,
- export diagrams and project documents.

Out of scope until explicitly re-approved:

- executing `terraform init`, `terraform plan`, or `terraform apply`,
- requiring cloud credentials,
- managing infrastructure,
- multi-user realtime collaboration,
- direct support for non-Terraform IaC formats,
- claims of complete security auditing.

## Architecture Rules

The codebase must preserve these boundaries:

```text
source ingestion -> terraform parser -> cloud graph -> layout -> canvas adapter -> web UI
```

Rules:

- Parser code must not import React, Drawnix, Plait, or browser-only APIs.
- Cloud graph code must not import React, Drawnix, Plait, or parser internals.
- Layout code must operate on graph models, not UI components.
- Canvas adapter is the only layer allowed to import Drawnix/Plait.
- Web UI coordinates workflows but should not own parser, graph, or layout logic.
- Shared types belong in a stable core package before they are reused by multiple layers.
- Generated diagrams must carry diagnostics instead of silently dropping unsupported input.

If a change breaks these boundaries, it requires an ADR or an explicit tech-debt
issue with a cleanup plan.

## Stack Decision

Default stack:

- TypeScript for product, graph, layout, canvas adapter, CLI, and web UI.
- React + Vite for the web app.
- Vitest for unit/integration/contract tests.
- Playwright for browser, e2e, and visual tests.
- Zod or JSON Schema for document/graph validation.

Terraform parsing must be behind an interface. The initial implementation may be
TypeScript/WASM, but the architecture must allow a future Go/HCL parser without
rewriting the product.

## Repository Layout

Target layout:

```text
apps/
  web/
  cli/
packages/
  core-types/
  iac-parser/
  terraform-parser/
  cloud-graph/
  layout-engine/
  canvas-engine/
examples/
tests/
  integration/
  e2e/
  visual/
docs/
```

The repo may remain a simple Vite app during foundation work, but new domain
logic should be placed where it can move into this layout cleanly.

## Branching

Use trunk-based development with short-lived branches.

Branch names:

- `feature/<issue>-short-name`
- `fix/<issue>-short-name`
- `docs/<issue>-short-name`
- `chore/<issue>-short-name`
- `ci/<issue>-short-name`
- `spike/<topic>`

Rules:

- `main` must stay stable.
- No direct commits to `main` after GitHub branch protection is enabled.
- Prefer small PRs.
- Spikes do not merge directly unless converted into production code, docs, or ADRs.
- Squash merge using Conventional Commits.

## Commit Convention

Use Conventional Commits:

- `feat:`
- `fix:`
- `docs:`
- `test:`
- `refactor:`
- `chore:`
- `ci:`
- `security:`

Recommended scopes:

- `parser`
- `graph`
- `layout`
- `canvas`
- `web`
- `docs`
- `ci`
- `security`

Examples:

```text
feat(parser): extract AWS Lambda resources from Terraform
test(layout): add deterministic VPC layout fixture
docs(adr): record local-first parsing model
ci: add coverage upload artifact
```

## Definition Of Done

A change is done only when every applicable item is true:

- Issue or documented task exists.
- Acceptance criteria are satisfied.
- Code is typed.
- `npm run format:check` passes.
- `npm run lint` passes.
- `npm run typecheck` passes.
- Relevant unit tests pass.
- Relevant integration or contract tests are added.
- Browser/e2e test is added for user-visible workflows.
- Parser changes include fixtures.
- Graph/layout changes are deterministic and tested.
- Diagnostics are emitted for unsupported or ambiguous Terraform input.
- No Terraform command is executed on user repositories.
- No local repository content is uploaded by default.
- Docs are updated when behavior, architecture, CLI, document format, or security posture changes.
- ADR is added when a major technical boundary changes.
- Any accepted shortcut has a tech-debt issue.

## Test Rules

Testing layers:

- Unit tests for pure functions and model behavior.
- Parser fixture tests for Terraform input and diagnostics.
- Graph tests for normalization and relationships.
- Layout tests for deterministic positions and containment.
- Canvas contract tests for graph-to-element insertion/export boundaries.
- Integration tests for Terraform -> graph -> layout -> canvas element output.
- E2E tests for high-value product flows.
- Visual tests only for stable, deterministic screens.

Minimum quality rule:

- Parser, graph, and layout must be easy to test without React or a browser.
- UI tests should focus on behavior, not implementation details.
- Screenshot tests must use deterministic fixtures.

See [Test Strategy](testing/test-strategy.md).

## CI Rules

Required CI gate for pull requests:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test:coverage
npm run build
```

Browser tests may run in a separate workflow:

```bash
npm run test:e2e
npm run test:visual
```

Security checks:

```bash
npm run security:audit
npm run security:audit-ci
```

CI must upload artifacts for:

- coverage,
- Playwright reports,
- visual diffs on failure.

## Security Rules

IaC Board treats Terraform repositories as untrusted input.

Rules:

- Do not execute Terraform.
- Do not execute repository scripts.
- Do not require cloud credentials in MVP.
- Do not upload local files by default.
- Keep AI features opt-in if introduced later.
- Sanitize source labels, paths, diagnostics, and metadata before rendering.
- Add size limits for large files and graphs.
- Use security wording carefully: findings are hints, not complete audits.

Security-sensitive changes require extra review:

- file import,
- parser execution model,
- document export/import,
- dependency changes,
- canvas adapter internals,
- future AI or cloud integrations.

## Documentation Rules

Docs follow four categories:

- Tutorial: teach a workflow.
- How-to: solve a specific task.
- Reference: define APIs, schemas, diagnostics, support matrices.
- Explanation: explain architecture and tradeoffs.

Rules:

- Keep examples executable or clearly mark them as conceptual.
- Link new docs from [Planning Index](README.md) when they are part of the product plan.
- Update [Roadmap](product/roadmap.md) when milestone scope changes.
- Update [User Stories](product/user-stories.md) when product behavior changes.
- Add an ADR when a major technical decision is made.

## ADR Rules

Create an ADR for:

- parser strategy,
- document/schema versioning,
- canvas engine extraction,
- workspace/monorepo structure,
- local-first security model,
- layout strategy,
- release strategy.

ADR format:

```text
Context
Decision
Consequences
Alternatives
Rollout
```

Statuses:

- `Proposed`
- `Accepted`
- `Superseded`
- `Rejected`

## Release Rules

Use SemVer while pre-1.0:

- `0.1.0`: foundation public-ready.
- `0.2.0`: canvas proof.
- `0.3.0`: cloud graph model.
- `0.4.0`: Terraform parser MVP.
- `0.5.0`: layout/export.
- `0.6.0`: usable public MVP.

Each release should include:

- tag,
- changelog,
- supported Terraform/AWS resource list,
- known limitations,
- screenshots or demo link when UI changes,
- security/dependency check status.

## Tech Debt Rules

Tech debt is allowed only when visible.

Rules:

- Use `type:tech-debt` issue label.
- Explain impact, owner, workaround, and review date.
- Do not hide boundary violations.
- Do not mix large refactors with feature PRs.
- TODO comments must reference an issue once GitHub is enabled.

Blocking debt:

- parser importing UI/canvas code,
- graph model depending on Drawnix/Plait,
- nondeterministic layout without tests,
- silent parsing failures,
- unsafe execution of imported repos,
- undocumented document format changes.

## Immediate Milestone

Current milestone: **M0 - Open Source Foundation**.

Required before core implementation:

- development spec,
- quality tooling,
- CI workflows,
- security workflow,
- issue/PR templates,
- license,
- contributing guide,
- code of conduct,
- ADR templates,
- initial tests proving the toolchain works.
