# Product Brief

## Summary

IaC Board is a local-first developer tool that reads infrastructure-as-code and
generates editable architecture diagrams. The product starts as a web app for
developers, cloud engineers, DevOps engineers, and technical teams that need to
understand infrastructure quickly without manually redrawing cloud diagrams.

The first version focuses on Terraform because it is widely used, file-based,
source-controlled, and suitable for static parsing. OpenTofu can be supported
through the same HCL pipeline after the Terraform path is stable.

## Problem

Architecture diagrams often fall out of sync with real infrastructure. Teams keep
Terraform code in repositories, but the visual documentation is usually manual,
stale, or missing.

Common pain points:

- New engineers need time to understand an infrastructure repo.
- Architecture reviews require manually drawing what already exists in code.
- Security reviews need visibility into public networking, IAM, databases, and
  exposed services.
- Cloud migrations need before/after diagrams.
- Small teams do not want to open the AWS Console just to understand topology.
- Existing diagram tools are great for drawing, but weak at reading IaC.

## Product Vision

IaC Board should feel like opening a codebase and immediately getting a useful,
editable system map:

1. Import a repository or folder.
2. Detect IaC files.
3. Parse resources into a normalized graph.
4. Render a cloud architecture diagram.
5. Let the user edit, annotate, export, and save the diagram.
6. Optionally generate documentation, review notes, and risk hints.

## Target Users

### Primary

- Cloud engineers
- Software engineers working with Terraform
- DevOps and platform engineers
- Students building cloud portfolios
- Open source maintainers documenting infrastructure examples

### Secondary

- Engineering managers preparing architecture reviews
- Security reviewers needing a first-pass topology view
- Technical writers documenting cloud systems
- Consultants auditing client repositories

## Positioning

IaC Board sits between:

- generic whiteboards such as Excalidraw, Drawnix, Miro, and tldraw,
- cloud diagram tools such as Cloudcraft and Hava,
- IaC security tools such as Checkov, tfsec, and Terrascan,
- documentation generators.

Its difference is:

> IaC Board creates editable diagrams from source-controlled infrastructure code.

It is not trying to be a full cloud management console. The core value is
understanding, documenting, reviewing, and communicating infrastructure.

## MVP Scope

### Input

- Local Terraform files: `.tf`, `.tfvars` optional later.
- Basic Terraform modules: local module calls first.
- AWS resources first.

### Output

- Editable canvas diagram.
- Export PNG/SVG/JSON.
- Optional generated Markdown summary.

### First Supported Resource Families

- VPC, subnets, route tables, internet gateways, NAT gateways.
- Security groups and basic ingress/egress relationships.
- Load balancers.
- Lambda functions.
- API Gateway.
- SQS/SNS/EventBridge.
- RDS/Aurora/DynamoDB/S3.
- ECS/EKS at high level.
- IAM roles/policies as attached metadata, not first-class visual nodes in MVP.

### First Diagram Types

- System overview.
- Network topology.
- Serverless event flow.
- Data pipeline.

## Non-Goals For MVP

- Applying infrastructure changes.
- Replacing Terraform plan/apply.
- Full HCL evaluation with every dynamic expression.
- Full cloud account inventory.
- Perfect automatic layout for every possible repo.
- Multi-user collaboration.
- Realtime cloud synchronization.

## Product Differentiators

- Local-first: source code can stay on the developer machine.
- Editable: generated diagram is a starting point, not a locked render.
- Source-aware: nodes retain metadata linking back to files and line ranges.
- Explainable: generated diagrams can include confidence and skipped resources.
- Open source-friendly: useful for public repos, examples, docs, and portfolios.

## Example Workflow

1. User opens IaC Board.
2. User selects a local folder.
3. App scans for Terraform files.
4. Parser extracts resources and module calls.
5. Normalizer builds a provider-agnostic graph.
6. Layout engine groups resources by account, region, VPC, subnet, and service.
7. Canvas displays an editable diagram.
8. User adds notes and manually adjusts layout.
9. User exports PNG and commits `.iac-board.json` to the repo.

## Future Inputs

Future versions may explore additional inputs, but they are intentionally outside
the current product promise. The project should earn trust by doing Terraform
well before expanding.

## Success Criteria

The MVP is successful if a developer can point the tool at a small Terraform AWS
project and get a useful diagram in less than one minute.

Practical quality bar:

- No crash on unknown resources.
- Clear list of parsed, skipped, and unsupported resources.
- Stable diagram output for the same input.
- Export works.
- Generated diagram remains editable.
- The repo has tests, examples, docs, screenshots, and license attribution.
