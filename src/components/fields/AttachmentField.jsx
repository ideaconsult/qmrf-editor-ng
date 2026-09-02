import {
  childSteps,
  formatPath,
  insertOccurrence,
  removeElement,
  setAttr
} from '../../qmrf/model.js'
import { TextRow } from './Controls.jsx'

/**
 * One attachment slot of chapter 9.3 — the training set, the validation set, the other documents.
 *
 * A slot holds `molecules` or `document` elements and nothing else: a URL, whether the file is also
 * embedded, its type and what it is. Those four attributes are the whole of the editing problem, and
 * the file itself is not this app's business — a QMRF document points at its data or carries it
 * base64 inside, and neither is something a browser editor should be rewriting.
 *
 * @typedef {import('../../qmrf/model.js').Model} Model
 * @typedef {import('../../qmrf/model.js').Path} Path
 */

const ROW_ATTRS = ['url', 'filetype', 'description']

/**
 * @param {{
 *   model: Model,
 *   path: Path,
 *   entryElement: string,
 *   onApply: (next: Model, step?: {label?: string}) => void,
 *   onPoint: (address: string) => void
 * }} props
 */
export default function AttachmentField({ model, path, entryElement, onApply, onPoint }) {
  const rows = childSteps(model, path)
    .filter((child) => child.step.name === entryElement)
    .map((child) => ({ node: child.node, path: [...path, child.step] }))

  const add = () => {
    const inserted = insertOccurrence(model, path, entryElement)
    if (!inserted) return
    onApply(inserted.model, { label: `add ${entryElement}` })
    onPoint(formatPath(inserted.path))
  }

  return (
    <div className="qmrf-attachments-edit" data-qmrf-edit="attachment">
      {rows.length === 0 ? <p className="qmrf-edit-empty">No files listed yet.</p> : null}
      {rows.map(({ node, path: rowPath }) => {
        const address = formatPath(rowPath)
        const value = (/** @type {string} */ name) =>
          node.attrs.find((attr) => attr.name === name)?.value ?? ''
        return (
          <div className="qmrf-attachment-edit" key={address} data-qmrf-path={address}>
            {ROW_ATTRS.map((name) => (
              <TextRow
                key={name}
                label={name}
                type={name === 'url' ? 'url' : 'text'}
                value={value(name)}
                placeholder={name === 'url' ? 'https://…' : ''}
                onCommit={(next) =>
                  onApply(setAttr(model, rowPath, name, next), { label: `set ${name}` })
                }
              />
            ))}
            <label className="qmrf-choice-option">
              <input
                type="checkbox"
                checked={value('embedded') === 'Yes'}
                onChange={(event) =>
                  onApply(
                    setAttr(model, rowPath, 'embedded', event.target.checked ? 'Yes' : 'No'),
                    {
                      label: 'set embedded'
                    }
                  )
                }
              />
              embedded in the document
            </label>
            <button
              type="button"
              className="qmrf-button qmrf-button--remove"
              onClick={() =>
                onApply(removeElement(model, rowPath), { label: `remove ${entryElement}` })
              }
            >
              Remove file
            </button>
          </div>
        )
      })}
      <button type="button" className="qmrf-button qmrf-button--add" onClick={add}>
        Add file
      </button>
    </div>
  )
}
