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

  it('shows error when dropped files are not .tf or .tfvars', async () => {
    const handler = vi.fn()
    render(<ImportZone loadedFiles={[]} onFilesLoaded={handler} />)
    const zone = screen.getByRole('region')
    const pngFile = new File(['binary'], 'diagram.png', { type: 'image/png' })
    fireEvent.drop(zone, { dataTransfer: { files: [pngFile] } })
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain(
      'No .tf, .tfvars, or .json files found.',
    )
    expect(handler).not.toHaveBeenCalled()
  })

  it('shows lines count for each loaded file', () => {
    const files = [
      { path: 'main.tf', content: 'resource "aws_s3_bucket" "b" {}\neof\n' },
    ]
    render(<ImportZone loadedFiles={files} onFilesLoaded={() => {}} />)
    expect(screen.getByText('3 lines')).toBeTruthy()
  })

  it('shows error via file input when non-.tf file is selected', async () => {
    const handler = vi.fn()
    render(<ImportZone loadedFiles={[]} onFilesLoaded={handler} />)
    const input = screen.getByTestId('file-input')
    const pngFile = new File(['data'], 'image.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [pngFile] } })
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(handler).not.toHaveBeenCalled()
  })

  it('Browse button triggers file input click', () => {
    render(<ImportZone loadedFiles={[]} onFilesLoaded={() => {}} />)
    const input = screen.getByTestId('file-input')
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})
    fireEvent.click(screen.getByText('Browse files'))
    expect(clickSpy).toHaveBeenCalled()
  })
})
