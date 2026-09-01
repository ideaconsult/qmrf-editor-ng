/**
 * Immutable editing of a parsed QMRF document.
 *
 * A model is the document object that xml.js produced. Every edit is a copy-on-write of the
 * spine from the root to the edited node: the nodes on the spine lose their cached source span
 * (so the writer re-renders them from structure) and every sibling off the spine keeps its
 * original bytes. That single rule gives us three things at once - an untouched document is
 * written back byte-for-byte, an edit changes only what it has to, and an undo snapshot is just
 * another immutable model reference rather than a copy of the file.
 *
 * Paths are relative to the root element and address children by name plus occurrence index,
 * because QMRF repeats same-named siblings (chapters 5 and 7, `algorithm`, `descriptor`, the
 * `*_ref` pointers) and an editor needs a stable handle on the second one.
 */

/** @typedef {import('./xml.js').XmlAttr} XmlAttr */
/** @typedef {import('./xml.js').XmlElement} XmlElement */
/** @typedef {import('./xml.js').XmlNode} XmlNode */
/** @typedef {import('./xml.js').XmlDocument} Model */
/** @typedef {{ name: string, index: number }} Step */
/** @typedef {Step[]} Path */

import { ELEMENTS } from './spec.js'
import { parseXml, serializeXml } from './xml.js'

/** Steps are addressed by name, so a path reads like the document: `QMRF_chapters/QSAR_title[0]`. */

/** @param {Path} path */
export function formatPath(path) {
  return path.map((step) => `${step.name}[${step.index}]`).join('/')
}

