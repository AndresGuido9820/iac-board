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
 */
const ICON_ALIASES: Record<string, string> = {
  // compute → compute (orange)
  aws_s3_bucket_policy: 'aws_s3_bucket',
  // network → network (purple)
  aws_route53_record: 'aws_route53_zone',
  aws_eip: 'aws_internet_gateway',
  aws_alb: 'aws_lb',
  aws_lb_listener: 'aws_lb',
  aws_lb_target_group: 'aws_lb',
  // database → database (purple-pink)
  aws_rds_cluster_instance: 'aws_rds_cluster',
  // integration → integration (pink)
  aws_lambda_event_source_mapping: 'aws_kinesis_stream',
  aws_cloudwatch_event_rule: 'aws_cloudwatch_metric_alarm',
  aws_cloudwatch_event_target: 'aws_cloudwatch_metric_alarm',
  aws_scheduler_schedule: 'aws_sqs_queue',
  aws_kinesis_firehose_delivery_stream: 'aws_kinesis_stream',
  // security → security (red)
  aws_iam_role_policy_attachment: 'aws_iam_role',
  aws_iam_instance_profile: 'aws_iam_role',
}
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
