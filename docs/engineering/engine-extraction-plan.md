# Engine Extraction Plan

## Goal

Use the Drawnix/Plait visual capabilities as the foundation for IaC Board while
keeping IaC Board as a distinct product with clean architecture.

Drawnix gives us:

- React canvas wrapper.
- Infinite board.
- Shapes, arrows, text, images, mind maps, freehand.
- Export to image/JSON.
- Local save/open.
- `board.insertFragment(...)`, which can insert generated elements into the board.

IaC Board adds:

- IaC parsing.
- Cloud resource graph.
- Cloud-specific layout.
- Diagram templates.
- Source metadata.
- IaC-aware documentation and review workflows.

## Strategic Choice

Do not start by copying the full Drawnix repository into the product.

Start with a dependency-based wrapper:

- use `@drawnix/drawnix` and `@plait/*` packages where possible,
- create our own app shell,
- create our own IaC parser and graph model,
- insert generated diagrams into the board through stable public APIs.

If dependency APIs are insufficient, extract a minimal internal visual package
later with explicit attribution.

## Extraction Modes

### Mode 1: Package Dependency

Use published packages:

- `@drawnix/drawnix`
- `@plait/core`
- `@plait/common`
- `@plait/draw`
- `@plait/mind`

Pros:

- Fastest path.
- Clean legal boundary.
- Easier upgrades.
- Less source code to maintain.

Cons:

- Limited customization if Drawnix does not expose all needed hooks.
- Product UX may still inherit Drawnix defaults.

Use this for MVP.

### Mode 2: Engine Adapter Package

Create an internal package:

```text
packages/canvas-engine/
  src/
    Board.tsx
    insert-cloud-diagram.ts
    export-diagram.ts
    theme.ts
```

This package wraps Drawnix/Plait APIs and exposes our own interface:

```ts
export interface DiagramCanvasEngine {
  insertGraph(graph: CloudGraph, options: InsertOptions): void
  exportImage(format: 'png' | 'svg'): Promise<Blob>
  exportDocument(): Promise<IacBoardDocument>
}
```

Pros:

- Keeps app code independent from Drawnix internals.
- Makes future engine swap possible.
- Easier tests.

Cons:

- Requires disciplined API design.

This should be built immediately after the first working prototype.

### Mode 3: Source Extraction

Copy selected Drawnix source files into our repo only if needed.

Allowed candidates:

- board wrapper,
- toolbar primitives,
- export helpers,
- menu/dialog primitives,
- styles required by the canvas.

Avoid copying:

- full app shell,
- unrelated product pages,
- tutorial content,
- all language packs if not needed,
- unused drawing plugins.

If source extraction happens:

- preserve MIT license headers where present,
- add Drawnix attribution in `NOTICE.md`,
- document copied files and modifications,
- keep the extracted code isolated under `packages/visual-engine-drawnix/`.

## Proposed Repository Shape

```text
iac-board/
  apps/
    web/
      src/
        app/
        routes/
        features/
  packages/
    iac-parser/
      src/
        terraform/
        opentofu/
        cloudformation/
    cloud-graph/
      src/
        model.ts
        normalize.ts
        relationships.ts
    layout-engine/
      src/
        cloud-layout.ts
        layers.ts
    canvas-engine/
      src/
        CanvasBoard.tsx
        insertGraph.ts
        drawnixAdapter.ts
    examples/
      aws-serverless-api/
      aws-iot-pipeline/
      aws-vpc-rds/
  docs/
```

Vite can be used for the first version. If the project grows, move to a monorepo
with Nx, Turborepo, or pnpm workspaces.

## Technical Boundaries

### Parser Boundary

Input:

- file paths,
- file contents,
- parser options.

Output:

- raw IaC resources,
- diagnostics,
- source locations.

The parser must not import React or canvas code.

### Cloud Graph Boundary

Input:

- raw provider resources.

Output:

- provider-aware but renderer-independent graph:

```ts
type CloudGraph = {
  nodes: CloudNode[]
  edges: CloudEdge[]
  groups: CloudGroup[]
  diagnostics: Diagnostic[]
}
```

The graph must not contain Drawnix or Plait element types.

### Layout Boundary

Input:

- `CloudGraph`.

Output:

- positioned graph:

```ts
type PositionedCloudGraph = CloudGraph & {
  layout: Record<NodeId, Rectangle>
}
```

The layout engine should know cloud semantics such as VPC, subnet, region, and
service category, but should not know about React components.

### Canvas Boundary

Input:

- `PositionedCloudGraph`.

Output:

- Drawnix/Plait elements inserted into the board.

This is the only layer allowed to import Drawnix/Plait.

## Extraction Phases

### Phase 0: Research Spike

Goal: prove that a generated graph can be inserted into a Drawnix canvas.

Tasks:

- Install `@drawnix/drawnix`.
- Render an empty board.
- Generate a small fake graph.
- Convert graph to Plait/Drawnix elements.
- Insert using `board.insertFragment(...)`.
- Export as image.

Exit criteria:

- User can click "Insert sample AWS serverless app".
- Diagram appears on canvas.
- Build passes.

### Phase 1: MVP Adapter

Goal: create our own canvas API.

Tasks:

- Create `packages/canvas-engine`.
- Wrap Drawnix in `CanvasBoard`.
- Add `insertGraph(graph)` API.
- Add adapter tests around generated element shape.
- Add one diagram theme.

Exit criteria:

- App code never calls Drawnix directly except inside `canvas-engine`.

### Phase 2: Terraform Parser

Goal: parse enough Terraform for useful diagrams.

Tasks:

- Choose parser:
  - `@cdktf/hcl2json` if usable in browser/node,
  - tree-sitter HCL,
  - WASM parser,
  - or server-side parser for first CLI-assisted version.
- Parse resources and variables.
- Preserve file path and line metadata.
- Normalize AWS resources into `CloudGraph`.

Exit criteria:

- Example Terraform folder renders a diagram.
- Unknown resources produce diagnostics, not crashes.

### Phase 3: Product Hardening

Goal: make the tool feel open-source-ready.

Tasks:

- Example gallery.
- CLI import command.
- Visual regression screenshots.
- README with GIF.
- Contribution guide.
- License and NOTICE.

Exit criteria:

- New user can run the project locally in under five minutes.
- Tests cover parser, graph, layout, and canvas adapter.

## Risks

### Drawnix API Instability

Mitigation:

- Use an adapter layer.
- Pin package versions.
- Keep source extraction as fallback.

### Terraform Parsing Complexity

Mitigation:

- Start with static resources.
- Report unresolved expressions.
- Avoid pretending full Terraform evaluation in MVP.

### Layout Quality

Mitigation:

- Start with deterministic layered layout.
- Add manual editing.
- Store user adjustments in `.iac-board.json`.

### Legal / Attribution

Mitigation:

- Keep MIT license text.
- Add attribution to Drawnix and Plait.
- Keep copied source isolated if extraction happens.

## Decision

Use dependency mode for MVP, adapter mode immediately after proof of concept,
and source extraction only for blocked customization.
