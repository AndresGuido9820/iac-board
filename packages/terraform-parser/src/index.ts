import type { Diagnostic, SourceLocation } from '@iac-board/core-types'
import { tokenize } from './lexer'
import { parseHclFile } from './parser'
import { extractFromFile } from './extractor'

export type TerraformResource = {
  address: string
  type: string
  name: string
  source: SourceLocation
  body: string
  refs: string[]
}

export type TerraformParseResult = {
  resources: TerraformResource[]
  diagnostics: Diagnostic[]
}

export type TerraformFile = {
  path: string
  content: string
}

export function parseTerraformFiles(
  files: TerraformFile[],
): TerraformParseResult {
  const resources: TerraformResource[] = []
  const diagnostics: Diagnostic[] = []

  for (const file of files) {
    if (!file.path.endsWith('.tf')) {
      diagnostics.push({
        code: 'TF001',
        severity: 'info',
        message: `Skipped non-Terraform file: ${file.path}`,
        source: { filePath: file.path },
      })
      continue
    }

    const tokens = tokenize(file.content)
    const { file: hclFile, diagnostics: parseDiags } = parseHclFile(tokens, file.path)
    diagnostics.push(...parseDiags)

    const fileResources = extractFromFile(hclFile, diagnostics)
    resources.push(...fileResources)
  }

  return { resources, diagnostics }
}
