import { fieldHtml } from '../../qmrf/html.js'
import { catalogOfRef, formatPath, textOf } from '../../qmrf/model.js'
import {
  attachmentRows,
  elements,
  fieldKind,
  flagRows,
  headingOf,
  linkHref,
  resolveReference
} from '../../qmrf/render.js'
import Html from '../Html.jsx'

/**
 * One field, read-only.
 *
 * The layout follows `qmrf2div.xsl`, the stylesheet upstream's own viewer runs: chapter number and
 * label as a subheading, then the answer, then the content, with a catalog entry shown as the entry
 * rather than as its pointer. Which columns of an entry are shown is `render.js`'s decision, so this
 * component only lays out what it is handed.
 *
 * Shape comes from the generated `kind`, never from whether the element holds character data: 50 of
 * the 61 chapter fields are `#PCDATA`, the question fields among them, and their answers are
 * attributes rather than content.
 *
 * What a field holds is decided from the document rather than the schema, because the two disagree
 * in the wild: a `*_ref` child is always a pointer to substitute, while any other element child is
 * content of its own (an attachment slot's files, an older document's inline author) and is rendered
 * as such. Only a field with no element children shows its character data.
 *
 * @typedef {import('../../qmrf/model.js').Model} Model
 * @typedef {import('../../qmrf/model.js').Path} Path
 * @typedef {import('../../qmrf/xml.js').XmlElement} XmlElement
 */

/**
 * @param {{model: Model, node: XmlElement, path: Path}} props
 */
export default function FieldView({ model, node, path }) {
  const kind = fieldKind(node.name) ?? 'text'
  const nodes = elements(node)
  const pointers = nodes.filter((child) => child.name.endsWith('_ref'))
  // The equation is an element child that `Equation` below renders itself, so it is not nested.
  const nested = nodes.filter(
    (child) => !child.name.endsWith('_ref') && !(kind === 'algorithm' && child.name === 'equation')
  )
  const content = nested.length === 0 ? fieldHtml(textOf(node)) : ''

  return (
    <section className={`qmrf-field qmrf-field--${kind}`} data-qmrf-path={formatPath(path)}>
      <h4 className="qmrf-field-heading">{headingOf(node)}</h4>
      {kind === 'question' ? <Answer node={node} /> : null}
      {pointers.length > 0 ? <ReferenceList model={model} refs={pointers} parent={path} /> : null}
      {kind === 'algorithm' ? <Equation nodes={nodes} /> : null}
      {kind === 'attachment' ? <Attachments group={node} path={path} /> : null}
      {kind === 'attachment' || nested.length === 0 ? null : (
        <ChildFields model={model} parent={node} parentPath={path} />
      )}
      {content ? <Html html={content} className="qmrf-field-body" /> : null}
    </section>
  )
}

/**
 * One level of element children, each addressed the way `model.js` addresses them — by name plus
 * occurrence, because QMRF repeats same-named siblings and the edit path has to match.
 *
 * @param {{model: Model, parent: XmlElement, parentPath: Path}} props
 */
export function ChildFields({ model, parent, parentPath }) {
  /** @type {Record<string, number>} */
  const seen = {}
  return (
    <>
      {elements(parent).map((child) => {
        const index = seen[child.name] ?? 0
        seen[child.name] = index + 1
        const path = [...parentPath, { name: child.name, index }]
        return <FieldView key={formatPath(path)} model={model} node={child} path={path} />
      })}
    </>
  )
}

