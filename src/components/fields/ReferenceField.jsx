import { useState } from 'react'
import { addEntry, catalogEntries } from '../../qmrf/catalog.js'
import {
  childSteps,
  formatPath,
  getAttr,
  insertOccurrence,
  removeElement,
  setAttr
} from '../../qmrf/model.js'
import { findEndpointTerm } from '../../qmrf/vocab/endpoints.js'
import { TextRow } from './Controls.jsx'
import EndpointPicker from './EndpointPicker.jsx'

/**
 * A reference field, edited: the pointers into one catalog.
 *
 * A chapter never holds what it cites, so editing a reference is always one of three moves — start
 * pointing at an entry, stop pointing, point somewhere else — and the entries themselves belong to
 * the catalogs (M5's tables). The exception is the endpoint vocabulary, which lives outside the
 * document and is minted as an entry here the moment it is chosen.
 *
 * Two rules, both from the complaint that "adding does not always work":
 *
 * - **Never select nothing.** The candidate list arrives with its first entry chosen, so Add always
 *   has a target. A control that adds "whatever was selected", where nothing ever was, is a control
 *   that appears to do nothing.
 * - **Say why when it cannot.** No catalog block, a term that is not in the vocabulary, a field the
 *   document does not hold: each leaves a note in the field instead of a click into the void.
 *
 * @typedef {import('../../qmrf/model.js').Model} Model
 * @typedef {import('../../qmrf/model.js').Path} Path
 */

/**
 * @param {{
 *   model: Model,
 *   path: Path,
 *   refElement: string,
 *   catalog: string,
 *   label: string,
 *   refAttrs?: string[],
 *   fieldAttrs?: string[],
 *   onApply: (next: Model, step?: {label?: string}) => void,
 *   onPoint: (address: string) => void
 * }} props
 */
