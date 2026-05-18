import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getExampleProject,
  listExampleProjects,
} from '@iac-board/example-catalog'
import type { ExampleProject } from '@iac-board/example-catalog'
import {
  generateDiagramFromTerraformFiles,
  generateDiagramFromPlanJson,
} from '@iac-board/pipeline'
import type { DiagramPipelineResult } from '@iac-board/pipeline'
import { CloudBoard, toBoardElements } from '@iac-board/visual-engine'
import type { Rect } from '@iac-board/visual-engine'
import { translations } from './translations'
import type { Lang, Translations } from './translations'
import { ImportZone } from './import-zone'
import type { LoadedFile } from './import-zone'
import './App.css'

// ── Layout persistence ───────────────────────────────────────────────────────

const LS_PREFIX = 'iac-board:layout:'

/** FNV-1a 32-bit hash — stable identity for a set of loaded files. */
function hashFiles(files: LoadedFile[]): string {
  const str = files.map((f) => `${f.path}\x00${f.content}`).join('\x01')
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h.toString(16)
}

function loadOverrides(diagramId: string): Record<string, Rect> {
  try {
    const raw = localStorage.getItem(LS_PREFIX + diagramId)
    return raw ? (JSON.parse(raw) as Record<string, Rect>) : {}
  } catch {
    return {}
  }
}

function persistOverrides(diagramId: string, overrides: Record<string, Rect>): void {
  try {
    localStorage.setItem(LS_PREFIX + diagramId, JSON.stringify(overrides))
  } catch {
    // localStorage quota exceeded or unavailable — silently ignore
  }
}

/** Download a .iac-board.json file with the current layout overrides. */
function downloadLayoutFile(
  diagramId: string,
  name: string,
  overrides: Record<string, Rect>,
): void {
  const data = {
    version: 1,
    diagramId,
    overrides,
    savedAt: new Date().toISOString(),
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name.toLowerCase().replace(/\s+/g, '-')}.iac-board.json`
  a.click()
  URL.revokeObjectURL(url)
}

type IacBoardLayoutFile = {
  version: number
  diagramId: string
  overrides: Record<string, Rect>
}

/**
 * Read a .iac-board.json file chosen by the user.
 * Returns the overrides and the saved diagramId (for mismatch detection).
 * Throws if the file is not a valid layout file.
 */
async function readLayoutFile(
  file: File,
): Promise<{ overrides: Record<string, Rect>; savedDiagramId: string }> {
  const text = await file.text()
  const data = JSON.parse(text) as IacBoardLayoutFile
  if (!data.version || !data.overrides || typeof data.overrides !== 'object') {
    throw new Error('Invalid .iac-board.json file')
  }
  return { overrides: data.overrides, savedDiagramId: data.diagramId ?? '' }
}

/** Download the `.cloud-canvas` SVG as a self-contained SVG file. */
function exportSvg(name: string): void {
  const svg = document.querySelector<SVGSVGElement>('.cloud-canvas')
  if (!svg) return
  const serializer = new XMLSerializer()
  let src = serializer.serializeToString(svg)
  if (!src.startsWith('<?xml')) {
    src = '<?xml version="1.0" encoding="utf-8"?>\n' + src
  }
  const blob = new Blob([src], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name.toLowerCase().replace(/\s+/g, '-')}-diagram.svg`
  a.click()
  URL.revokeObjectURL(url)
}

/** Download the `.cloud-canvas` SVG rendered as a 2× PNG. */
async function exportPng(name: string): Promise<void> {
  const svg = document.querySelector<SVGSVGElement>('.cloud-canvas')
  if (!svg) return
  const serializer = new XMLSerializer()
  let src = serializer.serializeToString(svg)
  if (!src.startsWith('<?xml')) {
    src = '<?xml version="1.0" encoding="utf-8"?>\n' + src
  }
  const svgBlob = new Blob([src], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)
  const vb = svg.viewBox.baseVal
  const scale = 2
  const w = (vb.width || svg.clientWidth) * scale
  const h = (vb.height || svg.clientHeight) * scale
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = svgUrl
  })
  URL.revokeObjectURL(svgUrl)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)
  const pngUrl = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = pngUrl
  a.download = `${name.toLowerCase().replace(/\s+/g, '-')}-diagram.png`
  a.click()
}

type SelectedNode = {
  id: string
  label: string
  resourceType: string
  category: string
  sourceRef?: string
  edgesOut: number
  edgesIn: number
}

type NodeInspectorProps = {
  node: SelectedNode
  onClose: () => void
  t: Translations
}

