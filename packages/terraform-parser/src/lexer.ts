/**
 * HCL Lexer — tokenizes Terraform configuration files.
 *
 * Produces a flat token stream. Comments and non-significant whitespace
 * (spaces, tabs) are discarded. Newlines are kept because HCL uses them
 * as statement terminators.
 */

export type TokenKind =
  | 'IDENT' // identifier or keyword: resource, var, true, false, null …
  | 'STRING' // "…" — raw content preserved, includes ${…} markers
  | 'NUMBER' // 42 | 3.14
  | 'HEREDOC' // <<EOF … EOF — content only
  | 'LBRACE' // {
  | 'RBRACE' // }
  | 'LBRACKET' // [
  | 'RBRACKET' // ]
  | 'LPAREN' // (
  | 'RPAREN' // )
  | 'EQUALS' // =
  | 'FAT_ARROW' // =>
  | 'COMMA' // ,
  | 'DOT' // .
  | 'ELLIPSIS' // ...
  | 'STAR' // *  (splat expressions)
  | 'NEWLINE' // \n
  | 'EOF'

export type Token = {
  kind: TokenKind
  value: string
  line: number
}

export function tokenize(src: string): Token[] {
  const tokens: Token[] = []
  let pos = 0
  let line = 1

  function peek(offset = 0): string {
    return src[pos + offset] ?? ''
  }

  function advance(): string {
    const ch = src[pos++] ?? ''
    if (ch === '\n') line++
    return ch
  }

  function addToken(kind: TokenKind, value: string, tokenLine = line) {
    tokens.push({ kind, value, line: tokenLine })
  }

  while (pos < src.length) {
    const startLine = line
    const ch = peek()

    // Skip spaces and tabs
    if (ch === ' ' || ch === '\t' || ch === '\r') {
      advance()
      continue
    }

    // Newline
    if (ch === '\n') {
      advance()
      // Collapse consecutive newlines into one token
      if (tokens.at(-1)?.kind !== 'NEWLINE') {
        addToken('NEWLINE', '\n', startLine)
      }
      continue
    }

    // Line comment  # or //
    if (ch === '#' || (ch === '/' && peek(1) === '/')) {
      while (pos < src.length && peek() !== '\n') advance()
      continue
    }

    // Block comment /* … */
    if (ch === '/' && peek(1) === '*') {
      advance()
      advance() // consume /*
      while (pos < src.length) {
        if (peek() === '*' && peek(1) === '/') {
          advance()
          advance()
          break
        }
        advance()
      }
      continue
    }

    // Heredoc <<[-]IDENT\n…IDENT\n
    if (ch === '<' && peek(1) === '<') {
      advance()
      advance() // <<
      const trimIndent = peek() === '-'
      if (trimIndent) advance()
      let marker = ''
      while (pos < src.length && peek() !== '\n') {
        marker += advance()
      }
      marker = marker.trim()
      advance() // consume \n after marker
      let content = ''
      while (pos < src.length) {
        let lineContent = ''
        while (pos < src.length && peek() !== '\n') {
          lineContent += advance()
        }
        if (peek() === '\n') advance()
        const trimmed = lineContent.trimStart()
        if (trimmed === marker) break
        content += lineContent + '\n'
      }
      addToken('HEREDOC', content, startLine)
      continue
    }

    // String "…"
    if (ch === '"') {
      advance() // opening quote
      let value = ''
      let depth = 0 // interpolation depth ${ }
      while (pos < src.length) {
        const c = peek()
        if (c === '\\') {
          value += advance() + advance()
          continue
        }
        if (c === '$' && peek(1) === '{') {
          depth++
          value += advance() + advance()
          continue
        }
        if (c === '{' && depth > 0) {
          depth++
          value += advance()
          continue
        }
        if (c === '}' && depth > 0) {
          depth--
          value += advance()
          continue
        }
        if (c === '"' && depth === 0) {
          advance() // closing quote
          break
        }
        if (c === '\n') {
          value += advance() // allow multi-line strings
          continue
        }
        value += advance()
      }
      addToken('STRING', value, startLine)
      continue
    }

    // Number
    if (ch >= '0' && ch <= '9') {
      let value = ''
      while (pos < src.length && peek() >= '0' && peek() <= '9') {
        value += advance()
      }
      if (peek() === '.' && peek(1) >= '0' && peek(1) <= '9') {
        value += advance()
        while (pos < src.length && peek() >= '0' && peek() <= '9') {
          value += advance()
        }
      }
      // Handle scientific notation (1e5, 1.5e-3)
      if (peek() === 'e' || peek() === 'E') {
        value += advance()
        if (peek() === '+' || peek() === '-') value += advance()
        while (pos < src.length && peek() >= '0' && peek() <= '9') {
          value += advance()
        }
      }
      addToken('NUMBER', value, startLine)
      continue
    }

    // Identifier (includes keywords, booleans, null)
    if (isIdentStart(ch)) {
      let value = ''
      while (pos < src.length && isIdentPart(peek())) {
        value += advance()
      }
      addToken('IDENT', value, startLine)
      continue
    }

    // Punctuation
    if (ch === '{') {
      advance()
      addToken('LBRACE', '{', startLine)
      continue
    }
    if (ch === '}') {
      advance()
      addToken('RBRACE', '}', startLine)
      continue
    }
    if (ch === '[') {
      advance()
      addToken('LBRACKET', '[', startLine)
      continue
    }
    if (ch === ']') {
      advance()
      addToken('RBRACKET', ']', startLine)
      continue
    }
    if (ch === '(') {
      advance()
      addToken('LPAREN', '(', startLine)
      continue
    }
    if (ch === ')') {
      advance()
      addToken('RPAREN', ')', startLine)
      continue
    }
    if (ch === ',') {
      advance()
      addToken('COMMA', ',', startLine)
      continue
    }
    if (ch === '.') {
      if (peek(1) === '.' && peek(2) === '.') {
        advance()
        advance()
        advance()
        addToken('ELLIPSIS', '...', startLine)
      } else {
        advance()
        addToken('DOT', '.', startLine)
      }
      continue
    }
    if (ch === '=') {
      if (peek(1) === '>') {
        advance()
        advance()
        addToken('FAT_ARROW', '=>', startLine)
      } else if (peek(1) === '=') {
        advance()
        advance() /* skip == operator */
      } else {
        advance()
        addToken('EQUALS', '=', startLine)
      }
      continue
    }

    // Splat operator (e.g. aws_subnet.*.id)
    if (ch === '*') {
      advance()
      addToken('STAR', '*', startLine)
      continue
    }

    // Skip other operators (!=, >=, <=, &&, ||, !, +, -, /, %, ?, :, ~)
    // These appear inside expressions which we handle as raw text
    advance()
  }

  addToken('EOF', '', line)
  return tokens
}

function isIdentStart(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_'
}

function isIdentPart(ch: string): boolean {
  return isIdentStart(ch) || (ch >= '0' && ch <= '9') || ch === '-'
}
