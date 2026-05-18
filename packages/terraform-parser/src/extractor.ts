/**
 * Extractor — converts an HclFile AST into TerraformParseResult.
 *
 * Handles:
 *   resource  → TerraformResource
 *   variable  → variable defaults table (used for var.x resolution)
 *   locals    → locals table (used for local.x resolution)
 *   data      → TerraformResource with type prefixed "data."
 *   module    → local modules expanded inline; remote modules emit TF004
 *   provider  → ignored (not needed for graph)
 *   output    → ignored
 */

import type { Diagnostic } from '@iac-board/core-types'
import type { HclFile, HclBlock, HclBody, HclExpr } from './ast'
import { isAttribute, isBlock, bodyAttr, exprToString } from './ast'
import type { TerraformResource, TerraformFile } from './index'
import { expandLocalModule } from './index'
import { refsFromBody, bodyToText } from './refs'

/**
 * Resolve a module source path (e.g. "./modules/vpc") relative to the
 * directory of the calling .tf file.
 */
function resolveModulePath(
  callingFilePath: string,
  moduleSource: string,
): string {
  const callingDir = callingFilePath.includes('/')
    ? callingFilePath.slice(0, callingFilePath.lastIndexOf('/'))
    : ''
  const parts = moduleSource.replace(/^\.\//, '').split('/')
  const dirParts = callingDir ? callingDir.split('/') : []
  for (const part of parts) {
    if (part === '..') dirParts.pop()
    else if (part !== '.') dirParts.push(part)
  }
  return dirParts.join('/')
}

export function extractFromFile(
  file: HclFile,
  allFiles: TerraformFile[],
  allDiagnostics: Diagnostic[],
  _visited?: Set<string>,
): TerraformResource[] {
  const resources: TerraformResource[] = []
  const filePath = file.filePath

  // ── First pass: collect variable defaults and locals ──────────────────────

  const varDefaults: Map<string, string> = new Map()
  const localValues: Map<string, string> = new Map()

  for (const block of file.blocks) {
    if (block.type === 'variable' && block.labels[0]) {
      const defaultExpr = bodyAttr(block.body, 'default')
      if (defaultExpr) {
        const val = exprToString(defaultExpr)
        if (val !== undefined) varDefaults.set(block.labels[0], val)
      }
    }
    if (block.type === 'locals') {
      for (const stmt of block.body) {
        if (isAttribute(stmt)) {
          const val = exprToString(stmt.value)
          if (val !== undefined) localValues.set(stmt.name, val)
        }
      }
    }
  }

  // ── Second pass: extract resources and data sources ────────────────────────

  for (const block of file.blocks) {
    if (block.type === 'resource') {
      const resourceType = block.labels[0]
      const resourceName = block.labels[1]
      if (!resourceType || !resourceName) {
        allDiagnostics.push({
          code: 'TF002',
          severity: 'warning',
          message: 'resource block missing type or name labels',
          source: { filePath, line: block.line },
        })
        continue
      }
      resources.push(
        buildResource(
          block,
          resourceType,
          resourceName,
          filePath,
          varDefaults,
          localValues,
        ),
      )
    }

    if (block.type === 'data') {
      const dataType = block.labels[0]
      const dataName = block.labels[1]
      if (!dataType || !dataName) continue
      // Represent data sources as resources with a "data." prefix address
      resources.push(
        buildResource(
          block,
          `data.${dataType}`,
          dataName,
          filePath,
          varDefaults,
          localValues,
        ),
      )
    }

    if (block.type === 'module') {
      const moduleName = block.labels[0] ?? 'unknown'
      const sourceExpr = bodyAttr(block.body, 'source')
      const sourceVal = sourceExpr ? exprToString(sourceExpr) : undefined
      const isLocal =
        sourceVal !== undefined &&
        (sourceVal.startsWith('./') || sourceVal.startsWith('../'))

      if (isLocal && sourceVal) {
        const modulePath = resolveModulePath(filePath, sourceVal)
        const visited = _visited ?? new Set<string>()
        const moduleResources = expandLocalModule(
          moduleName,
          modulePath,
          allFiles,
          allDiagnostics,
          visited,
        )
        if (moduleResources.length > 0) {
          resources.push(...moduleResources)
        } else {
          allDiagnostics.push({
            code: 'TF003',
            severity: 'info',
            message: `Local module "${moduleName}" (${sourceVal}) not expanded — no matching files found`,
            source: { filePath, line: block.line },
          })
        }
      } else if (!isLocal) {
        allDiagnostics.push({
          code: 'TF004',
          severity: 'info',
          message: `Remote module "${moduleName}" not supported in static analysis`,
          source: { filePath, line: block.line },
        })
      }
    }
  }

  return resources
}

function buildResource(
  block: HclBlock,
  resourceType: string,
  resourceName: string,
  filePath: string,
  varDefaults: Map<string, string>,
  localValues: Map<string, string>,
): TerraformResource {
  const address = `${resourceType}.${resourceName}`

  // Resolve var.x and local.x references in the body
  const resolvedBody = resolveBody(block.body, varDefaults, localValues)

  // Extract all resource-to-resource references
  const refs = refsFromBody(resolvedBody).filter(
    (r) => r !== address && !r.startsWith('data.'),
  )

  // Reconstruct body as text for backward compatibility
  const bodyText = bodyToText(resolvedBody)

  return {
    address,
    type: resourceType,
    name: resourceName,
    source: { filePath, line: block.line },
    body: bodyText,
    refs,
  }
}

/**
 * Walk a body and resolve var.x and local.x references inline.
 * Returns a new body with simple resolvable references replaced by string values.
 * Non-resolvable references are kept as-is.
 */
function resolveBody(
  body: HclBody,
  varDefaults: Map<string, string>,
  localValues: Map<string, string>,
): HclBody {
  return body.map((stmt) => {
    if (isAttribute(stmt)) {
      return {
        ...stmt,
        value: resolveExpr(stmt.value, varDefaults, localValues),
      }
    }
    if (isBlock(stmt)) {
      return { ...stmt, body: resolveBody(stmt.body, varDefaults, localValues) }
    }
    return stmt
  })
}

function resolveExpr(
  expr: HclExpr,
  varDefaults: Map<string, string>,
  localValues: Map<string, string>,
): HclExpr {
  switch (expr.kind) {
    case 'ref': {
      // var.x
      if (expr.path[0] === 'var' && expr.path[1]) {
        const val = varDefaults.get(expr.path[1])
        if (val !== undefined) return { kind: 'string', value: val }
      }
      // local.x
      if (expr.path[0] === 'local' && expr.path[1]) {
        const val = localValues.get(expr.path[1])
        if (val !== undefined) return { kind: 'string', value: val }
      }
      return expr
    }
    case 'string': {
      // Resolve ${var.x} and ${local.x} in string interpolations
      const resolved = expr.value.replace(
        /\$\{(var|local)\.([^}]+)\}/g,
        (_, kind, name) => {
          const val =
            kind === 'var' ? varDefaults.get(name) : localValues.get(name)
          return val ?? `\${${kind}.${name}}`
        },
      )
      return { kind: 'string', value: resolved }
    }
    case 'list':
      return {
        kind: 'list',
        items: expr.items.map((i) => resolveExpr(i, varDefaults, localValues)),
      }
    case 'object':
      return {
        kind: 'object',
        entries: expr.entries.map(([k, v]) => [
          k,
          resolveExpr(v, varDefaults, localValues),
        ]),
      }
    default:
      return expr
  }
}
