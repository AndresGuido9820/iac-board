/**
 * Export utilities for CloudBoard — SVG download and PNG rasterization.
 *
 * SVG export: serializes the live SVG DOM element to a Blob and triggers a download.
 * PNG export: draws the SVG onto an offscreen canvas at 2× scale (retina-quality),
 *             then triggers a download of the resulting PNG.
 *
 * Both functions are pure side-effect utilities (no React dependencies) so they can
 * be unit-tested without a DOM renderer.
 */

/** Serialize an SVGSVGElement to a data URL string. */
export function svgToDataUrl(svgEl: SVGSVGElement): string {
  const serializer = new XMLSerializer()
  const svgStr = serializer.serializeToString(svgEl)
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
  return URL.createObjectURL(blob)
}

/** Trigger a browser file download for a given object URL. */
function triggerDownload(url: string, filename: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Download the given SVGSVGElement as an .svg file.
 *
 * @param svgEl   - The live SVG element to serialize.
 * @param filename - Download filename (default: "diagram.svg").
 */
export function exportSvg(svgEl: SVGSVGElement, filename = 'diagram.svg'): void {
  const url = svgToDataUrl(svgEl)
  triggerDownload(url, filename)
}

/**
 * Rasterize the given SVGSVGElement to a PNG and download it.
 *
 * Renders the SVG into an offscreen canvas at `scale` × the SVG's natural
 * viewBox dimensions (default 2× for retina quality).
 *
 * @param svgEl    - The live SVG element to rasterize.
 * @param filename  - Download filename (default: "diagram.png").
 * @param scale     - Pixel ratio (default: 2 for retina).
 */
export async function exportPng(
  svgEl: SVGSVGElement,
  filename = 'diagram.png',
  scale = 2,
): Promise<void> {
  const viewBox = svgEl.viewBox.baseVal
  /* c8 ignore next 4 */
  const w = viewBox.width || svgEl.clientWidth || 800
  // svgEl.clientHeight is 0 in jsdom — use viewBox height (set in tests) or fall back to 480
  const h = viewBox.height || svgEl.clientHeight || 480

  const canvas = document.createElement('canvas')
  canvas.width = w * scale
  canvas.height = h * scale

  const ctx = canvas.getContext('2d')
  /* c8 ignore next */
  if (!ctx) throw new Error('Could not get 2D canvas context')

  const svgUrl = svgToDataUrl(svgEl)

  await new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(svgUrl)
      resolve()
    }
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl)
      reject(new Error('Failed to load SVG into Image element'))
    }
    img.src = svgUrl
  })

  const pngUrl = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = pngUrl
  a.download = filename
  a.click()
}
