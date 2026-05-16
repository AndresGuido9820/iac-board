import { render, screen } from '@testing-library/react'
import { getExampleProject } from '@iac-board/example-catalog'
import { generateDiagramFromTerraformFiles } from '@iac-board/pipeline'
import App, { ProductShell } from './App'

describe('App', () => {
  it('renders the product shell', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'IaC Board' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Terraform parser')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Development spec' }),
    ).toHaveAttribute('href', '/docs/development-spec.md')
    expect(
      screen.getByRole('heading', { level: 2, name: 'AWS Serverless API' }),
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
      <ProductShell example={example} generatedDiagram={generatedDiagram} />,
    )

    expect(
      screen.getByText('Unsupported Terraform resource type: custom_service'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('infra/main.tf:1')).toHaveLength(2)
  })
})
