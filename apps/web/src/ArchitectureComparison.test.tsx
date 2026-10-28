import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { generateDiagramFromTerraformFiles } from '@iac-board/pipeline'
import { ArchitectureComparison } from './ArchitectureComparison'
import { translations } from './translations'

const current = (bucket: string) =>
  generateDiagramFromTerraformFiles([
    {
      path: 'main.tf',
      content: `resource "aws_s3_bucket" "data" { bucket = "${bucket}" }`,
    },
  ])

describe('ArchitectureComparison', () => {
  it('pins a snapshot and follows updated current input', async () => {
    const user = userEvent.setup()
    const view = render(
      <ArchitectureComparison
        current={current('before')}
        t={translations.en}
      />,
    )
    await user.click(
      screen.getByRole('button', { name: 'Use current as baseline' }),
    )
    expect(screen.getByRole('status')).toHaveTextContent('No changes detected')
    view.rerender(
      <ArchitectureComparison current={current('after')} t={translations.en} />,
    )
    const resources = screen.getByRole('list', { name: 'Changed resources' })
    await user.click(
      within(resources).getByRole('button', { name: /aws_s3_bucket.data/ }),
    )
    expect(screen.getByLabelText('Change details')).toHaveTextContent('before')
    expect(screen.getByLabelText('Change details')).toHaveTextContent('after')
    await user.click(screen.getByRole('button', { name: 'Clear comparison' }))
    expect(screen.queryByLabelText('Change summary')).not.toBeInTheDocument()
  })

  it('offers a working example with all four statuses and Spanish copy', async () => {
    const user = userEvent.setup()
    render(
      <ArchitectureComparison current={current('a')} t={translations.es} />,
    )
    await user.click(screen.getByRole('button', { name: 'Probar comparación' }))
    expect(screen.getByLabelText('Resumen de cambios')).toHaveTextContent(
      '+ Agregados2',
    )
    expect(screen.getByLabelText('Resumen de cambios')).toHaveTextContent(
      '− Eliminados1',
    )
    expect(screen.getByLabelText('Resumen de cambios')).toHaveTextContent(
      '~ Modificados1',
    )
    expect(screen.getByLabelText('Resumen de cambios')).toHaveTextContent(
      'Sin cambios1',
    )
  })
})

it('loads a baseline, preserves it after malformed input, and exports a value-free summary', async () => {
  const user = userEvent.setup()
  render(
    <ArchitectureComparison
      current={current('private-current-value')}
      t={translations.en}
    />,
  )
  const input = screen.getByLabelText('Load baseline files', {
    selector: 'input',
  })
  const baseline = new File([''], 'base.tf', { type: 'text/plain' })
  Object.defineProperty(baseline, 'text', {
    value: async () =>
      'resource "aws_s3_bucket" "data" { bucket = "private-old-value" }',
  })
  await user.upload(input, baseline)
  expect(await screen.findByLabelText('Change summary')).toHaveTextContent(
    '~ Modified1',
  )
  const invalid = new File([''], 'bad.json', { type: 'application/json' })
  Object.defineProperty(invalid, 'text', { value: async () => 'null' })
  await user.upload(input, invalid)
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Previous baseline was kept',
  )
  expect(screen.getByLabelText('Change summary')).toHaveTextContent(
    '~ Modified1',
  )
  let exported: Blob | undefined
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn((blob: Blob) => {
      exported = blob
      return 'blob:test'
    }),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  })
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => {})
  await user.click(
    screen.getByRole('button', { name: 'Export change summary' }),
  )
  const content = await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.readAsText(exported!)
  })
  expect(JSON.parse(content).changes).toEqual([
    { id: 'aws_s3_bucket.data', status: 'changed', reasons: ['configuration'] },
  ])
  expect(content).not.toContain('private-current-value')
  expect(content).not.toContain('private-old-value')
  click.mockRestore()
})

it('loads plan values and blocks a broken current diagram', async () => {
  const user = userEvent.setup()
  const broken = {
    ...current('a'),
    diagnostics: [
      { code: 'TEST', message: 'Invalid source', severity: 'error' as const },
    ],
  }
  const view = render(
    <ArchitectureComparison current={broken} t={translations.en} />,
  )
  expect(
    screen.getByRole('button', { name: 'Use current as baseline' }),
  ).toBeDisabled()
  expect(screen.getByRole('alert')).toHaveTextContent('Fix parser errors')
  view.rerender(
    <ArchitectureComparison current={current('a')} t={translations.en} />,
  )
  const plan = new File([''], 'plan.json', { type: 'application/json' })
  Object.defineProperty(plan, 'text', {
    value: async () =>
      JSON.stringify({
        format_version: '1.2',
        planned_values: {
          root_module: {
            resources: [
              {
                address: 'aws_s3_bucket.data',
                type: 'aws_s3_bucket',
                name: 'data',
                values: { bucket: 'a' },
              },
            ],
          },
        },
      }),
  })
  await user.upload(
    screen.getByLabelText('Load baseline files', { selector: 'input' }),
    plan,
  )
  expect(await screen.findByLabelText('Change summary')).toHaveTextContent(
    '~ Modified1',
  )
})
