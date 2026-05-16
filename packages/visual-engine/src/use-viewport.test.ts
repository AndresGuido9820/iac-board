import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useViewport } from './use-viewport'

describe('useViewport', () => {
  it('initializes with zoom=1, x=0, y=0', () => {
    const { result } = renderHook(() => useViewport())
    expect(result.current.viewport).toEqual({ zoom: 1, x: 0, y: 0 })
    expect(result.current.transform).toBe('translate(0px, 0px) scale(1)')
  })

  it('zooms in on wheel up (deltaY < 0)', () => {
    const { result } = renderHook(() => useViewport())
    act(() => {
      result.current.onWheel({
        deltaY: -1,
        preventDefault: vi.fn(),
      } as unknown as React.WheelEvent)
    })
    expect(result.current.viewport.zoom).toBeCloseTo(1.1, 5)
  })

  it('zooms out on wheel down (deltaY > 0)', () => {
    const { result } = renderHook(() => useViewport())
    act(() => {
      result.current.onWheel({
        deltaY: 1,
        preventDefault: vi.fn(),
      } as unknown as React.WheelEvent)
    })
    expect(result.current.viewport.zoom).toBeCloseTo(0.9, 5)
  })

  it('clamps zoom at MIN_ZOOM (0.2) when scrolling out many times', () => {
    const { result } = renderHook(() => useViewport())
    for (let i = 0; i < 30; i++) {
      act(() => {
        result.current.onWheel({
          deltaY: 1,
          preventDefault: vi.fn(),
        } as unknown as React.WheelEvent)
      })
    }
    expect(result.current.viewport.zoom).toBeGreaterThanOrEqual(0.2)
  })

  it('clamps zoom at MAX_ZOOM (3) when scrolling in many times', () => {
    const { result } = renderHook(() => useViewport())
    for (let i = 0; i < 30; i++) {
      act(() => {
        result.current.onWheel({
          deltaY: -1,
          preventDefault: vi.fn(),
        } as unknown as React.WheelEvent)
      })
    }
    expect(result.current.viewport.zoom).toBeLessThanOrEqual(3)
  })

  it('pans viewport when mousedown on pannable element then mousemove', () => {
    const { result } = renderHook(() => useViewport())
    const target = document.createElement('div')
    target.setAttribute('data-pannable', 'true')

    act(() => {
      result.current.onMouseDown({
        target,
        clientX: 100,
        clientY: 200,
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent)
    })
    act(() => {
      result.current.onMouseMove({
        clientX: 110,
        clientY: 215,
      } as unknown as React.MouseEvent)
    })

    expect(result.current.viewport.x).toBe(10)
    expect(result.current.viewport.y).toBe(15)
  })

  it('does not pan when mousedown is not on pannable element', () => {
    const { result } = renderHook(() => useViewport())
    const target = document.createElement('div') // no data-pannable

    act(() => {
      result.current.onMouseDown({
        target,
        clientX: 100,
        clientY: 200,
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent)
    })
    act(() => {
      result.current.onMouseMove({
        clientX: 110,
        clientY: 215,
      } as unknown as React.MouseEvent)
    })

    expect(result.current.viewport.x).toBe(0)
    expect(result.current.viewport.y).toBe(0)
  })

  it('stops panning after mouseup', () => {
    const { result } = renderHook(() => useViewport())
    const target = document.createElement('div')
    target.setAttribute('data-pannable', 'true')

    act(() => {
      result.current.onMouseDown({
        target,
        clientX: 100,
        clientY: 200,
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent)
    })
    act(() => {
      result.current.onMouseUp()
    })
    act(() => {
      result.current.onMouseMove({
        clientX: 110,
        clientY: 215,
      } as unknown as React.MouseEvent)
    })

    // No panning after mouseup
    expect(result.current.viewport.x).toBe(0)
    expect(result.current.viewport.y).toBe(0)
  })
})
