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

  // Pre-scan all files to collect module source directories so we can skip
  // module files during root-level iteration (they are expanded inline).
  const moduleSourceDirs = new Set<string>()
  for (const file of files) {
    if (!file.path.endsWith('.tf')) continue
    // Simple regex scan — avoids a full lex/parse pass
    const moduleSources = file.content.matchAll(/module\s+"[^"]+"\s*\{[^}]*source\s*=\s*"([^"]+)"/gs)
    for (const [, src] of moduleSources) {
      if (src.startsWith('./') || src.startsWith('../')) {
        const callingDir = file.path.includes('/')
          ? file.path.slice(0, file.path.lastIndexOf('/'))
          : ''
        const parts = src.replace(/^\.\//, '').split('/')
        const dirParts = callingDir ? callingDir.split('/') : []
        for (const part of parts) {
          if (part === '..') dirParts.pop()
          else if (part !== '.') dirParts.push(part)
        }
        moduleSourceDirs.add(dirParts.join('/'))
      }
    }
  }

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

    // Skip files inside module directories — they are expanded by the module block
    const fileDir = file.path.includes('/')
      ? file.path.slice(0, file.path.lastIndexOf('/'))
      : ''
    if (fileDir && moduleSourceDirs.has(fileDir)) continue

    const tokens = tokenize(file.content)
    const { file: hclFile, diagnostics: parseDiags } = parseHclFile(
      tokens,
      file.path,
    )
    diagnostics.push(...parseDiags)

    const fileResources = extractFromFile(hclFile, files, diagnostics)
    resources.push(...fileResources)
  }

  return { resources, diagnostics }
}

/**
 * Expand a local module: parse all .tf files under `moduleDirPath` from the
 * provided file set, and re-address their resources with `module.<name>.` prefix.
 * Guards against infinite recursion via `visited` (set of resolved dir paths).
 */
export function expandLocalModule(
  moduleName: string,
  moduleDirPath: string,
  allFiles: TerraformFile[],
  allDiagnostics: Diagnostic[],
  visited: Set<string>,
): TerraformResource[] {
  if (visited.has(moduleDirPath)) return []
  visited.add(moduleDirPath)

  const prefix = moduleDirPath ? moduleDirPath + '/' : ''
  const moduleFiles = allFiles.filter(
    (f) => f.path.endsWith('.tf') && (prefix === '' || f.path.startsWith(prefix)),
  )
  if (moduleFiles.length === 0) return []

  const expanded: TerraformResource[] = []
  for (const file of moduleFiles) {
    const tokens = tokenize(file.content)
    const { file: hclFile, diagnostics: parseDiags } = parseHclFile(
      tokens,
      file.path,
    )
    allDiagnostics.push(...parseDiags)

    const fileResources = extractFromFile(hclFile, allFiles, allDiagnostics, visited)
    for (const r of fileResources) {
      expanded.push({
        ...r,
        address: `module.${moduleName}.${r.address}`,
        refs: r.refs.map((ref) => `module.${moduleName}.${ref}`),
      })
    }
  }
  return expanded
}
