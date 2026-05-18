# @iac-board/cloud-graph

Converts a `TerraformParseResult` into a `CloudGraph` — a normalized, provider-agnostic model of cloud resources, their relationships, and network group boundaries.

---

## API

```typescript
import { buildCloudGraph } from '@iac-board/cloud-graph'
import type { CloudGraph } from '@iac-board/core-types'
```

### `buildCloudGraph(parsed: TerraformParseResult): CloudGraph`

```typescript
import { parseTerraformFiles } from '@iac-board/terraform-parser'
import { buildCloudGraph } from '@iac-board/cloud-graph'

const parsed = parseTerraformFiles([{ path: 'main.tf', content: '...' }])
const graph = buildCloudGraph(parsed)

graph.nodes   // CloudNode[]
graph.edges   // CloudEdge[]
graph.groups  // CloudGroup[] — VPC and subnet containers
graph.diagnostics  // Diagnostic[] — unsupported resource types, etc.
```

---

## Output types (from `@iac-board/core-types`)

```typescript
type CloudNode = {
  id: string           // same as resource address: "aws_lambda_function.handler"
  provider: 'aws' | 'unknown'
  kind: string         // resource type: "aws_lambda_function"
  label: string        // display label: "handler"
  category: 'network' | 'compute' | 'database' | 'storage'
           | 'security' | 'integration' | 'unknown'
  source?: SourceLocation
  metadata: Record<string, unknown>
}

type CloudEdge = {
  id: string
  from: string         // source node id
  to: string           // target node id
  relation: 'connects' | 'depends-on' | 'deployed-in' | 'invokes'
           | 'publishes-to' | 'reads-from' | 'secured-by'
           | 'triggers' | 'uses-role' | 'writes-to' | 'contains'
  confidence: 'exact' | 'inferred' | 'uncertain'
  metadata: Record<string, unknown>
}

type CloudGroup = {
  id: string
  label: string
  kind: 'vpc' | 'subnet' | 'account' | 'region' | 'service'
  children: string[]   // node ids
  metadata: Record<string, unknown>
}
```

---

## Edge inference

Edges are inferred from `refs` in the parsed resources. The mapping from raw ref to semantic relation is:

| Resource pair | Inferred relation |
|---|---|
| Any resource -> `aws_iam_role.*` | `uses-role` |
| `aws_lambda_function` -> `aws_sqs_queue` / `aws_sns_topic` / `aws_kinesis_stream` | `triggers` |
| `aws_lambda_event_source_mapping` -> source | `triggers` |
| `aws_api_gateway_rest_api` -> `aws_lambda_function` | `connects` |
| `aws_iot_topic_rule` -> `aws_lambda_function` | `triggers` |
| `aws_iot_topic_rule` -> `aws_kinesis_stream` | `publishes-to` |
| `aws_*` -> `aws_s3_bucket` | `writes-to` |
| `aws_*` -> `aws_dynamodb_table` | `writes-to` |
| `aws_*` -> `aws_security_group` | `secured-by` |
| `aws_subnet` inside `aws_vpc` | `deployed-in` |
| Other refs | `depends-on` |

When `confidence = 'exact'` (plan JSON mode) the relation is `depends-on` for all non-IAM edges.

---

## Group detection

- A `vpc` group is created for each `aws_vpc` resource. Subnets with a matching `vpc_id` ref are placed inside it.
- A `subnet` group is created for each `aws_subnet`. Resources referencing that subnet are placed inside it.

Group `children` lists node ids contained within the group.

---

## Diagnostics

Unsupported resource types produce a diagnostic:

```
{
  code: 'GRAPH001',
  severity: 'warning',
  message: 'Unsupported Terraform resource type: custom_service',
  source: { filePath: 'main.tf', line: 1 }
}
```

---

## Testing

```bash
npx vitest run packages/cloud-graph
```
