import { getExampleProject } from '@iac-board/example-catalog'
import { generateDiagramFromTerraformFiles } from '@iac-board/pipeline'
import './App.css'

const qualityGates = [
  'Terraform parser',
  'Cloud graph',
  'Deterministic layout',
  'Canvas adapter',
  'CI and security checks',
]

function App() {
  const example = getExampleProject('aws-serverless-api')
  const generatedDiagram = generateDiagramFromTerraformFiles(example.files)

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
          {generatedDiagram.canvasDrafts.map((draft) => (
            <li key={draft.id}>
              <strong>{draft.label}</strong>
              <span>{draft.id}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default App
