/**
 * What a QMRF document should *say* when it is read rather than edited.
 *
 * Upstream renders a report with `qmrf2div.xsl` (invoked by `QMRF_xml2html.java`), and this module
 * keeps the reading rules of that stylesheet in one place, as data: catalogs are not shown as
 * lists but inline where they are referenced; a chapter is a heading and a field is a subheading;
 * `answer` is printed next to the question; a `*_ref` becomes the entry it points at, with the
 * columns that stylesheet chose per catalog. React components below only lay this out, which keeps
 * the semantics testable without a DOM.
 *
 * Three deliberate departures, each noted where it is made: the 6.2 / 7.2 flag list gains
 * `nanomaterial` (the stylesheet predates it), publications gain their DOI and URL (dead text
 * otherwise on the web), and headings put a space after the chapter number, which upstream omits.
 */

/** @typedef {import('./model.js').Model} Model */
/** @typedef {import('./model.js').Path} Path */
/** @typedef {import('./xml.js').XmlElement} XmlElement */

/**
 * @typedef {object} MetaRow
 * @property {string} label
 * @property {string} value
 * @property {boolean} link the value is a URL
 */

/**
 * @typedef {object} ReferenceShape
 * @property {string[]} heading joined with ", " and emphasised
 * @property {string[]} rest one line each, in this order
 * @property {string[]} links which of those values are URLs
 */

/**
 * @typedef {object} ResolvedReference
 * @property {boolean} found
 * @property {string} id the `idref` as written
 * @property {string} catalog
 * @property {string[]} heading
 * @property {MetaRow[]} rows
 * @property {Path|null} path where the entry lives, for click-to-edit
 */

import { plainText } from './html.js'
import { entryById } from './model.js'
import { SPEC } from './spec.js'

/**
 * The kind of a generated field, indexed by element name. `ELEMENTS` describes content models, not
 * the field kinds, and the kinds live in the chapter tree of `spec.js`, so the view reads them
 * from there rather than re-deriving them from cardinality.
 * @typedef {object} KindNode
 * @property {string} name
 * @property {string} kind
 * @property {KindNode[]} [children]
 */
/**
 * @type {Record<string, string>}
 */
const FIELD_KINDS = {}
for (const chapter of SPEC.chapters) {
  /** @type {KindNode[]} */
  const queue = [...chapter.fields]
  while (queue.length > 0) {
    const field = /** @type {KindNode} */ (queue.shift())
    FIELD_KINDS[field.name] = field.kind
    queue.push(...(field.children ?? []))
  }
}

/**
 * `text`, `question`, `reference`, … for an element the schema describes as a field, or null for
 * structural elements (`QMRF_chapters`, `Catalogs`) and vocabulary elements (`software`).
 * @returns {string|null}
 */
export function fieldKind(/** @type {string} */ name) {
  return FIELD_KINDS[name] ?? null
}

/** An element's element children, in document order — the parser's children include whitespace. */
export function elements(/** @type {XmlElement} */ node) {
  /** @type {XmlElement[]} */
  const found = []
  for (const child of node.children) if (child.type === 'element') found.push(child)
  return found
}

/**
 * The root's own attributes, which the reference stylesheet prints as a header block. They are all
 * `#FIXED` in the schema — the document's provenance, not user input — and a reader still wants to
 * see who published the model format and when.
 */
export const DOCUMENT_META = [
  { attr: 'version', label: 'Version', link: false },
  { attr: 'name', label: 'Name', link: false },
  { attr: 'author', label: 'Author', link: false },
  { attr: 'date', label: 'Date', link: false },
  { attr: 'contact', label: 'Contact', link: false },
  { attr: 'email', label: 'e-mail', link: false },
  { attr: 'url', label: 'www', link: true }
]

/**
 * Which columns of a catalog entry a pointer shows, mirroring the per-catalog templates in
 * `qmrf2div.xsl`. `id` and `ontology_term` are never shown: the first is an internal handle, the
 * second is a mapping this app does not interpret.
 */
