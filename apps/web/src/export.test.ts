import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { exportSvg, exportPng, svgToDataUrl } from './export'

// Minimal SVGSVGElement stub
function makeSvgEl(
  viewBoxWidth = 800,
  viewBoxHeight = 480,
): SVGSVGElement {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  el.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
  return el as unknown as SVGSVGElement
}

describe('svgToDataUrl', () => {
  it('returns a blob: URL', () => {
    const el = makeSvgEl()
    const url = svgToDataUrl(el)
    expect(url).toMatch(/^blob:/)
    URL.revokeObjectURL(url)
  })
})

describe('exportSvg', () => {
  let clickSpy: ReturnType<typeof vi.fn>
  let anchorEl: HTMLAnchorElement
  let createElementSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    clickSpy = vi.fn()
    anchorEl = { click: clickSpy, href: '', download: '' } as unknown as HTMLAnchorElement
    createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string) => {
        if (tag === 'a') return anchorEl as unknown as HTMLElement
        return document.createElement.call(document, tag as 'div')
      })
  })

  afterEach(() => {
    createElementSpy.mockRestore()
  })

  it('sets download filename and triggers click', () => {
    const el = makeSvgEl()
    exportSvg(el, 'my-diagram.svg')
    expect(anchorEl.download).toBe('my-diagram.svg')
    expect(clickSpy).toHaveBeenCalledOnce()
  })

  it('defaults filename to diagram.svg', () => {
    const el = makeSvgEl()
    exportSvg(el)
    expect(anchorEl.download).toBe('diagram.svg')
  })
})

describe('exportPng', () => {
  let clickSpy: ReturnType<typeof vi.fn>
  let anchorEl: HTMLAnchorElement
  let createElementSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    clickSpy = vi.fn()
    anchorEl = { click: clickSpy, href: '', download: '' } as unknown as HTMLAnchorElement

    // Stub canvas with a working getContext and toDataURL
    const canvasStub = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({
        drawImage: vi.fn(),
      }),
      toDataURL: vi.fn().mockReturnValue('data:image/png;base64,abc'),
    }

    createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string) => {
        if (tag === 'a') return anchorEl as unknown as HTMLElement
        if (tag === 'canvas') return canvasStub as unknown as HTMLElement
        return document.createElement.call(document, tag as 'div')
      })
  })

  afterEach(() => {
    createElementSpy.mockRestore()
  })

  it('resolves and triggers download after image loads', async () => {
    // Stub Image to auto-fire onload
    const OriginalImage = globalThis.Image
    globalThis.Image = class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_url: string) {
        // fire onload synchronously so the promise resolves
        this.onload?.()
      }
    } as unknown as typeof Image

    const el = makeSvgEl()
    await exportPng(el, 'chart.png', 1)

    expect(anchorEl.download).toBe('chart.png')
    expect(clickSpy).toHaveBeenCalledOnce()

    globalThis.Image = OriginalImage
  })

  it('falls back to 800x480 when viewBox dimensions are zero', async () => {
    const OriginalImage = globalThis.Image
    globalThis.Image = class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_url: string) {
        this.onload?.()
      }
    } as unknown as typeof Image

    const el = makeSvgEl(0, 0) // viewBox 0 0 0 0 → width=0, height=0
    await exportPng(el, 'fallback.png', 1)
    expect(clickSpy).toHaveBeenCalledOnce()

    globalThis.Image = OriginalImage
  })

  it('rejects when image fails to load', async () => {
    const OriginalImage = globalThis.Image
    globalThis.Image = class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_url: string) {
        this.onerror?.()
      }
    } as unknown as typeof Image

    const el = makeSvgEl()
    await expect(exportPng(el)).rejects.toThrow('Failed to load SVG into Image element')

    globalThis.Image = OriginalImage
  })
})
