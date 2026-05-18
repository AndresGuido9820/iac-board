# Architecture

## Overview

IaC Board is a fully client-side, zero-execution Terraform diagram tool. The entire pipeline runs in the browser — no server, no cloud API calls, no Terraform binary.

```
Local .tf files  OR  terraform show -json output
         |
         v
  @iac-board/terraform-parser
         |
         v
  @iac-board/cloud-graph
         |
         v
  @iac-board/layout-engine
         |
         v
  @iac-board/canvas-engine
         |
         v
  @iac-board/visual-engine (CloudBoard SVG)
```

Each stage is an independent npm workspace package. The `@iac-board/pipeline` package provides a single-call orchestrator for the full stack.

---

## Package responsibilities

### `@iac-board/core-types`

Shared Zod schemas and TypeScript types. No logic, no runtime behaviour. All other packages import types from here.

Key types: `CloudNode`, `CloudEdge`, `CloudGroup`, `CloudGraph`, `Diagnostic`, `SourceLocation`, `IacBoardDocument`.

### `@iac-board/terraform-parser`

Converts raw `.tf` file content (or a `terraform show -json` JSON string) into `TerraformParseResult`:

- **HCL lexer** (`src/lexer.ts`): tokenises `.tf` text into a stream of tokens
- **HCL parser** (`src/parser.ts`): builds a shallow block tree (resource blocks, module blocks)
- **Resource extractor** (`src/extractor.ts`): walks the block tree to produce `TerraformResource[]` with resolved `refs`
- **Plan JSON parser** (`src/plan-json.ts`): extracts resources from `planned_values.root_module` and exact refs from `configuration.root_module`
- **Local module expansion**: when a `module` block has a local `source` path, the parser inlines resources from matching files

The parser never modifies the filesystem and never calls `terraform`.

### `@iac-board/cloud-graph`

Maps `TerraformParseResult` to a `CloudGraph`:

- Each `TerraformResource` becomes a `CloudNode` with a category, provider, and label
- `refs` arrays are interpreted semantically (e.g., ref to `aws_iam_role` -> `uses-role` edge; ref to `aws_s3_bucket` -> `writes-to` edge)
- VPC and subnet `CloudGroup`s are created and children are assigned by inspecting `vpc_id` and `subnet_id` refs
- Unsupported resource types produce `GRAPH001` warnings

### `@iac-board/layout-engine`

Assigns `(x, y, width, height)` to every node and group using a 5-phase algorithm:

1. **Longest-path layering** — assigns nodes to integer columns based on reference direction
2. **Barycenter crossing minimisation** — 6 forward/backward sweeps to reduce edge crossings
3. **Group-constrained post-processing** — subnet members collapse to a single column; VPC members span at most 2 adjacent columns
4. **Coordinate assignment** — maps layers to pixel columns with uniform gaps
5. **Group bounding boxes** — computed from children's bounding boxes plus padding

Output: `PositionedCloudGraph = CloudGraph & { layout: Record<id, Rectangle> }`

### `@iac-board/canvas-engine`

Thin transformation layer: converts `PositionedCloudGraph` into a flat `CanvasElementDraft[]` array (groups first, then nodes). Throws if any node or group lacks a layout entry.

### `@iac-board/visual-engine`

React SVG renderer. No dependency on any diagram library.

Key components:

- `CloudBoard` — interactive canvas container; owns pan/zoom state (`useViewport`), drag state, node selection, and keyboard navigation
- `NodeRenderer` — renders a node card with AWS category icon, label, and selection ring
- `GroupRenderer` — renders VPC/subnet group boundaries
- `EdgeRenderer` — renders bezier edges with obstacle avoidance and relation labels
- `EdgeLegend` — colour/dash legend rendered below the diagram content
- `Minimap` — thumbnail showing all nodes and groups with a viewport indicator

Edge routing (`EdgeRenderer`):

- Forward edges: cubic bezier from right-center to left-center
- Obstacles: intermediate nodes **and** group boundaries (skipped when both endpoints are inside the same group)
- When obstacles block the direct path, the arc is rerouted above all blockers
- Feedback edges (right-to-left): compact S-arc between inner faces
- `depends-on` edges: visual direction reversed so arrows flow dependency to dependent