const REFERENCE_SHAPES = {
  software_catalog: {
    heading: ['name', 'version'],
    rest: ['description', 'contact', 'url'],
    links: ['url']
  },
  algorithms_catalog: { heading: ['definition'], rest: ['description'], links: [] },
  descriptors_catalog: { heading: ['name', 'units'], rest: ['description'], links: [] },
  endpoints_catalog: { heading: ['name'], rest: ['group', 'subgroup'], links: [] },
  publications_catalog: { heading: ['title'], rest: ['doi', 'url'], links: ['doi', 'url'] },
  authors_catalog: {
    heading: ['name'],
    rest: ['affiliation', 'contact', 'email', 'url'],
    links: ['url']
  }
}

/**
 * Labels for the 6.2 / 7.2 inventory flags, worded as the schema's own guidance words them
 * ("Chemical names", "CAS numbers", …) rather than the shorthand the stylesheet hard-codes.
 * Order is the one the guidance lists, which is also the DTD's declaration order.
 */
export const FLAG_LABELS = [
  { attr: 'chemname', label: 'Chemical names' },
  { attr: 'cas', label: 'CAS numbers' },
  { attr: 'smiles', label: 'SMILES' },
  { attr: 'inchi', label: 'InChI codes' },
  { attr: 'mol', label: 'MOL files' },
  { attr: 'formula', label: 'Structural formula' },
  { attr: 'nanomaterial', label: 'Nanomaterials' }
]

/**
 * The three attachment groups of chapter 9.3, with the labels the reference report uses. The slots
 * carry no `name` attribute of their own in the schema, so without these the headings would fall
 * back to the element names.
 */
export const ATTACHMENT_GROUPS = [
  { element: 'attachment_training_data', label: 'Training data set' },
  { element: 'attachment_validation_data', label: 'Validation data set' },
  { element: 'attachment_documents', label: 'Other documents' }
]

/** @type {Record<string, string>} */
const SLOT_LABELS = {}
for (const slot of ATTACHMENT_GROUPS) SLOT_LABELS[slot.element] = slot.label

/**
 * One line on what each catalog collects. Names and labels come from the generated spec, so only
 * the prose is written here — a schema change leaves a description missing rather than a wrong
 * table. The authors catalog serves both sets of people because `qmrf_authors` and `model_authors`
 * are chapters-2 fields pointing into it, not catalogs of their own.
 * @type {Record<string, string>}
 */
export const CATALOG_NOTES = {
  software_catalog: 'Programs the model was built and run with.',
  algorithms_catalog: 'Calculation methods the model applies.',
  descriptors_catalog: 'Quantitative descriptions the algorithm reads.',
  endpoints_catalog: 'Effects the model predicts.',
  publications_catalog: 'Literature the report cites.',
  authors_catalog: 'Who wrote the report and who built the model.'
}

/**
 * A usable `href` out of an attribute the schema only types as text, or '' when the value is not
 * a link at all. QMRF authors write bare `www.` hosts, DOIs without their resolver and occasionally
 * a sentence where a URL belongs; handing those straight to `href` would resolve them against this
 * page, so anything without a scheme we understand stays plain text — the caller is showing the
 * value either way, only not as a broken link.
 * @param {string} name the attribute, since a DOI and an e-mail need different prefixes
 * @param {string} value
 * @returns {string}
 */
