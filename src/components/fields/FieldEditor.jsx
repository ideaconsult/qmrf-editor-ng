import { useEditor } from '../../context/EditorContext.jsx'
import { catalogShape } from '../../qmrf/catalog.js'
import { fieldHtml, hasEnvelope, wrapHtml } from '../../qmrf/html.js'
import {
  catalogOfRef,
  formatPath,
  insertOccurrence,
  setAttr,
  setValue,
  textOf
} from '../../qmrf/model.js'
import { elements, fieldKind, headingOf } from '../../qmrf/render.js'
import { ELEMENTS } from '../../qmrf/spec.js'
import AttachmentField from './AttachmentField.jsx'
import DateField from './DateField.jsx'
import QuestionField from './QuestionField.jsx'
import ReferenceField from './ReferenceField.jsx'
import RichTextField from './RichTextField.jsx'

/**
 * Which editor a field gets, and what it writes.
 *
 * The switch is on the generated `kind` — the same value the read-only view switches on — because
 * the schema, not the document, is what says whether a field answers with an attribute or holds
 * paragraphs. Adding a kind to the DTD and re-running `gen:spec` lands here as the text case rather
 * than as a crash, which is the failure mode worth having.
 *
 * Every write goes out through `doc.edit`, so every editor is one undo step and none of them owns
 * state the document also keeps.
 *
 * @typedef {import('../../qmrf/model.js').Model} Model
 * @typedef {import('../../qmrf/model.js').Path} Path
 * @typedef {import('../../qmrf/xml.js').XmlElement} XmlElement
 */

/**
 * @param {{model: Model, node: XmlElement, path: Path}} props
 */
export default function FieldEditor({ model, node, path }) {
  const { doc, markAddress } = useEditor()
  const kind = fieldKind(node.name) ?? 'text'
  const apply = (/** @type {Model} */ next, /** @type {{label?: string}} */ step = {}) =>
    doc.edit(next, step)
  const writeText = (/** @type {string} */ body) =>
    apply(setValue(model, path, wrapHtml(body)), { label: `edit ${node.name}` })
  const writeAttr = (/** @type {string} */ name, /** @type {string} */ value) =>
    apply(setAttr(model, path, name, value), { label: `set ${name}` })

  if (kind === 'question')
    return (
      <QuestionField
        attrs={ELEMENTS[node.name]?.dataAttrs ?? []}
        readAttr={(/** @type {string} */ name) =>
          node.attrs.find((attr) => attr.name === name)?.value ?? ''
        }
        onSet={writeAttr}
      />
    )

  if (kind === 'date') {
    // Chapter 2's dates arrive inside the rich-text envelope the Java kit wrote; chapter 10's
    // arrive as the bare text its inventory importer wrote. Each keeps the shape it came with —
    // see `qmrf/dates.js` for the same rule applied to the value itself.
    const wrapped = hasEnvelope(textOf(node))
    return (
      <DateField
        text={textOf(node)}
        onCommit={(value) =>
          apply(setValue(model, path, wrapped ? wrapHtml(value) : value), { label: 'set date' })
        }
      />
    )
  }

  if (kind === 'reference') {
    const refElement = refElementOf(node.name)
    if (!refElement)
      return (
        <p className="qmrf-edit-note" role="status">
          The schema gives {node.name} nothing to point at, so there is nothing to edit here.
        </p>
      )
    return (
      <ReferenceField
        model={model}
        path={path}
        refElement={refElement}
        catalog={catalogOfRef(refElement)}
        label={catalogLabel(refElement)}
        refAttrs={textAttrsOf(refElement)}
        fieldAttrs={textAttrsOf(node.name)}
        onApply={apply}
        onPoint={markAddress}
      />
    )
  }

  if (kind === 'algorithm') {
    const refElement = refElementOf(node.name) ?? 'algorithm_ref'
    const equation = elements(node).find((child) => child.name === 'equation')
    const equationPath = /** @type {Path} */ ([...path, { name: 'equation', index: 0 }])
    return (
      <>
        <ReferenceField
          model={model}
          path={path}
          refElement={refElement}
          catalog={catalogOfRef(refElement)}
          label={catalogLabel(refElement)}
          onApply={apply}
          onPoint={markAddress}
        />
        {equation ? (
          <RichTextField
            label="Equation"
            html={fieldHtml(textOf(equation))}
            onCommit={(body) =>
              apply(setValue(model, equationPath, wrapHtml(body)), { label: 'edit equation' })
            }
          />
        ) : (
          <button
            type="button"
            className="qmrf-button"
            onClick={() => {
              const inserted = insertOccurrence(model, path, 'equation')
              if (!inserted) return
              apply(inserted.model, { label: 'add equation' })
              markAddress(formatPath(inserted.path))
            }}
          >
            Add the equation
          </button>
        )}
      </>
    )
  }

  if (kind === 'attachment') {
    const entryElement = ELEMENTS[node.name]?.children[0]?.name ?? 'document'
    return (
      <AttachmentField
        model={model}
        path={path}
        entryElement={entryElement}
        onApply={apply}
        onPoint={markAddress}
      />
    )
  }

  // `group` is the structural case — 9.3's three slots, each of which gets its own editor below
  // this one — and `entry` elements are only ever reached through the editor that owns them, so
  // neither is edited here.
  if (kind === 'group' || kind === 'entry') return null

  return (
    <RichTextField label={headingOf(node)} html={fieldHtml(textOf(node))} onCommit={writeText} />
  )
}

/**
 * The pointer element a reference field holds. The schema declares it as the field's only child
 * (`qmrf_authors` → `author_ref`), which is the same fact the read-only view uses to tell a pointer
 * from a nested field — so both directions agree without either hard-coding a name.
 * @returns {string|null}
 */
function refElementOf(/** @type {string} */ fieldName) {
  const declared = (ELEMENTS[fieldName]?.children ?? []).find((child) =>
    child.name.endsWith('_ref')
  )
  return declared?.name ?? null
}

/** Attributes a reference or a field carries besides the pointer itself, e.g. `number`, `options`. */
function textAttrsOf(/** @type {string} */ elementName) {
  return (ELEMENTS[elementName]?.dataAttrs ?? [])
    .filter((attr) => attr.kind === 'text' && attr.name !== 'idref')
    .map((attr) => attr.name)
}

/** The catalog's own label, so the UI says "Endpoints" rather than "endpoints_catalog". */
function catalogLabel(/** @type {string} */ refElement) {
  const catalog = catalogOfRef(refElement)
  return catalogShape(catalog)?.label ?? catalog.replace(/_catalog$/, '')
}
