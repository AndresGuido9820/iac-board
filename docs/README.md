# IaC Board Planning

This folder defines the product and engineering plan for IaC Board before the
visual engine is extracted or adapted.

IaC Board is not a generic whiteboard. It is a developer tool that turns
infrastructure-as-code into editable cloud architecture diagrams.

## Documents

- [Product Brief](product/product-brief.md): product vision, users, scope, and positioning.
- [User Stories](product/user-stories.md): product backlog grouped by epics and personas.
- [Development Spec](development-spec.md): development rules, quality gates, architecture boundaries, and CI expectations.
- [Development Guide](development.md): local setup and commands.
- [Git Workflow](git-workflow.md): branches, commits, authorship, and PR rules.
- [Engine Extraction Plan](engineering/engine-extraction-plan.md): how to reuse the Drawnix/Plait engine without turning this repo into a messy fork.
- [Architecture](engineering/architecture.md): target modules, data flow, interfaces, and boundaries.
- [Test Strategy](testing/test-strategy.md): unit, integration, visual, parser, and regression tests.
- [Roadmap](product/roadmap.md): phased delivery plan from MVP to open source-ready product.
- [Attribution And Licensing](engineering/attribution-and-licensing.md): license obligations and attribution model.
- [Open Source Structure Review](engineering/open-source-structure-review.md): structure patterns from tldraw, Excalidraw, Drawnix, InfraMap, and Blast Radius.
- [ADR 0001](adr/0001-use-drawnix-plait-as-visual-engine.md): initial architecture decision.

## Current Product Name

Working name: **IaC Board**

Tagline:

> Generate editable cloud architecture diagrams from Terraform.

## Engineering Principle

The parser and infrastructure model must be independent from the canvas engine.
If the visual engine changes later, the IaC graph model should survive.