export function linkHref(/** @type {string} */ name, /** @type {string} */ value) {
  const text = (value ?? '').trim()
  if (!text) return ''
  // A scheme counts as a link only with something in front of it: `mailto:` and `https://` are what
  // an author leaves behind when they start typing a value and stop, and linking to them is worse
  // than showing the text.
  const scheme = /^(?:https?|ftp|mailto):(.*)$/i.exec(text)
  if (scheme && (scheme[1] ?? '').replace(/^\/\//, '')) return text
  if (name === 'doi') {
    const bare = text.replace(/^https?:\/\/(?:dx\.|www\.)?doi\.org\//i, '')
    return /^10.\d{4,9}\//.test(bare) ? `https://doi.org/${bare}` : ''
  }
  if (name === 'email') return /^[^@\s]+@[^@\s]+$/.test(text) ? `mailto:${text}` : ''
  if (/^www\./i.test(text)) return `https://${text}`
  return ''
}

/**
 * @param {Model} model
 * @returns {MetaRow[]} the root block, empty values dropped
 */
export function documentMeta(model) {
  const root = model.root
  if (!root) return []
  /** @type {MetaRow[]} */
  const rows = []
  for (const column of DOCUMENT_META) {
    const value = root.attrs.find((attr) => attr.name === column.attr)?.value ?? ''
    if (value) rows.push({ label: column.label, value, link: column.link })
  }
  return rows
}

/**
 * "1.1. QSAR identifier (title)" — the number and the label the schema fixes for the element,
 * which is the heading the reference report uses. Read from the document rather than from the
 * spec, so a document whose labels drifted shows what it actually says (and is told so by the
 * validator's `fixed-attr-drift`). Where the schema fixes no label, as in the attachment slots,
 * the label the reference report uses takes over.
 * @param {XmlElement} node
 * @returns {string}
 */
export function headingOf(/** @type {XmlElement} */ node) {
  const attr = (/** @type {string} */ name) => node.attrs.find((a) => a.name === name)?.value ?? ''
  const chapter = attr('chapter')
  const label = attr('name') || SLOT_LABELS[node.name] || node.name
  return chapter ? `${chapter}. ${label}` : label
}

/**
 * The attributes that name an entry of a catalog — the ones a reader recognises it by, which is
 * what makes them the label of a picker listing that catalog's entries.
 * @param {string} catalogName
 * @returns {string[]}
 */
export function headingAttrs(/** @type {string} */ catalogName) {
  const shape = /** @type {ReferenceShape|undefined} */ (REFERENCE_SHAPES[catalogName])
  return shape ? [...shape.heading] : []
}

/**
 * A pointer as a reader should see it: the entry it names, not the `idref` string. An unresolvable
 * pointer is shown as such rather than dropped — silently losing a row is how a report starts
 * lying, and the validator already flagged it.
 * @returns {ResolvedReference}
 */
export function resolveReference(
  /** @type {Model} */ model,
  /** @type {string} */ id,
  /** @type {string} */ catalog
) {
  const shape = /** @type {ReferenceShape} */ (
    REFERENCE_SHAPES[catalog] ?? { heading: [], rest: [], links: [] }
  )
  const found = entryById(model, id)
  if (!found) {
    return { found: false, id, catalog, heading: [], rows: [], path: null }
  }
  const value = (/** @type {string} */ name) =>
    found.node.attrs.find((attr) => attr.name === name)?.value ?? ''
  const links = new Set(shape.links)
  return {
    found: true,
    id,
    catalog,
    heading: shape.heading.map(value).filter((text) => text !== ''),
    rows: shape.rest
      .map((name) => ({ label: name, value: value(name), link: links.has(name) }))
      .filter((row) => row.value !== ''),
    path: found.path
  }
}

/**
 * The inventory flags of a 6.2 / 7.2 field, in the schema's order, skipping any the (older)
 * document never carried.
 * @returns {MetaRow[]}
 */
export function flagRows(/** @type {XmlElement} */ node) {
  /** @type {MetaRow[]} */
  const rows = []
  for (const flag of FLAG_LABELS) {
    const value = node.attrs.find((attr) => attr.name === flag.attr)?.value ?? ''
    if (value) rows.push({ label: flag.label, value, link: false })
  }
  return rows
}

/**
 * Attachments as a file list: what a reader wants is the link, its type and what it holds. `entry`
 * is the element name the file sits in (`molecules` or `document`), which is how a caller addresses
 * the row back — the two slots hold different element names, so a positional index alone would not
 * resolve.
 * @returns {{entry: string, url: string, filetype: string, description: string, embedded: string}[]}
 */
export function attachmentRows(/** @type {XmlElement} */ group) {
  /** @type {{entry: string, url: string, filetype: string, description: string, embedded: string}[]} */
  const rows = []
  for (const child of group.children) {
    if (child.type !== 'element') continue
    if (child.name !== 'molecules' && child.name !== 'document') continue
    const value = (/** @type {string} */ name) =>
      child.attrs.find((attr) => attr.name === name)?.value ?? ''
    rows.push({
      entry: child.name,
      url: value('url'),
      filetype: value('filetype'),
      description: value('description'),
      embedded: value('embedded')
    })
  }
  return rows
}

/** Whether a field has anything worth rendering, so the view can skip unanswered ones quietly. */
export function isAnswered(/** @type {string|null|undefined} */ value) {
  return plainText(value) !== ''
}
