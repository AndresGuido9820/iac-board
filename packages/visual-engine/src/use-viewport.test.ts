import { renderHook, act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useViewport } from './use-viewport'

describe('useViewport', () => {
  it('initialises with zoom=1 and no pan', () => {
    const { result } = renderHook(() => useViewport())
    expect(result.current.viewport.zoom).toBe(1)
    expect(result.current.viewport.x).toBe(0)
    expect(result.current.viewport.y).toBe(0)
  })

  it('exposes transform string', () => {
    const { result } = renderHook(() => useViewport())
    expect(result.current.transform).toContain('translate')
    expect(result.current.transform).toContain('scale')
  })

  it('zooms in on wheel up', () => {
    const { result } = renderHook(() => useViewport())
    act(() => {
      result.current.onWheel({ deltaY: -1, preventDefault: () => {} } as unknown as React.WheelEvent)
    })
    expect(result.current.viewport.zoom).toBeGreaterThan(1)
  })

  it('zooms out on wheel down', () => {
    const { result } = renderHook(() => useViewport())
    act(() => {
      result.current.onWheel({ deltaY: 1, preventDefault: () => {} } as unknown as React.WheelEvent)
    })
    expect(result.current.viewport.zoom).toBeLessThan(1)
  })

  it('does not exceed MAX_ZOOM on repeated wheel up', () => {
    const { result } = renderHook(() => useViewport())
    for (let i = 0; i < 100; i++) {
      act(() => {
        result.current.onWheel({ deltaY: -1, preventDefault: () => {} } as unknown as React.WheelEvent)
      })
    }
    expect(result.current.viewport.zoom).toBeLessThanOrEqual(3)
  })

  it('does not go below MIN_ZOOM on repeated wheel down', () => {
    const { result } = renderHook(() => useViewport())
    for (let i = 0; i < 100; i++) {
      act(() => {
        result.current.onWheel({ deltaY: 1, preventDefault: () => {} } as unknown as React.WheelEvent)
      })
    }
    expect(result.current.viewport.zoom).toBeGreaterThanOrEqual(0.2)
  })

  it('pans on mousedown + mousemove', () => {
    const { result } = renderHook(() => useViewport())
    act(() => {
      result.current.onMouseDown({
        clientX: 100, clientY: 100,
        target: { closest: () => true },
        preventDefault: () => {},
      } as unknown as React.MouseEvent)
    })
    act(() => {
      result.current.onMouseMove({ clientX: 150, clientY: 120 } as React.MouseEvent)
    })
    expect(result.current.viewport.x).toBe(50)
    expect(result.current.viewport.y).toBe(20)
  })

  it('stops panning after mouseup', () => {
    const { result } = renderHook(() => useViewport())
    act(() => {
      result.current.onMouseDown({
        clientX: 100, clientY: 100,
        target: { closest: () => true },
        preventDefault: () => {},
      } as unknown as React.MouseEvent)
    })
    act(() => { result.current.onMouseUp() })
    act(() => {
      result.current.onMouseMove({ clientX: 200, clientY: 200 } as React.MouseEvent)
    })
    // After mouseup, position should not have changed
    expect(result.current.viewport.x).toBe(0)
    expect(result.current.viewport.y).toBe(0)
  })

  it('does not pan if mousedown not on pannable target', () => {
    const { result } = renderHook(() => useViewport())
    act(() => {
      result.current.onMouseDown({
        clientX: 100, clientY: 100,
        target: { closest: () => null },
        preventDefault: () => {},
      } as unknown as React.MouseEvent)
    })
    act(() => {
      result.current.onMouseMove({ clientX: 200, clientY: 200 } as React.MouseEvent)
    })
    expect(result.current.viewport.x).toBe(0)
    expect(result.current.viewport.y).toBe(0)
  })
})
