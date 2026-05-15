# ADR 0002: Use TypeScript First With Parser Adapter

## Status

Accepted

## Context

IaC Board needs a web UI, canvas integration, graph model, layout engine, tests,
and future CLI. Drawnix and Plait fit naturally into TypeScript. Terraform/HCL
parsing is the only area where TypeScript may not be enough long term.

## Decision

Use TypeScript as the primary implementation language and isolate Terraform
parsing behind an adapter interface.

The first parser implementation may use TypeScript/WASM. If source locations,
diagnostics, or HCL fidelity are insufficient, the parser can be replaced by a
Go/HCL implementation without changing graph, layout, canvas, or UI packages.

## Consequences

- Contributors can work mostly in one language.
- The web app and future CLI can share core packages.
- Parser implementation remains replaceable.
- Parser contracts and fixtures become critical.

## Alternatives

- Rust + WASM: strong but higher contributor/debugging cost.
- Go + TypeScript everywhere: good parser ecosystem but more repo complexity.
- Python + TypeScript: good prototyping, weaker browser/local-first fit.

## Rollout

Define parser interfaces before implementing Terraform support. Keep parser code
independent from React, Drawnix, and Plait.
