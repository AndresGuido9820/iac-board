import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CloudBoard } from './cloud-board'

describe('CloudBoard', () => {
  it('renders an SVG canvas with no elements (empty viewBox fallback)', () => {
    render(<CloudBoard elements={[]} />)
    const svg = screen.getByTestId('cloud-canvas')
    // Empty elements: fallback viewBox uses the default constants (0, 0, 800, 480)
    expect(svg.getAttribute('viewBox')).toBe('0 0 800 480')
  })
})
