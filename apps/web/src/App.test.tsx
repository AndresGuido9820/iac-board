import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  getExampleProject,
  listExampleProjects,
} from '@iac-board/example-catalog'
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

  it('toggles to Spanish and back to English', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Español' }))
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument()
    // Spanish translation functions called
    expect(screen.getByText(/ejemplos/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByRole('button', { name: 'Español' })).toBeInTheDocument()
  })

  it('shows imported mode UI with plural file count and header', () => {
    const examples = listExampleProjects()
    const example = getExampleProject('aws-serverless-api')
    const generatedDiagram = generateDiagramFromTerraformFiles(example.files)
    const onClearImport = vi.fn()

    render(
      <ProductShell
        example={example}
        examples={examples}
        generatedDiagram={generatedDiagram}
        onSelectExample={() => undefined}
        selectedExampleId={example.id}
        mode="imported"
        importedFiles={[
          { path: 'main.tf', content: 'resource "aws_s3_bucket" "b" {}' },
          { path: 'vars.tf', content: 'variable "x" {}' },
        ]}
        onClearImport={onClearImport}
        onFilesLoaded={() => {}}
      />,
    )

    // Clear button shows with plural form
    expect(
      screen.getByRole('button', { name: /2 files.*clear/i }),
    ).toBeInTheDocument()
    // Title shows "Your infrastructure" instead of example name
    expect(
      screen.getByRole('heading', { name: 'Your infrastructure' }),
    ).toBeInTheDocument()
    // Status pill shows "Imported"
    expect(screen.getAllByText('Imported').length).toBeGreaterThan(0)
  })

  it('shows singular file count in imported clear button', () => {
    const examples = listExampleProjects()
    const example = getExampleProject('aws-serverless-api')
    const generatedDiagram = generateDiagramFromTerraformFiles(example.files)

    render(
      <ProductShell
        example={example}
        examples={examples}
        generatedDiagram={generatedDiagram}
        onSelectExample={() => undefined}
        selectedExampleId={example.id}
        mode="imported"
        importedFiles={[{ path: 'main.tf', content: '' }]}
        onClearImport={() => {}}
        onFilesLoaded={() => {}}
      />,
    )

    // Singular "file" not "files"
    expect(
      screen.getByRole('button', { name: /1 file loaded/i }),
    ).toBeInTheDocument()
  })

  it('calls onClearImport when clear button is clicked', async () => {
    const user = userEvent.setup()
    const examples = listExampleProjects()
    const example = getExampleProject('aws-serverless-api')
    const generatedDiagram = generateDiagramFromTerraformFiles(example.files)
    const onClearImport = vi.fn()

    render(
      <ProductShell
        example={example}
        examples={examples}
        generatedDiagram={generatedDiagram}
        onSelectExample={() => undefined}
        selectedExampleId={example.id}
        mode="imported"
        importedFiles={[{ path: 'main.tf', content: '' }]}
        onClearImport={onClearImport}
        onFilesLoaded={() => {}}
      />,
    )

    await user.click(screen.getByRole('button', { name: /1 file loaded/i }))
    expect(onClearImport).toHaveBeenCalledOnce()
  })
})
