import type { Diagnostic, SourceLocation } from '@iac-board/core-types'

export type TerraformResource = {
  address: string
  type: string
  name: string
  source: SourceLocation
  body: string
}

export type TerraformParseResult = {
  resources: TerraformResource[]
  diagnostics: Diagnostic[]
}

export type TerraformFile = {
  path: string
  content: string
}

const resourceBlockPattern =
  /resource\s+"(?<type>[^"]+)"\s+"(?<name>[^"]+)"\s*\{/g

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

    for (const match of file.content.matchAll(resourceBlockPattern)) {
      const type = match.groups?.type
      const name = match.groups?.name
      if (!type || !name) {
        continue
      }

      resources.push({
        address: `${type}.${name}`,
        type,
        name,
        source: {
          filePath: file.path,
          line: getLineNumber(file.content, match.index ?? 0),
        },
        body: extractBlockBody(file.content, match.index ?? 0),
      })
    }
  }

  return { resources, diagnostics }
}

function getLineNumber(content: string, index: number) {
  return content.slice(0, index).split('\n').length
}

function extractBlockBody(content: string, startIndex: number) {
  const nextResourceIndex = content.indexOf('\nresource ', startIndex + 1)
  const endIndex = nextResourceIndex === -1 ? content.length : nextResourceIndex
  return content.slice(startIndex, endIndex).trim()
}
