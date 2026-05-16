# Roadmap

> Detailed execution plan: `todo/core-plan.md`

## Phase 0: Foundation ✅

Repo structure, license, docs, contribution guide, CI, demo deploy.

---

## Phase 1: Visual Engine ✅

Own SVG canvas (no external canvas deps). Inspired by Drawnix/Plait patterns.

- [x] `packages/visual-engine` — pan, zoom, drag, node renderer, group containers, edges
- [x] AWS/GCP/Azure real service icons (Apache 2.0 — tf2d2/icons)
- [x] Icon registry generated from SVG files
- [x] Real edges from Terraform resource reference extraction
- [ ] Zoom-aware node drag
- [ ] Export PNG
- [ ] Edge routing (avoid node overlap)

---

## Phase 2: Cloud Graph Model ✅

- [x] `CloudNode`, `CloudEdge`, `CloudGroup`, `Diagnostic` with Zod validators
- [x] `IacBoardDocument` schema
- [x] Edge confidence and relation types
- [ ] More relation types (event-trigger, reads-from, writes-to per service)

---

## Phase 3: Terraform Parser

### 3.0 ✅ Basic regex parser
Handles flat `resource` blocks. Works for bundled examples.

### 3.1 ← NEXT: Proper HCL block parser
The current regex breaks on nested blocks and misses variables/locals.

- [ ] Recursive block parser (handles arbitrary nesting)
- [ ] Block types: `resource`, `variable`, `locals`, `data`, `module`, `output`, `provider`
- [ ] Attribute reference extraction (not just regex on raw body string)
- [ ] Resolve `variable.x` → default value when available
- [ ] Resolve simple `local.x` expressions
- [ ] Multi-file module: combine all `.tf` in a folder
- [ ] Diagnostics for unresolvable expressions (no crash)

### 3.2 Local module support (HU-025)
- [ ] Detect `module` blocks with local `source = "./path"`
- [ ] Recurse into child modules
- [ ] Prefix resource addresses with module path (`module.vpc.aws_vpc.main`)

### 3.3 Variables from tfvars (HU-026)
- [ ] Parse `.tfvars` files
- [ ] Override variable defaults with tfvars values

---

## Phase 4: Layout Engine

### 4.0 ✅ Grid layout
4-column grid sorted by category. Works but not readable.

### 4.1 ← NEXT (after 3.1): Layered flow layout
- [ ] Topological sort of nodes by edge dependencies
- [ ] Assign nodes to layers (left-to-right data flow)
- [ ] Group category lanes within layers
- [ ] Groups (VPC/subnet) contain their children — children positioned inside group
- [ ] Fallback to category grid when no edges

### 4.2 Saved layout
- [ ] User drag positions stored in `IacBoardDocument.layout`
- [ ] Regenerating graph reuses saved positions for matching resource IDs

---

## Phase 5: Web UX

### 5.0 ✅ Bundled examples gallery
3 examples, one-click generation, diagnostics panel, source references, i18n ES/EN.

### 5.1 ← File import (HU-001)
- [ ] Drag & drop `.tf` files onto the diagram area
- [ ] File picker (multi-select `.tf`)
- [ ] Paste HCL in a text area
- [ ] Show file count + resource count after scan
- [ ] All local — no upload

### 5.2 Node inspector panel
- [ ] Click node → side panel shows: resource type, name, attributes, source file:line
- [ ] Edge tooltip: relation type, confidence, source attribute

### 5.3 Export (HU-016)
- [ ] Export PNG
- [ ] Export SVG
- [ ] Export Markdown architecture report (HU-017)

### 5.4 Save / open
- [ ] Save `.iac-board.json` (graph + layout + diagnostics)
- [ ] Reopen saved document

---

## Phase 6: More Resource Coverage (Phase E)

### AWS additions
- [ ] `aws_ecs_cluster`, `aws_ecs_service`, `aws_ecs_task_definition`
- [ ] `aws_eks_cluster`
- [ ] `aws_lb`, `aws_lb_listener`, `aws_lb_target_group`
- [ ] `aws_cloudfront_distribution`
- [ ] `aws_cognito_user_pool`
- [ ] `aws_sfn_state_machine`
- [ ] `aws_ses_domain_identity`
- [ ] `aws_elasticache_cluster`

### GCP basics
- [ ] `google_cloudfunctions_function`, `google_storage_bucket`, `google_sql_database_instance`
- [ ] `google_pubsub_topic`, `google_bigquery_dataset`, `google_container_cluster`

### Azure basics
- [ ] `azurerm_function_app`, `azurerm_storage_account`, `azurerm_virtual_network`
- [ ] `azurerm_service_bus_namespace`, `azurerm_kubernetes_cluster`

---

## Phase 7: Open Source Polish

- [ ] README with animated GIF / screenshot
- [ ] Good first issues labeled
- [ ] Architecture decision records (ADRs) updated
- [ ] Demo video

---

## Phase 8: Advanced (after tool is solid)

- GitHub repo import (URL → files via GitHub API)
- Terraform plan JSON enrichment (HU-027)
- Architecture diff (HU-021)
- GitHub Actions integration (HU-023)
- CLI (HU-022)
- AI explanation opt-in (HU-028)
- Risk hints: public ingress, open SGs, unencrypted storage (HU-019)
- OpenTofu support (same parser, different provider namespace)

---

## Success criteria for "good enough"

- Parse a real 5-10 file Terraform module without crash
- Generated diagram is readable without moving nodes manually
- An engineer can load `.tf` files and understand their infra in < 30 seconds
- Export PNG is usable in a README