export default function ReferenceField({
  model,
  path,
  refElement,
  catalog,
  label,
  refAttrs = [],
  fieldAttrs = [],
  onApply,
  onPoint
}) {
  const [note, setNote] = useState('')
  const [chosen, setChosen] = useState('')
  const entries = catalogEntries(model, catalog)
  const options = entries.filter((entry) => entry.id !== '')
  const pointers = childSteps(model, path)
    .filter((child) => child.step.name === refElement)
    .map((child) => ({ node: child.node, path: [...path, child.step] }))
  // The first entry is selected before the user touches the select, so the button next to it can
  // never be waiting for a choice that was never made.
  const candidate = options.some((entry) => entry.id === chosen) ? chosen : (options[0]?.id ?? '')

  /**
   * Insert one pointer naming `id`. `base` is whichever model is current at this point in a
   * two-step write — mint the entry, then point into it — because the second step cannot be built
   * from the model the component was rendered with.
   */
  const pointerInto = (
    /** @type {Model} */ base,
    /** @type {string} */ id,
    /** @type {string} */ what
  ) => {
    const inserted = insertOccurrence(base, path, refElement)
    if (!inserted) {
      setNote(`This document has no ${heading(path)} element to hold a ${what}.`)
      return
    }
    onApply(setAttr(inserted.model, inserted.path, 'idref', id), { label: `cite ${what}` })
    onPoint(formatPath(inserted.path))
    setNote('')
  }

  const cite = (/** @type {string} */ id) => {
    const entry = options.find((option) => option.id === id)
    if (!entry) {
      setNote(`Nothing in the ${lower(label)} catalog is called ${id}.`)
      return
    }
    pointerInto(model, entry.id, entry.label)
  }

  const citeTerm = (/** @type {string} */ termId) => {
    const term = findEndpointTerm(termId)
    if (!term) {
      setNote('That term is not in the endpoint vocabulary.')
      return
    }
    // A document already carrying this term points at the row it has rather than minting a twin and
    // letting the validator explain the duplicate ids afterwards.
    if (entries.some((entry) => entry.id === term.id)) {
      pointerInto(model, term.id, term.name)
      return
    }
    const added = addEntry(model, catalog, term.entry)
    if (!added) {
      setNote(`This document has no ${lower(label)} catalog for ${term.name} to go into.`)
      return
    }
    pointerInto(added.model, added.id, term.name)
  }

  const createEntry = () => {
    const added = addEntry(model, catalog)
    if (!added) {
      setNote(`This document has no ${lower(label)} catalog to add an entry to.`)
      return
    }
    pointerInto(added.model, added.id, `new ${lower(label)} entry`)
    setNote(
      `Added ${added.id} to the ${lower(label)} catalog — fill its row in at the foot of the report.`
    )
  }

  const drop = (/** @type {Path} */ pointerPath) => {
    onApply(removeElement(model, pointerPath), { label: `uncite ${refElement}` })
    setNote('')
  }

  return (
    <div className="qmrf-reference" data-qmrf-edit="reference">
      {pointers.length === 0 ? <p className="qmrf-edit-empty">Nothing cited yet.</p> : null}
      <ul className="qmrf-edit-list">
        {pointers.map(({ node, path: pointerPath }) => {
          const address = formatPath(pointerPath)
          const id = node.attrs.find((attr) => attr.name === 'idref')?.value ?? ''
          const known = options.some((entry) => entry.id === id)
          const resolved = entries.find((entry) => entry.id === id)
          return (
            <li className="qmrf-edit-item" key={address} data-qmrf-path={address}>
              <span className="qmrf-edit-item-label">
                {resolved?.label ?? (id ? `${id} — not in the catalog` : 'points at nothing')}
              </span>
              <select
                className="qmrf-input"
                aria-label={`Entry cited by ${address}`}
                value={known ? id : ''}
                onChange={(event) =>
                  onApply(setAttr(model, pointerPath, 'idref', event.target.value), {
                    label: 'repoint'
                  })
                }
              >
                {known ? null : (
                  <option value="" disabled>
                    {id ? `${id} (not in the catalog)` : 'nothing chosen'}
                  </option>
                )}
                {options.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
              {refAttrs.map((name) => (
                <input
                  className="qmrf-input qmrf-input--short"
                  key={name}
                  type="text"
                  aria-label={name}
                  placeholder={name}
                  defaultValue={node.attrs.find((attr) => attr.name === name)?.value ?? ''}
                  onBlur={(event) =>
                    onApply(setAttr(model, pointerPath, name, event.target.value), {
                      label: `set ${name}`
                    })
                  }
                />
              ))}
              <button
                type="button"
                className="qmrf-button qmrf-button--remove"
                onClick={() => drop(pointerPath)}
              >
                Remove
              </button>
            </li>
          )
        })}
      </ul>

      {fieldAttrs.map((name) => (
        <TextRow
          key={name}
          label={name}
          value={getAttr(model, path, name)}
          onCommit={(value) => onApply(setAttr(model, path, name, value), { label: `set ${name}` })}
        />
      ))}

      <div className="qmrf-edit-add">
        {options.length > 0 ? (
          <label className="qmrf-edit-row">
            <span className="qmrf-edit-label">Cite</span>
            {/* Named outright rather than left to the wrapping label, whose text is also where the
                currently chosen entry's own name would be read from — which would make one option's
                title part of another control's name. */}
            <select
              className="qmrf-input"
              aria-label="Cite"
              value={candidate}
              onChange={(event) => setChosen(event.target.value)}
            >
              {options.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="qmrf-button qmrf-button--add"
              disabled={!candidate}
              onClick={() => cite(candidate)}
            >
              Cite entry
            </button>
          </label>
        ) : (
          <span className="qmrf-edit-hint">
            Nothing in this document's {lower(label)} catalog yet.
          </span>
        )}
        <button type="button" className="qmrf-button" onClick={createEntry}>
          New {lower(label)} entry
        </button>
      </div>

      {catalog === 'endpoints_catalog' ? (
        <EndpointPicker onPick={citeTerm} picked={entries.map((entry) => entry.id)} />
      ) : null}

      {note ? (
        <p className="qmrf-edit-note" role="status">
          {note}
        </p>
      ) : null}
    </div>
  )
}

/** The last step of a path, which is what a reader would call the element that failed to appear. */
function heading(/** @type {Path} */ path) {
  return path.at(-1)?.name ?? 'field'
}

function lower(/** @type {string} */ text) {
  return text.toLowerCase()
}
