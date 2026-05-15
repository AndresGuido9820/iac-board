# IaC Board

Generate editable cloud architecture diagrams from infrastructure-as-code.

IaC Board is a developer tool for turning Terraform infrastructure into visual
architecture diagrams. OpenTofu can be supported through the same HCL-first
pipeline, but the product focus is Terraform.

The product is planned as a standalone open source project. It may use the
Drawnix and Plait ecosystem as its visual canvas foundation, but the unique
product layer is infrastructure parsing, cloud graph normalization, layout, and
documentation workflows.

## Vision

Architecture diagrams should not be stale screenshots or manual drawings that
drift away from the real system.

IaC Board should let a developer open an infrastructure repository and quickly
get:

- a visual cloud architecture diagram,
- editable nodes, groups, arrows, and annotations,
- source metadata that links diagram elements back to IaC files,
- parser diagnostics for unsupported or ambiguous resources,
- image and JSON export for documentation.

## First Target

The first useful version should support Terraform projects for AWS:

- VPCs, subnets, routes, internet gateways, NAT gateways,
- Lambda, API Gateway, SQS, SNS, EventBridge,
- RDS, DynamoDB, S3,
- ECS/EKS at a high level,
- security groups as relationships and metadata.

## Product Direction

IaC Board is not a cloud console and it should not apply infrastructure changes.

It is an architecture understanding and documentation tool:

```text
IaC files -> parser -> cloud graph -> layout -> editable diagram -> export
```

## Planning Docs

The engineering plan lives in [docs](docs/README.md).

Start here:

- [Product Brief](docs/product/product-brief.md)
- [User Stories](docs/product/user-stories.md)
- [Development Spec](docs/development-spec.md)
- [Git Workflow](docs/git-workflow.md)
- [Engine Extraction Plan](docs/engineering/engine-extraction-plan.md)
- [Architecture](docs/engineering/architecture.md)
- [Test Strategy](docs/testing/test-strategy.md)
- [Roadmap](docs/product/roadmap.md)
- [Attribution And Licensing](docs/engineering/attribution-and-licensing.md)
- [ADR 0001](docs/adr/0001-use-drawnix-plait-as-visual-engine.md)

## Engine Strategy

The current plan is:

1. Use Drawnix/Plait as a package dependency for the first proof of concept.
2. Wrap it behind an internal `canvas-engine` adapter.
3. Keep parser, graph, and layout independent from Drawnix internals.
4. Extract selected Drawnix source only if package APIs block product features.

This keeps IaC Board as a real product instead of a renamed fork.

## Status

Planning stage.

The next milestone is a proof of concept that renders a generated AWS
serverless architecture diagram on a Drawnix/Plait-backed canvas.

## Acknowledgements

IaC Board may use the Drawnix and Plait ecosystem as part of its visual canvas
foundation. Drawnix is an MIT-licensed open source whiteboard project.
