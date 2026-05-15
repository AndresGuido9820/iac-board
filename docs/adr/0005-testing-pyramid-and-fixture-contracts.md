# ADR 0005: Testing Pyramid And Fixture Contracts

## Status

Accepted

## Context

IaC Board will parse code, infer relationships, lay out diagrams, and render a
canvas. Bugs can appear at each layer. UI-only tests would be slow and brittle.

## Decision

Use a layered test strategy:

- unit tests for parser, graph, layout, and utilities,
- fixture tests for Terraform inputs,
- contract tests for canvas adapter,
- integration tests for Terraform -> graph -> layout -> canvas elements,
- Playwright e2e and visual tests for high-value product flows.

## Consequences

- Core behavior stays cheap to test.
- Parser support can grow safely through fixtures.
- Visual tests are reserved for stable screens.

## Alternatives

- Rely mostly on E2E: too slow and brittle.
- Rely mostly on snapshots: too easy to approve wrong behavior.

## Rollout

Start with Vitest, Testing Library, coverage, and Playwright smoke tests. Add
domain fixtures before implementing parser support.
