import { useState } from 'react'
import { useEditing, useEditor } from '../context/EditorContext.jsx'
import { useViewerConfig } from '../context/ViewerConfig.jsx'
import {
  addEntry,
  catalogAddress,
  catalogEntries,
  citationIndex,
  entryFields,
  entryOptions
} from '../qmrf/catalog.js'
import { formatPath, removeAttr, removeElement, setAttr } from '../qmrf/model.js'
import { CATALOG_NOTES, elements, linkHref } from '../qmrf/render.js'
import { SPEC } from '../qmrf/spec.js'
import { TextRow } from './fields/Controls.jsx'

/**
 * The six catalogs, as a table to read and a form to work in.
 *
 * Upstream's `qmrf2div.xsl` hides the catalogs outright: a printed report only needs an entry where
 * it is cited. Both a reader who wants to know what a model drew on and an editor who has to fix a
 * descriptor name need the tables themselves, so this app appends them, in the schema's order.
 *
 * Reading is a table, columns in the order the DTD declares them. Editing is deliberately not the
 * same table with inputs in the cells: an entry is six to eight attributes, several of them a
 * paragraph, and a grid of text boxes is harder to read than one form per entry. One entry's form is
 * open at a time per catalog — the published document holds 22 entries, and a model built on the
 * descriptor catalog can hold a hundred, so mounting every form at once would build a thousand
 * inputs to hide behind the fold. The closed row still shows what an entry *is* (its own heading
 * attributes) and who cites it, which is everything needed to choose which one to open. Addresses
 * are the same either way, so the jump M6 adds lands on an entry open or closed.
 *
 * Who cites what is worked out once, here, and handed down: asked per entry it would walk the whole
 * document once per row, which on a real document is the slowest thing in the report.
 *
 * @typedef {import('../qmrf/catalog.js').Citation} Citation
 * @typedef {import('../qmrf/catalog.js').EntryField} EntryField
 * @typedef {import('../qmrf/model.js').Model} Model
 * @typedef {import('../qmrf/xml.js').XmlElement} XmlElement
 * @typedef {ReturnType<typeof catalogEntries>[number]} CatalogEntry
 */

/**
 * `id` is dropped from the columns: it is the handle the pointers in the chapters use, and this
 * view already shows a pointer as the entry it names, so the table would only be repeating itself.
 */
const HIDDEN_COLUMNS = ['id', 'ontology_term']

/**
 * @param {{model: Model, block: XmlElement}} props
 */
export default function Catalogs({ model, block }) {
  const editing = useEditing()
  const catalogs = elements(block).filter((catalog) =>
    SPEC.catalogs.some((entry) => entry.name === catalog.name)
  )
  if (catalogs.length === 0) return null
  const cited = citationIndex(model)
  return (
    <section className="qmrf-catalogs">
      <h3 className="qmrf-catalogs-heading">Catalogs</h3>
      {catalogs.map((catalog) => (
        <Catalog
          key={catalog.name}
          model={model}
          catalog={catalog}
          editing={editing}
          cited={cited}
        />
      ))}
    </section>
  )
}

/**
 * @param {{
 *   model: Model,
 *   catalog: XmlElement,
 *   editing: boolean,
 *   cited: Map<string, Citation[]>
 * }} props
 */
