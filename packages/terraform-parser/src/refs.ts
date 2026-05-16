/**
 * Reference extractor — finds resource references inside HCL expressions.
 *
 * A resource reference looks like:  resource_type.resource_name(.attribute)*
 * We detect them by matching provider prefixes (aws_, google_, azurerm_, etc.)
 */

import type { HclExpr, HclBody } from './ast'
import { isAttribute, isBlock, exprToRaw } from './ast'

/** Provider resource type prefixes we recognize */
const PROVIDER_PREFIXES = [
  'aws_',
  'google_',
  'azurerm_',
  'azuread_',
  'kubernetes_',
  'helm_',
  'random_',
  'tls_',
  'null_',
  'local_',
  'time_',
  'http_',
]

const REF_PATTERN = new RegExp(
  `\\b((?:${PROVIDER_PREFIXES.map((p) => p.replace('_', '_')).join('|')})[a-z0-9_]+)\\.([a-zA-Z0-9_][a-zA-Z0-9_-]*)`,
  'g',
)

/** Extract all resource references from an expression */
export function refsFromExpr(expr: HclExpr): string[] {
  const raw = exprToRaw(expr)
  return refsFromRaw(raw)
}

/** Extract all resource references from a raw text string */
export function refsFromRaw(text: string): string[] {
  const refs: Set<string> = new Set()
  for (const m of text.matchAll(REF_PATTERN)) {
    refs.add(`${m[1]}.${m[2]}`)
  }
  return [...refs]
}

/** Extract references from string interpolation markers ${…} */
export function refsFromString(value: string): string[] {
  const refs: Set<string> = new Set()
  // Extract content from ${...} blocks
  for (const m of value.matchAll(/\$\{([^}]+)\}/g)) {
    for (const ref of refsFromRaw(m[1] ?? '')) {
      refs.add(ref)
    }
  }
  // Also check the whole string for bare references (e.g. in heredocs)
  for (const ref of refsFromRaw(value)) {
    refs.add(ref)
  }
  return [...refs]
}

/** Recursively extract all resource references from an HCL body */
export function refsFromBody(body: HclBody): string[] {
  const refs: Set<string> = new Set()
  for (const stmt of body) {
    if (isAttribute(stmt)) {
      for (const ref of refsFromExpr(stmt.value)) refs.add(ref)
    } else if (isBlock(stmt)) {
      for (const ref of refsFromBody(stmt.body)) refs.add(ref)
    }
  }
  return [...refs]
}

/** Serialize a body back to approximate HCL text (for backward-compat body field) */
export function bodyToText(body: HclBody): string {
  const lines: string[] = []
  for (const stmt of body) {
    if (isAttribute(stmt)) {
      lines.push(`  ${stmt.name} = ${exprToRaw(stmt.value)}`)
    } else if (isBlock(stmt)) {
      const header = [stmt.type, ...stmt.labels.map((l) => `"${l}"`)].join(' ')
      lines.push(`  ${header} {`)
      lines.push(
        bodyToText(stmt.body)
          .split('\n')
          .map((l) => '  ' + l)
          .join('\n'),
      )
      lines.push('  }')
    }
  }
  return lines.join('\n')
}
