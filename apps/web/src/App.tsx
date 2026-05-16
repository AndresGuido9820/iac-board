import { useMemo, useState } from 'react'
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
import { ImportZone } from './import-zone'
import type { LoadedFile } from './import-zone'
import './App.css'

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
  mode?: 'example' | 'imported'
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
}: ProductShellProps) {
  const nodesById = new Map(
    generatedDiagram.graph.nodes.map((node) => [node.id, node]),
  )
  const nodeDrafts = generatedDiagram.canvasDrafts.filter(
    (draft) => draft.type === 'node',
  )
  const groupDrafts = generatedDiagram.canvasDrafts.filter(
    (draft) => draft.type === 'group',
  )

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

      {/* Import section */}
      <section className="panel" aria-labelledby="import-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Your Terraform</p>
            <h2 id="import-title">Import .tf files</h2>
          </div>
          {mode === 'imported' && (
            <button
              className="status-pill"
              onClick={onClearImport}
              style={{
                cursor: 'pointer',
                background: '#fef3c7',
                color: '#92400e',
                border: '1px solid #fcd34d',
              }}
              type="button"
            >
              {importedFiles.length} file{importedFiles.length !== 1 ? 's' : ''}{' '}
              loaded — clear
            </button>
          )}
        </div>
        <ImportZone
          loadedFiles={importedFiles}
          onFilesLoaded={onFilesLoaded ?? (() => {})}
        />
      </section>

      {/* Examples section */}
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
              aria-pressed={
                project.id === selectedExampleId && mode === 'example'
              }
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
              {mode === 'imported' ? 'Your infrastructure' : example.name}
            </h2>
          </div>
          <span className="status-pill">
            {mode === 'imported' ? 'Imported' : t.bundled_example}
          </span>
        </div>
        <p className="panel-copy">{example.description}</p>
        <CloudBoard
          className="cloud-board"
          elements={toBoardElements(
            generatedDiagram.canvasDrafts,
            generatedDiagram.graph.nodes,
            generatedDiagram.graph.edges,
          )}
        />
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
  const [importedFiles, setImportedFiles] = useState<LoadedFile[]>([])
  const [mode, setMode] = useState<'example' | 'imported'>('example')

  const example = getExampleProject(selectedExampleId ?? 'aws-serverless-api')

  const activeFiles = mode === 'imported' ? importedFiles : example.files
  const generatedDiagram = useMemo(
    () => generateDiagramFromTerraformFiles(activeFiles),
    [activeFiles],
  )

  const handleFilesLoaded = (files: LoadedFile[]) => {
    setImportedFiles(files)
    setMode('imported')
  }

  const handleClearImport = () => {
    setImportedFiles([])
    setMode('example')
  }

  return (
    <ProductShell
      example={example}
      examples={examples}
      generatedDiagram={generatedDiagram}
      importedFiles={importedFiles}
      mode={mode}
      onClearImport={handleClearImport}
      onFilesLoaded={handleFilesLoaded}
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
