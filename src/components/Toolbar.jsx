import { useRef } from 'react'

/**
 * The actions a document needs that are not about its content: open, start, write out, print.
 *
 * Deliberately a presentational shell — every action arrives as a callback from `useDocument`, so
 * the same toolbar serves the standalone app, a host embed, and the editor that M3 bolts on. The
 * file input is a real input rather than a scripted click on a hidden one because it is the only
 * way to read a local file, and it has to be reachable by keyboard.
 *
 * Print sits beside Save because it is the same act with another carrier: a QMRF is filed as paper
 * as often as it is filed as XML, and a dossier attaches the printed report. The button only asks
 * for the print; switching the report back to its read view first is `Header`'s doing, since that is
 * where the mode lives.
 *
 * @typedef {object} ToolbarProps
 * @property {(file: File) => void} onOpenFile
 * @property {() => void} [onCreate] omitted where a new document is not offered
 * @property {() => void} [onSave] omitted where the document cannot be written out
 * @property {() => void} onPrint
 * @property {boolean} [dirty] the open document differs from the saved one
 * @property {string} [label] what Save is about to write, for its title attribute
 */

const ACCEPT = '.xml,text/xml,application/xml'

/**
 * @param {ToolbarProps} props
 */
export default function Toolbar({
  onOpenFile,
  onCreate,
  onSave,
  onPrint,
  dirty = false,
  label = ''
}) {
  const input = useRef(/** @type {HTMLInputElement|null} */ (null))

  return (
    <div className="qmrf-toolbar">
      <input
        ref={input}
        className="qmrf-toolbar-file"
        type="file"
        accept={ACCEPT}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onOpenFile(file)
          // Cleared so that picking the same file again after editing still counts as a change.
          event.target.value = ''
        }}
      />
      <button type="button" className="qmrf-button" onClick={() => input.current?.click()}>
        Open
      </button>
      {onCreate ? (
        <button type="button" className="qmrf-button" onClick={onCreate}>
          New
        </button>
      ) : null}
      {onSave ? (
        <button
          type="button"
          className="qmrf-button qmrf-button--save"
          onClick={onSave}
          title={label ? `Save ${label}` : 'Save'}
        >
          Save
          {dirty ? (
            <span className="qmrf-dirty" title="Unsaved changes">
              •
            </span>
          ) : null}
        </button>
      ) : null}
      <button
        type="button"
        className="qmrf-button"
        onClick={onPrint}
        title={`Print${label ? ` ${label}` : ''} — the browser's dialog offers "Save as PDF"`}
      >
        Print / PDF
      </button>
    </div>
  )
}
