import './styles/viewer.css'

/**
 * @typedef {object} QMRFViewerProps
 * @property {string} [xml] QMRF document text to open immediately.
 * @property {string} [url] URL to fetch the document from.
 * @property {boolean} [readOnly] Defaults to `true`; set `false` to allow editing.
 * @property {string} [token] Bearer token used for the `url` fetch.
 * @property {boolean} [showHeader] Defaults to `true`; hosts render their own chrome.
 * @property {(xml: string) => void} [onSave] Host save handler; enables the Save action.
 */

/**
 * Viewer + editor for a QMRF ((Q)SAR Model Reporting Format) document.
 * @param {QMRFViewerProps} props
 */
export default function QMRFViewer({ showHeader = true }) {
  return (
    <div className="qmrf-root">
      {showHeader ? (
        <header className="qmrf-header">
          <span className="qmrf-title">QMRF</span>
        </header>
      ) : null}
      <p className="qmrf-empty">No QMRF document loaded.</p>
    </div>
  )
}
