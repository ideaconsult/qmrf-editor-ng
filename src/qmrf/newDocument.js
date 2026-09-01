/**
 * The document a user starts from.
 *
 * Upstream ships a 68 KB `qmrf.xml` template with every field spelled out by hand, three software
 * entries, an author each for the QMRF and the model, and the whole 347-row QMRF/EC/OECD endpoint
 * vocabulary pre-copied into `endpoints_catalog`. Most of its seeded entries carry `name=""`, which
 * the validator reports as `info attr-empty` rather than an error — tolerable, but a fresh document
 * should not start with anything to explain. Two things in it are not cosmetic: its eight `*_ref`
 * children omit the `#FIXED` `catalog` attribute, which is what routes a pointer, so opening the
 * template already costs eight warnings; and its root declares `version="3.0.1"` while the DTD fixes
 * `3.0`, so the editor would show its own new document as drifted from the schema.
 *
 * So the skeleton is generated from the schema instead. Only the elements the DTD *requires* are
 * written — everything optional is added when the user asks for it — and the `#FIXED` attributes
 * come from `spec.js`, which is byte-tied to the DTD, so a fresh document validates with no errors
 * and no warnings. Catalogs start empty: the endpoint vocabulary in `vocab/endpoints.js` is a
 * picker that mints an entry on demand, rather than 347 unused rows in every document.
 *
 * Question fields are the one thing prefilled, as upstream does: their `answer` and flag
 * attributes are `#REQUIRED`, so an empty document would otherwise open red. It preanswers Yes
 * (All where the answer set is All|Some|No|Unknown) and `nanomaterial` No — a starting position
 * the user is expected to correct, not to trust.
 */

/** @typedef {import('./model.js').Model} Model */
/** @typedef {NonNullable<(typeof ELEMENTS)[string]>} Declared */

import { openModel } from './model.js'
import { ELEMENTS, SPEC } from './spec.js'
import { escapeAttribute } from './xml.js'

/** Upstream's PUBLIC id, kept verbatim so existing QMRF tooling still recognises the doctype. */
const PUBLIC_ID = 'http://svn.code.sf.net/p/qmrf/code/trunk/schema/3.0.0/qmrf.dtd'

/**
 * The two catalog entries a document cannot do without. `qmrf_authors` and `model_authors` are the
 * only reference fields whose child `*_ref` the DTD requires (every other `*_ref` is `zeroOrMore`),
 * so a valid document must point at two author rows; upstream calls them `firstauthor` and
 * `modelauthor` and so does the published fixture. Their names are placeholders the user replaces,
 * and unlike upstream's template they are not left blank: a blank `name` or `number` is a
 * `#REQUIRED` attribute the editor would immediately complain about.
 */
const FORCED_AUTHORS = [
  { field: 'qmrf_authors', id: 'firstauthor', name: 'QMRF author', number: '1' },
  { field: 'model_authors', id: 'modelauthor', name: 'Model developer', number: '2' }
]

/**
 * A document text carrying the `#FIXED` attributes the schema fixes and every element the schema
 * requires, so it is valid the moment it is created.
 * @returns {string}
 */
export function newDocumentText() {
  const [chaptersBlock, catalogsBlock] = declared(SPEC.root).children
  const rootAttrs = declared(SPEC.root)
    .fixed.map((fixed) => ` ${fixed.name}="${escapeAttribute(fixed.value ?? '')}"`)
    .join('')
  const chapters = SPEC.chapters.map((chapter) => element(chapter.name, 1)).join('\n')
  const catalogs = SPEC.catalogs.map((catalog) => catalogElement(catalog.name)).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ${SPEC.root} PUBLIC "${PUBLIC_ID}" "qmrf.dtd">
<${SPEC.root}${rootAttrs}>
<${chaptersBlock.name}>
${chapters}
</${chaptersBlock.name}>
<${catalogsBlock.name}>
${catalogs}
</${catalogsBlock.name}>
</${SPEC.root}>
`
}

/**
 * @returns {Model} a fresh document, already open for editing.
 */
export function newDocument() {
  return openModel(newDocumentText())
}

/**
 * One element of the skeleton, expanded as far as the schema requires and no further: `once` and
 * `oneOrMore` children are written (one occurrence of the latter), `zeroOrMore` ones are added by
 * the editor when the user asks for them.
 * @param {string} name
 * @param {number} depth
 * @param {Record<string, string>} [values] attribute values the skeleton cannot infer
 * @returns {string}
 */
function element(name, depth, values = {}) {
  const shape = declared(name)
  const indent = '  '.repeat(depth)
  const author = FORCED_AUTHORS.find((entry) => entry.field === name)
  if (author) {
    return `${indent}<${name}${attributes(name)}>\n${element('author_ref', depth + 1, {
      idref: author.id
    })}\n${indent}</${name}>`
  }
  if (shape.pcdata) return `${indent}<${name}${attributes(name, values)}></${name}>`

  const required = shape.children.filter((child) => child.occurrences !== 'zeroOrMore')
  if (required.length === 0) return `${indent}<${name}${attributes(name, values)} />`
  const inner = required.map((child) => element(child.name, depth + 1)).join('\n')
  return `${indent}<${name}${attributes(name, values)}>\n${inner}\n${indent}</${name}>`
}

/** One of the six catalogs; only the two forced authors are worth starting a document with. */
function catalogElement(/** @type {string} */ name) {
  if (name !== 'authors_catalog') return `  <${name} />`
  const rows = FORCED_AUTHORS.map((author) => {
    const attrs = attributes('author', { id: author.id, name: author.name, number: author.number })
    return `    <author${attrs} />`
  })
  return `  <${name}>\n${rows.join('\n')}\n  </${name}>`
}

/**
 * The `#FIXED` attributes, then the `#REQUIRED` ones a document must carry to validate.
 * @param {string} name
 * @param {Record<string, string>} [values]
 */
function attributes(name, values = {}) {
  const shape = declared(name)
  const fixed = shape.fixed.map((attr) => ` ${attr.name}="${escapeAttribute(attr.value ?? '')}"`)
  const data = shape.dataAttrs
    .filter((attr) => attr.required)
    .map((attr) => {
      const value =
        values[attr.name] ??
        (attr.kind === 'enum' ? openingAnswer(attr.name, attr.values ?? []) : '')
      return ` ${attr.name}="${escapeAttribute(value)}"`
    })
  return [...fixed, ...data].join('')
}

/** Upstream's opening position for a required answer: everything available, nanomaterial not. */
function openingAnswer(/** @type {string} */ name, /** @type {string[]} */ values) {
  if (name === 'nanomaterial') return 'No'
  return values.includes('All') ? 'All' : 'Yes'
}

/** @returns {Declared} */
function declared(/** @type {string} */ name) {
  const shape = ELEMENTS[name]
  if (!shape) throw new Error(`${name} is not declared by the vendored QMRF DTD`)
  return shape
}
