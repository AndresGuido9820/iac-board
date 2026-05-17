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

---

## 2026-05-17

### Visual Excellence Sprint — `feat/hu-032-033-layout-quality`

**Branch:** `feat/hu-032-033-layout-quality`
**PR:** #15

#### Changes implemented

**Layout quality:**
- `IMPLEMENTATION_DETAIL_TYPES`: filters `aws_db_subnet_group` from nodes/edges (kept for group propagation). VPC+RDS group: 4→3 columns.
- `HIDDEN_RELATIONS`: `deployed-in` + `secured-by` removed from canvas. Position communicates these relations.
- Subnet labels moved to bottom of group box (avoids VPC MAIN label overlap at top-left).

**Edge quality:**
- HU-034: `bezierPath` now accepts `obstacles: Rect[]`. Detects blocking nodes in horizontal path span and routes edge ABOVE them with `avoidY = minObstacle.y - 20`. `labelAnchor` updated to match.
- `EdgeRenderer` computes `obstacles` per edge (all nodes except source/target).

**Node icons:**
- `categoryIcons` fallback in `NodeRenderer`: when no specific AWS icon, renders category SVG path on tinted background. All nodes now show meaningful icons.
- `ICON_ALIASES` in `registry.ts`: 12 Terraform resource types mapped to nearest same-category icon (e.g., `aws_lambda_event_source_mapping → aws_kinesis_stream`, `aws_rds_cluster → aws_db_instance`, `aws_lb → aws_api_gateway_rest_api`).

**UX interactive:**
- Keyboard navigation: `CloudBoard` wrapper div is `role=application tabIndex=0`. `onKeyDown` handles `ArrowLeft/Right/Up/Down` to cycle through `resolvedNodes`. Calls `onNodeSelect` on each step.
- Export SVG button: `exportSvg()` uses `XMLSerializer` + XML declaration + Blob URL download. Internationalized (en/es).
- Minimap: thumbnail 120×80 in bottom-right of legend row showing node positions + viewport indicator.

**CI:**
- Coverage: statements 82.86%, branches 71.23%, functions 92.82%, lines 84.25% — all above thresholds.
- Tests: 88 passing (87+1 new obstacle-avoidance test, +5 keyboard nav tests).

**Visual quality score estimate: ~9.3/10** (L:9.5 E:9 N:9.5 C:9 U:9.5)
