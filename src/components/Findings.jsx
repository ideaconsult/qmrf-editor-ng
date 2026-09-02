import { useState } from 'react'
import { useEditor } from '../context/EditorContext.jsx'

/**
 * What the validator found, as a list you can act on.
 *
 * The outline says *where* the document is weak and the header chip says *how much*, but neither
 * says what is wrong — so the reader had to open a chapter and hunt for the paragraph. Each row
 * here is one finding: what the validator said, which field it belongs to, and a jump to it. The
 * address a row carries is the same `data-qmrf-path` the outline jumps by, so a finding lands on
 * the field the report actually renders, edited or not.
 *
 * The list is mounted only while it is open, and open by default only when something is broken.
 * A document with 21 notes does not need 21 rows above the fold before the reader has read
 * chapter 1, and a real document can carry hundreds of them: the outline counts and the header
 * chip stay visible either way, so a closed list is not a hidden problem.
 *
 * @typedef {import('../qmrf/validate.js').Issue} Issue
 * @typedef {import('../qmrf/validate.js').Severity} Severity
 */

/** Reading order for the list: what breaks the document first. */
const BY_SEVERITY = { error: 0, warning: 1, info: 2 }

export default function Findings() {
  const { doc } = useEditor()
  const report = doc.report
  const [open, setOpen] = useState(report ? report.counts.error > 0 : false)
  if (!report || report.issues.length === 0) return null

  const { error, warning, info } = report.counts
  const parts = [
    error > 0 && `${error} ${plural(error, 'error')}`,
    warning > 0 && `${warning} ${plural(warning, 'warning')}`,
    info > 0 && `${info} ${plural(info, 'note')}`
  ].filter(Boolean)

  return (
    <section className="qmrf-findings">
      <button
        type="button"
        className="qmrf-findings-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="qmrf-findings-title">Findings</span>
        <span className={`qmrf-findings-count qmrf-findings-count--${worst(report.issues)}`}>
          {parts.join(', ')}
        </span>
      </button>
      {open ? (
        <ul className="qmrf-findings-list">
          {report.issues
            .slice()
            .sort((a, b) => BY_SEVERITY[a.severity] - BY_SEVERITY[b.severity])
            .map((issue, at) => (
              // A finding has no identity of its own: it is a sentence the validator derives from
              // the document again on every edit, and two of them can share an address, a code and
              // an attribute (two empty attributes on one entry, say). The row holds no state, so
              // nothing is carried to the wrong finding when the document changes under the list.
              // biome-ignore lint/suspicious/noArrayIndexKey: derived rows have no id to key by
              <li key={`${issue.path}#${issue.code}#${issue.attr ?? ''}#${at}`}>
                <Finding issue={issue} />
              </li>
            ))}
        </ul>
      ) : null}
    </section>
  )
}

/**
 * One finding, and the jump to the field it was found in.
 * @param {{issue: Issue}} props
 */
function Finding({ issue }) {
  const { showAddress } = useEditor()
  return (
    <button
      type="button"
      className={`qmrf-finding qmrf-finding--${issue.severity}`}
      onClick={() => showAddress(issue.path)}
    >
      <span className="qmrf-finding-severity">{severityWord(issue.severity)}</span>
      <span className="qmrf-finding-where">{where(issue)}</span>
      <span className="qmrf-finding-text">{issue.message}</span>
    </button>
  )
}

/**
 * Where the finding is, in the words the report itself uses — the field's DTD label with its
 * chapter number, the element for anything the chapters do not name, and the document for a
 * finding about the file as a whole, whose address is the empty one.
 * @param {Issue} issue
 */
function where(issue) {
  if (issue.path === '') return 'This document'
  if (issue.label) return issue.chapter ? `${issue.chapter} ${issue.label}` : issue.label
  if (issue.chapter) return `Chapter ${issue.chapter}`
  // A pointer's issue names no element, only the path it was found at — whose last step is the
  // element the reader is looking for anyway.
  const leaf = issue.element || (issue.path.split('/').pop() ?? '').replace(/\[\d+\]$/, '')
  return leaf ? `<${leaf}>` : 'this field'
}

/** @param {Severity} severity */
function severityWord(severity) {
  return severity === 'info' ? 'note' : severity
}

/** @param {Issue[]} issues @returns {Severity} */
function worst(issues) {
  let out = /** @type {Severity} */ ('info')
  for (const issue of issues)
    if (BY_SEVERITY[issue.severity] < BY_SEVERITY[out]) {
      out = issue.severity
    }
  return out
}

function plural(/** @type {number} */ count, /** @type {string} */ word) {
  return count === 1 ? word : `${word}s`
}
