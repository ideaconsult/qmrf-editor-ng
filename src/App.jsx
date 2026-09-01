import { useMemo } from 'react'
import QMRFViewer from './QMRFViewer'

/**
 * Standalone shell. This is the ONLY file allowed to read `import.meta.env` and URL
 * query params — library code (`QMRFViewer.jsx` and below) receives everything through
 * props, which is what keeps `dist/*.js` free of `VITE_` references (CI enforces it).
 *
 * URL contract:
 *   ?url=...        fetch a QMRF document from this URL on load
 *   ?mode=edit      start in edit mode instead of read-only view
 *   ?token=...      bearer token for the fetch above (standalone deep links only)
 */
export default function App() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])

  /** @type {Record<string, unknown>} */
  const props = {}
  const url = params.get('url') ?? import.meta.env.VITE_QMRF_DEFAULT_URL
  if (url) props.url = url
  if (params.get('mode') === 'edit') props.readOnly = false
  const token = params.get('token')
  if (token) props.token = token

  return (
    <div className="qmrf-app">
      <QMRFViewer {...props} />
    </div>
  )
}