/** The `answer` attribute where upstream prints it, plus the 6.2 / 7.2 inventory flags. */
function Answer(/** @type {{node: XmlElement}} */ { node }) {
  const flags = flagRows(node)
  const answer = attr(node, 'answer')
  return (
    <>
      {answer ? <p className="qmrf-answer">{answer}</p> : null}
      {flags.length > 0 ? (
        <ul className="qmrf-flags">
          {flags.map((flag) => (
            <li key={flag.label}>
              <b>{flag.label}:</b> {flag.value}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  )
}

/** Every `*_ref` inside a field, resolved to the entry it names. */
function ReferenceList(
  /** @type {{model: Model, refs: XmlElement[], parent: Path}} */ { model, refs, parent }
) {
  /** @type {Record<string, number>} */
  const seen = {}
  return (
    <ul className="qmrf-refs">
      {refs.map((ref) => {
        const index = seen[ref.name] ?? 0
        seen[ref.name] = index + 1
        const value = attr(ref, 'idref')
        const resolved = resolveReference(model, value, catalogOfRef(ref.name))
        const refPath = formatPath([...parent, { name: ref.name, index }])
        if (!resolved.found) {
          return (
            <li className="qmrf-ref qmrf-ref--missing" key={refPath} data-qmrf-path={refPath}>
              <b className="qmrf-ref-heading">{value || '(no idref)'}</b>
              <span className="qmrf-ref-note">
                {value
                  ? `names no entry in the ${ref.name.replace(/_ref$/, '').replace(/_/g, ' ')} catalog`
                  : 'points at nothing, so this row is missing from the report'}
              </span>
            </li>
          )
        }
        return (
          <li
            className="qmrf-ref"
            key={refPath}
            data-qmrf-path={refPath}
            // The row's own address stays its own — an issue about this pointer has to be able to
            // point at it — and the entry it names travels alongside, for the jump.
            data-qmrf-target={formatPath(resolved.path ?? [])}
          >
            {resolved.heading.length > 0 ? (
              <b className="qmrf-ref-heading">{resolved.heading.join(', ')}</b>
            ) : null}
            {resolved.rows.map((row) => {
              const href = linkHref(row.label, row.value)
              return row.link && href ? (
                <a
                  className="qmrf-ref-row qmrf-external"
                  key={`${ref.name}-${row.label}`}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {row.value}
                </a>
              ) : (
                <span className="qmrf-ref-row" key={`${ref.name}-${row.label}`}>
                  {row.value}
                </span>
              )
            })}
          </li>
        )
      })}
    </ul>
  )
}

/** 4.2's equation, which is content rather than rich text but is stored the same way. */
function Equation(/** @type {{nodes: XmlElement[]}} */ { nodes }) {
  const equation = nodes.find((child) => child.name === 'equation')
  if (!equation) return null
  return <Html html={fieldHtml(textOf(equation))} className="qmrf-field-body" />
}

/** One attachment slot's file list: what a reader wants is the link and what it holds. */
function Attachments(/** @type {{group: XmlElement, path: Path}} */ { group, path }) {
  const rows = attachmentRows(group)
  /** @type {Record<string, number>} */
  const seen = {}
  if (rows.length === 0) return null
  return (
    <ul className="qmrf-attachments">
      {rows.map((row) => {
        const index = seen[row.entry] ?? 0
        seen[row.entry] = index + 1
        const rowPath = formatPath([...path, { name: row.entry, index }])
        const href = linkHref('url', row.url)
        return (
          <li className="qmrf-attachment" key={rowPath} data-qmrf-path={rowPath}>
            {href ? (
              <a className="qmrf-external" href={href} target="_blank" rel="noopener noreferrer">
                {row.description || row.url}
              </a>
            ) : (
              <b>{row.description || row.url || '(no url)'}</b>
            )}
            {row.filetype ? <span className="qmrf-attachment-note">{row.filetype}</span> : null}
            {row.embedded === 'Yes' ? (
              <span className="qmrf-attachment-note">embedded in the document</span>
            ) : null}
            {href && row.description ? (
              <span className="qmrf-attachment-note">{row.url}</span>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

function attr(/** @type {XmlElement} */ node, /** @type {string} */ name) {
  return node.attrs.find((entry) => entry.name === name)?.value ?? ''
}