function Catalog({ model, catalog, editing, cited }) {
  const { uid } = useViewerConfig()
  const [open, setOpen] = useState('')
  const shape = SPEC.catalogs.find((entry) => entry.name === catalog.name)
  const entries = catalogEntries(model, catalog.name)
  const label = shape?.label ?? catalog.name.replace(/_catalog$/, '')
  const blurb = CATALOG_NOTES[catalog.name] ?? ''
  // The catalog's own address, so the outline can jump here, and an id prefixed with this viewer's
  // uid, so two viewers in one host page do not share anchors.
  const address = catalogAddress(catalog.name)
  const id = `${uid}-catalog-${catalog.name}`

  if (!editing) {
    if (entries.length === 0)
      return (
        <section className="qmrf-catalog" id={id} data-qmrf-path={address}>
          <h4 className="qmrf-catalog-heading">{label}</h4>
          <p className="qmrf-catalog-empty">
            {blurb ? `${blurb} ` : ''}
            <span>Nothing listed.</span>
          </p>
        </section>
      )
    const columns = (shape?.attrs ?? [])
      .map((attr) => attr.name)
      .filter((column) => !HIDDEN_COLUMNS.includes(column))
    return (
      <section className="qmrf-catalog" id={id} data-qmrf-path={address}>
        <h4 className="qmrf-catalog-heading">
          {label} <span className="qmrf-catalog-count">{entries.length}</span>
        </h4>
        <Table entries={entries} columns={columns} blurb={blurb} />
      </section>
    )
  }

  const fields = entryFields(catalog.name)
  return (
    <section className="qmrf-catalog" id={id} data-qmrf-path={address}>
      <h4 className="qmrf-catalog-heading">
        {label} <span className="qmrf-catalog-count">{entries.length}</span>
      </h4>
      {blurb ? <p className="qmrf-catalog-note">{blurb}</p> : null}
      {entries.map((entry) => {
        const row = formatPath(entry.path)
        return (
          <EntryEditor
            key={row}
            model={model}
            entry={entry}
            fields={fields}
            citations={cited.get(entry.id) ?? []}
            open={open === row}
            onToggle={() => setOpen(open === row ? '' : row)}
          />
        )
      })}
      <AddBar
        catalog={catalog.name}
        label={label}
        entryElement={shape?.entryElement ?? 'entry'}
        onAdded={(path) => setOpen(path)}
      />
    </section>
  )
}

