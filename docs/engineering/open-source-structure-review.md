# Open Source Structure Review

This review compares IaC Board with open source projects that solve adjacent
problems: infinite canvas apps, editable diagramming, and Terraform
visualization.

The goal is not to copy one repository. The goal is to borrow proven structural
patterns and adapt them to a Terraform-first diagram product.

## Repositories Reviewed

### tldraw

Repository: <https://github.com/tldraw/tldraw>

Why it matters:

- large TypeScript canvas/editor product,
- SDK-first architecture,
- monorepo with applications and reusable packages,
- strong separation between editor logic, store/schema, React UI, examples, and
  internal tooling.

Observed top-level structure:

```text
apps/
packages/
internal/
templates/
.github/
skills/
```

Observed package examples:

```text
packages/editor/
packages/store/
packages/tldraw/
packages/tlschema/
packages/utils/
packages/validate/
apps/dotcom/
apps/docs/
apps/examples/
apps/vscode/
```

Pattern to borrow:

- keep the product app separate from reusable engines,
- keep schema/model code in its own package,
- keep examples as first-class apps or fixtures,
- keep internal automation outside product packages.

### Excalidraw

Repository: <https://github.com/excalidraw/excalidraw>

Why it matters:

- mature whiteboard/diagramming product,
- MIT licensed,
- separates app, packages, examples, scripts, and developer docs,
- has governance and contribution infrastructure.

Observed top-level structure:

```text
excalidraw-app/
packages/
examples/
dev-docs/
scripts/
.github/
```

Observed package examples:

```text
packages/common/
packages/element/
packages/excalidraw/
packages/math/
packages/utils/
```

Pattern to borrow:

- put reusable product logic in `packages/`,
- keep runnable user-facing app separate,
- keep examples close to the repo,
- keep architecture/development docs in dedicated docs folders.

### Drawnix

Repository: <https://github.com/plait-board/drawnix>

Why it matters:

- likely visual foundation for IaC Board,
- React + TypeScript + Plait canvas,
- package-oriented repo with web app and canvas libraries.

Observed local structure from the cloned repository:

```text
apps/web/
packages/drawnix/
packages/react-board/
packages/react-text/
```

Pattern to borrow:

- wrap the visual engine behind a package,
- keep the actual app in `apps/web`,
- avoid scattering canvas details through parser or graph code.

### InfraMap

Repository: <https://github.com/cycloidio/inframap>

Why it matters:

- Terraform/HCL/tfstate visualization tool,
- shows provider-specific extraction boundaries,
- has graph and printer concepts separated from providers.

Observed top-level structure:

```text
cmd/
provider/
graph/
printer/
prune/
generate/
docs/
scripts/
tools/
```

Observed provider structure:

```text
provider/aws/
provider/azurerm/
provider/google/
provider/openstack/
provider/factory/
```

Observed graph structure:

```text
graph/node.go
graph/edge.go
graph/graph.go
graph/*_test.go
```

Pattern to borrow:

- provider parsing/extraction should be separate from graph building,
- graph model deserves its own package and tests,
- output/rendering should be a separate layer.

### Blast Radius

Repository: <https://github.com/28mm/blast-radius>

Why it matters:

- Terraform dependency graph visualizer,
- older but directly related to Terraform graphing,
- has CLI/bin, examples, docs, and app code separated.

Observed top-level structure:

```text
bin/
blastradius/
doc/
examples/
utilities/
```

Pattern to borrow:

- examples are essential for Terraform tooling,
- CLI entrypoints should stay separate from core logic,
- docs and examples should be part of the product, not an afterthought.

## Recommended IaC Board Structure

IaC Board should use a TypeScript monorepo structure inspired mainly by tldraw,
Excalidraw, Drawnix, and InfraMap.

Recommended target:

```text
apps/
  web/
    src/
    public/
    index.html
  cli/
    src/

packages/
  core-types/
    src/
    test/
  terraform-parser/
    src/
    test/
      fixtures/
  cloud-graph/
    src/
    test/
  layout-engine/
    src/
    test/
  canvas-engine/
    src/
    test/
  docs-generator/
    src/
    test/

examples/
  terraform/
    aws-serverless-api/
    aws-vpc-rds/
    aws-iot-pipeline/

tests/
  integration/
  e2e/
  visual/

docs/
  adr/
  engineering/
  product/
  testing/

scripts/
  verify-fixtures.ts
  generate-support-matrix.ts

.github/
```

## Package Responsibilities

### `apps/web`

Owns:

- React application shell,
- import screens,
- diagnostics panel,
- node inspector,
- canvas host,
- export UI.

Must not own:

- Terraform parsing,
- cloud graph rules,
- layout algorithms,
- Drawnix internals outside adapter usage.

### `apps/cli`

Future Node CLI.

Owns:

- `iac-board generate`,
- path input/output,
- CI-friendly JSON generation,
- future PNG export.

Must reuse packages instead of duplicating parser or graph logic.

### `packages/core-types`

Owns:

- `CloudNode`,
- `CloudEdge`,
- `CloudGroup`,
- `Diagnostic`,
- `IacBoardDocument`,
- version constants,
- schema validation.

This package is the equivalent of tldraw's schema/store boundary and InfraMap's
graph model boundary.

### `packages/terraform-parser`

Owns:

- safe Terraform file scanning,
- HCL parsing adapter,
- raw Terraform resource extraction,
- source locations,
- parser diagnostics.

Must not execute Terraform.

### `packages/cloud-graph`

Owns:

- converting Terraform resources to cloud graph nodes and edges,
- AWS-specific relationship inference,
- confidence labels,
- unsupported resource diagnostics.

### `packages/layout-engine`

Owns:

- deterministic positioning,
- VPC/subnet containment,
- service-category layers,
- event/data flow layout.

### `packages/canvas-engine`

Owns:

- Drawnix/Plait adapter,
- graph-to-canvas element conversion,
- canvas insertion,
- export integration.

This should be the only package importing Drawnix or Plait.

### `packages/docs-generator`

Future package.

Owns:

- Markdown architecture reports,
- resource tables,
- diagnostics summaries,
- README snippets.

## Why Not Copy A Go Layout?

InfraMap's Go layout is strong for provider/graph separation, but IaC Board is a
web-first TypeScript product with an editable canvas. Copying `cmd/`, `provider/`,
and `graph/` literally would make the browser app feel bolted on.

Instead, IaC Board should translate that concept:

```text
provider/      -> packages/terraform-parser + packages/cloud-graph
graph/         -> packages/core-types + packages/cloud-graph
printer/       -> packages/canvas-engine + packages/docs-generator
cmd/           -> apps/cli
```

## Migration From Current Repo

Current state is a Vite app at the repo root. That is acceptable for foundation,
but product code should move before parser implementation.

Recommended migration steps:

1. Create npm workspaces.
2. Move current Vite app into `apps/web`.
3. Create empty packages with README files and smoke tests.
4. Add TypeScript path aliases.
5. Update CI to run workspace scripts.
6. Add Terraform examples under `examples/terraform`.
7. Implement core types before parser logic.

## Decision

IaC Board will follow an `apps/ + packages/ + examples/ + tests/ + docs/`
structure.

The structure is closest to tldraw/Excalidraw for web/canvas scalability and
borrows provider/graph separation from InfraMap.
