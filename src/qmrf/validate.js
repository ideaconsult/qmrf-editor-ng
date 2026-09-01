/**
 * Validation against the QMRF 3.0.0 DTD, tuned for documents that predate it.
 *
 * Upstream never validated anything: the Java editor switched validation off and shipped the
 * schema drift it found. We do check, but the check is only useful if its output stays readable,
 * so severity depends on one distinction that a real editor has to make anyway:
 *
 * - A document that declares itself 3.0.0 is held to 3.0.0. Missing required attributes and
 *   unresolvable references are errors.
 * - A document that declares something older (the published fixtures say 0.9, upstream code says
 *   1.2) is read best-effort. Findings that only exist because 3.0 introduced the thing - a
 *   missing `nanomaterial` flag, a chapter 9.3 attachment that did not exist yet - are reported
 *   as info, not as errors the user did not make.
 *
 * Referential integrity is the exception and stays an error either way: a `*_ref` that names no
 * catalog entry means the reader silently loses a row, in any version.
 */

/** @typedef {import('./xml.js').XmlElement} XmlElement */
/** @typedef {import('./xml.js').XmlDocument} Model */
/** @typedef {import('./model.js').Path} Path */
/** @typedef {'error' | 'warning' | 'info'} Severity */

/**
 * @typedef {object} Issue
 * @property {Severity} severity
 * @property {string} code stable identifier, for filtering and tests
 * @property {string} message one sentence, written for a person editing this document
 * @property {string} path formatted path below the root ('' for document-level)
 * @property {string} element
 * @property {string|null} attr
 * @property {string|null} chapter chapter number when the element is a QMRF field
 * @property {string|null} label field label from the DTD, for the issue list
 */

/**
 * @typedef {object} Report
 * @property {Issue[]} issues in document order, document-level issues first
 * @property {VersionInfo} version
 * @property {Record<Severity, number>} counts
 */

/**
 * @typedef {object} VersionInfo
 * @property {string} schemaVersion as declared
 * @property {string} editorVersion as declared
 * @property {string} expectedSchemaVersion
 * @property {string} expectedEditorVersion
 * @property {boolean} drifted
 */

import { collectIds, collectReferences, formatPath, walkElements } from './model.js'
import { ELEMENTS, SPEC } from './spec.js'

/** Fixed attributes worth checking. The rest of the root's fixed attributes (`author`, `date`,
 * `contact`, `email`, `url`) record who published which edition, so a document that disagrees
 * with the DTD's copy is not wrong - only older - and flagging it would bury the real findings. */
const CHECKED_FIXED = new Set(['chapter', 'name', 'catalog'])
const ROOT_CHECKED_FIXED = new Set(['name'])
const ID_PATTERN = /^[\p{L}_][\p{L}\p{N}._-]*$/u

/**
 * A generated field, narrowed to what an issue list needs. Stated explicitly because the
 * generated union differs per field (only references carry `refs`), and this loop crosses those
 * branches.
 * @typedef {object} SpecField
 * @property {string} name
 * @property {string|null} chapter
 * @property {string} label
 * @property {SpecField[]} [children]
 */

/** @type {Record<string, {chapter: string|null, label: string}>} */
const fieldIndex = {}
/** @type {SpecField[]} */
const queue = []
for (const chapter of SPEC.chapters) {
  queue.push(...chapter.fields)
  while (queue.length) {
    const field = /** @type {SpecField} */ (queue.shift())
    fieldIndex[field.name] = { chapter: field.chapter ?? null, label: field.label }
    queue.push(...(field.children ?? []))
  }
}

/** @returns {VersionInfo} */
function readVersion(/** @type {XmlElement} */ root) {
  /** @type {Record<string, string>} */
  const fixed = {}
  for (const f of ELEMENTS[SPEC.root]?.fixed ?? []) fixed[f.name] = f.value ?? ''
  const attr = (/** @type {string} */ name) => root.attrs.find((a) => a.name === name)?.value ?? ''
  const schemaVersion = attr('schema_version')
  const editorVersion = attr('version')
  return {
    schemaVersion,
    editorVersion,
    expectedSchemaVersion: fixed.schema_version ?? '',
    expectedEditorVersion: fixed.version ?? '',
    drifted:
      schemaVersion !== (fixed.schema_version ?? '') || editorVersion !== (fixed.version ?? '')
  }
}

/**
 * @param {Model} model
 * @returns {Report}
 */