function NodeInspector({ node, onClose, t }: NodeInspectorProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <aside className="node-inspector" aria-label={t.aria_node_inspector}>
      <div className="node-inspector-header">
        <strong>{node.label}</strong>
        <button
          aria-label={t.close_inspector}
          className="inspector-close"
          onClick={onClose}
          type="button"
        >
          ✕
        </button>
      </div>
      <dl className="inspector-fields">
        <div>
          <dt>{t.inspector_type}</dt>
          <dd>{node.resourceType}</dd>
        </div>
        <div>
          <dt>{t.inspector_category}</dt>
          <dd>{node.category}</dd>
        </div>
        {node.sourceRef && (
          <div>
            <dt>{t.inspector_source}</dt>
            <dd>
              <code>{node.sourceRef}</code>
            </dd>
          </div>
        )}
        <div>
          <dt>{t.inspector_edges_out}</dt>
          <dd>{node.edgesOut}</dd>
        </div>
        <div>
          <dt>{t.inspector_edges_in}</dt>
          <dd>{node.edgesIn}</dd>
        </div>
      </dl>
    </aside>
  )
}

type ProductShellProps = {
  examples: ExampleProject[]
  example: ExampleProject
  generatedDiagram: DiagramPipelineResult
  onSelectExample: (exampleId: string) => void
  selectedExampleId: string
  t?: Translations
  onToggleLang?: () => void
  importedFiles?: LoadedFile[]
  onFilesLoaded?: (files: LoadedFile[]) => void
  onClearImport?: () => void
  mode?: 'example' | 'imported' | 'plan'
  diagramId: string
  layoutOverrides: Record<string, Rect>
  onOverridesChange: (overrides: Record<string, Rect>) => void
  onLoadLayout?: (overrides: Record<string, Rect>) => void
}