/** The read view: one row per entry, cells in the declared column order. */
function Table(/** @type {{entries: CatalogEntry[], columns: string[], blurb: string}} */ props) {
  const { entries, columns, blurb } = props
  const value = (/** @type {XmlElement} */ node, /** @type {string} */ name) =>
    node.attrs.find((attr) => attr.name === name)?.value ?? ''
  return (
    <table className="qmrf-catalog-table">
      <caption className="qmrf-catalog-note">{blurb}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => {
          // The row's own address doubles as its key: it is unique, stable, and the same string
          // M6 will scroll to.
          const address = formatPath(entry.path)
          return (
            <tr key={address} data-qmrf-path={address}>
              {columns.map((column) => {
                const text = value(entry.node, column)
                const href = linkHref(column, text)
                return (
                  <td key={column}>
                    {href ? (
                      <a
                        className="qmrf-external"
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {text}
                      </a>
                    ) : (
                      text
                    )}
                  </td>
                )
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/**
 * One catalog entry, edited.
 *
 * The handle is shown rather than edited: an `id` is what every pointer in the chapters names, so
 * changing it rewrites the document rather than spelling a word differently. `renameId` in
 * `model.js` does that rewrite when a document needs it; a wrong id nobody has cited is simply
 * removed and added again, which mints a free one and cannot strand a pointer.
 *
 * Whether an entry may be removed at all is not the editor's guess — the pointers say. A cited entry
 * gets no live Remove button and a line naming the fields that cite it, each of them a jump to the
 * one that has to let go first.
 *
 * @param {{
 *   model: Model,
 *   entry: CatalogEntry,
 *   fields: EntryField[],
 *   citations: Citation[],
 *   open: boolean,
 *   onToggle: () => void
 * }} props
 */
function EntryEditor({ model, entry, fields, citations, open, onToggle }) {
  const { doc, showAddress } = useEditor()
  const address = formatPath(entry.path)
  const held = (/** @type {string} */ name) =>
    entry.node.attrs.find((attr) => attr.name === name)?.value ?? ''

  return (
    <div className="qmrf-catalog-entry" data-qmrf-path={address}>
      <div className="qmrf-catalog-entry-head">
        <button
          type="button"
          className="qmrf-catalog-entry-toggle"
          aria-expanded={open}
          aria-label={`${open ? 'Close' : 'Edit'} ${entry.id || 'entry'}`}
          onClick={onToggle}
        >
          {entry.label}
        </button>
        <code className="qmrf-catalog-entry-id">{entry.id || 'no id'}</code>
        <button
          type="button"
          className="qmrf-button qmrf-button--remove"
          // The same accessible name whether or not it is live: a reader working down a catalog hears
          // which entry is at stake, not a column of identical "Remove" buttons.
          aria-label={`Remove ${entry.id || 'this entry'}`}
          disabled={citations.length > 0}
          title={
            citations.length > 0
              ? `In use — cited by ${citations.map((citation) => citation.label).join(', ')}`
              : undefined
          }
          onClick={() =>
            doc.edit(removeElement(model, entry.path), { label: `remove ${entry.label}` })
          }
        >
          Remove
        </button>
      </div>

      {citations.length > 0 ? (
        <p className="qmrf-catalog-used">
          In use, cited by{' '}
          {citations.map((citation, at) => (
            <span className="qmrf-catalog-cite" key={citation.address}>
              {at > 0 ? ', ' : ''}
              <button type="button" onClick={() => showAddress(citation.address)}>
                {citation.label}
              </button>
            </span>
          ))}
          . Remove the citation there to free this entry.
        </p>
      ) : null}

      {open ? (
        <div className="qmrf-catalog-entry-attrs">
          {fields.map((field) => (
            <EntryAttr
              key={field.name}
              model={model}
              entry={entry}
              field={field}
              current={held(field.name)}
              onApply={(next, label) => doc.edit(next, { label })}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

/**
 * One attribute of one entry: a text row, or a picker into another catalog — the same two shapes the
 * chapter fields use for the same two kinds of attribute.
 *
 * @param {{
 *   model: Model,
 *   entry: CatalogEntry,
 *   field: EntryField,
 *   current: string,
 *   onApply: (next: Model, label: string) => void
 * }} props
 */
function EntryAttr({ model, entry, field, current, onApply }) {
  const write = (/** @type {string} */ value) =>
    onApply(setAttr(model, entry.path, field.name, value), `set ${field.name}`)

  if (field.refCatalog) {
    const options = entryOptions(model, field.refCatalog)
    const known = options.some((option) => option.id === current)
    return (
      <label className="qmrf-edit-row qmrf-edit-row--ref">
        <span className="qmrf-edit-label">{field.name}</span>
        <select
          className="qmrf-input"
          aria-label={field.name}
          value={current}
          onChange={(event) =>
            // "not cited" drops the attribute rather than writing `publication_ref=""`: an entry
            // that cites nothing is missing the attribute, not holding a blank in it.
            event.target.value === ''
              ? onApply(removeAttr(model, entry.path, field.name), `clear ${field.name}`)
              : write(event.target.value)
          }
        >
          <option value="">not cited</option>
          {known || current === '' ? null : (
            <option value={current}>{`${current} (not in the catalog)`}</option>
          )}
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    )
  }

  return (
    <TextRow
      label={field.name}
      value={current}
      hint={field.required && current === '' ? 'required by the schema' : ''}
      onCommit={write}
    />
  )
}

/**
 * The one control that grows a catalog. It says so when the document has nowhere to put the entry —
 * the same rule every other add in this app follows, that a refusal is worth a sentence — and it
 * opens the entry it made, which is the only thing the reader is going to do next with it.
 *
 * @param {{catalog: string, label: string, entryElement: string, onAdded: (address: string) => void}} props
 */
function AddBar({ catalog, label, entryElement, onAdded }) {
  const { doc, markAddress } = useEditor()
  const model = doc.model
  const [note, setNote] = useState('')
  if (!model) return null

  const add = () => {
    const added = addEntry(model, catalog)
    if (!added) {
      setNote(`This document has no ${catalog} element to add an entry to.`)
      return
    }
    setNote('')
    doc.edit(added.model, { label: `add ${label.toLowerCase()} entry` })
    const address = formatPath(added.path)
    onAdded(address)
    // Where the new entry is, without moving the reader: it lands under the button that was just
    // pressed, and the scroll-keeping holds the rest of the page still.
    markAddress(address)
  }

  return (
    <div className="qmrf-edit-add">
      <button type="button" className="qmrf-button qmrf-button--add" onClick={add}>
        Add {entryElement}
      </button>
      {note ? (
        <p className="qmrf-edit-note" role="status">
          {note}
        </p>
      ) : null}
    </div>
  )
}