/** @param {string} text @returns {Path} */
export function parsePath(text) {
  if (!text) return []
  return text.split('/').map((part) => {
    const m = /^([^[]+)(?:\[(\d+)\])?$/.exec(part)
    if (!m) return { name: part, index: 0 }
    return { name: m[1] ?? '', index: Number(m[2] ?? 0) }
  })
}

/** @param {string} text @returns {Model} */
export function openModel(text) {
  return parseXml(text).doc
}

/** @param {Model} model @returns {string} */
export function saveModel(model) {
  return serializeXml(model)
}

/** The nth element child with the given name, or -1. */
function indexOfName(
  /** @type {XmlNode[]} */ children,
  /** @type {string} */ name,
  /** @type {number} */ index
) {
  let seen = 0
  for (let i = 0; i < children.length; i += 1) {
    const child = children[i]
    if (child?.type === 'element' && child.name === name) {
      if (seen === index) return i
      seen += 1
    }
  }
  return -1
}

/** @returns {XmlElement|null} */
function childByName(/** @type {XmlElement} */ parent, /** @type {Step} */ step) {
  const at = indexOfName(parent.children, step.name, step.index)
  if (at === -1) return null
  const child = /** @type {XmlNode} */ (parent.children[at])
  return child.type === 'element' ? child : null
}

/**
 * Drops a node's cached source span so the writer re-renders it, while leaving attribute spans
 * (and every off-spine child span) intact.
 * @param {XmlElement} node
 */
function opened(/** @type {XmlElement} */ node) {
  return { ...node, raw: null }
}

/**
 * Copies the tree along `path` and replaces the node at its end with `update(node)`.
 * @param {XmlElement} root
 * @param {Path} path
 * @param {(node: XmlElement) => XmlElement} update
 * @returns {XmlElement|null} null when the path does not resolve; callers leave the model alone
 *   rather than inventing structure, because the spec - not user input - decides what exists.
 */
function mapNode(
  /** @type {XmlElement} */ root,
  /** @type {Path} */ path,
  /** @type {(node: XmlElement) => XmlElement} */ update
) {
  if (path.length === 0) return update(root)
  const step = /** @type {Step} */ (path[0])
  const target = childByName(root, step)
  if (!target) return null
  const inner = path.length === 1 ? update(target) : mapNode(target, path.slice(1), update)
  if (!inner) return null
  const at = indexOfName(root.children, step.name, step.index)
  const children = root.children.slice()
  children[at] = inner
  return opened({ ...root, children })
}

/** Rebuilds a model with a new root; the spine is already copied, so only the wrapper changes. */
function withRoot(/** @type {Model} */ model, /** @type {XmlElement|null} */ root) {
  return root ? { ...model, root } : model
}

/** @returns {XmlElement|null} */
export function elementAt(/** @type {Model} */ model, /** @type {Path} */ path) {
  if (!model.root) return null
  /** @type {XmlElement|null} */
  let node = model.root
  for (const step of path) {
    node = node ? childByName(node, step) : null
    if (!node) return null
  }
  return node
}

/** Decoded character data directly inside an element, as stored (QMRF puts escaped HTML here). */
export function textOf(/** @type {XmlElement} */ node) {
  let out = ''
  for (const child of node.children) if (child.type === 'text') out += child.value
  return out
}

/** True when the text is only indentation, which QMRF uses freely between elements. */
export function isBlank(/** @type {string} */ text) {
  return text.trim() === ''
}

/** @returns {string} '' when the element or the attribute is absent */
export function getValue(/** @type {Model} */ model, /** @type {Path} */ path) {
  const node = elementAt(model, path)
  return node ? textOf(node) : ''
}

/**
 * Sets an element's character data, replacing every child. QMRF text fields are leaf elements,
 * so dropping the old text nodes cannot lose structure; the writer re-escapes on the way out.
 * @param {Model} model
 * @param {Path} path
 * @param {string} value
 */
export function setValue(
  /** @type {Model} */ model,
  /** @type {Path} */ path,
  /** @type {string} */ value
) {
  if (!model.root) return model
  const root = mapNode(model.root, path, (node) =>
    opened({
      ...node,
      selfClosing: false,
      children: value === '' ? [] : [{ type: 'text', value, raw: null }]
    })
  )
  return withRoot(model, root)
}

/** @returns {string} '' when absent */
export function getAttr(
  /** @type {Model} */ model,
  /** @type {Path} */ path,
  /** @type {string} */ name
) {
  const node = elementAt(model, path)
  return node?.attrs.find((a) => a.name === name)?.value ?? ''
}

/**
 * Sets or adds an attribute. An empty value is written as `name=""` rather than removing the
 * attribute, matching how existing QMRF editors spell an unfilled optional field.
 * @param {Model} model
 * @param {Path} path
 * @param {string} name
 * @param {string} value
 */
export function setAttr(
  /** @type {Model} */ model,
  /** @type {Path} */ path,
  /** @type {string} */ name,
  /** @type {string} */ value
) {
  if (!model.root) return model
  const root = mapNode(model.root, path, (node) => {
    const known = node.attrs.some((a) => a.name === name)
    const attrs = known
      ? node.attrs.map((a) => (a.name === name ? { ...a, value, raw: null } : a))
      : [...node.attrs, { name, value, raw: null }]
    return opened({ ...node, attrs })
  })
  return withRoot(model, root)
}

/** Element children with their addressing steps, in document order. */
export function childSteps(/** @type {Model} */ model, /** @type {Path} */ path) {
  const node = elementAt(model, path)
  if (!node) return []
  /** @type {Record<string, number>} */
  const seen = {}
  /** @type {{ step: Step, node: XmlElement }[]} */
  const out = []
  for (const child of node.children) {
    if (child.type !== 'element') continue
    const index = seen[child.name] ?? 0
    seen[child.name] = index + 1
    out.push({ step: { name: child.name, index }, node: child })
  }
  return out
}

/** Every occurrence of one child name, as paths below `path`. */
export function occurrences(
  /** @type {Model} */ model,
  /** @type {Path} */ path,
  /** @type {string} */ name
) {
  return childSteps(model, path).filter((c) => c.step.name === name)
}

/**
 * Builds an element that is valid to insert: `#FIXED` attributes such as `chapter` and `name`
 * are seeded from the DTD, so a freshly added chapter 5 renders with its label instead of an
 * empty heading and does not immediately fail validation.
 * @param {string} name
 * @returns {XmlElement}
 */
export function newElement(/** @type {string} */ name) {
  const declared = ELEMENTS[name]
  /** @type {XmlAttr[]} */
  const attrs = (declared?.fixed ?? []).map((f) => ({
    name: f.name,
    value: f.value ?? '',
    raw: null
  }))
  return {
    type: 'element',
    name,
    attrs,
    children: [],
    selfClosing: true,
    raw: null,
    start: -1,
    end: -1
  }
}

/**
 * The existing element after which a new child of `name` belongs, or null for "first". New nodes
 * go straight after the last sibling of the same name; otherwise after the last child the DTD
 * declares before them - which is what keeps a repeated chapter 5 or 7 inside its sequence.
 * @param {XmlElement} parent
 * @param {string} name
 * @returns {XmlElement|null}
 */
function insertionAnchor(/** @type {XmlElement} */ parent, /** @type {string} */ name) {
  const occurrences = countName(parent.children, name)
  if (occurrences > 0) {
    const last = indexOfName(parent.children, name, occurrences - 1)
    const node = parent.children[last]
    return node?.type === 'element' ? node : null
  }

  const order = ELEMENTS[parent.name]?.children ?? []
  const rank = order.findIndex((c) => c.name === name)
  // A name the parent does not declare (a document element from another schema version) is
  // appended rather than refused; the validator reports it separately.
  if (rank === -1) return lastElement(parent.children)
  const predecessors = new Set(order.slice(0, rank).map((c) => c.name))
  /** @type {XmlElement|null} */
  let anchor = null
  for (const child of parent.children) {
    if (child.type === 'element' && predecessors.has(child.name)) anchor = child
  }
  return anchor
}

/** The last element child, scanning from the end (no `findLast`, which the ES2022 target lacks). */
function lastElement(/** @type {XmlNode[]} */ children) {
  for (let i = children.length - 1; i >= 0; i -= 1) {
    const child = children[i]
    if (child?.type === 'element') return child
  }
  return null
}

function countName(/** @type {XmlNode[]} */ children, /** @type {string} */ name) {
  let n = 0
  for (const child of children) if (child.type === 'element' && child.name === name) n += 1
  return n
}

/** The separator style this level of the file already uses, or null when it has none (minified). */
function siblingSeparator(/** @type {XmlElement} */ parent) {
  for (const child of parent.children) {
    if (child.type === 'text' && isBlank(child.value) && child.value.includes('\n'))
      return child.value
  }
  return null
}

/**
 * Inserts a new occurrence of a repeatable child into the element at `path`.
 * @param {Model} model
 * @param {Path} path path of the parent element
 * @param {string} name child element to add
 * @returns {{ model: Model, path: Path }|null} the new element's path, so the caller can focus it
 */
export function insertOccurrence(
  /** @type {Model} */ model,
  /** @type {Path} */ path,
  /** @type {string} */ name
) {
  if (!model.root) return null
  const parent = elementAt(model, path)
  if (!parent) return null
  const anchor = insertionAnchor(parent, name)
  const index = countName(parent.children, name)
  const fresh = newElement(name)
  const separator = siblingSeparator(parent)

  const root = mapNode(model.root, path, (node) => {
    const children = node.children.slice()
    const blankAt = (/** @type {number} */ i) => {
      const n = children[i]
      return n?.type === 'text' && isBlank(n.value)
    }
    let at
    if (anchor) {
      at = children.indexOf(anchor) + 1
      if (separator && blankAt(at)) at += 1
    } else {
      at = blankAt(0) ? 1 : 0
    }
    // Copy the separator the file already uses at this level, so the newcomer reads like the rest:
    // `<a/>\n<new/>\n<b/>` in a pretty document, `<a/><new/><b/>` in a compact one.
    /** @type {XmlNode[]} */
    const added = separator ? [fresh, { type: 'text', value: separator, raw: null }] : [fresh]
    children.splice(at, 0, ...added)
    return opened({ ...node, children })
  })
  if (!root) return null
  return { model: withRoot(model, root), path: [...path, { name, index }] }
}

/**
 * Removes the element at `path`, taking the whitespace separator in front of it with it so a
 * pretty-printed document does not grow a blank line per deletion.
 * @param {Model} model
 * @param {Path} path
 */
export function removeElement(/** @type {Model} */ model, /** @type {Path} */ path) {
  if (!model.root || path.length === 0) return model
  const parentPath = path.slice(0, -1)
  const step = /** @type {Step} */ (path.at(-1))
  const root = mapNode(model.root, parentPath, (parent) => {
    const at = indexOfName(parent.children, step.name, step.index)
    if (at === -1) return parent
    const children = parent.children.slice()
    const prev = children[at - 1]
    const dropSep = at > 0 && prev?.type === 'text' && isBlank(prev.value)
    children.splice(dropSep ? at - 1 : at, dropSep ? 2 : 1)
    return opened({ ...parent, children })
  })
  return withRoot(model, root)
}

/**
 * Depth-first walk over element nodes, each with its path below the root. Paths are assigned
 * while descending, so a visitor gets the same addressing the setters expect.
 * @param {(node: XmlElement, path: Path) => void} visit
 */
export function walkElements(
  /** @type {XmlElement} */ node,
  /** @type {(node: XmlElement, path: Path) => void} */ visit,
  /** @type {Path} */ path = []
) {
  visit(node, path)
  /** @type {Record<string, number>} */
  const seen = {}
  for (const child of node.children) {
    if (child.type !== 'element') continue
    const index = seen[child.name] ?? 0
    seen[child.name] = index + 1
    walkElements(child, visit, [...path, { name: child.name, index }])
  }
}

/** @typedef {{ id: string, path: Path, catalog: string }} IdEntry */

/**
 * Every ID-bearing element, in document order. A list rather than a map so that duplicate IDs -
 * which the DTD forbids and real documents contain - stay visible to the validator.
 * @returns {IdEntry[]}
 */
export function collectIds(/** @type {Model} */ model) {
  /** @type {IdEntry[]} */
  const out = []
  if (!model.root) return out
  walkElements(model.root, (node, path) => {
    const declared = ELEMENTS[node.name]?.dataAttrs.find((a) => a.kind === 'id')
    const id = declared ? node.attrs.find((a) => a.name === declared.name)?.value : ''
    if (id) out.push({ id, path, catalog: catalogOfEntry(node) })
  })
  return out
}

/** The catalog an entry belongs to, from its own element name (`software` -> `software_catalog`). */
export function catalogOfEntry(/** @type {XmlElement} */ node) {
  return catalogOfRef(`${node.name}_ref`)
}

/** @typedef {{ path: Path, attr: string, catalog: string, via: 'ref-element' | 'idref-attr', value: string }} Reference */

/**
 * Every pointer in the document. Two conventions exist and both are honoured: a `*_ref` element
 * whose fixed `catalog` attribute says where the target lives (the DTD types its `idref` as
 * CDATA, so the attribute type alone is not enough), and an attribute the DTD really does declare
 * IDREF, which spec.js already resolves to a catalog.
 * @returns {Reference[]}
 */
export function collectReferences(/** @type {Model} */ model) {
  /** @type {Reference[]} */
  const out = []
  if (!model.root) return out
  walkElements(model.root, (node, path) => {
    const declared = ELEMENTS[node.name]
    if (!declared) return
    if (node.name.endsWith('_ref')) {
      const attr = node.attrs.find((a) => a.name === 'idref')
      if (attr) {
        out.push({
          path,
          attr: 'idref',
          catalog: catalogOfRef(node.name),
          via: 'ref-element',
          value: attr.value
        })
      }
    }
    for (const spec of declared.dataAttrs) {
      if (spec.kind !== 'ref') continue
      const attr = node.attrs.find((a) => a.name === spec.name)
      if (attr)
        out.push({
          path,
          attr: spec.name,
          catalog: spec.refCatalog ?? '',
          via: 'idref-attr',
          value: attr.value
        })
    }
  })
  return out
}

/** The catalog a `*_ref` element points into, from its fixed `catalog` attribute. */
export function catalogOfRef(/** @type {string} */ refElementName) {
  return ELEMENTS[refElementName]?.fixed.find((f) => f.name === 'catalog')?.value ?? ''
}

/** Pointers that name `id`. */
export function referencesTo(/** @type {Model} */ model, /** @type {string} */ id) {
  if (!id) return []
  return collectReferences(model).filter((ref) => ref.value === id)
}

/**
 * Renames a catalog ID and rewrites every pointer to it. Attribute-only edits, so the paths
 * collected before the first change stay valid throughout.
 */
export function renameId(
  /** @type {Model} */ model,
  /** @type {string} */ oldId,
  /** @type {string} */ newId
) {
  if (!oldId || oldId === newId) return model
  let next = model
  for (const entry of collectIds(model).filter((e) => e.id === oldId))
    next = setAttr(next, entry.path, 'id', newId)
  for (const ref of referencesTo(model, oldId)) next = setAttr(next, ref.path, ref.attr, newId)
  return next
}
