# Changelog

All notable changes to IaC Board will be documented in this file.

The project follows Semantic Versioning while pre-1.0.

## Unreleased

- Added product planning documents.
- Added development spec.
- Added quality tooling plan and CI foundation.

## Unreleased

- Make the documented `npm install` work on a fresh clone by committing the `legacy-peer-deps` setting that CI already uses.
- Stop tracking local working notes and editor tooling.
- Fix clicking a node sometimes closing the inspector right after opening it: the inspector resized the board, so the end of the same click landed on the background and deselected the node (reproducible with imported files).
- Sync `examples/terraform/` with the bundled examples (the IoT, VPC and serverless files were outdated stubs; ECS and Modular App were missing) and test that they stay identical.
- Add browser-local architecture comparison with baseline snapshots, HCL/plan import, visual resource statuses, before/after details and JSON summary export.
- Preserve canonical parsed resource configuration and plan values for comparisons.
