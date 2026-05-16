import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CloudBoard } from './cloud-board'

describe('CloudBoard', () => {
  it('renders an SVG canvas with empty fallback viewBox', () => {
    render(<CloudBoard elements={[]} />)
    const svg = screen.getByTestId('cloud-canvas')
    expect(svg.getAttribute('viewBox')).toBe('0 0 800 480')
  })
})
