# Contributing to IaC Board

Thank you for your interest in IaC Board. This guide explains how to set up the environment, understand the codebase, write tests, and open a pull request.

---

## Table of Contents

1. [Environment setup](#environment-setup)
2. [Project layout](#project-layout)
3. [Development workflow](#development-workflow)
4. [Adding a new AWS resource type](#adding-a-new-aws-resource-type)
5. [Adding a new example project](#adding-a-new-example-project)
6. [Writing tests](#writing-tests)
7. [Visual regression](#visual-regression)
8. [Commit style](#commit-style)
9. [Pull request checklist](#pull-request-checklist)

---

## Environment setup

**Requirements:** Node.js 24, npm.

```bash
git clone https://github.com/AndresGuido9820/iac-board
cd iac-board
npm ci           # installs all workspace packages
npm run dev      # starts Vite at http://localhost:5173
```

Verify everything works before making changes:

```bash
npm test         # must show all tests passing
npm run build    # must produce a clean dist/
```

---

## Project layout

IaC Board is an npm monorepo. Each directory under `packages/` is an independent workspace with its own `package.json`, `src/`, and `test/` (or `*.test.ts` collocated with source).

```
packages/
  core-types/        Shared Zod schemas + TS types. No runtime deps.
  terraform-parser/  HCL lexer, parser, resource extractor, plan-json parser.
  cloud-graph/       Maps resources -> CloudGraph (nodes, edges, groups).
  layout-engine/     Sugiyama layering + group-constrained coordinate assignment.
  canvas-engine/     Converts a positioned graph to CanvasElementDraft[].
  visual-engine/     React SVG renderer. CloudBoard, EdgeRenderer, NodeRenderer.
  pipeline/          Thin orchestrator: calls each stage in order.
  example-catalog/   Bundled .tf fixture projects used by the web app.
```

The dependency graph flows in one direction:

```
core-types
    ^
    |-- terraform-parser
    |-- cloud-graph
    |-- layout-engine
    |-- canvas-engine
    |-- visual-engine
    |-- pipeline  (depends on all above)
    |-- example-catalog
```

`apps/web` depends on `pipeline`, `example-catalog`, and `visual-engine`.

---

## Development workflow

### Running a specific package's tests

```bash
npx vitest run packages/terraform-parser
npx vitest run packages/layout-engine
npx vitest run packages/visual-engine/src
```

### Running all tests

```bash
npm test
# or
npx vitest run
```

### Type-checking

```bash
npm run typecheck
# or
npx tsc --noEmit
```

### Linting and formatting

```bash
npm run lint
npm run format:check   # dry run
npm run format         # auto-fix
```

### Full CI gate (run before opening a PR)

```bash
npm run check:ci
```

---

## Adding a new AWS resource type

Most additions require changes in two packages only.

### 1. `packages/cloud-graph/src/index.ts`

Add the resource type to the `awsCategories` map:

```typescript
// packages/cloud-graph/src/index.ts
const awsCategories: Record<string, CloudNode['category']> = {
  // ...existing entries...
  aws_my_new_resource: 'compute',   // pick the right category
}
```

Valid categories: `compute`, `network`, `storage`, `database`, `security`, `integration`, `unknown`.

### 2. `packages/cloud-graph/src/index.ts` — edge inference (optional)

If the resource creates semantic edges to other resources, add rules to the edge-inference section. Look for existing patterns like Lambda -> IAM role, API Gateway -> Lambda.

### 3. Add a test

Add a test case in `packages/cloud-graph/test/` or extend an existing fixture. Verify:

- the resource maps to the correct category,
- any expected edges are produced,
- no spurious diagnostic is emitted.

### 4. Add to supported resources table in README

Update the table in [`README.md`](../README.md).

---

## Adding a new example project

1. Create the `.tf` file(s) under `examples/terraform/<your-example>/`.
2. Add the project to `packages/example-catalog/src/index.ts`:

```typescript
const myExample: ExampleProject = {
  id: 'my-example',
  name: 'My Example',
  description: 'Short description shown in the UI.',
  userStoryIds: [],
  files: [
    {
      path: 'examples/terraform/my-example/main.tf',
      content: `...raw terraform content...`,
    },
  ],
}

export const exampleProjects: ExampleProject[] = [
  awsServerlessApi,
  awsIotPipeline,
  awsVpcRds,
  ecsмикросервисы,
  modularApp,
  myExample,   // add here
]
```

3. Verify it renders correctly in `npm run dev`.
4. Update the visual snapshot baselines: `npm run test:visual:update`.

---

## Writing tests

### Unit tests

Use **Vitest** + **Testing Library** (for React components). Test files live alongside source (`*.test.ts` / `*.test.tsx`) or under `packages/<pkg>/test/`.

```typescript
import { describe, it, expect } from 'vitest'
import { parseTerraformFiles } from '@iac-board/terraform-parser'

describe('parseTerraformFiles', () => {
  it('extracts a Lambda resource', () => {
    const result = parseTerraformFiles([{
      path: 'main.tf',
      content: 'resource "aws_lambda_function" "handler" {}',
    }])
    expect(result.resources).toHaveLength(1)
    expect(result.resources[0].type).toBe('aws_lambda_function')
  })
})
```

### Integration tests

Use `generateDiagramFromTerraformFiles` from `@iac-board/pipeline` to test the full stack in a single call:

```typescript
import { generateDiagramFromTerraformFiles } from '@iac-board/pipeline'

it('produces nodes and edges for a serverless example', () => {
  const result = generateDiagramFromTerraformFiles([{
    path: 'main.tf',
    content: `
      resource "aws_lambda_function" "handler" {}
      resource "aws_api_gateway_rest_api" "api" {}
    `,
  }])
  expect(result.graph.nodes.length).toBeGreaterThan(0)
  expect(result.graph.edges.length).toBeGreaterThan(0)
})
```

### Coverage thresholds

The project enforces minimum coverage (see `vitest.config.ts`):

- branches: 70%
- statements / functions / lines: 80%

Run `npx vitest run --coverage` to check locally.

---

## Visual regression

Playwright captures full-page screenshots and compares them to committed baselines.

**Run against existing baselines:**

```bash
npm run build
npm run test:visual
```

**Regenerate baselines** (after an intentional visual change):

```bash
npm run test:visual:update
```

Commit the updated `.png` files. Snapshots live in `tests/visual/`.

**Adding a new visual test:**

Add a test to `tests/visual/diagram-audit.visual.spec.ts`. Follow the existing pattern: navigate, wait for the canvas, optionally assert a functional invariant, then take a screenshot.

```typescript
test('diagram: my new example', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'My Example' }).click()
  await page.locator('svg').first().waitFor({ timeout: 8000 })
  await page.waitForTimeout(400)
  await expect(page).toHaveScreenshot('diagram-my-example.png', {
    fullPage: true,
    animations: 'disabled',
  })
})
```

---

## Commit style

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <summary>
```

| Type | When to use |
|------|-------------|
| `feat` | new capability |
| `fix` | bug fix |
| `test` | tests or fixtures only |
| `refactor` | internal change, no behavior difference |
| `docs` | documentation only |
| `chore` | tooling, deps, config |
| `ci` | GitHub Actions |

Scopes: `parser`, `graph`, `layout`, `canvas`, `visual`, `web`, `pipeline`, `docs`, `ci`.

Examples:

```
feat(graph): add aws_mq_broker to integration category
fix(parser): handle empty resource blocks without panicking
test(layout): assert group constraints for nested subnets
docs(contributing): add section on adding resource types
```

---

## Pull request checklist

Before opening a PR, verify:

- [ ] `npm run check:ci` passes (typecheck + lint + format + test + build)
- [ ] New behavior is covered by at least one test
- [ ] Edge cases are handled (empty input, unknown resource types, missing refs)
- [ ] If UI changed: visual snapshots updated and committed
- [ ] If public API changed: package README updated
- [ ] PR description includes what changed and how to test it

**Branch naming:**

```
feat/hu-NNN-short-description
fix/short-description
docs/short-description
test/short-description
chore/short-description
```
