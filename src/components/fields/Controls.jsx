import { useEffect, useId, useRef, useState } from 'react'

/**
 * The three controls every field editor is built from.
 *
 * They share one discipline: **a write happens when the user leaves the control, not on every
 * keystroke.** That keeps the undo tape readable (one step per edit rather than one per character),
 * keeps the model immutable-copy-on-write cost proportional to edits rather than to typing, and
 * means a document is never left holding half a word.
 *
 * Draft state lives in the control and is discarded to the model on commit. While a control holds
 * the caret its draft wins, so a sibling field's edit (which re-renders this one with a fresh value)
 * cannot yank text out from under the keyboard; once it lets go, the model wins again, which is what
 * makes undo visible in the box.
 */

/**
 * @param {{
 *   label: string,
 *   value?: string,
 *   onCommit: (value: string) => void,
 *   hint?: string,
 *   placeholder?: string,
 *   type?: string,
 *   align?: 'left'|'right'
 * }} props
 */
export function TextRow({
  label,
  value = '',
  onCommit,
  hint = '',
  placeholder = '',
  type = 'text'
}) {
  const [draft, setDraft] = useState(value)
  const held = useRef(false)
  // The label element wraps the field so a click on the words focuses it, which also means the
  // field's accessible name is read out of that label's text — including the hint. A reader should
  // hear "Date" and then, separately, "this document writes dd.MM.yyyy", so the name is stated
  // outright (the same words the label shows) and the hint is referred to.
  const described = useId()
  useEffect(() => {
    if (!held.current) setDraft(value)
  }, [value])

  const commit = (/** @type {string} */ next) => {
    if (next !== value) onCommit(next)
  }

  return (
    <label className={`qmrf-edit-row qmrf-edit-row--${type === 'date' ? 'date' : 'text'}`}>
      <span className="qmrf-edit-label">{label}</span>
      <input
        className="qmrf-input"
        type="text"
        inputMode={type === 'url' ? 'url' : undefined}
        aria-label={label}
        aria-describedby={hint ? described : undefined}
        value={draft}
        placeholder={placeholder}
        onFocus={() => {
          held.current = true
        }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => {
          held.current = false
          commit(event.target.value)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
          }
        }}
      />
      {hint ? (
        <span className="qmrf-edit-hint" id={described}>
          {hint}
        </span>
      ) : null}
    </label>
  )
}

/**
 * A choice among the values the DTD lists for one attribute.
 * @param {{label: string, value: string, options: string[], onPick: (value: string) => void}} props
 */
export function EnumRow({ label, value, options, onPick }) {
  const group = useId()
  return (
    <fieldset className="qmrf-edit-row qmrf-choice">
      <legend className="qmrf-edit-label">{label}</legend>
      {options.map((option) => (
        <label className="qmrf-choice-option" key={option}>
          <input
            type="radio"
            name={group}
            value={option}
            checked={value === option}
            onChange={() => onPick(option)}
          />
          {option}
        </label>
      ))}
    </fieldset>
  )
}

/**
 * The 6.2 / 7.2 inventory flags.
 *
 * A checkbox rather than two radios: these attributes are `Yes|No` *and required*, so an unchecked
 * box means "No", not "say nothing" — which is also how a flag a document never carried reads. The
 * first click on such a flag writes `No` where the file held nothing, upgrading an older document
 * toward the schema rather than leaving the hole open.
 *
 * @param {{flags: {attr: string, label: string, value: string}[], onSet: (attr: string, value: string) => void}} props
 */
export function FlagGrid({ flags, onSet }) {
  return (
    <fieldset className="qmrf-edit-row qmrf-flags-grid">
      <legend className="qmrf-edit-label">Available information</legend>
      {flags.map((flag) => (
        <label className="qmrf-choice-option" key={flag.attr}>
          <input
            type="checkbox"
            checked={flag.value === 'Yes'}
            onChange={(event) => onSet(flag.attr, event.target.checked ? 'Yes' : 'No')}
          />
          {flag.label}
        </label>
      ))}
    </fieldset>
  )
}
