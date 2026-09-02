import { useEditor } from '../context/EditorContext.jsx'
import Findings from './Findings.jsx'

/**
 * Where the document is and where it needs work, in one column.
 *
 * The list is the document's own chapters and catalogs rather than the schema's, so a repeatable
 * chapter appears as many times as it is used and a drifted heading reads as written — the same
 * thing the reader sees when they scroll. Counts come from the validator, attributed to the part
 * they were found in, which is what makes the list useful before the reader has scrolled anywhere:
 * chapter 6 with a warning on it is where to look first.
 *
 * Below it, the findings themselves (`Findings.jsx`): the outline counts say how much, this says
 * what, and every row is the same kind of jump. Both ride in this column, which is what
 * `showNav={false}` switches off.
 *
 * @typedef {import('../qmrf/outline.js').Counts} Counts
 */

export default function Sidebar() {
  const { doc, outline } = useEditor()
  if (!doc.model) return null
  return (
    <div className="qmrf-side">
      <nav className="qmrf-nav" aria-label="Document contents">
        <CountsLink
          address=""
          label="Document"
          detail={doc.report?.version.drifted ? 'other version' : 'properties'}
          counts={outline.document}
        />
        <p className="qmrf-nav-title">Chapters</p>
        <ul className="qmrf-nav-list">
          {outline.chapters.map((chapter) => (
            <li key={chapter.address}>
              <CountsLink
                address={chapter.address}
                label={chapter.heading}
                detail={chapter.occurrences > 1 ? `${chapter.occurrences} in this document` : ''}
                counts={chapter.counts}
              />
            </li>
          ))}
        </ul>
        <p className="qmrf-nav-title">Catalogs</p>
        <ul className="qmrf-nav-list">
          {outline.catalogs.map((catalog) => (
            <li key={catalog.address}>
              <CountsLink
                address={catalog.address}
                label={catalog.label}
                detail={catalog.entries === 1 ? '1 entry' : `${catalog.entries} entries`}
                counts={catalog.counts}
              />
            </li>
          ))}
        </ul>
      </nav>
      <Findings />
    </div>
  )
}

/**
 * One row of the outline. Its address is the document's own, and `''` is the document itself: the
 * findings about the file as a whole, which the report shows as its properties block.
 * @param {{address: string, label: string, detail: string, counts: Counts}} props
 */
function CountsLink({ address, label, detail, counts }) {
  const { focus, showAddress } = useEditor()
  const found = counts.error + counts.warning + counts.info
  const worst = counts.error > 0 ? 'error' : counts.warning > 0 ? 'warning' : 'info'
  const current = focus === address
  return (
    <button
      type="button"
      className={`qmrf-nav-item${current ? ' qmrf-nav-item--current' : ''}`}
      aria-current={current ? 'true' : undefined}
      onClick={() => showAddress(address)}
      aria-label={`${label}, ${found === 0 ? 'no findings' : `${found} finding${found === 1 ? '' : 's'}`}`}
    >
      <span className="qmrf-nav-label">{label}</span>
      {detail ? <span className="qmrf-nav-detail">{detail}</span> : null}
      {found > 0 ? (
        <span className={`qmrf-nav-count qmrf-nav-count--${worst}`} title={describe(counts)}>
          {found}
        </span>
      ) : null}
    </button>
  )
}

/** @param {Counts} counts */
function describe(counts) {
  const parts = []
  if (counts.error) parts.push(`${counts.error} error${counts.error === 1 ? '' : 's'}`)
  if (counts.warning) parts.push(`${counts.warning} warning${counts.warning === 1 ? '' : 's'}`)
  if (counts.info) parts.push(`${counts.info} note${counts.info === 1 ? '' : 's'}`)
  return parts.join(', ')
}
