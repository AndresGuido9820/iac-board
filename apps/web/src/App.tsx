import { useEffect, useMemo, useState } from 'react'
import {
  getExampleProject,
  listExampleProjects,
} from '@iac-board/example-catalog'
import type { ExampleProject } from '@iac-board/example-catalog'
import { generateDiagramFromTerraformFiles } from '@iac-board/pipeline'
import type { DiagramPipelineResult } from '@iac-board/pipeline'
import { CloudBoard, toBoardElements } from '@iac-board/visual-engine'
import { translations } from './translations'
import type { Lang, Translations } from './translations'
import './App.css'

/** Download the `.cloud-canvas` SVG as a self-contained SVG file. */
function exportSvg(name: string): void {
  const svg = document.querySelector<SVGSVGElement>('.cloud-canvas')
  if (!svg) return
  const serializer = new XMLSerializer()
  let src = serializer.serializeToString(svg)
  // Ensure XML declaration and SVG namespace are present
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
}

export function ProductShell({
  examples,
  example,
  generatedDiagram,
  onSelectExample,
  selectedExampleId,
  t = translations.en,
  onToggleLang,
}: ProductShellProps) {
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null)

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
    if (!id) { setSelectedNode(null); return }
    const graphNode = nodesById.get(id)
    if (!graphNode) { setSelectedNode(null); return }
    const edgesOut = generatedDiagram.graph.edges.filter((e) => e.from === id).length
    const edgesIn = generatedDiagram.graph.edges.filter((e) => e.to === id).length
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
              aria-pressed={project.id === selectedExampleId}
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
            <h2 id="example-title">{example.name}</h2>
          </div>
          <div className="panel-header-actions">
            <button
              aria-label={t.export_svg}
              className="export-btn"
              onClick={() => exportSvg(example.name)}
              type="button"
            >
              {t.export_svg}
            </button>
            <span className="status-pill">{t.bundled_example}</span>
          </div>
        </div>
        <p className="panel-copy">{example.description}</p>
        <div className="board-with-inspector">
          <CloudBoard
            className="cloud-board"
            elements={toBoardElements(
              generatedDiagram.canvasDrafts,
              generatedDiagram.graph.nodes,
              generatedDiagram.graph.edges,
            )}
            onNodeSelect={handleNodeSelect}
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
            <dd>{example.files.length}</dd>
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
  const example = getExampleProject(selectedExampleId ?? 'aws-serverless-api')
  const generatedDiagram = generateDiagramFromTerraformFiles(example.files)

  return (
    <ProductShell
      example={example}
      examples={examples}
      generatedDiagram={generatedDiagram}
      onSelectExample={setSelectedExampleId}
      onToggleLang={() => setLang((l) => (l === 'en' ? 'es' : 'en'))}
      selectedExampleId={example.id}
      t={translations[lang]}
    />
  )
}

export default App
