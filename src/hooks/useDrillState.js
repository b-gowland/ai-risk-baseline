import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * useDrillState — reads and writes drill + focus state from URL searchParams.
 * Per FR-93/FR-94: drill opens via pushState, closes via replaceState.
 * Esc and second-click on same chip both close the rail.
 */
export function useDrillState() {
  const [searchParams, setSearchParams] = useSearchParams()

  const drill = searchParams.get(`drill`) || null
  const focus = searchParams.get(`focus`) || null

  const openDrill = useCallback((name, focusId = null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set(`drill`, name)
      if (focusId) next.set(`focus`, focusId)
      else next.delete(`focus`)
      return next
    }, { replace: false })
  }, [setSearchParams])

  const closeDrill = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete(`drill`)
      next.delete(`focus`)
      return next
    }, { replace: true })
  }, [setSearchParams])

  const toggleDrill = useCallback((name, focusId = null) => {
    if (drill === name) {
      closeDrill()
    } else {
      openDrill(name, focusId)
    }
  }, [drill, openDrill, closeDrill])

  return { drill, focus, openDrill, closeDrill, toggleDrill }
}
