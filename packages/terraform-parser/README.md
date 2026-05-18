# @iac-board/terraform-parser

Parses Terraform (`.tf`) source files and `terraform show -json` plan output into a normalized resource list with source locations and cross-references.

No `terraform` binary required. All parsing is pure text/regex/HCL tokenisation — safe to run in the browser.

---

## API

```typescript
import { parseTerraformFiles, parsePlanJson } from '@iac-board/terraform-parser'

import type {
  TerraformFile,
  TerraformResource,
  TerraformParseResult,
} from '@iac-board/terraform-parser'
```

### `parseTerraformFiles(files: TerraformFile[]): TerraformParseResult`

Parses one or more `.tf` / `.tfvars` files from memory.

```typescript
const result = parseTerraformFiles([
  {
    path: 'infra/main.tf',
    content: `
      resource "aws_lambda_function" "handler" {
        filename = "handler.zip"
        role     = aws_iam_role.exec.arn
      }
      resource "aws_iam_role" "exec" {
        name               = "lambda-exec"
        assume_role_policy = "{}"
      }
    `,
  },
])

result.resources
// [
//   { address: 'aws_lambda_function.handler', type: 'aws_lambda_function',
//     name: 'handler', refs: ['aws_iam_role.exec'], source: { filePath: 'infra/main.tf', line: 2 } },
//   { address: 'aws_iam_role.exec', type: 'aws_iam_role',
//     name: 'exec', refs: [], source: { filePath: 'infra/main.tf', line: 8 } },
// ]

result.diagnostics
// [] — or warnings/errors for unsupported constructs
```

**Local module expansion:** When a `.tf` file contains a `module` block with a local `source` path, the parser looks for matching `.tf` files in `files` and inlines the module's resources with the module address prefix.

### `parsePlanJson(content: string): TerraformParseResult`

Parses a `terraform show -json` plan output.

```typescript
const content = fs.readFileSync('plan.json', 'utf-8')
const result = parsePlanJson(content)

// Resources come from planned_values.root_module (recursive via child_modules).
// Refs come from configuration.root_module.resources[].expressions.references[].
// All edges are marked: metadata.confidence = 'exact'
```

**Skipped ref prefixes:** `var.*`, `local.*`, `path.*`, `each.*`, `self.*`, `module.*` — these are not resource addresses.

**data sources:** `data.TYPE.NAME` references are normalised to `data.TYPE.NAME` address format.

---

## Types

```typescript
type TerraformFile = {
  path: string // relative path used for source location display
  content: string // raw file content
}

type TerraformResource = {
  address: string // e.g. "aws_lambda_function.handler"
  type: string // e.g. "aws_lambda_function"
  name: string // e.g. "handler"
  source: SourceLocation // { filePath, line?, column? }
  body: string // raw resource block body (HCL text)
  refs: string[] // resolved resource addresses this resource references
  metadata?: Record<string, unknown>
}

type TerraformParseResult = {
  resources: TerraformResource[]
  diagnostics: Diagnostic[]
}
```

---

## Diagnostics

| Code      | Severity | Meaning                                                |
| --------- | -------- | ------------------------------------------------------ |
| `PLAN001` | error    | Plan JSON is not valid JSON                            |
| `PLAN002` | error    | Plan JSON missing `format_version` or `planned_values` |

HCL parse errors surface as diagnostics with `severity: 'error'` and a source location.

---

## Internals

| File               | Responsibility                                          |
| ------------------ | ------------------------------------------------------- |
| `src/lexer.ts`     | Tokenises HCL into a flat token stream                  |
| `src/parser.ts`    | Builds a shallow block tree from the token stream       |
| `src/extractor.ts` | Walks the block tree and extracts `TerraformResource[]` |
| `src/plan-json.ts` | Parses `terraform show -json` output                    |
| `src/index.ts`     | Public re-exports                                       |

---

## Testing

```bash
npx vitest run packages/terraform-parser
```

Test files: `packages/terraform-parser/test/`
