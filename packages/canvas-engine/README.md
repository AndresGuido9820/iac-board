# @iac-board/canvas-engine

Converts a `PositionedCloudGraph` into a flat list of `CanvasElementDraft` objects that the visual renderer can consume.

---

## API

```typescript
import { toCanvasElementDrafts } from '@iac-board/canvas-engine'
import type { CanvasElementDraft } from '@iac-board/canvas-engine'
```

### `toCanvasElementDrafts(graph: PositionedCloudGraph): CanvasElementDraft[]`

```typescript
import { layoutCloudGraph } from '@iac-board/layout-engine'
import { toCanvasElementDrafts } from '@iac-board/canvas-engine'

const positioned = layoutCloudGraph(graph)
const drafts = toCanvasElementDrafts(positioned)

// drafts is a mix of groups and nodes, groups first:
// [
//   { id: 'vpc-main', type: 'group', label: 'VPC main', x: 220, y: 60, width: 600, height: 320 },
//   { id: 'aws_lambda_function.handler', type: 'node', label: 'handler', x: 340, y: 124, ... },
//   ...
// ]
```

**Throws** if a node or group in the graph has no entry in `positioned.layout`. This is a programming error (layout engine bug), not a user error.

---

## Types

```typescript
type CanvasElementDraft = {
  id: string
  type: 'group' | 'node'
  label: string
  x: number
  y: number
  width: number
  height: number
}
```

---

## Notes

This package is intentionally thin. It does not make layout decisions — those belong in `@iac-board/layout-engine`. It does not apply visual styling — that belongs in `@iac-board/visual-engine`. Its sole job is the data transformation from `PositionedCloudGraph` to the flat `CanvasElementDraft[]` structure.

The visual-engine receives both the `CanvasElementDraft[]` (for positions/labels) and the original `CloudGraph` (for edge data, categories, and source locations).

---

## Testing

```bash
npx vitest run packages/canvas-engine
```
