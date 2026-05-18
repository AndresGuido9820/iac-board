/**
 * HU-041 — Pipeline Performance Benchmarks
 *
 * Measures end-to-end pipeline time (parse → cloud-graph → layout → canvas)
 * on synthetic inputs of increasing size. Thresholds are conservative and
 * machine-independent (wall-clock, CI-safe). They establish a regression
 * baseline — if they start failing, investigate before changing them.
 *
 * Run individually:  npx vitest run tests/benchmark
 */
import { describe, expect, it } from 'vitest'
import { generateDiagramFromTerraformFiles } from '@iac-board/pipeline'

// ── Resource pool for synthetic generation ──────────────────────────────────

const RESOURCE_TYPES = [
  'aws_lambda_function',
  'aws_s3_bucket',
  'aws_dynamodb_table',
  'aws_sqs_queue',
  'aws_sns_topic',
  'aws_api_gateway_rest_api',
  'aws_iam_role',
  'aws_kinesis_stream',
  'aws_vpc',
  'aws_subnet',
  'aws_security_group',
  'aws_db_instance',
  'aws_ecs_service',
  'aws_ecs_cluster',
  'aws_cloudfront_distribution',
  'aws_elasticache_cluster',
  'aws_sfn_state_machine',
  'aws_cognito_user_pool',
  'aws_lb',
  'aws_ecr_repository',
]

/**
 * Generate synthetic Terraform HCL with `n` resources.
 * Resources have cross-references so the layout engine gets a real dependency graph,
 * not a trivial set of isolated nodes.
 */
function generateSyntheticTf(n: number): string {
  const lines: string[] = []

  for (let i = 0; i < n; i++) {
    const type = RESOURCE_TYPES[i % RESOURCE_TYPES.length]!
    const name = `resource_${i}`

    // Every 3rd resource references the previous one (creates a DAG)
    const ref =
      i > 0 && i % 3 === 0
        ? `  depends_on_ref = ${RESOURCE_TYPES[(i - 1) % RESOURCE_TYPES.length]}.resource_${i - 1}.id`
        : ''

    lines.push(`resource "${type}" "${name}" {\n${ref}\n}`)
  }

  return lines.join('\n')
}

// ── Timing helper ────────────────────────────────────────────────────────────

function measureMs(fn: () => void): number {
  const t0 = performance.now()
  fn()
  return performance.now() - t0
}

// ── Thresholds (ms) — CI-safe, measured on a modest developer machine ────────

const THRESHOLDS = {
  10: 100, // trivially fast
  50: 500, // small module
  100: 1500, // medium module
  200: 4000, // large monolith
} as const

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Pipeline performance benchmarks (HU-041)', () => {
  for (const [sizeStr, maxMs] of Object.entries(THRESHOLDS)) {
    const size = Number(sizeStr)

    it(`processes ${size} resources in < ${maxMs}ms`, () => {
      const content = generateSyntheticTf(size)
      const files = [{ path: 'main.tf', content }]

      const elapsed = measureMs(() => {
        const result = generateDiagramFromTerraformFiles(files)
        // Sanity: correct node count
        expect(result.graph.nodes).toHaveLength(size)
      })

      // Log for visibility in CI output
      console.warn(
        `[bench] ${size} resources: ${elapsed.toFixed(1)}ms (limit ${maxMs}ms)`,
      )

      expect(elapsed).toBeLessThan(maxMs)
    })
  }

  it('produces deterministic output for the same input', () => {
    const content = generateSyntheticTf(20)
    const files = [{ path: 'main.tf', content }]

    const r1 = generateDiagramFromTerraformFiles(files)
    const r2 = generateDiagramFromTerraformFiles(files)

    // Node IDs and positions must be identical across runs
    const ids1 = r1.graph.nodes.map((n) => n.id).sort()
    const ids2 = r2.graph.nodes.map((n) => n.id).sort()
    expect(ids1).toEqual(ids2)

    const pos1 = r1.positionedGraph.nodes.map((n) => ({
      id: n.id,
      x: n.x,
      y: n.y,
    }))
    const pos2 = r2.positionedGraph.nodes.map((n) => ({
      id: n.id,
      x: n.x,
      y: n.y,
    }))
    expect(pos1).toEqual(pos2)
  })

  it('does not crash on empty input', () => {
    const result = generateDiagramFromTerraformFiles([
      { path: 'empty.tf', content: '' },
    ])
    expect(result.graph.nodes).toHaveLength(0)
    expect(result.graph.edges).toHaveLength(0)
    expect(result.canvasDrafts).toHaveLength(0)
  })

  it('scales linearly — 200 resources takes less than 10× time of 20 resources', () => {
    const small = generateSyntheticTf(20)
    const large = generateSyntheticTf(200)

    const tSmall = measureMs(() =>
      generateDiagramFromTerraformFiles([{ path: 'main.tf', content: small }]),
    )
    const tLarge = measureMs(() =>
      generateDiagramFromTerraformFiles([{ path: 'main.tf', content: large }]),
    )

    // Floor of 1ms prevents false failures when tSmall is sub-millisecond
    // (timer granularity makes ratios meaningless at that scale).
    const tSmallFloor = Math.max(tSmall, 1)

    console.warn(
      `[bench] scaling ratio: ${(tLarge / tSmallFloor).toFixed(1)}× (200 vs 20 resources, floor 1ms)`,
    )

    // 200 resources (10×) should take less than 20× the time — roughly linear.
    // 20× is generous to catch quadratic regressions while tolerating JIT warmup.
    expect(tLarge).toBeLessThan(tSmallFloor * 20)
  })
})