export function ProductShell({
  examples,
  example,
  generatedDiagram,
  onSelectExample,
  selectedExampleId,
  t = translations.en,
  onToggleLang,
  importedFiles = [],
  onFilesLoaded,
  onClearImport,
  mode = 'example',
  diagramId,
  layoutOverrides,
  onOverridesChange,
  onLoadLayout,
}: ProductShellProps) {
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null)
  const [layoutMismatch, setLayoutMismatch] = useState(false)
  const layoutFileRef = useRef<HTMLInputElement>(null)

  const nodesById = new Map(
    generatedDiagram.graph.nodes.map((node) => [node.id, node]),
  )
  const nodeDrafts = generatedDiagram.canvasDrafts.filter(
    (draft) => draft.type === 'node',
  )
  const groupDrafts = generatedDiagram.canvasDrafts.filter(
    (draft) => draft.type === 'group',
  )

  const handleNodeSelect = (id: string | null) => {
    if (!id) {
      setSelectedNode(null)
      return
    }
    const graphNode = nodesById.get(id)
    if (!graphNode) {
      setSelectedNode(null)
      return
    }
    const edgesOut = generatedDiagram.graph.edges.filter(
      (e) => e.from === id,
    ).length
    const edgesIn = generatedDiagram.graph.edges.filter(
      (e) => e.to === id,
    ).length
    setSelectedNode({
      id,
      label: graphNode.label,
      resourceType: graphNode.kind,
      category: graphNode.category,
      sourceRef: graphNode.source
        ? `${graphNode.source.filePath}:${graphNode.source.line ?? 1}`
        : undefined,
      edgesOut,
      edgesIn,
    })
  }

  return (
    <main className="app-shell">
      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">{t.eyebrow_hero}</p>
        <h1 id="hero-title">IaC Board</h1>
        <p className="hero-copy">{t.hero_copy}</p>
        <div className="hero-actions" aria-label={t.aria_project_actions}>
          <a href="https://github.com/AndresGuido9820/iac-board">
            {t.view_source}
          </a>
          <a href="https://github.com/AndresGuido9820/iac-board/tree/main/examples/terraform">
            {t.terraform_examples}
          </a>
          {onToggleLang ? (
            <button className="lang-btn" onClick={onToggleLang} type="button">
              {t.lang_toggle}
            </button>
          ) : null}
        </div>
      </section>

      <section className="panel" aria-labelledby="import-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Your infrastructure</p>
            <h2 id="import-title">{t.import_section_heading}</h2>
          </div>
          {(mode === 'imported' || mode === 'plan') && (
            <button
              className="export-btn"
              onClick={onClearImport}
              type="button"
            >
              {t.import_clear}
            </button>
          )}
        </div>
        {(mode === 'imported' || mode === 'plan') && (
          <p className="panel-copy">
            {t.import_loaded_summary(importedFiles.length)}
          </p>
        )}
        <ImportZone
          loadedFiles={importedFiles}
          onFilesLoaded={onFilesLoaded ?? (() => {})}
        />
      </section>

      <section className="panel" aria-labelledby="examples-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">{t.eyebrow_samples}</p>
            <h2 id="examples-title">{t.examples_heading}</h2>
          </div>
          <span className="status-pill">
            {t.examples_count(examples.length)}
          </span>
        </div>
        <div className="example-grid" aria-label={t.aria_example_grid}>
          {examples.map((project) => (
            <button
              aria-pressed={project.id === selectedExampleId && mode === 'example'}
              className="example-card"
              key={project.id}
              onClick={() => onSelectExample(project.id)}
              type="button"
            >
              <strong>{project.name}</strong>
              <span>{project.description}</span>
              <small>{t.generate_diagram}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="example-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">{t.eyebrow_generated}</p>
            <h2 id="example-title">
              {mode === 'example' ? example.name : 'Your infrastructure'}
            </h2>
          </div>
          <div className="panel-header-actions">
            <button
              aria-label={t.export_png}
              className="export-btn"
              onClick={() => {
                const name = mode === 'example' ? example.name : 'custom'
                exportPng(name).catch(() => {})
              }}
              type="button"
            >
              {t.export_png}
            </button>
            <button
              aria-label={t.export_svg}
              className="export-btn"
              onClick={() => exportSvg(mode === 'example' ? example.name : 'custom')}
              type="button"
            >
              {t.export_svg}
            </button>
            {Object.keys(layoutOverrides).length > 0 && (
              <button
                aria-label={t.save_layout}
                className="export-btn"
                onClick={() =>
                  downloadLayoutFile(
                    diagramId,
                    mode === 'imported' ? 'custom' : example.name,
                    layoutOverrides,
                  )
                }
                type="button"
              >
                {t.save_layout}
              </button>
            )}
            <button
              aria-label={t.load_layout}
              className="export-btn"
              onClick={() => layoutFileRef.current?.click()}
              type="button"
            >
              {t.load_layout}
            </button>
            <input
              accept=".json"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file || !onLoadLayout) return
                try {
                  const { overrides, savedDiagramId } = await readLayoutFile(file)
                  const mismatch = savedDiagramId !== '' && savedDiagramId !== diagramId
                  setLayoutMismatch(mismatch)
                  onLoadLayout(overrides)
                } catch {
                  // invalid file — ignore silently
                }
                e.target.value = ''
              }}
              ref={layoutFileRef}
              style={{ display: 'none' }}
              type="file"
            />
            <span className="status-pill">
              {mode === 'plan'
                ? t.plan_mode_badge
                : mode === 'imported'
                  ? 'Imported'
                  : t.bundled_example}
            </span>
          </div>
        </div>
        {mode === 'example' && (
          <p className="panel-copy">{example.description}</p>
        )}
        {mode === 'plan' && (
          <p className="panel-copy">{t.plan_mode_hint}</p>
        )}
        {layoutMismatch && (
          <p className="panel-copy" role="alert">{t.load_layout_mismatch}</p>
        )}
        <div className="board-with-inspector">
          <CloudBoard
            className="cloud-board"
            elements={toBoardElements(
              generatedDiagram.canvasDrafts,
              generatedDiagram.graph.nodes,
              generatedDiagram.graph.edges,
            )}
            initialOverrides={layoutOverrides}
            key={diagramId}
            onNodeSelect={handleNodeSelect}
            onOverridesChange={onOverridesChange}
          />
          {selectedNode && (
            <NodeInspector
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              t={t}
            />
          )}
        </div>
        <dl className="metrics" aria-label={t.aria_metrics}>
          <div>
            <dt>{t.tf_files}</dt>
            <dd>{mode === 'example' ? example.files.length : importedFiles.length}</dd>
          </div>
          <div>
            <dt>{t.resources}</dt>
            <dd>{generatedDiagram.parsed.resources.length}</dd>
          </div>
          <div>
            <dt>{t.canvas_drafts}</dt>
            <dd>{generatedDiagram.canvasDrafts.length}</dd>
          </div>
          <div>
            <dt>{t.groups}</dt>
            <dd>{generatedDiagram.graph.groups.length}</dd>
          </div>
          <div>
            <dt>{t.diagnostics_label}</dt>
            <dd>{generatedDiagram.diagnostics.length}</dd>
          </div>
        </dl>
        {groupDrafts.length > 0 ? (
          <ul className="group-list" aria-label={t.aria_groups}>
            {groupDrafts.map((draft) => (
              <li key={draft.id}>
                <strong>{draft.label}</strong>
                <span>{draft.id}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <ul className="resource-list" aria-label={t.aria_resources}>
          {nodeDrafts.map((draft) => {
            const node = nodesById.get(draft.id)
            const sourceLabel = node?.source
              ? `${node.source.filePath}:${node.source.line ?? 1}`
              : 'Source unknown'

            return (
              <li key={draft.id}>
                <div>
                  <strong>{draft.label}</strong>
                  <small>{sourceLabel}</small>
                </div>
                <span>{draft.id}</span>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="panel" aria-labelledby="diagnostics-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">{t.eyebrow_parser}</p>
            <h2 id="diagnostics-title">{t.parser_diagnostics}</h2>
          </div>
          <span className="status-pill">
            {t.findings(generatedDiagram.diagnostics.length)}
          </span>
        </div>
        {generatedDiagram.diagnostics.length === 0 ? (
          <p className="empty-state">{t.no_diagnostics}</p>
        ) : (
          <ul className="diagnostic-list" aria-label={t.aria_diagnostics_list}>
            {generatedDiagram.diagnostics.map((diagnostic) => (
              <li key={`${diagnostic.code}-${diagnostic.message}`}>
                <strong>{diagnostic.severity}</strong>
                <span>{diagnostic.message}</span>
                {diagnostic.source ? (
                  <small>
                    {diagnostic.source.filePath}:{diagnostic.source.line ?? 1}
                  </small>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

function App() {
  const examples = useMemo(() => listExampleProjects(), [])
  const [selectedExampleId, setSelectedExampleId] = useState(examples[0]?.id)
  const [lang, setLang] = useState<Lang>('en')
  const [importedFiles, setImportedFiles] = useState<LoadedFile[]>([])
  const [planContent, setPlanContent] = useState<string | null>(null)
  const [mode, setMode] = useState<'example' | 'imported' | 'plan'>('example')

  const example = getExampleProject(selectedExampleId ?? 'aws-serverless-api')
  const generatedDiagram = useMemo(() => {
    if (mode === 'plan' && planContent !== null) {
      return generateDiagramFromPlanJson(planContent)
    }
    const activeFiles = mode === 'imported' ? importedFiles : example.files
    return generateDiagramFromTerraformFiles(activeFiles)
  }, [mode, planContent, importedFiles, example.files])

  // Stable identity for the current diagram — used as localStorage key and CloudBoard key.
  const diagramId =
    mode === 'plan'
      ? `plan:${hashFiles(importedFiles)}`
      : mode === 'imported'
        ? `imported:${hashFiles(importedFiles)}`
        : `example:${example.id}`

  // Track previous diagramId to detect switches and reload overrides from localStorage.
  // Updating state during render (not inside an effect) is the React-idiomatic way to
  // derive state from a changing prop without triggering a cascading effect.
  const [activeDiagramId, setActiveDiagramId] = useState(diagramId)
  const [layoutOverrides, setLayoutOverrides] = useState<Record<string, Rect>>(
    () => loadOverrides(diagramId),
  )

  if (activeDiagramId !== diagramId) {
    setActiveDiagramId(diagramId)
    setLayoutOverrides(loadOverrides(diagramId))
  }

  const handleOverridesChange = (overrides: Record<string, Rect>) => {
    setLayoutOverrides(overrides)
    persistOverrides(diagramId, overrides)
  }

  const handleLoadLayout = (overrides: Record<string, Rect>) => {
    setLayoutOverrides(overrides)
    persistOverrides(diagramId, overrides)
  }

  const handleFilesLoaded = (files: LoadedFile[]) => {
    setImportedFiles(files)
    // A single .json file is treated as a terraform show -json plan.
    if (files.length === 1 && files[0].path.endsWith('.json')) {
      setPlanContent(files[0].content)
      setMode('plan')
    } else {
      setPlanContent(null)
      setMode('imported')
    }
  }

  return (
    <ProductShell
      diagramId={diagramId}
      example={example}
      examples={examples}
      generatedDiagram={generatedDiagram}
      importedFiles={importedFiles}
      layoutOverrides={layoutOverrides}
      mode={mode}
      onClearImport={() => {
        setImportedFiles([])
        setPlanContent(null)
        setMode('example')
      }}
      onFilesLoaded={handleFilesLoaded}
      onLoadLayout={handleLoadLayout}
      onOverridesChange={handleOverridesChange}
      onSelectExample={(id) => {
        setSelectedExampleId(id)
        setMode('example')
      }}
      onToggleLang={() => setLang((l) => (l === 'en' ? 'es' : 'en'))}
      selectedExampleId={example.id}
      t={translations[lang]}
    />
  )
}

export default App
