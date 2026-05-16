import { render, fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ImportZone } from './import-zone'

describe('ImportZone', () => {
  it('renders drop zone with instructions', () => {
    render(<ImportZone loadedFiles={[]} onFilesLoaded={() => {}} />)
    expect(
      screen.getByRole('region', { name: /drop terraform files/i }),
    ).toBeTruthy()
    expect(screen.getByText(/Drop/)).toBeTruthy()
    expect(screen.getByText(/Browse files/i)).toBeTruthy()
  })

  it('shows loaded file list when files are provided', () => {
    const files = [
      { path: 'main.tf', content: 'resource "aws_s3_bucket" "b" {}\n' },
      { path: 'variables.tf', content: 'variable "region" {}\n' },
    ]
    render(<ImportZone loadedFiles={files} onFilesLoaded={() => {}} />)
    expect(screen.getByText('main.tf')).toBeTruthy()
    expect(screen.getByText('variables.tf')).toBeTruthy()
  })

  it('shows drag-active style on dragover', () => {
    render(<ImportZone loadedFiles={[]} onFilesLoaded={() => {}} />)
    const zone = screen.getByRole('region')
    fireEvent.dragOver(zone)
    expect(zone.className).toContain('import-drop-zone--active')

    fireEvent.dragLeave(zone)
    expect(zone.className).not.toContain('import-drop-zone--active')
  })

  it('calls onFilesLoaded=noop when no files provided', () => {
    const handler = vi.fn()
    render(<ImportZone loadedFiles={[]} onFilesLoaded={handler} />)
    const zone = screen.getByRole('region')
    // Drop with empty fileList — should not call handler
    fireEvent.drop(zone, { dataTransfer: { files: [] } })
    expect(handler).not.toHaveBeenCalled()
  })
})
