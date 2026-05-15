# Contributing

Thanks for considering a contribution to IaC Board.

Before opening a pull request, read:

- [Development Spec](docs/development-spec.md)
- [Architecture](docs/engineering/architecture.md)
- [Test Strategy](docs/testing/test-strategy.md)
- [User Stories](docs/product/user-stories.md)

## Local Setup

```bash
npm ci
npm run dev
```

## Quality Gate

Run before opening a PR:

```bash
npm run check:ci
```

For browser tests:

```bash
npx playwright install chromium
npm run build
npm run test:e2e
```

## Development Rules

- Keep Terraform parsing independent from React and canvas code.
- Keep graph and layout code independent from Drawnix/Plait.
- Do not execute Terraform on user input.
- Add diagnostics for unsupported Terraform input.
- Add tests for parser, graph, layout, and canvas adapter behavior.
- Update docs when behavior, architecture, or security assumptions change.

## Pull Requests

Use small PRs and Conventional Commits:

```text
feat(parser): support aws_lambda_function
test(layout): add deterministic subnet layout fixture
docs: add Terraform support matrix
```

Every PR should explain:

- what changed,
- why it changed,
- how it was tested,
- which docs were updated.
