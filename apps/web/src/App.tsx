import { useMemo, useState } from 'react'
import {
  getExampleProject,
  listExampleProjects,
} from '@iac-board/example-catalog'
import type { ExampleProject } from '@iac-board/example-catalog'
import { generateDiagramFromTerraformFiles } from '@iac-board/pipeline'
import type { DiagramPipelineResult } from '@iac-board/pipeline'
import './App.css'

const qualityGates = [
  'Terraform parser',
  'Cloud graph',
  'Deterministic layout',
  'Canvas adapter',
  'CI and security checks',
]

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
          <a href="/docs/product/user-stories.md">User stories</a>
          <a href="/docs/development-spec.md">Development spec</a>
        </div>
      </section>

      <section className="panel" aria-labelledby="quality-title">
        <h2 id="quality-title">Engineering gates</h2>
        <ul>
          {qualityGates.map((gate) => (
            <li key={gate}>{gate}</li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="examples-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">HU-002</p>
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
              <small>{project.userStoryIds.join(' / ')}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="example-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">HU-002 / HU-005</p>
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
            <dt>Diagnostics</dt>
            <dd>{generatedDiagram.diagnostics.length}</dd>
          </div>
        </dl>
        <ul className="resource-list" aria-label="Generated resources">
          {generatedDiagram.canvasDrafts.map((draft) => {
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
            <p className="eyebrow">HU-010</p>
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
