# @iac-board/core-types

Shared Zod schemas and TypeScript types used across all IaC Board packages.

This package has no runtime behaviour — it only exports schemas and their inferred types. It is the single source of truth for the IaC Board data model.

---

## Types

```typescript
import type {
  SourceLocation,
  Diagnostic,
  CloudNode,
  CloudEdge,
  CloudGroup,
  CloudGraph,
  IacBoardDocument,
} from '@iac-board/core-types'
```

### `SourceLocation`

```typescript
type SourceLocation = {
  filePath: string
  line?: number // 1-based
  column?: number // 1-based
}
```

### `Diagnostic`

```typescript
type Diagnostic = {
  code: string
  message: string
  severity: 'info' | 'warning' | 'error'
  source?: SourceLocation
}
```

### `CloudNode`

```typescript
type CloudNode = {
  id: string // resource address: "aws_lambda_function.handler"
  provider: 'aws' | 'unknown'
  kind: string // resource type: "aws_lambda_function"
  label: string // short display name: "handler"
  category:
    | 'network'
    | 'compute'
    | 'database'
    | 'storage'
    | 'security'
    | 'integration'
    | 'unknown'
  source?: SourceLocation
  metadata: Record<string, unknown>
}
```

### `CloudEdge`

```typescript
type CloudEdge = {
  id: string
  from: string // source node id
  to: string // target node id
  relation:
    | 'contains'
    | 'connects'
    | 'depends-on'
    | 'deployed-in'
    | 'invokes'
    | 'publishes-to'
    | 'reads-from'
    | 'secured-by'
    | 'triggers'
    | 'uses-role'
    | 'writes-to'
  confidence: 'exact' | 'inferred' | 'uncertain'
  metadata: Record<string, unknown>
}
```

### `CloudGroup`

```typescript
type CloudGroup = {
  id: string
  label: string
  kind: 'account' | 'region' | 'vpc' | 'subnet' | 'service'
  children: string[] // node ids contained in this group
  metadata: Record<string, unknown>
}
```

### `CloudGraph`

```typescript
type CloudGraph = {
  nodes: CloudNode[]
  edges: CloudEdge[]
  groups: CloudGroup[]
  diagnostics: Diagnostic[]
}
```

### `IacBoardDocument`

The schema for `.iac-board.json` saved files:

```typescript
type IacBoardDocument = {
  version: 1
  source: {
    type: 'local-folder' | 'git-repo' | 'example'
    name: string
    scannedAt: string // ISO 8601
  }
  graph: CloudGraph
  layout: Record<
    string,
    { x: number; y: number; width: number; height: number }
  >
  diagnostics: Diagnostic[]
}
```

---

## Schemas

Zod schemas are exported alongside types for runtime validation:

```typescript
import {
  cloudGraphSchema,
  iacBoardDocumentSchema,
  diagnosticSchema,
  sourceLocationSchema,
} from '@iac-board/core-types'

// Validate a parsed .iac-board.json:
const result = iacBoardDocumentSchema.safeParse(JSON.parse(fileContent))
if (!result.success) {
  console.error(result.error.issues)
}
```

---

## Document version

The current document version is `1` (exported as `documentVersion`). Breaking changes to the `IacBoardDocument` schema must increment this value.
