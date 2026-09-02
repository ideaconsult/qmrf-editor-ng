/**
 * The catalogs, as the editing side needs them: which entry element belongs in which catalog, what
 * its entries are called, and how a new one gets an id.
 *
 * Chapters never hold content of their own that a catalog does not also hold — a chapter field only
 * points — so every "add a software / a descriptor / a publication" gesture is this module's work:
 * mint an id, append one entry element to the right catalog, and hand the caller the path to point
 * at. The DTD types `idref` as CDATA and declares nothing about how an id is *formed*, so the shape
 * here is upstream's own (`endpoints_catalog_3` in the published document), not a schema rule.
 *
 * @typedef {import('./model.js').Model} Model
 * @typedef {import('./model.js').Path} Path
 * @typedef {import('./xml.js').XmlElement} XmlElement
 */

import { childSteps, collectIds, elementAt, insertOccurrence, parsePath, setAttr } from './model.js'
import { headingAttrs } from './render.js'
import { ELEMENTS, SPEC } from './spec.js'

/** The two blocks under the root, named from the schema rather than hard-coded. */
const BLOCKS = (ELEMENTS[SPEC.root]?.children ?? []).map((child) => child.name)
const CATALOGS_BLOCK = BLOCKS[1] ?? 'Catalogs'

/**
 * @typedef {object} CatalogShape
 * @property {string} name `endpoints_catalog`
 * @property {string} label `Endpoints`
 * @property {string} entryElement `endpoint`
 * @property {string} refElement `endpoint_ref`
 * @property {string} idAttr `id`
 * @property {{name: string}[]} attrs the entry's attributes, in the DTD's order
 */

/**
 * @param {string} catalogName
 * @returns {CatalogShape|null}
 */
export function catalogShape(/** @type {string} */ catalogName) {
  const shape = SPEC.catalogs.find((entry) => entry.name === catalogName)
  return shape ? /** @type {CatalogShape} */ (/** @type {unknown} */ (shape)) : null
}

/** Where a catalog lives, in a document that has one. @returns {Path|null} */
export function catalogPath(/** @type {string} */ catalogName) {
  return catalogShape(catalogName) ? parsePath(`${CATALOGS_BLOCK}[0]/${catalogName}[0]`) : null
}

/**
 * A catalog's entries, with the address a caller needs to edit them.
 * @returns {{id: string, label: string, node: XmlElement, path: Path}[]}
 */
export function catalogEntries(/** @type {Model} */ model, /** @type {string} */ catalogName) {
  const shape = catalogShape(catalogName)
  const path = catalogPath(catalogName)
  if (!shape || !path) return []
  const headings = headingAttrs(catalogName)
  return childSteps(model, path)
    .filter((child) => child.step.name === shape.entryElement)
    .map(({ step, node }) => {
      const attr = (/** @type {string} */ name) =>
        node.attrs.find((entry) => entry.name === name)?.value ?? ''
      const id = attr(shape.idAttr)
      return {
        id,
        // A label a picker can choose from: what the entry is called, or — in a document whose
        // entries were copied in unnamed, as upstream's template is — the handle itself, because
        // "unnamed" repeated 347 times tells the reader nothing.
        label: headings.map(attr).filter(Boolean).join(' — ') || id || '(unnamed)',
        node,
        path: [...path, step]
      }
    })
}

/**
 * The entries as a `<select>` wants them.
 * @returns {{id: string, label: string}[]}
 */
export function entryOptions(/** @type {Model} */ model, /** @type {string} */ catalogName) {
  return catalogEntries(model, catalogName)
    .filter((entry) => entry.id !== '')
    .map(({ id, label }) => ({ id, label }))
}

/**
 * A free id in one catalog, in upstream's shape. Only the ids already in the document are looked
 * at, which is the whole of the available evidence: a QMRF document is self-contained, and a second
 * document opened later cannot collide with this one's ids.
 * @returns {string}
 */
export function mintId(/** @type {Model} */ model, /** @type {string} */ catalogName) {
  const taken = new Set(
    collectIds(model)
      .filter((entry) => entry.catalog === catalogName)
      .map((entry) => entry.id)
  )
  const suffix = new RegExp(`^${catalogName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_(\\d+)$`)
  let next = 1
  for (const id of taken) {
    const match = suffix.exec(id)
    if (match) next = Math.max(next, Number(match[1]) + 1)
  }
  while (taken.has(`${catalogName}_${next}`)) next += 1
  return `${catalogName}_${next}`
}

/**
 * Append one entry to a catalog.
 *
 * Attributes are written in the DTD's declared order rather than the caller's, so a generated entry
 * reads like one the Java editor wrote; the id is always written, and a value nobody filled in is
 * left out rather than written empty.
 *
 * A document whose catalog block is missing altogether gets `null`: inventing a `Catalogs` child
 * would make the writer emit structure the schema's own sequence may not allow at that position, so
 * the caller says "this document has nowhere to put that" instead.
 *
 * @param {Model} model
 * @param {string} catalogName
 * @param {Record<string, string>} [attrs] without the id, which is minted unless given
 * @returns {{model: Model, path: Path, id: string}|null} the new entry, addressed
 */
export function addEntry(
  /** @type {Model} */ model,
  /** @type {string} */ catalogName,
  /** @type {Record<string, string>} */ attrs = {}
) {
  const shape = catalogShape(catalogName)
  const path = catalogPath(catalogName)
  if (!shape || !path || !elementAt(model, path)) return null
  const inserted = insertOccurrence(model, path, shape.entryElement)
  if (!inserted) return null

  const declared = new Set((ELEMENTS[shape.entryElement]?.dataAttrs ?? []).map((a) => a.name))
  const wanted = { ...attrs }
  if (!wanted[shape.idAttr]) wanted[shape.idAttr] = mintId(model, catalogName)
  let next = inserted.model
  for (const spec of ELEMENTS[shape.entryElement]?.dataAttrs ?? []) {
    const value = wanted[spec.name]
    if (!declared.has(spec.name) || value === undefined || value === '') continue
    next = setAttr(next, inserted.path, spec.name, value)
  }
  return { model: next, path: inserted.path, id: wanted[shape.idAttr] ?? '' }
}
