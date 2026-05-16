import './App.css'

const qualityGates = [
  'Terraform parser',
  'Cloud graph',
  'Deterministic layout',
  'Canvas adapter',
  'CI and security checks',
]

function App() {
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
    </main>
  )
}

export default App
