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

**Status:** 🔄 In progress
**Branch:** `feat/hu-035-edge-labels`
**PR:** TBD

Adds semantic relation labels on edges (triggers, writes-to, uses-role, etc.)
with smart midpoint positioning and toggle visibility.

---

### HU-041 — Performance benchmark (`feat/hu-041-performance-benchmark`)

**Status:** ⏳ Pending
**Branch:** `feat/hu-041-performance-benchmark`
**PR:** TBD

---

### HU-036 — AWS resource types (`feat/hu-036-aws-resource-types`)

**Status:** ⏳ Pending
**Branch:** `feat/hu-036-aws-resource-types`
**PR:** TBD
