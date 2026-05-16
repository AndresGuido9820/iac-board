/**
 * HCL Abstract Syntax Tree types.
 *
 * We use a simplified AST focused on what matters for IaC diagram generation:
 * block structure, attribute values, and resource references.
 */

/** A complete parsed HCL file */
export type HclFile = {
  blocks: HclBlock[]
  filePath: string
}

/**
 * A block: type + optional labels + body.
 * Examples:
 *   resource "aws_vpc" "main" { … }      → type="resource", labels=["aws_vpc","main"]
 *   variable "prefix" { … }              → type="variable", labels=["prefix"]
 *   locals { … }                         → type="locals",   labels=[]
 *   provider "aws" { … }                 → type="provider", labels=["aws"]
 */
export type HclBlock = {
  type: string
  labels: string[]
  body: HclBody
  line: number
}

/** Body = ordered list of attributes and nested blocks */
export type HclBody = HclStatement[]
export type HclStatement = HclAttribute | HclBlock

export function isAttribute(s: HclStatement): s is HclAttribute {
  return 'value' in s
}
export function isBlock(s: HclStatement): s is HclBlock {
  return 'body' in s
}

/** An attribute: name = expression */
export type HclAttribute = {
  name: string
  value: HclExpr
  line: number
}

/**
 * Expression — we parse what we can, fall back to 'unknown' for complex cases.
 * For 'unknown', we still extract resource references from raw text.
 */
export type HclExpr =
  | { kind: 'string'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'bool'; value: boolean }
  | { kind: 'null' }
  | { kind: 'ref'; path: string[] } // e.g. ["aws_vpc","main","id"]
  | { kind: 'list'; items: HclExpr[] }
  | { kind: 'object'; entries: [string, HclExpr][] }
  | { kind: 'unknown'; raw: string } // complex expression, raw text kept

/** Flatten all raw text and refs out of an expression for reference extraction */
export function exprToRaw(expr: HclExpr): string {
  switch (expr.kind) {
    case 'string':
      return `"${expr.value}"`
    case 'number':
      return String(expr.value)
    case 'bool':
      return String(expr.value)
    case 'null':
      return 'null'
    case 'ref':
      return expr.path.join('.')
    case 'unknown':
      return expr.raw
    case 'list':
      return expr.items.map(exprToRaw).join(' ')
    case 'object':
      return expr.entries.map(([k, v]) => `${k} = ${exprToRaw(v)}`).join(' ')
  }
}

/** Resolve a simple scalar expression to a string value, or undefined */
export function exprToString(expr: HclExpr): string | undefined {
  if (expr.kind === 'string') return expr.value
  if (expr.kind === 'number') return String(expr.value)
  if (expr.kind === 'bool') return String(expr.value)
  return undefined
}

/** Find all attribute values in a body by name (non-recursive) */
export function bodyAttr(body: HclBody, name: string): HclExpr | undefined {
  for (const s of body) {
    if (isAttribute(s) && s.name === name) return s.value
  }
}

/** Find all nested blocks by type (non-recursive) */
export function bodyBlocks(body: HclBody, type: string): HclBlock[] {
  return body.filter((s): s is HclBlock => isBlock(s) && s.type === type)
}
