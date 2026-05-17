import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * useDrillState — reads and writes drill + focus state from URL searchParams.
 *
 * History discipline per FR-88 / FR-93:
 *   - Fresh open  → pushState  (one history entry; back closes rail)
 *   - Switch drill → replaceState (no history entry; back goes to no-drill, not prior drill)
 *   - Close drill  → pushState  (one history entry; back reopens the drill)
 *   - Set focus    → replaceState (refinement, not navigation; per FR-94)
 */
export function useDrillState() {
  const [searchParams, setSearchParams] = useSearchParams()

  const drill = searchParams.get(`drill`) || null
  const focus = searchParams.get(`focus`) || null

  // Fresh open from no-drill state: pushState (FR-88)
  const openDrill = useCallback((name, focusId = null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set(`drill`, name)
      if (focusId) next.set(`focus`, focusId)
      else next.delete(`focus`)
      return next
    }, { replace: false })
  }, [setSearchParams])

  // Switch from one drill to another: replaceState (FR-93)
  const switchDrill = useCallback((name, focusId = null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set(`drill`, name)
      if (focusId) next.set(`focus`, focusId)
      else next.delete(`focus`)
      return next
    }, { replace: true })
  }, [setSearchParams])

  // Close drill: pushState so back reopens the last open drill (FR-88)
  const closeDrill = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete(`drill`)
      next.delete(`focus`)
      return next
    }, { replace: false })
  }, [setSearchParams])

  const toggleDrill = useCallback((name, focusId = null) => {
    if (drill === name) {
      closeDrill()          // close: pushState
    } else if (drill) {
      switchDrill(name, focusId) // switch: replaceState (FR-93)
    } else {
      openDrill(name, focusId)   // fresh open: pushState (FR-88)
    }
  }, [drill, openDrill, switchDrill, closeDrill])

  return { drill, focus, openDrill, closeDrill, toggleDrill }
}
