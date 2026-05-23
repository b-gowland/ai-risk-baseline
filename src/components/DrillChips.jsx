import styles from './DrillChips.module.css'

const DRILLS = [
  { id: `regulatory`, label: `Regulatory`, getCount: (output) => output?.regulatory?.length || 0 },
  { id: `risks`,      label: `Risks`,      getCount: (output) => output?.risks?.length || 0 },
  { id: `controls`,   label: `Controls`,   getCount: (output) => output?.controls?.length || 0 },
  { id: `actions`,    label: `Actions`,    getCount: (output) => output?.actions?.length || 0 },
  { id: `platform`,   label: `Platform`,   getCount: () => 0 },
]

/**
 * DrillChips — chip row that opens/closes the detail rail.
 * Per design: full-width, above the canvas, with "Drill into:" eyebrow.
 * Active chip is highlighted; second click or Esc closes the rail.
 */
export default function DrillChips({ output, activeDrill, onToggle }) {
  return (
    <div className={styles.wrapper}>
      <span className={styles.eyebrow}>Drill into</span>
      <div className={styles.chips}>
        {DRILLS.map(drill => {
          const count = drill.getCount(output)
          const isActive = activeDrill === drill.id
          return (
            <button
              key={drill.id}
              className={`${styles.chip} ${isActive ? styles.chipActive : ``} ${drill.placeholder ? styles.chipPlaceholder : ``}`}
              aria-pressed={isActive}
              onClick={() => onToggle(drill.id)}
            >
              {drill.label}
              {count > 0 && (
                <span className={`${styles.count} ${isActive ? styles.countActive : ``}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
