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

import {
  childSteps,
  collectIds,
  collectReferences,
  elementAt,
  formatPath,
  insertOccurrence,
  parsePath,
  setAttr
} from './model.js'
import { headingAttrs, headingOf } from './render.js'
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

/** The same address as the string the report and the outline match on. */
export function catalogAddress(/** @type {string} */ catalogName) {
  const path = catalogPath(catalogName)
  return path ? formatPath(path) : ''
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
 * Append one entry to a catalog, building whatever the document is missing on the way there.
 *
 * Attributes are written in the DTD's declared order rather than the caller's, so a generated entry
 * reads like one the Java editor wrote; the id is always written, and a value nobody filled in is
 * left out rather than written empty.
 *
 * A document with no `Catalogs` block, or with only two of the six catalogs in it, is not a document
 * that cannot have a publication — `<!ELEMENT QMRF (QMRF_chapters,Catalogs)>` *requires* the block,
 * so a file that omits one is short of the schema rather than exempt from it, and the validator says
 * so. Refusing there would strand the whole editor: no appendix, no sidebar row, and no Add on any of
 * the chapter fields that mint entries, which is how a real document arrived in the state where
 * nothing could be added at all. So the missing `Catalogs` and the missing `*_catalog` are created,
 * through the same `insertOccurrence` that positions a repeated chapter, at the position the DTD's
 * own sequence puts them. A `null` now means only "that is not one of the six catalogs".
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
  if (!shape || !path) return null
  const room = ensureCatalog(model, path)
  if (!room) return null
  const inserted = insertOccurrence(room, path, shape.entryElement)
  if (!inserted) return null

  const declared = new Set((ELEMENTS[shape.entryElement]?.dataAttrs ?? []).map((a) => a.name))
  const wanted = { ...attrs }
  if (!wanted[shape.idAttr]) wanted[shape.idAttr] = mintId(room, catalogName)
  let next = inserted.model
  for (const spec of ELEMENTS[shape.entryElement]?.dataAttrs ?? []) {
    const value = wanted[spec.name]
    if (!declared.has(spec.name) || value === undefined || value === '') continue
    next = setAttr(next, inserted.path, spec.name, value)
  }
  return { model: next, path: inserted.path, id: wanted[shape.idAttr] ?? '' }
}

/**
 * The model with this catalog present, creating the `Catalogs` block and the `*_catalog` element if
 * the document is short of them.
 *
 * Both are one `insertOccurrence` each, whose anchor rule already knows where the DTD puts them:
 * `Catalogs` runs after the last `QMRF_chapters`, a `publications_catalog` after the last catalog the
 * schema declares before it. Nothing here chooses a position, which is the point — a hand-picked
 * `appendChild` is how a generated document stops validating.
 *
 * @param {Model} model
 * @param {Path} path as `catalogPath` returns it: the block step, then the catalog step
 * @returns {Model|null} null only when the document has no root to write into
 */
function ensureCatalog(/** @type {Model} */ model, /** @type {Path} */ path) {
  const block = /** @type {import('./model.js').Step} */ (path[0])
  const catalog = /** @type {import('./model.js').Step} */ (path[1])
  if (!elementAt(model, [block])) {
    const made = insertOccurrence(model, [], block.name)
    if (!made) return null
    model = made.model
  }
  if (!elementAt(model, path)) {
    const made = insertOccurrence(model, [block], catalog.name)
    if (!made) return null
    model = made.model
  }
  return model
}

/** @typedef {{address: string, label: string}} Citation */

/**
 * Which entry is cited by whom, in one pass over the document.
 *
 * The per-entry question — "may this be dropped?" — is asked of every row of every catalog on every
 * render, and `referencesTo` walks the whole document each time it is asked: with a real document's
 * thirty-odd entries that is the slowest thing in the report. Same answer, grouped once.
 *
 * @param {Model} model
 * @returns {Map<string, Citation[]>} keyed by the entry id as written
 */
export function citationIndex(/** @type {Model} */ model) {
  /** @type {Map<string, Citation[]>} */
  const index = new Map()
  /** @type {Set<string>} */
  const seen = new Set()
  for (const ref of collectReferences(model)) {
    if (ref.value === '') continue
    // A `*_ref` child is held by the field that cites; an IDREF attribute sits on the citing
    // element itself. Either way it is the field a reader recognises, not the pointer element.
    const owner = ref.via === 'ref-element' ? ref.path.slice(0, -1) : ref.path
    const address = formatPath(owner)
    if (seen.has(`${ref.value}\u0000${address}`)) continue
    seen.add(`${ref.value}\u0000${address}`)
    const node = elementAt(model, owner)
    const list = index.get(ref.value) ?? []
    list.push({ address, label: node ? headingOf(node) || address : address })
    index.set(ref.value, list)
  }
  return index
}

/**
 * The fields that cite one entry, labelled the way the report labels them.
 *
 * A pointer's own element name means nothing to someone deciding whether an entry may be dropped;
 * the field holding it is what they recognise — "1.3. Software coding the model", not
 * `software_ref`.
 *
 * @param {Model} model
 * @param {string} id the entry's handle, as written
 * @returns {Citation[]} one per citing field, in document order, a field citing twice listed once
 */
export function entryCitations(/** @type {Model} */ model, /** @type {string} */ id) {
  return citationIndex(model).get(id) ?? []
}

/** @typedef {{name: string, required: boolean, kind: string, values: string[], refCatalog: string}} EntryField */

/**
 * The attributes of an entry that are worth a control.
 *
 * The id is the handle the chapters point at rather than a field: changing it means rewriting every
 * pointer to it, so the editor shows it as a handle and leaves it alone. `ontology_term` is a
 * mapping this app does not interpret, and the read view leaves it out for the same reason.
 *
 * @param {string} catalogName
 * @returns {EntryField[]} in the DTD's declared order
 */
export function entryFields(/** @type {string} */ catalogName) {
  const shape = catalogShape(catalogName)
  if (!shape) return []
  return (ELEMENTS[shape.entryElement]?.dataAttrs ?? [])
    .filter((attr) => attr.name !== shape.idAttr && attr.name !== 'ontology_term')
    .map((attr) => ({
      name: attr.name,
      required: Boolean(attr.required),
      kind: attr.kind,
      values: attr.values ?? [],
      refCatalog: attr.refCatalog ?? ''
    }))
}