export function validate(model) {
  /** @type {Issue[]} */
  const issues = []
  const add = (
    /** @type {Severity} */ severity,
    /** @type {string} */ code,
    /** @type {string} */ message,
    /** @type {XmlElement|null} */ node,
    /** @type {Path} */ path,
    /** @type {string|null} */ attr = null
  ) => {
    const known = node ? fieldIndex[node.name] : undefined
    issues.push({
      severity,
      code,
      message,
      path: formatPath(path),
      element: node?.name ?? '',
      attr,
      chapter: known?.chapter ?? null,
      label: known?.label ?? null
    })
  }

  if (!model.root) {
    add(
      'error',
      'no-root',
      'The file contains no root element, so it is not a QMRF document.',
      null,
      []
    )
    return finish(issues, unknownVersion())
  }
  if (model.root.name !== SPEC.root) {
    add(
      'error',
      'not-qmrf',
      `The root element is <${model.root.name}>, not <${SPEC.root}>.`,
      model.root,
      []
    )
    return finish(issues, unknownVersion())
  }

  const version = readVersion(model.root)
  if (version.drifted) {
    add(
      'warning',
      'version-drift',
      `Declared schema_version "${version.schemaVersion}" and version "${version.editorVersion}"; ` +
        `this editor follows "${version.expectedSchemaVersion}" / "${version.expectedEditorVersion}". ` +
        'Fields are shown as 3.0 defines them.',
      model.root,
      []
    )
  }
  // A document the parser had to repair is worth reporting, but it is the file's damage rather
  // than the user's, so it never blocks a save.
  for (const note of model.notes ?? []) {
    add('warning', `xml-${note.code}`, note.message, null, [])
  }

  /** Expectations that 3.0 introduced are only errors in a document claiming 3.0. */
  const strict = !version.drifted
  const checkedFixed = (/** @type {XmlElement} */ node) =>
    node === model.root ? ROOT_CHECKED_FIXED : CHECKED_FIXED

  walkElements(model.root, (node, path) => {
    const declared = ELEMENTS[node.name]
    if (!declared) {
      add(
        'warning',
        'unknown-element',
        `<${node.name}> is not part of QMRF ${version.expectedEditorVersion}.`,
        node,
        path
      )
      return
    }

    for (const fixed of declared.fixed) {
      if (!checkedFixed(node).has(fixed.name)) continue
      const present = node.attrs.find((a) => a.name === fixed.name)
      if (!present) {
        add(
          'warning',
          'fixed-attr-missing',
          `<${node.name}> should carry ${fixed.name}="${fixed.value}".`,
          node,
          path,
          fixed.name
        )
      } else if (present.value !== fixed.value) {
        add(
          'warning',
          'fixed-attr-drift',
          `${fixed.name}="${present.value}" but the schema fixes it to "${fixed.value}".`,
          node,
          path,
          fixed.name
        )
      }
    }

    for (const spec of declared.dataAttrs) {
      const present = node.attrs.find((a) => a.name === spec.name)
      const value = present?.value ?? ''
      if (spec.kind === 'enum' && value !== '' && !(spec.values ?? []).includes(value)) {
        add(
          'error',
          'enum-value',
          `${spec.name}="${value}" is not one of ${(spec.values ?? []).join(' | ')}.`,
          node,
          path,
          spec.name
        )
      }
      if (spec.kind === 'id' && value !== '' && !ID_PATTERN.test(value)) {
        add(
          'error',
          'bad-id',
          `id "${value}" is not a valid XML identifier.`,
          node,
          path,
          spec.name
        )
      }
      if (spec.required && value === '') {
        add(
          strict ? 'error' : 'info',
          present ? 'attr-empty' : 'attr-missing',
          `${spec.name} is required on <${node.name}>${spec.kind === 'enum' ? ` (${spec.values?.join(' | ')})` : ''}.`,
          node,
          path,
          spec.name
        )
      }
    }

    checkChildren(node, declared, path, strict, add)
  })

  checkIds(model, add)
  checkReferences(model, add)

  return finish(issues, version)
}

