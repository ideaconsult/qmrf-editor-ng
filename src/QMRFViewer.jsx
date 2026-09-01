import { useCallback, useId, useState } from 'react'
import Header from './components/Header.jsx'
import ReportView from './components/ReportView.jsx'
import Sidebar from './components/Sidebar.jsx'
import { EditorProvider, useEditor } from './context/EditorContext.jsx'
import { useViewerConfig, ViewerConfigProvider } from './context/ViewerConfig.jsx'
import './styles/viewer.css'

/**
 * Viewer and editor for a QMRF ((Q)SAR Model Reporting Format) document — the React rewrite of the
 * Java QMRF Editor, which is itself a viewer for QMRF files as much as an editor of them.
 *
 * The component is three layers: what the host asked for (`ViewerConfigProvider`), the open document
 * (`EditorProvider`), and the shell that reads both. Keeping them separate is what lets a field
 * editor added later reach the document without four components in between agreeing to forward it,
 * and lets two viewers sit in one host page without sharing ids or scroll targets.
 *
 * @typedef {object} QMRFViewerProps
 * @property {string} [xml] QMRF document text to open immediately.
 * @property {string} [url] URL to fetch the document from.
 * @property {string} [token] Bearer token used for the `url` fetch.
 * @property {boolean} [readOnly] Defaults to `true`; set `false` to allow editing.
 * @property {boolean} [showHeader] Defaults to `true`; hosts render their own chrome.
 * @property {boolean} [showNav] Defaults to `true`; the chapter and catalog outline.
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
  showNav = true,
  onSave
}) {
  // One id prefix per mounted viewer, so catalog anchors and (later) field ids stay unique even when
  // a host embeds two of these side by side.
  const uid = useId().replace(/:/g, '') || 'qmrf'
  return (
    <ViewerConfigProvider config={{ readOnly, showHeader, showNav, onSave, uid }}>
      <EditorProvider xml={xml} url={url} token={token} onSave={onSave}>
        <Shell />
      </EditorProvider>
    </ViewerConfigProvider>
  )
}

function Shell() {
  const { doc, reportRef } = useEditor()
  const { showHeader, showNav } = useViewerConfig()
  const [dropping, setDropping] = useState(false)

  const onDrop = useCallback(
    /** @type {(event: React.DragEvent<HTMLElement>) => void} */
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
      {showHeader ? <Header /> : null}
      {doc.error ? (
        <p className="qmrf-banner qmrf-banner--error" role="alert">
          {doc.error}
        </p>
      ) : null}
      {doc.loading ? <p className="qmrf-empty">Loading…</p> : null}
      <div className="qmrf-layout">
        {showNav && !doc.loading && doc.model ? <Sidebar /> : null}
        <div className="qmrf-report-area" ref={reportRef}>
          {!doc.loading && doc.model ? <ReportView model={doc.model} /> : null}
          {!doc.loading && !doc.model ? (
            <div className="qmrf-empty qmrf-empty-start">
              <p>No QMRF document loaded.</p>
              <p>
                Open a <code>.xml</code> file, or drop one here.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
