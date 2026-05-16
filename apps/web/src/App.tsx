import { useMemo, useState } from 'react'
import {
  getExampleProject,
  listExampleProjects,
} from '@iac-board/example-catalog'
import type { ExampleProject } from '@iac-board/example-catalog'
import { generateDiagramFromTerraformFiles } from '@iac-board/pipeline'
import type { DiagramPipelineResult } from '@iac-board/pipeline'
import './App.css'

type ProductShellProps = {
  examples: ExampleProject[]
  example: ExampleProject
  generatedDiagram: DiagramPipelineResult
  onSelectExample: (exampleId: string) => void
  selectedExampleId: string
}

export function ProductShell({
  examples,
  example,
  generatedDiagram,
  onSelectExample,
  selectedExampleId,
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
        <p className="eyebrow">Terraform-first architecture diagrams</p>
        <h1 id="hero-title">IaC Board</h1>
        <p className="hero-copy">
          Generate editable AWS architecture diagrams from Terraform without
          executing infrastructure code.
        </p>
        <div className="hero-actions" aria-label="Project actions">
          <a href="https://github.com/AndresGuido9820/iac-board">View source</a>
          <a href="https://github.com/AndresGuido9820/iac-board/tree/main/examples/terraform">
            Terraform examples
          </a>
        </div>
      </section>

      <section className="panel" aria-labelledby="examples-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Sample infrastructure</p>
            <h2 id="examples-title">Example projects</h2>
          </div>
          <span className="status-pill">{examples.length} examples</span>
        </div>
        <div className="example-grid" aria-label="Bundled example projects">
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
              <small>Generate diagram</small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="example-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Generated architecture</p>
            <h2 id="example-title">{example.name}</h2>
          </div>
          <span className="status-pill">Bundled example</span>
        </div>
        <p className="panel-copy">{example.description}</p>
        <dl className="metrics" aria-label="Generated diagram metrics">
          <div>
            <dt>Terraform files</dt>
            <dd>{example.files.length}</dd>
          </div>
          <div>
            <dt>Resources</dt>
            <dd>{generatedDiagram.parsed.resources.length}</dd>
          </div>
          <div>
            <dt>Canvas drafts</dt>
            <dd>{generatedDiagram.canvasDrafts.length}</dd>
          </div>
          <div>
            <dt>Groups</dt>
            <dd>{generatedDiagram.graph.groups.length}</dd>
          </div>
          <div>
            <dt>Diagnostics</dt>
            <dd>{generatedDiagram.diagnostics.length}</dd>
          </div>
        </dl>
        {groupDrafts.length > 0 ? (
          <ul className="group-list" aria-label="Generated network groups">
            {groupDrafts.map((draft) => (
              <li key={draft.id}>
                <strong>{draft.label}</strong>
                <span>{draft.id}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <ul className="resource-list" aria-label="Generated resources">
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
            <p className="eyebrow">Parser output</p>
            <h2 id="diagnostics-title">Parser diagnostics</h2>
          </div>
          <span className="status-pill">
            {generatedDiagram.diagnostics.length} findings
          </span>
        </div>
        {generatedDiagram.diagnostics.length === 0 ? (
          <p className="empty-state">No diagnostics for this example.</p>
        ) : (
          <ul className="diagnostic-list" aria-label="Parser diagnostics">
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
  const example = getExampleProject(selectedExampleId ?? 'aws-serverless-api')
  const generatedDiagram = generateDiagramFromTerraformFiles(example.files)

  return (
    <ProductShell
      example={example}
      examples={examples}
      generatedDiagram={generatedDiagram}
      onSelectExample={setSelectedExampleId}
      selectedExampleId={example.id}
    />
  )
}

export default App
