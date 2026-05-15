import { render, screen } from '@testing-library/react'
import App from './App'

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
  })
})
