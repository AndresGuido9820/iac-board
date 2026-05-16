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
    expect(
      screen.getByRole('link', { name: 'Development spec' }),
    ).toHaveAttribute('href', '/docs/development-spec.md')
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
      screen.getByText('examples/terraform/aws-serverless-api/main.tf:5'),
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
})
