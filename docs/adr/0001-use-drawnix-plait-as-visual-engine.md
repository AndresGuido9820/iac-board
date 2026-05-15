# ADR 0001: Use Drawnix/Plait As Visual Engine Foundation

## Status

Proposed

## Context

IaC Board needs an editable infinite canvas with shapes, arrows, text,
exporting, and local document support. Building a whiteboard engine from scratch
would slow the project and move effort away from the unique product value:
generating architecture diagrams from infrastructure-as-code.

Drawnix already provides a whiteboard built on Plait and exposes behavior that
can insert generated elements into the board.

## Decision

Use Drawnix/Plait as the first visual engine foundation.

The product will isolate Drawnix behind a `canvas-engine` adapter so IaC parsing,
cloud graph normalization, and layout do not depend directly on Drawnix element
internals.

## Consequences

Positive:

- faster MVP,
- mature canvas behavior,
- export support,
- fewer low-level rendering bugs,
- MIT license compatibility.

Negative:

- dependency on external API stability,
- possible customization limitations,
- visual style may need work to feel like our own product.

Mitigations:

- pin versions,
- keep adapter boundary,
- write contract tests,
- extract selected source only if package APIs block product features.
