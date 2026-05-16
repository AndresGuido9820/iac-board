import { useCallback, useRef, useState } from 'react'
import type { Viewport } from './types'

const MIN_ZOOM = 0.2
const MAX_ZOOM = 3

export function useViewport() {
  const [viewport, setViewport] = useState<Viewport>({ zoom: 1, x: 0, y: 0 })
  const isPanning = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setViewport((vp) => {
      const delta = e.deltaY < 0 ? 1.1 : 0.9
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, vp.zoom * delta))
      return { ...vp, zoom: next }
    })
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // pan only on background click (not on elements) — callers set data-pan
    if ((e.target as HTMLElement).closest('[data-pannable]')) {
      isPanning.current = true
      lastPos.current = { x: e.clientX, y: e.clientY }
      e.preventDefault()
    }
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }
    setViewport((vp) => ({ ...vp, x: vp.x + dx, y: vp.y + dy }))
  }, [])

  const onMouseUp = useCallback(() => {
    isPanning.current = false
  }, [])

  const transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`

  return { viewport, transform, onWheel, onMouseDown, onMouseMove, onMouseUp }
}
