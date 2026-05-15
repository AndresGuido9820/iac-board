# ADR 0004: Cloud Graph Schema And Document Versioning

## Status

Proposed

## Context

Generated diagrams need a stable internal model that can survive renderer
changes. Saved `.iac-board.json` files must remain understandable across
versions.

## Decision

Use a versioned `CloudGraph` and `IacBoardDocument` schema. Validate schemas with
Zod or JSON Schema before rendering and before loading saved documents.

## Consequences

- Parser, layout, canvas, CLI, and web can share the same contract.
- Breaking changes require migrations.
- Tests can snapshot graph output without depending on canvas internals.

## Alternatives

- Store Drawnix/Plait elements directly: faster initially, but couples the whole
  product to the visual engine.
- Store only exported images: not editable and not source-aware.

## Rollout

Create schema package before Terraform parser MVP.
