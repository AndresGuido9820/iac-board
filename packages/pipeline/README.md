# @iac-board/pipeline

Single-call orchestrator that runs the full IaC Board diagram pipeline:
**parse → graph → layout → canvas drafts**.

Use this package when you want a diagram from Terraform files without wiring each stage manually.

---

## API

```typescript
import {
  generateDiagramFromTerraformFiles,
  generateDiagramFromPlanJson,
} from '@iac-board/pipeline'

import type { DiagramPipelineResult } from '@iac-board/pipeline'
```

### `generateDiagramFromTerraformFiles(files: TerraformFile[]): DiagramPipelineResult`

```typescript
import { generateDiagramFromTerraformFiles } from '@iac-board/pipeline'

const result = generateDiagramFromTerraformFiles([
  {
    path: 'infra/main.tf',
    content: `
      resource "aws_lambda_function" "handler" {
        role = aws_iam_role.exec.arn
      }
      resource "aws_iam_role" "exec" {
        name = "lambda-exec"
      }
    `,
  },
])

result.parsed // TerraformParseResult
result.graph // CloudGraph
result.positionedGraph // PositionedCloudGraph  (graph + layout coordinates)
result.canvasDrafts // CanvasElementDraft[]
result.diagnostics // Diagnostic[]  (merged from parser + graph stages)
```

### `generateDiagramFromPlanJson(content: string): DiagramPipelineResult`

Same shape as above, but accepts the raw JSON string from `terraform show -json`.

```typescript
import { generateDiagramFromPlanJson } from '@iac-board/pipeline'
import fs from 'fs'

const content = fs.readFileSync('plan.json', 'utf-8')
const result = generateDiagramFromPlanJson(content)
// result.graph.edges have confidence: 'exact'
```

---

## Return type

```typescript
type DiagramPipelineResult = {
  parsed: TerraformParseResult // raw resources + parse diagnostics
  graph: CloudGraph // nodes, edges, groups, graph diagnostics
  positionedGraph: PositionedCloudGraph // graph + layout: Record<id, {x,y,w,h}>
  canvasDrafts: CanvasElementDraft[] // flat list for the visual renderer
  diagnostics: Diagnostic[] // all diagnostics from all stages
}
```

---

## Stage order

```
TerraformFile[] / plan JSON
        |
        v  parseTerraformFiles / parsePlanJson
TerraformParseResult
        |
        v  buildCloudGraph
CloudGraph
        |
        v  layoutCloudGraph
PositionedCloudGraph
        |
        v  toCanvasElementDrafts
CanvasElementDraft[]
```

Each stage is a pure function. The pipeline does not mutate inputs or produce side effects.

---

## Testing

```bash
npx vitest run packages/pipeline
```

Test file: `packages/pipeline/test/pipeline.test.ts`

Integration tests validate the full pipeline on realistic multi-resource fixtures including VPC + subnet group detection and plan JSON mode.
