# @iac-board/example-catalog

Bundled Terraform example projects used by the IaC Board web app. Each project is a self-contained set of `.tf` files with metadata for display in the UI.

---

## API

```typescript
import {
  getExampleProject,
  exampleProjects,
} from '@iac-board/example-catalog'

import type { ExampleProject } from '@iac-board/example-catalog'
```

### `exampleProjects: ExampleProject[]`

All bundled example projects, in display order.

### `getExampleProject(id: string): ExampleProject`

Returns the example project with the given `id`. Throws if not found.

```typescript
const project = getExampleProject('aws-serverless-api')

project.id           // 'aws-serverless-api'
project.name         // 'AWS Serverless API'
project.description  // 'API Gateway, Lambda, IAM, and DynamoDB — ...'
project.files        // TerraformFile[]
```

---

## Bundled examples

| ID | Name | Resources |
|---|---|---|
| `aws-serverless-api` | AWS Serverless API | API Gateway, Lambda, IAM role, DynamoDB |
| `aws-iot-pipeline` | AWS IoT Pipeline | IoT Topic Rule, Lambda, Kinesis, S3 |
| `aws-vpc-rds` | AWS VPC + RDS | VPC, subnets, security groups, NAT gateway, RDS |
| `ecs-microservices` | ECS Microservices | ECS cluster/service/task, ALB, ECR, RDS |
| `modular-app` | Modular App | Local Terraform modules with nested resources |

---

## Type

```typescript
type ExampleProject = {
  id: string
  name: string
  description: string
  userStoryIds: string[]   // traceability to product backlog
  files: TerraformFile[]   // { path: string; content: string }[]
}
```

---

## Adding an example

1. Create the raw `.tf` file(s) under `examples/terraform/<your-example>/`.
2. Add the `ExampleProject` object to `packages/example-catalog/src/index.ts`.
3. Add it to the `exampleProjects` export array.
4. Verify it renders in `npm run dev`.
5. Update visual snapshots: `npm run test:visual:update`.

See [docs/contributing.md](../../docs/contributing.md#adding-a-new-example-project) for the full walkthrough.
