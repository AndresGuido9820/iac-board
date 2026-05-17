import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getExampleProject } from '@iac-board/example-catalog'
import { generateDiagramFromTerraformFiles } from '@iac-board/pipeline'
import App, { ProductShell } from './App'

describe('App', () => {
  it('renders the product shell', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'IaC Board' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View source' })).toHaveAttribute(
      'href',
      'https://github.com/AndresGuido9820/iac-board',
    )
    expect(screen.queryByText(/HU-\d+/)).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'AWS Serverless API' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /AWS IoT Pipeline/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /AWS VPC \+ RDS/ }),
    ).toBeInTheDocument()
    expect(screen.getByText('aws_lambda_function.handler')).toBeInTheDocument()
    expect(
      screen.getByText('examples/terraform/aws-serverless-api/main.tf:12'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Parser diagnostics' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('No diagnostics for this example.'),
    ).toBeInTheDocument()
  })

  it('renders parser diagnostics with source locations', () => {
    const example = getExampleProject('aws-serverless-api')
    const generatedDiagram = generateDiagramFromTerraformFiles([
      {
        path: 'infra/main.tf',
        content: 'resource "custom_service" "thing" {}',
      },
    ])

    render(
      <ProductShell
        example={example}
        examples={[example]}
        generatedDiagram={generatedDiagram}
        onSelectExample={() => undefined}
        selectedExampleId={example.id}
      />,
    )

    expect(
      screen.getByText('Unsupported Terraform resource type: custom_service'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('infra/main.tf:1')).toHaveLength(2)
  })

  it('generates a diagram from another bundled example in one click', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /AWS IoT Pipeline/ }))

    expect(
      screen.getByRole('heading', { level: 2, name: 'AWS IoT Pipeline' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('aws_iot_topic_rule.telemetry_ingest'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('examples/terraform/aws-iot-pipeline/main.tf:1'),
    ).toBeInTheDocument()
  })

  it('shows generated network groups for the VPC example', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /AWS VPC \+ RDS/ }))

    expect(screen.getByLabelText('Generated network groups')).toHaveTextContent(
      'VPC main',
    )
    expect(screen.getByLabelText('Generated network groups')).toHaveTextContent(
      'Private subnet private',
    )
    expect(screen.getByText('aws_db_instance.primary')).toBeInTheDocument()
  })

  it('renders export SVG button', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Export SVG' })).toBeInTheDocument()
  })

  it('opens node inspector when a board node is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Click the first iac-node element rendered inside the SVG
    const node = document.querySelector('[data-testid="iac-node"]')
    expect(node).not.toBeNull()
    await user.pointer({ keys: '[MouseLeft]', target: node! })

    // Inspector should appear with resource type label
    expect(screen.getByLabelText('Node inspector')).toBeInTheDocument()
  })

  it('closes node inspector with Escape key', async () => {
    const user = userEvent.setup()
    render(<App />)

    const node = document.querySelector('[data-testid="iac-node"]')
    await user.pointer({ keys: '[MouseLeft]', target: node! })
    expect(screen.getByLabelText('Node inspector')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByLabelText('Node inspector')).not.toBeInTheDocument()
  })

  it('closes node inspector with close button', async () => {
    const user = userEvent.setup()
    render(<App />)

    const node = document.querySelector('[data-testid="iac-node"]')
    await user.pointer({ keys: '[MouseLeft]', target: node! })
    expect(screen.getByLabelText('Node inspector')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Close inspector'))
    expect(screen.queryByLabelText('Node inspector')).not.toBeInTheDocument()
  })

  it('inspector shows correct node fields', async () => {
    const user = userEvent.setup()
    const example = getExampleProject('aws-serverless-api')
    const generatedDiagram = generateDiagramFromTerraformFiles(example.files)

    render(
      <ProductShell
        example={example}
        examples={[example]}
        generatedDiagram={generatedDiagram}
        onSelectExample={() => undefined}
        selectedExampleId={example.id}
      />,
    )

    const node = document.querySelector('[data-testid="iac-node"]')
    await user.pointer({ keys: '[MouseLeft]', target: node! })

    const inspector = screen.getByLabelText('Node inspector')
    expect(inspector).toBeInTheDocument()
    // Should show source file reference
    expect(inspector.textContent).toContain('examples/terraform')
  })
})
