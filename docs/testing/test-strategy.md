# Test Strategy

## Goals

IaC Board needs tests in four areas:

- parsing correctness,
- graph normalization,
- layout determinism,
- canvas rendering and export.

The project should avoid becoming a visual demo that breaks silently when IaC
inputs change.

## Test Pyramid

```text
Visual E2E / screenshots
Integration tests
Parser and graph unit tests
Pure utility tests
```

## Unit Tests

### Parser Tests

Each parser fixture should include:

- input IaC file,
- expected raw resources,
- expected diagnostics.

Example fixtures:

```text
fixtures/terraform/aws-lambda-api/
  main.tf
  expected.resources.json
  expected.diagnostics.json
```

Cases:

- single AWS resource,
- multiple resources,
- module call,
- variable interpolation,
- references between resources,
- unsupported resource,
- invalid syntax.

### Graph Tests

Validate normalization:

- resource type maps to correct category,
- references become edges,
- VPC/subnet containment is inferred,
- Lambda to IAM role relation is metadata or edge,
- API Gateway to Lambda invocation is detected,
- SQS producer/consumer edges are inferred.

### Layout Tests

Layout must be deterministic.

For the same graph:

- positions should be stable,
- group sizes should be stable,
- edge routing should be stable enough for snapshot tests.

Recommended assertions:

- no overlapping top-level groups,
- every node has a position,
- every edge references existing nodes,
- contained nodes are inside parent bounds,
- output is stable under repeated runs.

## Integration Tests

Integration tests should run full pipeline:

```text
Terraform fixture -> parser -> cloud graph -> layout -> canvas elements
```

Assertions:

- no thrown errors,
- expected number of nodes,
- expected number of edges,
- expected unsupported diagnostics,
- canvas element output validates against schema.

## Visual Regression Tests

Use Playwright.

Scenarios:

- load empty app,
- insert AWS serverless example,
- insert AWS IoT example,
- open diagnostics panel,
- export button enabled,
- responsive layout at desktop and mobile widths.

Screenshot tests should be stable by:

- using deterministic fixture data,
- disabling random IDs in test mode,
- waiting for canvas render completion,
- pinning browser viewport.

## E2E Tests

Core E2E flows:

1. Open app.
2. Select example.
3. Generate diagram.
4. Select a node.
5. Verify source metadata appears.
6. Export diagram.

Later:

1. Import local folder.
2. Save `.iac-board.json`.
3. Reopen saved document.

## Contract Tests

The canvas adapter should have contract tests so Drawnix/Plait upgrades do not
break us unnoticed.

Contract expectations:

- `insertGraph` inserts all nodes and edges,
- inserted diagram can be exported,
- generated elements are accepted by the board,
- no direct Drawnix types leak outside adapter package.

## Test Commands

Target commands once implemented:

```bash
npm run test
npm run test:parser
npm run test:integration
npm run test:e2e
npm run build
npm run lint
```

## CI Quality Gate

Pull requests should pass:

- TypeScript check,
- ESLint,
- unit tests,
- integration tests,
- production build,
- Playwright smoke test.

Visual regression can be optional until screenshots stabilize.
