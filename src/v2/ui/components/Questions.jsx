import MODEL from '../../data/answer-model.json'
import PURPOSES from '../../data/purposes.json'
import { FIELD_BY_ID, isOptional, toggleMulti } from '../flow.js'
import { allowedValues } from '../url-state.js'
import { FIELD_HELP, FIELD_QUESTIONS, FIELD_TITLES, UNSURE_LABEL, valueLabel } from '../labels.js'
import styles from './Questions.module.css'

const VALUE_HELP = MODEL.value_help
const MAP_VALUES = ['yes', 'no', 'unsure']

const questionText = f => FIELD_QUESTIONS[f.id] || f.question

function Option({ type, name, checked, onChange, label, help, examples }) {
  return (
    <label className={`${styles.option} ${checked ? styles.optionSelected : ''}`}>
      <input type={type} name={name} checked={checked} onChange={onChange} className={styles.control} />
      <span className={styles.optionText}>
        <span className={styles.optionLabel}>{label}</span>
        {help && <span className={styles.optionHelp}>{help}</span>}
        {examples && <span className={styles.optionHelp}>e.g. {examples}</span>}
      </span>
    </label>
  )
}

function Header({ field, missing }) {
  const help = FIELD_HELP[field.id]
  return (
    <>
      <legend className={styles.legend}>
        <span className={styles.eyebrow}>{FIELD_TITLES[field.id]}</span>
        <span className={styles.question}>{questionText(field)}</span>
      </legend>
      {help && <p className={styles.help} id={`${field.id}-help`}>{help}</p>}
      {missing && <p className={styles.missing} role="status">Choose an answer, or Unsure.</p>}
    </>
  )
}

export function SingleQuestion({ fieldId, value, onChange, missing }) {
  const f = FIELD_BY_ID.get(fieldId)
  const help = VALUE_HELP[fieldId] || {}
  return (
    <fieldset className={styles.block} aria-describedby={FIELD_HELP[fieldId] ? `${fieldId}-help` : undefined}>
      <Header field={f} missing={missing} />
      <div className={styles.options}>
        {allowedValues(f).map(v => (
          <Option key={v} type="radio" name={fieldId} checked={value === v} onChange={() => onChange(v)}
            label={valueLabel(fieldId, v)} help={help[v]} />
        ))}
      </div>
    </fieldset>
  )
}

export function MultiQuestion({ fieldId, value, onChange, missing }) {
  const f = FIELD_BY_ID.get(fieldId)
  const help = VALUE_HELP[fieldId] || {}
  const list = Array.isArray(value) ? value : []
  const optional = isOptional(f)
  const noneOfThese = optional && !f.values.includes('none')
  return (
    <fieldset className={styles.block} aria-describedby={FIELD_HELP[fieldId] ? `${fieldId}-help` : undefined}>
      <Header field={f} missing={missing} />
      <p className={styles.hint}>Choose all that apply.</p>
      <div className={styles.options}>
        {allowedValues(f).map(v => (
          <Option key={v} type="checkbox" name={fieldId} checked={list.includes(v)}
            onChange={() => onChange(toggleMulti(list, v))}
            label={v === 'unsure' ? UNSURE_LABEL : valueLabel(fieldId, v)} help={help[v]} />
        ))}
        {noneOfThese && (
          <Option type="checkbox" name={fieldId} checked={Array.isArray(value) && value.length === 0}
            onChange={() => onChange(Array.isArray(value) && value.length === 0 ? undefined : [])}
            label="None of these" />
        )}
      </div>
    </fieldset>
  )
}

