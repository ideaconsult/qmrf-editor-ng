import { useCallback, useState } from 'react'
import ReportView from './components/ReportView.jsx'
import Toolbar from './components/Toolbar.jsx'
import { useDocument } from './hooks/useDocument.js'
import './styles/viewer.css'

/**
 * Viewer and editor for a QMRF ((Q)SAR Model Reporting Format) document — the React rewrite of the
 * Java QMRF Editor, which is itself a viewer for QMRF files as much as an editor of them.
 *
 * What is on screen now is the report: the ten chapters as the schema numbers and labels them, with
 * catalog entries shown where the chapters cite them. Editing arrives with the field editors; the
 * props below already carry their switches so that hosts can pass them today.
 *
 * @typedef {object} QMRFViewerProps
 * @property {string} [xml] QMRF document text to open immediately.
 * @property {string} [url] URL to fetch the document from.
 * @property {string} [token] Bearer token used for the `url` fetch.
 * @property {boolean} [readOnly] Defaults to `true`; set `false` to allow editing.
 * @property {boolean} [showHeader] Defaults to `true`; hosts render their own chrome.
 * @property {(xml: string) => void | Promise<void>} [onSave] Host save handler; enables the Save action.
 */

/**
 * @param {QMRFViewerProps} props
 */
export default function QMRFViewer({
  xml,
  url,
  token,
  readOnly = true,
  showHeader = true,
  onSave
}) {
  const doc = useDocument({ xml, url, token, onSave })
  const [dropping, setDropping] = useState(false)
  const canWrite = !readOnly || Boolean(onSave)

  const onDrop = useCallback(
    /** @type {(event: React.DragEvent<HTMLDivElement>) => void} */
    (event) => {
      event.preventDefault()
      setDropping(false)
      const file = event.dataTransfer.files[0]
      if (file) doc.openFile(file)
    },
    [doc.openFile]
  )

  return (
    <section
      className={`qmrf-root${dropping ? ' qmrf-root--dropping' : ''}`}
      // Named, because it is a drop target as well as a container: the region is what a keyboard or
      // screen-reader user needs to hear before dragging a file onto it.
      aria-label="QMRF document"
      onDragOver={(event) => {
        // Only claim the drag when it can actually be used, so dragging anything else over the
        // viewer leaves the host's own drop handling alone.
        if (Array.from(event.dataTransfer.types).includes('Files')) {
          event.preventDefault()
          setDropping(true)
        }
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={onDrop}
    >
      {showHeader ? (
        <header className="qmrf-header">
          <span className="qmrf-title">QMRF</span>
          <Toolbar
            onOpenFile={doc.openFile}
            onCreate={readOnly ? undefined : doc.create}
            onSave={canWrite ? doc.save : undefined}
            dirty={doc.dirty}
          />
        </header>
      ) : null}
      {doc.error ? (
        <p className="qmrf-banner qmrf-banner--error" role="alert">
          {doc.error}
        </p>
      ) : null}
      {doc.loading ? <p className="qmrf-empty">Loading…</p> : null}
      {!doc.loading && doc.model ? <ReportView model={doc.model} /> : null}
      {!doc.loading && !doc.model ? (
        <div className="qmrf-empty qmrf-empty-start">
          <p>No QMRF document loaded.</p>
          <p>
            Open a <code>.xml</code> file, or drop one here.
          </p>
        </div>
      ) : null}
    </section>
  )
}
