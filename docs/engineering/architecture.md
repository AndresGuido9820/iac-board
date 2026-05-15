# Architecture

## High-Level System

IaC Board has five core layers:

1. Source ingestion
2. IaC parsing
3. Cloud graph normalization
4. Layout generation
5. Canvas rendering and editing

```text
Local files / Git repo
        |
        v
Source Ingestion
        |
        v
IaC Parser
        |
        v
Cloud Graph
        |
        v
Layout Engine
        |
        v
Canvas Engine
        |
        v
Editable Diagram + Export
```

## Core Packages

### `iac-parser`

Responsible for parsing infrastructure code.

Initial provider:

- Terraform

OpenTofu can be added later through the same HCL parsing pipeline once the
Terraform workflow is stable.

Important rule:

> The parser returns facts and diagnostics. It does not decide how diagrams look.

### `cloud-graph`

Responsible for converting raw IaC resources into a normalized architecture
model.

Example node:

```ts
export type CloudNode = {
  id: string
  provider: 'aws' | 'azure' | 'gcp' | 'kubernetes' | 'unknown'
  kind: string
  label: string
  category:
    | 'network'
    | 'compute'
    | 'database'
    | 'storage'
    | 'security'
    | 'integration'
    | 'ai'
    | 'unknown'
  source?: SourceLocation
  metadata: Record<string, unknown>
}
```

Example edge:

```ts
export type CloudEdge = {
  id: string
  from: string
  to: string
  relation:
    | 'contains'
    | 'connects'
    | 'depends-on'
    | 'publishes-to'
    | 'reads-from'
    | 'writes-to'
    | 'invokes'
  metadata: Record<string, unknown>
}
```

### `layout-engine`

Responsible for placing resources.

Initial layout rules:

- group by provider,
- group by account/region if detected,
- group AWS networking into VPC and subnet containers,
- place ingress services on the left,
- place compute in the center,
- place storage/database on the right,
- place queues/event buses between producers and consumers,
- place security/IAM metadata as badges or side panels.

### `canvas-engine`

Responsible for converting a positioned cloud graph into Drawnix/Plait elements.

This package owns:

- shape mapping,
- color tokens,
- icon rendering,
- edge style,
- insertion into board,
- export integration.

The rest of the app must not depend on Drawnix element internals.

### `web`

Responsible for product UI:

- import screen,
- parser diagnostics,
- board screen,
- side inspector,
- export actions,
- examples gallery.

## Document Model

IaC Board should save a project document:

```ts
export type IacBoardDocument = {
  version: 1
  source: {
    type: 'local-folder' | 'git-repo' | 'example'
    name: string
    scannedAt: string
  }
  graph: CloudGraph
  layout: PositionedCloudGraph['layout']
  canvas?: unknown
  notes: DiagramNote[]
  diagnostics: Diagnostic[]
}
```

The document should be exportable as `.iac-board.json`.

## Data Flow For MVP

1. User selects an example Terraform project.
2. App loads fixture files from `examples/`.
3. Parser extracts resources.
4. Graph normalizer builds nodes and edges.
5. Layout engine computes positions.
6. Canvas adapter inserts shapes.
7. User edits diagram.
8. User exports image or saves `.iac-board.json`.

## UI Structure

Recommended first screen:

- left sidebar: import, examples, diagram types,
- main area: canvas,
- right sidebar: selected node details, source metadata, diagnostics,
- top bar: export, save, theme, layout mode.

## Parser Diagnostics

Diagnostics must be first-class. A generated diagram should never silently hide
unsupported resources.

Diagnostic examples:

- unsupported resource type,
- unresolved variable,
- unsupported dynamic block,
- module source not found,
- invalid HCL,
- relationship inferred with low confidence.

## Security Model

Default mode should be local-only.

Rules:

- Do not upload repository contents by default.
- Do not require cloud credentials for MVP.
- Do not execute Terraform.
- Do not run arbitrary code from the imported repository.
- Parse text files only.

Future optional cloud features should be explicit and credential-scoped.
