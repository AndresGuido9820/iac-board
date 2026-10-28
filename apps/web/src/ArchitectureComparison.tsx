import { useMemo, useRef, useState } from 'react'
import {
  compareArchitectures,
  generateDiagramFromPlanJson,
  generateDiagramFromTerraformFiles,
} from '@iac-board/pipeline'
import type { DiagramPipelineResult, ResourceChange } from '@iac-board/pipeline'
import { CloudBoard, toBoardElements } from '@iac-board/visual-engine'
import type { Translations } from './translations'

const demoBefore = `resource "aws_iam_role" "worker" { name = "worker" }
resource "aws_lambda_function" "worker" {
  function_name = "worker"
  memory_size = 128
  role = aws_iam_role.worker.arn
}
resource "aws_s3_bucket" "legacy" { bucket = "legacy" }`
const demoAfter = `resource "aws_iam_role" "worker" { name = "worker" }
resource "aws_lambda_function" "worker" {
  function_name = "worker"
  memory_size = 512
  role = aws_iam_role.worker.arn
}
resource "aws_sqs_queue" "jobs" { name = "jobs" }
resource "aws_lambda_event_source_mapping" "jobs" {
  event_source_arn = aws_sqs_queue.jobs.arn
  function_name = aws_lambda_function.worker.arn
}`

