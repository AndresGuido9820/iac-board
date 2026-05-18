/**
 * parsePlanJson — parse the output of `terraform show -json` into a
 * TerraformParseResult.
 *
 * Relationships extracted from `configuration.root_module.resources[].expressions`
 * are exact (resolver by Terraform) and not inferred.
 *
 * Supported plan format_version: "1.0", "1.1", "1.2".
 */

import type { TerraformParseResult, TerraformResource } from './index'

// ── Plan JSON shape (only the fields we use) ──────────────────────────────────

interface PlanResource {
  address: string
  type: string
  name: string
}

interface PlanModule {
  resources?: PlanResource[]
  child_modules?: PlanModule[]
}

interface ConfigExprValue {
  constant_value?: unknown
  references?: string[]
}

interface ConfigExpression {
  [attr: string]: ConfigExprValue | ConfigExprValue[] | undefined
}

interface ConfigResource {
  address: string
  type: string
  name: string
  expressions?: ConfigExpression
}

interface ConfigModule {
  resources?: ConfigResource[]
  module_calls?: Record<string, { module?: ConfigModule; expressions?: ConfigExpression }>
}

interface TerraformPlan {
  format_version?: string
  planned_values?: { root_module?: PlanModule }
  configuration?: { root_module?: ConfigModule }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLAN_SOURCE = 'terraform.plan.json'

/**
 * Flatten resources from planned_values (recursive via child_modules).
 * Child module resources already carry the fully-qualified address
 * (e.g. `module.vpc.aws_subnet.private`).
 */
function flattenPlanResources(
  mod: PlanModule | undefined,
): PlanResource[] {
  if (!mod) return []
  const out: PlanResource[] = [...(mod.resources ?? [])]
  for (const child of mod.child_modules ?? []) {
    out.push(...flattenPlanResources(child))
  }
  return out
}

/**
 * Flatten config resources (recursive via module_calls).
 * Prepend the module address prefix when recursing.
 */
function flattenConfigResources(
  mod: ConfigModule | undefined,
  prefix: string,
): ConfigResource[] {
  if (!mod) return []

  const out: ConfigResource[] = (mod.resources ?? []).map((r) => ({
    ...r,
    address: prefix ? `${prefix}.${r.address}` : r.address,
  }))

  for (const [callName, call] of Object.entries(mod.module_calls ?? {})) {
    const childPrefix = prefix ? `${prefix}.module.${callName}` : `module.${callName}`
    out.push(...flattenConfigResources(call.module, childPrefix))
  }

  return out
}

/**
 * Extract resource address references from a single ConfigExpression.
 * Ignores var.*, local.*, path.*, each.*, self.*, and other non-resource refs.
 */
function refsFromExpressions(expressions: ConfigExpression): string[] {
  const refs = new Set<string>()

  function processReferences(references: string[]): void {
    for (const ref of references) {
      // Skip non-resource references
      if (
        ref.startsWith('var.') ||
        ref.startsWith('local.') ||
        ref.startsWith('path.') ||
        ref.startsWith('each.') ||
        ref.startsWith('self.') ||
        ref.startsWith('module.')   // module outputs — not a direct resource address
      ) continue

      // data.TYPE.NAME[.ATTR…] → "data.TYPE.NAME"
      if (ref.startsWith('data.')) {
        const parts = ref.split('.')
        if (parts.length >= 3) refs.add(`${parts[0]}.${parts[1]}.${parts[2]}`)
        continue
      }

      // TYPE.NAME[.ATTR…] → "TYPE.NAME"
      const parts = ref.split('.')
      if (parts.length >= 2) refs.add(`${parts[0]}.${parts[1]}`)
    }
  }

  for (const value of Object.values(expressions)) {
    if (!value) continue

    // Array expressions (e.g. `for_each` or list attributes)
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === 'object' && 'references' in item) {
          processReferences((item as ConfigExprValue).references ?? [])
        }
      }
      continue
    }

    if (typeof value === 'object' && 'references' in value) {
      processReferences(value.references ?? [])
    }
  }

  return [...refs]
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Parse the JSON output of `terraform show -json` into a TerraformParseResult.
 *
 * Emits a diagnostic error and returns empty results if:
 * - The input is not valid JSON
 * - The JSON is missing `format_version` or `planned_values`
 *
 * Resources use `metadata.confidence = 'exact'` to signal that dependencies
 * were resolved by Terraform's own graph, not inferred by regex.
 */
export function parsePlanJson(content: string): TerraformParseResult {
  let plan: TerraformPlan

  try {
    plan = JSON.parse(content) as TerraformPlan
  } catch {
    return {
      resources: [],
      diagnostics: [
        {
          code: 'PLAN001',
          severity: 'error',
          message: 'Failed to parse plan JSON: input is not valid JSON.',
          source: { filePath: PLAN_SOURCE },
        },
      ],
    }
  }

  if (!plan.format_version || !plan.planned_values) {
    return {
      resources: [],
      diagnostics: [
        {
          code: 'PLAN002',
          severity: 'error',
          message:
            'Input is not a valid Terraform plan JSON: missing format_version or planned_values.',
          source: { filePath: PLAN_SOURCE },
        },
      ],
    }
  }

  // Build a map of address → refs from configuration (if present)
  const refsMap = new Map<string, string[]>()
  const configResources = flattenConfigResources(plan.configuration?.root_module, '')
  for (const cr of configResources) {
    if (cr.expressions) {
      refsMap.set(cr.address, refsFromExpressions(cr.expressions))
    }
  }

  // Build TerraformResource[] from planned_values
  const planResources = flattenPlanResources(plan.planned_values.root_module)
  const resources: TerraformResource[] = planResources.map((pr) => ({
    address: pr.address,
    type: pr.type,
    name: pr.name,
    source: { filePath: PLAN_SOURCE },
    body: '',
    refs: refsMap.get(pr.address) ?? [],
    metadata: { confidence: 'exact' },
  }))

  return { resources, diagnostics: [] }
}
