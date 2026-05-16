# IaC Board — Work Log

## 2026-05-16

### Session baseline — pre-HU branches

Committed all work from previous sessions:

- HCL recursive-descent parser (lexer, parser, AST, extractor, refs) — 908 lines
- Topology-aware layout engine (longest-path DP layering)
- Semantic edge inference (8 relation types: triggers, writes-to, uses-role, deployed-in, secured-by, invokes, connects, publishes-to)
- Visual engine: bezier S-curves, dot-grid background, 10 edge styles
- Example catalog: serverless (4 resources), IoT pipeline (with aws_lambda_event_source_mapping), VPC+RDS
- 11 new HUs written in todo/diagram-quality-plan.md (HU-032 to HU-042)
- All 40 tests passing

---

### HU-035 — Edge labels (`feat/hu-035-edge-labels`)

**Status:** ✅ Done — PR #10

- `bezierMidpoint()`, `LABELED_RELATIONS`, pill background, `showLabels` toggle
- 6 unit tests in `edge-renderer.test.tsx`

### HU-036 — AWS resource types (`feat/hu-036-aws-resource-types`)

**Status:** ✅ Done — PR #11

- 21 new types in `awsCategories` (compute/storage/integration/network/database/security)
- `inferRelation` rules for sfn, cloudfront, lb, ecs_service, cognito, wafv2, acm
- 2 new tests (5 total in cloud-graph)

### HU-041 — Performance benchmark (`feat/hu-041-performance-benchmark`)

**Status:** ✅ Done — PR #12

- 7 tests covering 4 size thresholds, determinism, empty input, scaling ratio
- Baseline: 200 resources in 2.3ms, 8.2× ratio for 10× size (sub-linear)

### HU-038 — File import (`feat/hu-038-file-import`)

**Status:** ✅ Done — PR #13

- `ImportZone` component: drag & drop + file picker + loaded file list
- `App.tsx`: importedFiles + mode state, useMemo on pipeline
- 4 new tests in `import-zone.test.tsx`

---

### Pending HUs

- HU-032: Sugiyama barycenter crossing minimization
- HU-033: Group-constrained layout
- HU-034: Edge routing around groups
- HU-037: Export PNG/SVG
- HU-039: Node inspector sidebar
- HU-040: Local module expansion
- HU-042: Expanded visual regression harness