export function ArchitectureComparison({
  current,
  t,
}: {
  current: DiagramPipelineResult
  t: Translations
}) {
  const [baseline, setBaseline] = useState<DiagramPipelineResult | null>(null)
  const [demo, setDemo] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const target = useMemo(
    () =>
      demo
        ? generateDiagramFromTerraformFiles([
            { path: 'current.tf', content: demoAfter },
          ])
        : current,
    [demo, current],
  )
  const result = useMemo(
    () => (baseline ? compareArchitectures(baseline, target) : null),
    [baseline, target],
  )
  const selected = result?.changes.find((c) => c.id === selectedId)
  const elements = result
    ? toBoardElements(
        result.drafts,
        result.graph.nodes,
        result.graph.edges,
      ).map((element) =>
        element.type === 'node'
          ? {
              ...element,
              changeStatus: result.changes.find((c) => c.id === element.id)
                ?.status,
            }
          : element,
      )
    : []
  const validCurrent = !target.diagnostics.some((d) => d.severity === 'error')

  function exportSummary() {
    if (!result) return
    // Summaries intentionally omit resource attribute values.
    const report = {
      version: 1,
      baseline: name,
      current: demo ? 'Demo' : 'Current diagram',
      summary: result.summary,
      changes: result.changes.map(({ id, status, reasons }) => ({
        id,
        status,
        reasons,
      })),
      diagnostics: { before: baseline?.diagnostics, after: target.diagnostics },
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'architecture-diff.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  function reasonText(change: ResourceChange) {
    return change.reasons.map((reason) => t.diff_reasons[reason]).join(', ')
  }

  return (
    <section
      className="panel architecture-comparison"
      aria-labelledby="comparison-title"
    >
      <div className="panel-header">
        <div>
          <p className="eyebrow">{t.diff_eyebrow}</p>
          <h2 id="comparison-title">{t.diff_title}</h2>
        </div>
        <div className="panel-header-actions">
          <button
            className="export-btn"
            type="button"
            disabled={current.diagnostics.some((d) => d.severity === 'error')}
            onClick={() => {
              setBaseline(current)
              setDemo(false)
              setName(t.diff_current)
              setError(false)
              setSelectedId(null)
            }}
          >
            {t.diff_pin}
          </button>
          <button
            className="export-btn"
            type="button"
            onClick={() => input.current?.click()}
          >
            {t.diff_upload}
          </button>
          <button
            className="export-btn"
            type="button"
            onClick={() => {
              setBaseline(
                generateDiagramFromTerraformFiles([
                  { path: 'baseline.tf', content: demoBefore },
                ]),
              )
              setDemo(true)
              setName(t.diff_before)
              setError(false)
              setSelectedId(null)
            }}
          >
            {t.diff_demo}
          </button>
        </div>
      </div>
      <p className="panel-copy">{t.diff_intro}</p>
      <details className="diff-limits">
        <summary>{t.diff_limits_heading}</summary>
        <p className="panel-copy">{t.diff_limits}</p>
      </details>
      <input
        ref={input}
        aria-label={t.diff_upload}
        type="file"
        accept=".tf,.json"
        multiple
        hidden
        onChange={async (event) => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          if (!files.length) return
          try {
            const loaded = await Promise.all(
              files.map(async (file) => ({
                path: file.name,
                content: await file.text(),
              })),
            )
            const isPlan =
              loaded.length === 1 && loaded[0].path.endsWith('.json')
            if (!isPlan && loaded.some((file) => !file.path.endsWith('.tf')))
              throw new Error('Unsupported input')
            const parsed = isPlan
              ? generateDiagramFromPlanJson(loaded[0].content)
              : generateDiagramFromTerraformFiles(loaded)
            if (
              parsed.diagnostics.some((d) => d.severity === 'error') ||
              !parsed.parsed.resources.length
            )
              throw new Error('Invalid baseline')
            setBaseline(parsed)
            setName(files.map((f) => f.name).join(', '))
            setDemo(false)
            setError(false)
            setSelectedId(null)
          } catch {
            setError(true)
          }
        }}
      />
      {error && (
        <p role="alert" className="import-error">
          {t.diff_error}
        </p>
      )}
      {!validCurrent && (
        <p role="alert" className="import-error">
          {t.diff_invalid_current}
        </p>
      )}
      {baseline && baseline.diagnostics.length > 0 && (
        <details>
          <summary>
            {t.parser_diagnostics} ({t.diff_baseline})
          </summary>
          <ul>
            {baseline.diagnostics.map((diagnostic, index) => (
              <li key={index}>{diagnostic.message}</li>
            ))}
          </ul>
        </details>
      )}
      {result && validCurrent && (
        <>
          <div className="diff-heading">
            <p>
              {t.diff_baseline}: <strong>{demo ? t.diff_before : name}</strong>{' '}
              → {demo ? t.diff_after : t.diff_current}
            </p>
            <button
              className="export-btn"
              type="button"
              onClick={exportSummary}
            >
              {t.diff_export}
            </button>
            <button
              className="export-btn"
              type="button"
              onClick={() => {
                setBaseline(null)
                setDemo(false)
                setSelectedId(null)
              }}
            >
              {t.diff_clear}
            </button>
          </div>
          <dl className="diff-summary" aria-label={t.diff_summary}>
            {(['added', 'changed', 'removed', 'unchanged'] as const).map(
              (status) => (
                <div key={status} className={`diff-${status}`}>
                  <dt>{t.diff_status[status]}</dt>
                  <dd>{result.summary[status]}</dd>
                </div>
              ),
            )}
          </dl>
          {result.changes.every((c) => c.status === 'unchanged') && (
            <p role="status">{t.diff_no_changes}</p>
          )}
          <div className="board-with-inspector">
            <CloudBoard
              key={`${name}:${demo}:${JSON.stringify(result.changes)}`}
              className="cloud-board"
              elements={elements}
              onNodeSelect={setSelectedId}
            />
          </div>
          <ul className="diff-resources" aria-label={t.diff_resources}>
            {result.changes
              .filter((c) => c.status !== 'unchanged')
              .map((change) => (
                <li key={change.id}>
                  <button
                    type="button"
                    className={`diff-resource diff-${change.status}`}
                    aria-pressed={selectedId === change.id}
                    onClick={() => setSelectedId(change.id)}
                  >
                    <strong>{t.diff_status[change.status]}</strong>{' '}
                    <code>{change.id}</code>
                    <small>{reasonText(change)}</small>
                  </button>
                </li>
              ))}
          </ul>
          {selected && (
            <aside className="diff-detail" aria-label={t.diff_detail}>
              <h3>{selected.id}</h3>
              <p>
                {t.diff_status[selected.status]}
                {selected.reasons.length ? `: ${reasonText(selected)}` : ''}
              </p>
              <div className="diff-code-pair">
                {(
                  [
                    ['before', t.diff_before],
                    ['after', t.diff_after],
                  ] as const
                ).map(([side, label]) => (
                  <div key={side}>
                    <h4>{label}</h4>
                    <pre>{selected[side] || t.diff_no_source}</pre>
                  </div>
                ))}
              </div>
              <h4>{t.diff_connections}</h4>
              <ul>
                {result.graph.edges
                  .filter(
                    (edge) =>
                      edge.from === selected.id || edge.to === selected.id,
                  )
                  .map((edge) => (
                    <li key={edge.id}>
                      <code>
                        {edge.from} → {edge.to}
                      </code>{' '}
                      ({edge.relation})
                    </li>
                  ))}
              </ul>
            </aside>
          )}
        </>
      )}
    </section>
  )
}
