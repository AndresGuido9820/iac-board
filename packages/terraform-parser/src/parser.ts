/**
 * HCL Recursive Descent Parser.
 *
 * Consumes a Token[] from the lexer and produces an HclFile AST.
 * Tolerant: on unexpected input it emits a diagnostic and skips ahead.
 */

import type { Token, TokenKind } from './lexer'
import type { HclFile, HclBlock, HclBody, HclStatement, HclExpr } from './ast'
import type { Diagnostic } from '@iac-board/core-types'

export type ParseResult = {
  file: HclFile
  diagnostics: Diagnostic[]
}

export function parseHclFile(tokens: Token[], filePath: string): ParseResult {
  const diagnostics: Diagnostic[] = []
  let pos = 0

  // ── Token helpers ──────────────────────────────────────────────────────────

  function peek(offset = 0): Token {
    let i = pos
    let count = 0
    // Skip newlines for lookahead (but not for consume)
    while (i < tokens.length) {
      if (tokens[i]!.kind === 'NEWLINE') { i++; continue }
      if (count === offset) return tokens[i]!
      count++
      i++
    }
    return tokens.at(-1)! // EOF
  }

  function current(): Token {
    return tokens[pos] ?? tokens.at(-1)!
  }

  function advance(): Token {
    const t = tokens[pos] ?? tokens.at(-1)!
    if (pos < tokens.length - 1) pos++
    return t
  }

  function skipNewlines() {
    while (current().kind === 'NEWLINE') advance()
  }

  function expect(kind: TokenKind): Token | undefined {
    skipNewlines()
    if (current().kind !== kind) {
      addDiag(`Expected ${kind}, got ${current().kind} ("${current().value}")`, current().line)
      return undefined
    }
    return advance()
  }

  function check(kind: TokenKind): boolean {
    skipNewlines()
    return current().kind === kind
  }

  function addDiag(message: string, line: number) {
    diagnostics.push({
      code: 'HCL001',
      severity: 'warning',
      message,
      source: { filePath, line },
    })
  }

  // ── Body ───────────────────────────────────────────────────────────────────

  function parseBody(stopAt: TokenKind): HclBody {
    const statements: HclStatement[] = []
    while (true) {
      skipNewlines()
      const t = current()
      if (t.kind === stopAt || t.kind === 'EOF') break
      const stmt = parseStatement()
      if (stmt) statements.push(stmt)
    }
    return statements
  }

  function parseStatement(): HclStatement | null {
    skipNewlines()
    const t = current()

    if (t.kind !== 'IDENT' && t.kind !== 'STRING') {
      // Skip unexpected token
      addDiag(`Unexpected token: ${t.kind} "${t.value}"`, t.line)
      advance()
      return null
    }

    const name = advance() // consume IDENT/STRING — type for block, name for attr

    // Distinguish block vs attribute by what follows
    // Block:     IDENT (IDENT|STRING)* LBRACE
    // Attribute: IDENT EQUALS expr
    skipNewlines()
    const next = current()

    if (next.kind === 'EQUALS') {
      // Attribute
      advance() // consume =
      const valueLine = current().line
      const value = parseExpr()
      return { name: name.value, value, line: name.line }
    }

    // Block — collect labels
    const labels: string[] = []
    while (current().kind === 'STRING' || current().kind === 'IDENT') {
      labels.push(advance().value)
      skipNewlines()
    }

    if (!expect('LBRACE')) {
      // Recovery: skip to next newline
      while (current().kind !== 'NEWLINE' && current().kind !== 'EOF') advance()
      return null
    }
    const body = parseBody('RBRACE')
    expect('RBRACE')

    return {
      type: name.value,
      labels,
      body,
      line: name.line,
    } satisfies HclBlock
  }

  // ── Expression ─────────────────────────────────────────────────────────────

  function parseExpr(): HclExpr {
    skipNewlines()
    const t = current()

    // String literal
    if (t.kind === 'STRING' || t.kind === 'HEREDOC') {
      advance()
      return { kind: 'string', value: t.value }
    }

    // Number
    if (t.kind === 'NUMBER') {
      advance()
      return { kind: 'number', value: parseFloat(t.value) }
    }

    // List [ … ]
    if (t.kind === 'LBRACKET') {
      return parseList()
    }

    // Object { … }
    if (t.kind === 'LBRACE') {
      return parseObject()
    }

    // Identifier — bool, null, reference, function call, or complex expression
    if (t.kind === 'IDENT') {
      if (t.value === 'true')  { advance(); return { kind: 'bool', value: true } }
      if (t.value === 'false') { advance(); return { kind: 'bool', value: false } }
      if (t.value === 'null')  { advance(); return { kind: 'null' } }

      // Attempt to parse a traversal: IDENT (DOT IDENT | DOT NUMBER | [INDEX])*
      // Then check if it's immediately followed by LPAREN (function call)
      const path = parseTraversal()

      // Function call — read arguments as raw, return unknown
      if (current().kind === 'LPAREN') {
        const raw = path.join('.') + readBalanced('LPAREN', 'RPAREN')
        // May have more chaining: func(...).*
        return buildComplexExpr(raw)
      }

      // Simple reference (or complex expression like `a + b`)
      const nextKind = current().kind
      if (nextKind === 'NEWLINE' || nextKind === 'COMMA' ||
          nextKind === 'RBRACE' || nextKind === 'RBRACKET' ||
          nextKind === 'RPAREN' || nextKind === 'EOF') {
        // Clean traversal reference
        return { kind: 'ref', path }
      }

      // Complex expression (ternary, binary op, etc.) — read rest as raw
      const raw = path.join('.') + readRawExpr()
      return buildComplexExpr(raw)
    }

    // Anything else — read raw until end of expression
    const raw = readRawExpr()
    return buildComplexExpr(raw)
  }

  /**
   * Read a dot-separated traversal: foo.bar.baz or foo["key"] or foo[*].bar
   * Returns the path segments (stops at non-traversal tokens).
   */
  function parseTraversal(): string[] {
    const path: string[] = [advance().value] // consume first IDENT

    while (true) {
      if (current().kind === 'DOT') {
        advance() // consume .
        if (current().kind === 'IDENT' || current().kind === 'NUMBER') {
          path.push(advance().value)
        } else if (current().kind === 'STAR') {
          advance(); path.push('*')
        } else {
          break
        }
      } else if (current().kind === 'LBRACKET') {
        // index access — consume and ignore for path purposes
        readBalanced('LBRACKET', 'RBRACKET')
      } else {
        break
      }
    }
    return path
  }

  /**
   * Reads until end of current expression statement.
   * End = NEWLINE at depth 0, or COMMA/RBRACE/RBRACKET/RPAREN at depth 0.
   */
  function readRawExpr(): string {
    let raw = ''
    let depth = 0
    while (true) {
      const t = current()
      if (t.kind === 'EOF') break
      if (depth === 0) {
        if (t.kind === 'NEWLINE') break
        if (t.kind === 'COMMA' || t.kind === 'RBRACE' ||
            t.kind === 'RBRACKET' || t.kind === 'RPAREN') break
      }
      if (t.kind === 'LBRACE' || t.kind === 'LBRACKET' || t.kind === 'LPAREN') depth++
      if (t.kind === 'RBRACE' || t.kind === 'RBRACKET' || t.kind === 'RPAREN') depth--
      raw += t.value + ' '
      advance()
    }
    return raw.trim()
  }

  /** Read a balanced bracket pair and return as string including delimiters */
  function readBalanced(open: TokenKind, close: TokenKind): string {
    if (current().kind !== open) return ''
    let result = advance().value
    let depth = 1
    while (depth > 0 && current().kind !== 'EOF') {
      const t = advance()
      result += t.value
      if (t.kind === open) depth++
      if (t.kind === close) depth--
    }
    return result
  }

  /** Build unknown expression, but attempt simple ref detection */
  function buildComplexExpr(raw: string): HclExpr {
    return { kind: 'unknown', raw }
  }

  // List [expr, expr, …]
  function parseList(): HclExpr {
    expect('LBRACKET')
    const items: HclExpr[] = []
    skipNewlines()
    while (!check('RBRACKET') && current().kind !== 'EOF') {
      // Handle "for" expressions
      if (current().kind === 'IDENT' && current().value === 'for') {
        const raw = readRawExpr()
        items.push({ kind: 'unknown', raw })
        break
      }
      items.push(parseExpr())
      skipNewlines()
      if (current().kind === 'COMMA') advance()
      skipNewlines()
    }
    expect('RBRACKET')
    return { kind: 'list', items }
  }

  // Object {key = value, …} or {key: value, …}
  function parseObject(): HclExpr {
    expect('LBRACE')
    const entries: [string, HclExpr][] = []
    skipNewlines()
    while (!check('RBRACE') && current().kind !== 'EOF') {
      skipNewlines()
      const keyTok = current()
      if (keyTok.kind !== 'IDENT' && keyTok.kind !== 'STRING') {
        // unexpected — skip
        addDiag(`Unexpected object key: ${keyTok.kind}`, keyTok.line)
        advance()
        continue
      }
      const key = advance().value
      skipNewlines()
      // Accept both = and : and => as separators
      if (current().kind === 'EQUALS' || current().kind === 'FAT_ARROW') {
        advance()
      } else if (current().kind === 'IDENT' && current().value === ':') {
        advance()
      } else {
        // Bare block-style (e.g. nested block inside object) — treat as unknown
        const raw = readRawExpr()
        entries.push([key, { kind: 'unknown', raw }])
        skipNewlines()
        if (current().kind === 'COMMA') advance()
        skipNewlines()
        continue
      }
      const value = parseExpr()
      entries.push([key, value])
      skipNewlines()
      if (current().kind === 'COMMA') advance()
      skipNewlines()
    }
    expect('RBRACE')
    return { kind: 'object', entries }
  }

  // ── Top-level file ─────────────────────────────────────────────────────────

  const body = parseBody('EOF')

  // Filter top-level blocks only (attributes at top level are rare but valid)
  const blocks: HclBlock[] = body.filter(
    (s): s is HclBlock => 'body' in s,
  )

  return {
    file: { blocks, filePath },
    diagnostics,
  }
}
