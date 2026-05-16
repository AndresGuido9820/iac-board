import { renderHook, act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useViewport } from './use-viewport'

describe('useViewport', () => {
  it('initializes with zoom=1 and x=0, y=0', () => {
    const { result } = renderHook(() => useViewport())
    expect(result.current.viewport).toEqual({ zoom: 1, x: 0, y: 0 })
  })

  it('zooms in when deltaY < 0', () => {
    const { result } = renderHook(() => useViewport())
    act(() => {
      result.current.onWheel({ deltaY: -1, preventDefault: () => {} } as unknown as React.WheelEvent)
    })
    expect(result.current.viewport.zoom).toBeCloseTo(1.1)
  })

  it('zooms out when deltaY > 0', () => {
    const { result } = renderHook(() => useViewport())
    act(() => {
      result.current.onWheel({ deltaY: 1, preventDefault: () => {} } as unknown as React.WheelEvent)
    })
    expect(result.current.viewport.zoom).toBeCloseTo(0.9)
  })

  it('clamps zoom to MIN_ZOOM (0.2)', () => {
    const { result } = renderHook(() => useViewport())
    // Zoom out many times to hit the floor
    for (let i = 0; i < 30; i++) {
      act(() => {
        result.current.onWheel({ deltaY: 1, preventDefault: () => {} } as unknown as React.WheelEvent)
      })
    }
    expect(result.current.viewport.zoom).toBeGreaterThanOrEqual(0.2)
  })

  it('clamps zoom to MAX_ZOOM (3)', () => {
    const { result } = renderHook(() => useViewport())
    for (let i = 0; i < 30; i++) {
      act(() => {
        result.current.onWheel({ deltaY: -1, preventDefault: () => {} } as unknown as React.WheelEvent)
      })
    }
    expect(result.current.viewport.zoom).toBeLessThanOrEqual(3)
  })

  it('pans when mousedown on a pannable element', () => {
    const { result } = renderHook(() => useViewport())
    const panTarget = document.createElement('div')
    panTarget.setAttribute('data-pannable', 'true')

    act(() => {
      result.current.onMouseDown({
        target: panTarget,
        clientX: 10,
        clientY: 20,
        preventDefault: () => {},
      } as unknown as React.MouseEvent)
    })
    act(() => {
      result.current.onMouseMove({ clientX: 30, clientY: 50 } as React.MouseEvent)
    })
    expect(result.current.viewport.x).toBe(20)
    expect(result.current.viewport.y).toBe(30)
  })

  it('does not pan when mousedown on a non-pannable element', () => {
    const { result } = renderHook(() => useViewport())
    const target = document.createElement('div')

    act(() => {
      result.current.onMouseDown({
        target,
        clientX: 0,
        clientY: 0,
        preventDefault: () => {},
      } as unknown as React.MouseEvent)
    })
    act(() => {
      result.current.onMouseMove({ clientX: 50, clientY: 50 } as React.MouseEvent)
    })
    expect(result.current.viewport.x).toBe(0)
    expect(result.current.viewport.y).toBe(0)
  })

  it('stops panning after mouseup', () => {
    const { result } = renderHook(() => useViewport())
    const panTarget = document.createElement('div')
    panTarget.setAttribute('data-pannable', 'true')

    act(() => {
      result.current.onMouseDown({
        target: panTarget,
        clientX: 0,
        clientY: 0,
        preventDefault: () => {},
      } as unknown as React.MouseEvent)
    })
    act(() => { result.current.onMouseUp() })
    act(() => {
      result.current.onMouseMove({ clientX: 100, clientY: 100 } as React.MouseEvent)
    })
    expect(result.current.viewport.x).toBe(0)
    expect(result.current.viewport.y).toBe(0)
  })
})
