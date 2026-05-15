import { useMemo } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { buildOutput } from '../engine/baseline.js'
import { decodeConfig } from '../engine/url-state.js'
import styles from './DrillPage.module.css'

// Import the same content renderers from Output (they're extracted to shared file)
import {
  RisksContent,
  RegulatoryContent,
  ControlsContent,
  ActionsContent,
  PlatformContent,
} from '../components/DrillContent.jsx'

const DRILL_TITLES = {
  regulatory: `Regulatory`,
  risks: `Risks`,
  controls: `Controls`,
  actions: `Actions`,
  platform: `Platform`,
}

/**
 * DrillPage — mobile full-screen view for a single drill.
 * Route: /output/drill/:name
 * Back arrow returns to /output?<config params>
 */
export default function DrillPage() {
  const { name } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const config = useMemo(() => decodeConfig(searchParams), [searchParams])
  const output = useMemo(() => {
    if (!config) return null
    return buildOutput(config, new Date())
  }, [config])

  const title = DRILL_TITLES[name] || name

  function handleBack() {
    // Back to output page preserving all config params
    navigate(`/output?${searchParams.toString()}`)
  }

  if (!config) {
    return (
      <div className={styles.empty}>
        <p>No configuration. <Link to="/configure">Start here →</Link></p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={handleBack} aria-label="Back to baseline">
          ← Back
        </button>
        <h1 className={styles.title}>{title}</h1>
      </div>
      <div className={styles.body}>
        <DrillContent name={name} output={output} config={config} />
      </div>
    </div>
  )
}

function DrillContent({ name, output, config }) {
  switch (name) {
    case `risks`:      return <RisksContent output={output} />
    case `regulatory`: return <RegulatoryContent output={output} />
    case `controls`:   return <ControlsContent output={output} />
    case `actions`:    return <ActionsContent output={output} />
    case `platform`:   return <PlatformContent config={config} />
    default:
      return <p style={{ color: `var(--auth-text-muted)` }}>Unknown drill: {name}</p>
  }
}
