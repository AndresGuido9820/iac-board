# @iac-board/layout-engine

Assigns `(x, y, width, height)` coordinates to every node and group in a `CloudGraph` using a Sugiyama-style layered layout algorithm with group-constrained post-processing.

---

## API

```typescript
import { layoutCloudGraph } from '@iac-board/layout-engine'
import type { PositionedCloudGraph } from '@iac-board/layout-engine'
```

### `layoutCloudGraph(graph: CloudGraph): PositionedCloudGraph`

```typescript
import { buildCloudGraph } from '@iac-board/cloud-graph'
import { layoutCloudGraph } from '@iac-board/layout-engine'

const graph = buildCloudGraph(parsed)
const positioned = layoutCloudGraph(graph)

positioned.layout['aws_lambda_function.handler']
// { x: 340, y: 124, width: 220, height: 92 }

positioned.layout['vpc-main']
// { x: 220, y: 60, width: 600, height: 320 }
```

The returned `PositionedCloudGraph` is the original `CloudGraph` extended with a `layout` record.

---

## Types

```typescript
type Rectangle = {
  x: number
  y: number
  width: number
  height: number
}

type PositionedCloudGraph = CloudGraph & {
  layout: Record<string, Rectangle> // node id / group id -> position
}
```

---

## Algorithm

Layout runs in five phases:

### 1. Longest-path layering

Nodes are assigned to integer columns (layers) based on graph topology:

- A node that references B is placed **left** of B
- Nodes with no outgoing edges (pure leaves) land in the rightmost column
- Isolated nodes (no edges) are sorted by category and placed in column 0

### 2. Barycenter crossing minimisation

Sweeps forward and backward through the layer order 6 times, reordering nodes within each layer to minimise the number of edge crossings. Uses the barycenter heuristic: each node's position is the average position of its neighbours in the adjacent layer.

### 3. Group-constrained post-processing

Applied after barycenter ordering, before coordinate assignment:

- **Subnet groups** — all children of a subnet group are moved to the minimum layer occupied by any child. This prevents subnet members from spreading across unrelated columns.
- **VPC groups** — VPC children are compressed into at most 2 adjacent layers. If the span exceeds 2, overflow nodes are pulled into `minLayer + 1`.
- Layer numbers are renormalized to contiguous 0-based integers after adjustments.

### 4. Coordinate assignment

Each layer becomes a column. Nodes within a column are stacked vertically with a fixed gap. Column widths and row heights are uniform (`NODE_W = 220`, `NODE_H = 92`, `COL_GAP = 80`, `ROW_GAP = 28`).

### 5. Group bounding boxes

Group rectangles are computed by taking the bounding box of all their children's rects, expanded by a padding value. Groups that contain other groups (VPC > subnets) are expanded to contain all nested content.

---

## Constants

| Constant  | Value | Description                    |
| --------- | ----- | ------------------------------ |
| `NODE_W`  | 220   | Node width (px)                |
| `NODE_H`  | 92    | Node height (px)               |
| `COL_GAP` | 80    | Horizontal gap between columns |
| `ROW_GAP` | 28    | Vertical gap between rows      |
| `PAD_X`   | 60    | Left/right canvas padding      |
| `PAD_Y`   | 60    | Top/bottom canvas padding      |

---

## Determinism

For the same `CloudGraph` input, `layoutCloudGraph` always produces the same output. The barycenter sweep uses a stable sort. There is no randomness.

---

## Testing

```bash
npx vitest run packages/layout-engine
```

Test files: `packages/layout-engine/test/`

Key test suites:

- `layout.test.ts` — basic layering, padding, group bounds
- `crossing-minimization.test.ts` — barycenter ordering correctness
- `group-layout.test.ts` — group-constrained placement for subnet and VPC groups
