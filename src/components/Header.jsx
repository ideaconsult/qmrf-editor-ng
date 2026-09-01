import { useEditor } from '../context/EditorContext.jsx'
import { useViewerConfig } from '../context/ViewerConfig.jsx'
import { suggestedFilename } from '../qmrf/io.js'
import Toolbar from './Toolbar.jsx'

/**
 * The viewer's own strip of chrome: what this document is, how it scores, and the actions that are
 * about the file rather than its content.
 *
 * Presentational again, like `Toolbar` — everything arrives through the two contexts, so the same
 * header serves the standalone app and an embed. The count chip is the one piece with a second job:
 * it is also the shortcut to the first thing the validator would have the user fix.
 */

export default function Header() {
  const { doc } = useEditor()
  const { readOnly, onSave } = useViewerConfig()
  const canWrite = !readOnly || Boolean(onSave)
  const label = doc.model ? suggestedFilename(doc.model) : ''

  return (
    <header className="qmrf-header">
      <span className="qmrf-title">QMRF</span>
      {doc.report ? <Findings /> : null}
      <fieldset className="qmrf-history" aria-label="Editing history">
        <button
          type="button"
          className="qmrf-button"
          onClick={doc.undoStep}
          disabled={!doc.canUndoStep()}
        >
          Undo
        </button>
        <button
          type="button"
          className="qmrf-button"
          onClick={doc.redoStep}
          disabled={!doc.canRedoStep()}
        >
          Redo
        </button>
      </fieldset>
      <Toolbar
        onOpenFile={doc.openFile}
        onCreate={readOnly ? undefined : doc.create}
        onSave={canWrite ? doc.save : undefined}
        dirty={doc.dirty}
        label={label}
      />
    </header>
  )
}

/**
 * The validation summary as one chip. A reader who trusts a report wants to see that it is clean;
 * one who does not wants to be taken to the worst finding, which is what clicking it does.
 */
function Findings() {
  const { doc, showAddress } = useEditor()
  const report = doc.report
  if (!report) return null
  const { error, warning, info } = report.counts
  const worst = error > 0 ? 'error' : warning > 0 ? 'warning' : 'info'
  // Issues arrive in document order with the ones about the file first, and a document-level
  // finding has the empty address — the report's own properties block.
  const target = report.issues.find((issue) => issue.severity === worst)?.path ?? null
  const parts = [
    error && `${error} ${plural(error, 'error')}`,
    warning && `${warning} ${plural(warning, 'warning')}`,
    info && `${info} ${plural(info, 'note')}`
  ].filter(Boolean)

  return (
    <button
      type="button"
      className={`qmrf-chip qmrf-chip--${error + warning + info === 0 ? 'clean' : worst}`}
      onClick={() => target !== null && showAddress(target)}
      disabled={target === null}
      title="Go to the first finding"
    >
      {parts.length > 0 ? parts.join(', ') : 'no findings'}
    </button>
  )
}

function plural(/** @type {number} */ count, /** @type {string} */ word) {
  return count === 1 ? word : `${word}s`
}
