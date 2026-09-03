import { useEditing, useEditor } from '../context/EditorContext.jsx'
import { plainText } from '../qmrf/html.js'
import { formatPath, insertOccurrence, removeElement, textOf } from '../qmrf/model.js'
import { documentMeta, elements, headingOf } from '../qmrf/render.js'
import { ELEMENTS, SPEC } from '../qmrf/spec.js'
import Catalogs from './Catalogs.jsx'
import { ChildFields } from './fields/FieldView.jsx'

/**
 * The whole document, read as a report.
 *
 * Structure follows upstream's `qmrf2div.xsl`: the root's provenance attributes as a header block,
 * the ten chapters in the order the document holds them, each field as a subheading. Catalogs are
 * the one place this departs: that stylesheet hides them because a report only needs an entry where
 * it is cited, but an editor has to reach them, and a reader who wants to see what a model drew on
 * should not have to hunt for the citations — so they are appended, in the schema's order.
 *
 * @typedef {import('../qmrf/model.js').Model} Model
 * @typedef {import('../qmrf/model.js').Path} Path
 * @typedef {import('../qmrf/xml.js').XmlElement} XmlElement
 */

/** The two blocks under the root, named from the schema rather than hard-coded. */
const BLOCKS = (ELEMENTS[SPEC.root]?.children ?? []).map((child) => child.name)
const CHAPTERS_BLOCK = BLOCKS[0] ?? 'QMRF_chapters'
const CATALOGS_BLOCK = BLOCKS[1] ?? 'Catalogs'

/**
 * @param {{model: Model}} props
 */
export default function ReportView({ model }) {
  const root = model.root
  const editing = useEditing()
  if (!root) return null
  const blocks = elements(root)
  const chapterBlock = blocks.find((block) => block.name === CHAPTERS_BLOCK)
  const catalogBlock = blocks.find((block) => block.name === CATALOGS_BLOCK)
  const title = chapterBlock ? documentTitle(chapterBlock) : ''

  return (
    <article className="qmrf-report">
      <header className="qmrf-document" data-qmrf-path="">
        <h2 className="qmrf-document-title">{title || 'Untitled QMRF'}</h2>
        <dl className="qmrf-document-meta">
          {documentMeta(model).map((row) => (
            <div className="qmrf-document-meta-row" key={row.label}>
              <dt>{row.label}</dt>
              <dd>
                {row.link ? (
                  <a
                    className="qmrf-external"
                    href={row.value}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {row.value}
                  </a>
                ) : (
                  row.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </header>
      {chapterBlock ? chapters(model, chapterBlock, editing) : null}
      {/* Rendered whether or not the document got as far as writing a `Catalogs` element: in edit mode
          the six are where an entry is minted, and `Catalogs` itself decides when there is nothing to
          show — a reader of a file with no block at all sees no appendix, as upstream's stylesheet
          intended, rather than six headings over an empty page. */}
      <Catalogs model={model} block={catalogBlock ?? null} />
    </article>
  )
}

/**
 * The report is titled with the model's own title (1.1), which is what the JRC database lists it
 * under. Both element names come from the spec's chapter tree rather than being named here.
 */
function documentTitle(/** @type {XmlElement} */ chapterBlock) {
  const chapter = SPEC.chapters[0]
  const field = chapter?.fields[0]
  if (!chapter || !field) return ''
  const chapterNode = elements(chapterBlock).find((node) => node.name === chapter.name)
  const fieldNode = chapterNode
    ? elements(chapterNode).find((node) => node.name === field.name)
    : null
  return fieldNode ? plainText(textOf(fieldNode)) : ''
}

/** The chapter elements, each with the fields it holds, in document order. */
function chapters(
  /** @type {Model} */ model,
  /** @type {XmlElement} */ block,
  /** @type {boolean} */ editing
) {
  const found = elements(block)
  /** @type {Record<string, number>} */
  const totals = {}
  for (const chapter of found) totals[chapter.name] = (totals[chapter.name] ?? 0) + 1
  /** @type {Record<string, number>} */
  const seen = {}
  return (
    <>
      {found.map((chapter) => {
        const index = seen[chapter.name] ?? 0
        seen[chapter.name] = index + 1
        const path = /** @type {Path} */ ([
          { name: CHAPTERS_BLOCK, index: 0 },
          { name: chapter.name, index }
        ])
        return (
          <section
            className="qmrf-chapter"
            key={formatPath(path)}
            data-qmrf-path={formatPath(path)}
          >
            <h3 className="qmrf-chapter-heading">
              {headingOf(chapter)}
              {(totals[chapter.name] ?? 0) > 1 ? (
                <span className="qmrf-occurrence">
                  {index + 1} of {totals[chapter.name]}
                </span>
              ) : null}
            </h3>
            <ChildFields model={model} parent={chapter} parentPath={path} />
            {editing ? (
              <ChapterTools
                name={chapter.name}
                path={path}
                occurrence={index}
                total={totals[chapter.name] ?? 1}
              />
            ) : null}
          </section>
        )
      })}
    </>
  )
}

/**
 * Add or drop a whole chapter, for the two the schema repeats.
 *
 * Chapters 5 (applicability domain) and 7 (external validation) are `oneOrMore`: a model with two
 * applicability domains says so with two blocks, and one block is not half the story. A new block
 * arrives with its `#FIXED` attributes already in place — `newElement` seeds them from the DTD — so
 * it reads as "5. Defining the applicability domain" rather than as an empty heading, and the only
 * block that can be removed is a second one, because a document without its chapter 5 does not
 * validate at all.
 *
 * @param {{name: string, path: Path, occurrence: number, total: number}} props
 */
function ChapterTools({ name, path, occurrence, total }) {
  const { doc, markAddress } = useEditor()
  // Held in a local, not read off `doc` inside the handlers below: the guard here says nothing to a
  // callback that runs after a sibling edit could have replaced the document.
  const model = doc.model
  if (!model) return null
  if (!SPEC.chapters.some((chapter) => chapter.name === name && chapter.repeatable)) return null
  const label = SPEC.chapters.find((chapter) => chapter.name === name)?.label ?? name

  return (
    <div className="qmrf-chapter-tools">
      <button
        type="button"
        className="qmrf-button qmrf-button--add"
        onClick={() => {
          const inserted = insertOccurrence(model, [{ name: CHAPTERS_BLOCK, index: 0 }], name)
          if (!inserted) return
          doc.edit(inserted.model, { label: `add ${label}` })
          markAddress(formatPath(inserted.path))
        }}
      >
        Another {label} block
      </button>
      {total > 1 ? (
        <button
          type="button"
          className="qmrf-button qmrf-button--remove"
          onClick={() => {
            doc.edit(removeElement(model, path), { label: `remove ${label}` })
            markAddress(
              formatPath([
                { name: CHAPTERS_BLOCK, index: 0 },
                { name, index: Math.max(0, occurrence - 1) }
              ])
            )
          }}
        >
          Remove this block
        </button>
      ) : null}
    </div>
  )
}
