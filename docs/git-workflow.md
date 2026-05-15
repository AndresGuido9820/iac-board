# Git Workflow

This document defines how IaC Board changes are branched, committed, reviewed,
and released.

## Authorship

All commits in this repository must be authored only by Andres Guido unless a
future contribution explicitly comes from another person.

Rules:

- Do not add `Co-authored-by` trailers.
- Do not use AI co-author trailers.
- Do not use pair-programming trailers unless Andres explicitly asks for them.
- Commit author should be:

```text
Andres <aguido@unal.edu.co>
```

If GitHub needs a noreply email later, update this document and Git config before
new commits.

## Branch Model

Use trunk-based development with short-lived branches.

Protected branch:

- `main`: stable, green, deployable.

Working branches:

- `feature/<issue>-short-name`
- `fix/<issue>-short-name`
- `docs/<issue>-short-name`
- `test/<issue>-short-name`
- `ci/<issue>-short-name`
- `chore/<issue>-short-name`
- `spike/<topic>`

Rules:

- No direct push to `main` once the remote repository is configured.
- Every meaningful change should go through a PR.
- Branches should stay small and live for days, not weeks.
- Delete branches after merge.
- Spikes must end in an ADR, issue, or discarded branch.

## Commit Style

Use Conventional Commits:

```text
<type>(<scope>): <summary>
```

Allowed types:

- `feat`: product capability.
- `fix`: bug fix.
- `docs`: documentation only.
- `test`: tests or fixtures.
- `refactor`: internal code change without behavior change.
- `chore`: maintenance/tooling.
- `ci`: GitHub Actions or automation.
- `security`: security hardening or policy.

Recommended scopes:

- `parser`
- `graph`
- `layout`
- `canvas`
- `web`
- `docs`
- `ci`
- `security`
- `repo`

Examples:

```text
docs(repo): define development and git workflow
ci(repo): add quality and security workflows
test(web): add product shell smoke tests
feat(graph): add cloud graph core types
```

## Commit Granularity

Prefer commits that tell a clean story:

1. Documentation and planning.
2. Tooling and scripts.
3. CI/CD and repository automation.
4. Governance files.
5. Product shell or code changes.
6. Tests and fixtures.

Avoid:

- mixing formatting with behavior changes,
- mixing dependency updates with feature code,
- committing generated reports,
- committing `node_modules`, `dist`, `coverage`, `playwright-report`, or
  `test-results`.

## Current Initial Commit Plan

The initial repository history should be built as a small sequence:

1. `docs(repo): add product and development planning`
2. `chore(repo): configure quality tooling`
3. `ci(repo): add quality security visual and deploy workflows`
4. `docs(repo): add governance and ADRs`
5. `test(web): add product shell smoke and visual tests`

Each commit must be reviewed locally before creation with:

```bash
git diff --cached
```

## Pull Request Rules

Every PR should include:

- summary,
- linked issue or documented task,
- testing performed,
- docs updated,
- security impact if relevant.

Required checks:

```bash
npm run check:ci
npm run lint:md
npm run security:audit-ci
npm run test:e2e
npm run test:visual
```

## Merge Rules

Default merge method:

- Squash merge.

Squash commit format:

```text
<type>(<scope>): <summary>
```

No co-author trailers.

## Release Tags

Use signed or normal annotated tags later:

```bash
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
```

Pre-1.0 milestone tags:

- `v0.1.0`: open source foundation.
- `v0.2.0`: canvas proof.
- `v0.3.0`: cloud graph model.
- `v0.4.0`: Terraform parser MVP.
- `v0.5.0`: layout and export.
- `v0.6.0`: public MVP.
