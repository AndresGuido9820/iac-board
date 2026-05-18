/**
 * Regenerates src/icons/registry.ts from SVG files in src/icons/{aws,gcp,azure}/.
 * Run: node packages/visual-engine/scripts/build-icon-registry.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { join, dirname, basename } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconsDir = join(__dirname, '..', 'src', 'icons')
const outFile = join(__dirname, '..', 'src', 'icons', 'registry.ts')

const providers = ['aws', 'gcp', 'azure']
const entries = []

for (const provider of providers) {
  const dir = join(iconsDir, provider)
  let files
  try {
    files = readdirSync(dir)
      .filter((f) => f.endsWith('.svg'))
      .sort()
  } catch {
    continue
  }
  for (const file of files) {
    const resourceType = basename(file, '.svg')
    const svg = readFileSync(join(dir, file), 'utf8')
      .replace(/\n/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
    entries.push(`  ${resourceType}:\n    '${svg.replace(/'/g, "\\'")}'`)
  }
}

const aliases = `
/**
 * Alias map: resource types without a dedicated SVG file.
 * Values must be keys that exist in iconRegistry.
 * Both source and target must share the same AWS category color.
 * All cloud-graph supported types now have dedicated SVGs — this map
 * is kept for any future types added before a SVG is created.
 */
const ICON_ALIASES: Record<string, string> = {}
`

const code = `// AUTO-GENERATED — do not edit manually
// Source: packages/visual-engine/src/icons/{aws,gcp,azure}/*.svg
// Regenerate: node packages/visual-engine/scripts/build-icon-registry.mjs
// AWS icons © Amazon Web Services — used under AWS architecture icon terms

export const iconRegistry: Record<string, string> = {
${entries.join(',\n')},
}
${aliases}
export function getIcon(resourceType: string): string | undefined {
  return (
    iconRegistry[resourceType] ?? iconRegistry[ICON_ALIASES[resourceType] ?? '']
  )
}
`

writeFileSync(outFile, code, 'utf8')
console.log(`Wrote ${entries.length} icons to ${outFile}`)
