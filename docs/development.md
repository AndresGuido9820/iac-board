# Development Guide

This guide explains how to work on IaC Board locally.

The authoritative rules live in [Development Spec](development-spec.md).

## Requirements

- Node.js 24
- npm

## Setup

```bash
npm ci
```

## Run The App

```bash
npm run dev
```

## Quality Commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Full CI-equivalent gate:

```bash
npm run check:ci
```

## Browser Tests

Install Chromium:

```bash
npx playwright install chromium
```

Run E2E:

```bash
npm run build
npm run test:e2e
```

Run visual tests:

```bash
npm run test:visual
```

Update visual snapshots intentionally:

```bash
npm run test:visual:update
```

## Security Checks

```bash
npm run security:audit
npm run security:audit-ci
```

## Documentation

Run Markdown lint:

```bash
npm run lint:md
```

Docs should be updated in the same PR as behavior changes.
