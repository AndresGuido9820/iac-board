# ADR 0003: Local-First Safe Terraform Parsing

## Status

Accepted

## Context

IaC Board imports user Terraform repositories. Those repositories may be private,
large, malformed, or hostile. Running Terraform or repository scripts would
create unnecessary risk for an architecture visualization tool.

## Decision

IaC Board will parse Terraform files locally and will not execute Terraform,
providers, modules, or repository scripts in the MVP.

## Consequences

- Users can inspect infrastructure without cloud credentials.
- Some computed values will remain unresolved.
- Diagnostics must clearly explain unsupported or unknown values.
- Optional Terraform plan JSON import can be considered later, with explicit user
  action.

## Alternatives

- Run `terraform plan`: more accurate but unsafe and credential-heavy.
- Use live cloud inventory: useful later, but outside MVP.

## Rollout

Document limitations, emit diagnostics, and add parser fixtures for unresolved
expressions.
