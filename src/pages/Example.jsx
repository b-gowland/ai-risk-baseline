import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { trackEvent, events } from '../utils/analytics.js'

// Credit decisioning worked example — Sarah's case (APAC bank, EU + AU jurisdictions)
// st=predictive, who=customer_facing, dom=financial_services, dm=automated_decision,
// bp=in_house, dt=personal_financial+personal_basic, ds=10k_100k, juris=eu+au, plat=skip
const EXAMPLE_PARAMS = `st=predictive&who=customer_facing&dom=financial_services&dm=automated_decision&bp=in_house&dt=personal_financial%2Cpersonal_basic&ds=10k_100k&juris=eu%2Cau&plat=skip&v=1`

export default function Example() {
  const navigate = useNavigate()

  useEffect(() => {
    trackEvent(events.EXAMPLE_VIEWED)
    navigate(`/output?${EXAMPLE_PARAMS}`, { replace: true })
  }, [navigate])

  return (
    <div style={{ padding: `40px`, textAlign: `center`, color: `var(--auth-text-faint)` }}>
      Loading worked example…
    </div>
  )
}