### `@iac-board/pipeline`

Orchestrates all stages in one function call. Merges diagnostics from parser and graph stages.

```typescript
generateDiagramFromTerraformFiles(files: TerraformFile[]): DiagramPipelineResult
generateDiagramFromPlanJson(content: string): DiagramPipelineResult
```

### `@iac-board/example-catalog`

Bundled Terraform example projects (5 total). Used by `apps/web` for the examples gallery.

---

## Web application (`apps/web`)

Built with React 19 + Vite. Key modules:

| File                | Responsibility                                                                  |
| ------------------- | ------------------------------------------------------------------------------- |
| `App.tsx`           | Root state, example selection, import handling, layout persistence, language    |
| `ProductShell`      | Full page layout — hero, examples grid, metrics, diagnostics, canvas, inspector |
| `DiagramCanvas.tsx` | Wraps `CloudBoard`; provides SVG/PNG export via `foreignObject` capture         |
| `import-zone.tsx`   | Drag-and-drop and file picker for `.tf`, `.tfvars`, and `.json` plan files      |
| `translations.ts`   | EN / ES string table for all UI labels                                          |

**State managed in `App`:**

- `selectedExampleId` — currently displayed example
- `importedFiles` — user-uploaded files (overrides example)
- `mode: 'example' | 'imported' | 'plan'` — tracks whether plan JSON mode is active
- `layoutOverrides: Record<string, Rect>` — user drag positions, persisted to/from `.iac-board.json`
- `selectedNodeId` — drives the node inspector panel
- `showEdgeLabels: boolean` — toggled by the edge label button
- `lang: 'en' | 'es'` — interface language

---

## Data flow (detailed)

```
User selects example  OR  drops .tf files  OR  drops plan.json
                    |
                    v
          App.tsx determines mode:
            mode='plan'     -> generateDiagramFromPlanJson(content)
            mode='imported' -> generateDiagramFromTerraformFiles(files)
            mode='example'  -> generateDiagramFromTerraformFiles(example.files)
                    |
                    v
          DiagramPipelineResult {
            parsed, graph, positionedGraph, canvasDrafts, diagnostics
          }
                    |
            --------+--------
            |                |
            v                v
     CloudBoard           Diagnostics panel
  (visual-engine)        (parser + graph warnings)
            |
     Node inspector
  (click on iac-node)
```

---

## Save / load layout

Layout positions are serialised as `Record<nodeId, Rect>` and stored in `.iac-board.json` (version 1 of `IacBoardDocument`).

- **Save** — user clicks "Save layout"; `App.tsx` constructs the document and triggers a browser download
- **Load** — user drops a `.iac-board.json` file; the app parses it with `iacBoardDocumentSchema` and sets `layoutOverrides`; a mismatch warning appears if the `diagramId` differs

`diagramId` is a deterministic hash of the current file paths and content, so layout files are portable between machines.

---

## Security model

- No file is uploaded to any server
- No cloud credentials are required
- No `terraform` binary is invoked
- No arbitrary code from imported files is executed
- Only text content of `.tf` and `.json` files is read

All parsing happens in the browser's main thread using pure JavaScript.

---

## Testing strategy

See [`docs/testing/test-strategy.md`](../testing/test-strategy.md) for the full strategy.

| Layer                                | Tool                     | Location                                                           |
| ------------------------------------ | ------------------------ | ------------------------------------------------------------------ |
| Unit (parser, graph, layout, canvas) | Vitest                   | `packages/*/test/` or collocated `*.test.ts`                       |
| Component (React)                    | Vitest + Testing Library | `apps/web/src/*.test.tsx`, `packages/visual-engine/src/*.test.tsx` |
| Integration (full pipeline)          | Vitest                   | `packages/pipeline/test/`                                          |
| E2E                                  | Playwright               | `tests/e2e/`                                                       |
| Visual regression                    | Playwright               | `tests/visual/`                                                    |

Coverage thresholds: branches >= 70%, statements/functions/lines >= 80%.
