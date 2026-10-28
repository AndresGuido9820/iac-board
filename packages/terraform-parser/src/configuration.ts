import type { HclBody, HclExpr } from './ast'
import { isAttribute, isBlock } from './ast'

function expression(expr: HclExpr): unknown {
  switch (expr.kind) {
    case 'object':
      return {
        kind: expr.kind,
        entries: expr.entries
          .map(([key, value]) => [key, expression(value)])
          .sort(([a], [b]) => String(a).localeCompare(String(b))),
      }
    case 'list':
      return { kind: expr.kind, items: expr.items.map(expression) }
    default:
      return expr
  }
}

/** Preserve expression types and repeated-block order, ignoring source formatting. */
export function configurationFromBody(body: HclBody): unknown {
  return {
    attributes: body
      .filter(isAttribute)
      .map((attr) => [attr.name, expression(attr.value)])
      .sort(([a], [b]) => String(a).localeCompare(String(b))),
    blocks: body.filter(isBlock).map((block) => ({
      type: block.type,
      labels: block.labels,
      body: configurationFromBody(block.body),
    })),
  }
}
