# Fase D — Modo Plan JSON

**Status:** DONE
**Branch:** feat/fase-d-plan-json

## Objective

Accept `terraform show -json` output as an input alternative to raw .tf files.
Relationships come from Terraform's own dependency resolver — exact, not inferred.

## terraform show -json format

Key sections:

- `planned_values.root_module.resources[]` — all resources with type/name/values
- `planned_values.root_module.child_modules[]` — nested modules (recursive)
- `configuration.root_module.resources[].expressions` — attribute refs between resources
- `configuration.root_module.module_calls[]` — module references

## Tasks

### 1. Plan JSON parser (terraform-parser package)

- [x] `parsePlanJson(content: string): TerraformParseResult`
  - Extract resources from `planned_values.root_module` (recursive via child_modules)
  - Extract refs from `configuration.root_module.resources[].expressions` (references arrays)
  - Map to `TerraformResource[]` with confidence='exact' marker via metadata
  - Emit diagnostic if JSON is not a valid plan (missing format_version or planned_values)
- [x] Export from terraform-parser index

### 2. Pipeline

- [x] `generateDiagramFromPlanJson(content: string): DiagramPipelineResult`
  - Wraps parsePlanJson → buildCloudGraph → layout → canvas
- [x] Export from pipeline index

### 3. App — detect and handle plan JSON input

- [x] In ImportZone or App: detect `.json` file → route to plan parser
- [x] Show "from plan" badge instead of "Imported" when plan mode active
- [x] Translation keys: `plan_mode_badge`, `plan_mode_hint`

### 4. Tests

- [x] Unit: parsePlanJson extracts resources from planned_values
- [x] Unit: parsePlanJson extracts refs from configuration.expressions
- [x] Unit: parsePlanJson handles child_modules recursively
- [x] Unit: parsePlanJson returns diagnostic on invalid input
- [x] Integration: generateDiagramFromPlanJson produces a valid DiagramPipelineResult