/** One yes/no/unsure row per key (prohibited screen, Art. 6(3)). */
export function MapRows({ name, rows, value, onChange, missingKeys = [] }) {
  const map = value || {}
  return (
    <div className={styles.mapRows}>
      {rows.map(row => {
        const missing = missingKeys.includes(row.key)
        return (
          <fieldset key={row.key} className={`${styles.mapRow} ${missing ? styles.mapRowMissing : ''}`}>
            <legend className={styles.mapLegend}>
              {row.eyebrow && <span className={styles.eyebrow}>{row.eyebrow}</span>}
              <span className={styles.mapTitle}>{row.title}</span>
            </legend>
            {row.text && <p className={styles.mapText}>{row.text}</p>}
            <div className={styles.segmented}>
              {MAP_VALUES.map(v => (
                <label key={v} className={`${styles.segment} ${map[row.key] === v ? styles.segmentSelected : ''}`}>
                  <input type="radio" name={`${name}-${row.key}`} checked={map[row.key] === v}
                    onChange={() => onChange({ ...map, [row.key]: v })} className={styles.control} />
                  <span>{valueLabel('common', v)}</span>
                </label>
              ))}
            </div>
            {missing && <p className={styles.missing} role="status">Answer this item.</p>}
          </fieldset>
        )
      })}
    </div>
  )
}

export function Art63Question({ value, onChange, missingKeys, deployerOnly }) {
  const f = FIELD_BY_ID.get('art_6_3')
  const help = VALUE_HELP.art_6_3
  const rows = f.keys.map(k => ({ key: k, title: valueLabel('art_6_3', k), text: help[k] }))
  return (
    <div className={styles.block}>
      <h3 className={styles.legend}>
        <span className={styles.eyebrow}>{FIELD_TITLES.art_6_3}</span>
        <span className={styles.question}>{questionText(f)}</span>
      </h3>
      <p className={styles.help}>{FIELD_HELP.art_6_3}</p>
      {deployerOnly && (
        <p className={styles.callout}>You use a vendor system, so this is your provider's assessment (Art. 6(4)). Answer from their documentation, or Unsure.</p>
      )}
      <MapRows name="art_6_3" rows={rows} value={value} onChange={onChange} missingKeys={missingKeys} />
    </div>
  )
}

const GROUPS = [...new Set(PURPOSES.purposes.map(p => p.group))]

export function PurposeQuestion({ value, onChange, missing }) {
  const f = FIELD_BY_ID.get('purpose')
  const selected = PURPOSES.purposes.find(p => p.id === value)
  return (
    <fieldset className={styles.block} aria-describedby="purpose-help">
      <Header field={f} missing={missing} />
      {GROUPS.map(group => (
        <div key={group} className={styles.group} role="group" aria-labelledby={`group-${group}`}>
          <h3 className={styles.groupTitle} id={`group-${group}`}>{group}</h3>
          <div className={styles.options}>
            {PURPOSES.purposes.filter(p => p.group === group).map(p => (
              <Option key={p.id} type="radio" name="purpose" checked={value === p.id} onChange={() => onChange(p.id)}
                label={p.label} examples={p.examples?.length ? p.examples.join('; ') : null} />
            ))}
          </div>
        </div>
      ))}
      <div className={styles.group}>
        <h3 className={styles.groupTitle}>Not sure</h3>
        <div className={styles.options}>
          <Option type="radio" name="purpose" checked={value === 'unsure'} onChange={() => onChange('unsure')}
            label={UNSURE_LABEL} help="Treated as potentially high-risk until the purpose is confirmed. This blocks go-live." />
        </div>
      </div>
      {selected?.notes && (
        <p className={styles.callout} role="status">
          <strong>{selected.annex_iii ? `Annex III point ${selected.annex_iii}. ` : 'Not listed in Annex III. '}</strong>
          {selected.notes}
        </p>
      )}
    </fieldset>
  )
}

export function Question({ fieldId, answers, setAnswer, missing }) {
  const f = FIELD_BY_ID.get(fieldId)
  const props = { fieldId, value: answers[fieldId], onChange: v => setAnswer(fieldId, v), missing }
  if (f.type === 'multi') return <MultiQuestion {...props} />
  return <SingleQuestion {...props} />
}