/** Cardinality and sequence, which the DTD fixes as a strict order for the chapter block. */
function checkChildren(
  /** @type {XmlElement} */ node,
  /** @type {(typeof ELEMENTS)[string]} */ declared,
  /** @type {Path} */ path,
  /** @type {boolean} */ strict,
  /** @type {(severity: Severity, code: string, message: string, node: XmlElement, path: Path, attr?: string|null) => void} */ add
) {
  if (declared.pcdata || declared.empty || declared.children.length === 0) return
  /** @type {Record<string, number>} */
  const counts = {}
  const rank = new Map(declared.children.map((c, i) => [c.name, i]))
  let highest = -1
  for (const child of node.children) {
    if (child.type !== 'element') continue
    const occurrence = counts[child.name] ?? 0
    counts[child.name] = occurrence + 1
    const childPath = [...path, { name: child.name, index: occurrence }]
    const at = rank.get(child.name)
    if (at === undefined) {
      add(
        'warning',
        'undeclared-child',
        `<${child.name}> does not belong inside <${node.name}>.`,
        child,
        childPath
      )
      continue
    }
    if (!declared.choice && at < highest) {
      add(
        'warning',
        'out-of-order',
        `<${child.name}> appears out of schema order inside <${node.name}>.`,
        child,
        childPath
      )
    }
    highest = Math.max(highest, at)
  }
  for (const spec of declared.children) {
    const count = counts[spec.name] ?? 0
    if (count === 0 && spec.occurrences !== 'zeroOrMore') {
      add(
        strict ? 'error' : 'info',
        'missing-child',
        `<${node.name}> should contain <${spec.name}>.`,
        node,
        path
      )
    }
    if (count > 1 && spec.occurrences === 'once') {
      add(
        'error',
        'too-many-children',
        `<${node.name}> contains ${count} <${spec.name}>, only one is allowed.`,
        node,
        path
      )
    }
  }
}

function checkIds(
  /** @type {Model} */ model,
  /** @type {(severity: Severity, code: string, message: string, node: XmlElement|null, path: Path, attr?: string|null) => void} */ add
) {
  /** @type {Map<string, {path: Path, catalog: string}[]>} */
  const byId = new Map()
  for (const entry of collectIds(model)) {
    const seen = byId.get(entry.id) ?? []
    seen.push(entry)
    byId.set(entry.id, seen)
  }
  for (const [id, entries] of byId) {
    if (entries.length < 2) continue
    for (const entry of entries) {
      add(
        'error',
        'duplicate-id',
        `id "${id}" is used ${entries.length} times; references cannot resolve it.`,
        null,
        entry.path,
        'id'
      )
    }
  }
}

function checkReferences(
  /** @type {Model} */ model,
  /** @type {(severity: Severity, code: string, message: string, node: XmlElement|null, path: Path, attr?: string|null) => void} */ add
) {
  /** @type {Map<string, string>} id -> catalog */
  const ids = new Map()
  for (const entry of collectIds(model)) if (!ids.has(entry.id)) ids.set(entry.id, entry.catalog)

  for (const ref of collectReferences(model)) {
    if (ref.value === '') {
      // An empty pointer is how these documents spell "not applicable"; only the required ones
      // (a `*_ref` element sitting in a chapter) are worth a mention.
      if (ref.via === 'ref-element') {
        add(
          'info',
          'ref-empty',
          `A reference here points at nothing, so the ${catalogOfName(ref.catalog)} row is missing.`,
          null,
          ref.path,
          ref.attr
        )
      }
      continue
    }
    const target = ids.get(ref.value)
    if (target === undefined) {
      add(
        'error',
        'dangling-ref',
        `No entry with id "${ref.value}" exists in ${catalogOfName(ref.catalog)}, so this reference is lost.`,
        null,
        ref.path,
        ref.attr
      )
    } else if (ref.catalog && target !== ref.catalog) {
      add(
        'error',
        'wrong-catalog-ref',
        `id "${ref.value}" is a ${catalogOfName(target)} entry, but this reference expects ${catalogOfName(ref.catalog)}.`,
        null,
        ref.path,
        ref.attr
      )
    }
  }
}

/** `publications_catalog` -> "the publications catalog", for prose. */
function catalogOfName(/** @type {string} */ catalog) {
  if (!catalog) return 'a catalog'
  const label = catalog.replace(/_catalog$/, '').replace(/_/g, ' ')
  return `the ${label} catalog`
}

/** @param {Issue[]} issues */
function finish(/** @type {Issue[]} */ issues, /** @type {VersionInfo} */ version) {
  const counts = { error: 0, warning: 0, info: 0 }
  for (const issue of issues) counts[issue.severity] += 1
  return { issues, version, counts }
}

/** @returns {VersionInfo} */
function unknownVersion() {
  const fixed = Object.fromEntries(
    (ELEMENTS[SPEC.root]?.fixed ?? []).map((f) => [f.name, f.value ?? ''])
  )
  return {
    schemaVersion: '',
    editorVersion: '',
    expectedSchemaVersion: fixed.schema_version ?? '',
    expectedEditorVersion: fixed.version ?? '',
    drifted: false
  }
}
