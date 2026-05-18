# @iac-board/visual-engine

React SVG renderer for IaC Board diagrams. Provides an interactive canvas with pan, zoom, drag-and-drop node positioning, edge routing, group containers, minimap, and edge legend.

---

## Components

### `CloudBoard`

The top-level interactive diagram component.

```tsx
import { CloudBoard } from '@iac-board/visual-engine'
import type { BoardElement } from '@iac-board/visual-engine'

<CloudBoard
  elements={boardElements}          // BoardElement[] — nodes, edges, groups
  className="my-board"
  onNodeSelect={(id) => { /* id is null when deselected */ }}
  initialOverrides={savedLayout}    // Record<string, Rect> from a saved .iac-board.json
  onOverridesChange={(overrides) => saveLayout(overrides)}
  showEdgeLabels={true}             // default true; false hides relation labels
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `elements` | `BoardElement[]` | required | Nodes, edges, and groups to render |
| `className` | `string` | — | CSS class applied to the wrapper div |
| `onNodeSelect` | `(id: string \| null) => void` | — | Called when a node is clicked or deselected |
| `initialOverrides` | `Record<string, Rect>` | `{}` | Pre-load saved node positions |
| `onOverridesChange` | `(overrides: Record<string, Rect>) => void` | — | Called after each drag-end |
| `showEdgeLabels` | `boolean` | `true` | Show/hide relation labels on edges |

**Keyboard navigation:** when the board has focus, arrow keys cycle through nodes in layout order.

---

### `EdgeRenderer`

Renders SVG paths for all edges. Used internally by `CloudBoard`.

```tsx
import { EdgeRenderer, ArrowMarker } from '@iac-board/visual-engine'

<svg>
  <ArrowMarker />   {/* defs — must appear before EdgeRenderer */}
  <EdgeRenderer
    edges={edges}
    nodeMap={nodeMap}
    showEdgeLabels={true}
    groupRects={groups.map(g => g.rect)}  // optional: group boundaries as obstacles
  />
</svg>
```

**Edge routing:**
- Forward edges (left-to-right): cubic bezier from right-center of source to left-center of target
- When intermediate nodes block the direct path, the arc routes above them
- Group boundaries are additional obstacles; edges that cross a group boundary arc around it
- Edges where both endpoints are inside the same group skip that group as an obstacle
- Feedback edges (right-to-left): compact S-arc between inner faces of the nodes
- `depends-on` edges: visual direction reversed so arrow flows dependency → dependent

**Hidden relations:** `deployed-in` and `secured-by` are not rendered as edges — group position communicates containment, security group position communicates the security relationship.

---

### `NodeRenderer`

Renders a single board node with AWS category icon, label, and selection ring.

```tsx
import { NodeRenderer } from '@iac-board/visual-engine'

<NodeRenderer
  node={boardNode}
  selected={isSelected}
  onMouseDown={(e, id) => handleSelect(id)}
/>
```

---

### `GroupRenderer`

Renders a VPC or subnet group boundary.

```tsx
import { GroupRenderer } from '@iac-board/visual-engine'

<GroupRenderer group={boardGroup} />
```

---

## Types

```typescript
type Rect = { x: number; y: number; width: number; height: number }

type BoardNode = {
  type: 'node'
  id: string
  resourceType: string   // e.g. "aws_lambda_function"
  label: string
  category: string       // e.g. "compute"
  rect: Rect
  source?: { filePath: string; line?: number }
  confidence?: 'exact' | 'inferred' | 'uncertain'
}

type BoardEdge = {
  type: 'edge'
  id: string
  from: string           // source node id
  to: string             // target node id
  relation: string       // e.g. "invokes", "writes-to"
  confidence: 'exact' | 'inferred' | 'uncertain'
}

type BoardGroup = {
  type: 'group'
  id: string
  kind: 'vpc' | 'subnet' | 'account' | 'region' | 'service'
  label: string
  rect: Rect
  children: string[]
}

type BoardElement = BoardNode | BoardEdge | BoardGroup
```

---

## Converting from pipeline output

Use the helper from `@iac-board/pipeline` to go from `.tf` files all the way to `BoardElement[]`:

```typescript
import { generateDiagramFromTerraformFiles } from '@iac-board/pipeline'
import { toBoardElements } from '@iac-board/visual-engine'

const result = generateDiagramFromTerraformFiles(files)
const elements = toBoardElements(result.graph, result.positionedGraph)

// render:
<CloudBoard elements={elements} />
```

---

## Edge relation styles

| Relation | Colour | Dash | Label |
|---|---|---|---|
| `connects` | blue `#2563eb` | solid | connects |
| `triggers` | purple `#8b5cf6` | solid | triggers |
| `publishes-to` | purple `#8b5cf6` | solid | publishes |
| `invokes` | orange `#f97316` | solid | invokes |
| `writes-to` | green `#16a34a` | solid | writes to |
| `uses-role` | gray `#94a3b8` | `4 3` | uses role |
| `depends-on` | gray `#94a3b8` | `6 3` | — |
| `deployed-in` | — | hidden | — |
| `secured-by` | — | hidden | — |

---

## Testing

```bash
npx vitest run packages/visual-engine/src
```

Test files collocated with source: `*.test.tsx`.
