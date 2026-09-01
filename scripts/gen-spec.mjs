#!/usr/bin/env node
// Generates src/qmrf/spec.js from vendor/qmrf.dtd.
//
// The QMRF DTD is not only the schema but also the form metadata: every chapter and field
// element carries its chapter number and human-readable label as #FIXED attributes, and the
// enumerations (answer Yes|No, All|Some|No|Unknown, the seven training/validation flags) are
// encoded as attribute value sets. Deriving the spec here means a label or a chapter number
// can never drift from the schema, which is why CI runs `gen:spec -- --check`.
//
// Usage:
//   node scripts/gen-spec.mjs            regenerate spec.js
//   node scripts/gen-spec.mjs --check    fail if the committed spec.js is stale

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(here, '..')
const DTD_PATH = path.join(rootDir, 'vendor', 'qmrf.dtd')
const OUT_PATH = path.join(rootDir, 'src', 'qmrf', 'spec.js')

// --- DTD text ---------------------------------------------------------------------------

/** DTD comments are not nested; the 1.2 removal of `algorithm_comments` lives in one. */
function stripComments(src) {
  let out = ''
  let i = 0
  while (i < src.length) {
    if (src.startsWith('<!--', i)) {
      const end = src.indexOf('-->', i)
      i = end === -1 ? src.length : end + 3
    } else {
      out += src[i]
      i += 1
    }
  }
  return out
}

/** Splits `<!ELEMENT …>` / `<!ATTLIST …>` declarations on their closing `>`, ignoring `>` inside quotes. */
function declarations(src) {
  const out = []
  let i = 0
  while (i < src.length) {
    const start = src.indexOf('<!', i)
    if (start === -1) break
    let j = start + 2
    let quote = null
    while (j < src.length) {
      const c = src[j]
      if (quote) {
        if (c === quote) quote = null
      } else if (c === '"' || c === "'") {
        quote = c
      } else if (c === '>') {
        break
      }
      j += 1
    }
    out.push(src.slice(start, j + 1))
    i = j + 1
  }
  return out
}

/** Tokenizes an ATTLIST body; keeps `(a|b)` enumerations and "quoted defaults" intact. */
function tokenize(text) {
  const tokens = []
  let i = 0
  while (i < text.length) {
    const c = text[i]
    if (/\s/.test(c)) {
      i += 1
      continue
    }
    if (c === '(') {
      const end = text.indexOf(')', i)
      tokens.push(text.slice(i, end + 1))
      i = end + 1
      continue
    }
    if (c === '"' || c === "'") {
      let end = i + 1
      while (end < text.length && text[end] !== c) end += 1
      tokens.push(text.slice(i, end + 1))
      i = end + 1
      continue
    }
    let end = i
    while (end < text.length && !/[\s(]/.test(text[end])) end += 1
    tokens.push(text.slice(i, end))
    i = end
  }
  return tokens
}

/**
 * @typedef {object} DtdAttr
 * @property {string} name
 * @property {string} type        CDATA | ID | IDREF | ENTITY | '(a|b)'
 * @property {boolean} required
 * @property {string|null} fixed
 * @property {string[]} [values]  for enumerations
 */

/** @typedef {{ pcdata: boolean, empty: boolean, choice: boolean, children: {name: string, occurrences: string}[], raw: string }} DtdModel */

/**
 * One editable thing in the form: a chapter, a field inside a chapter, or a nested group member.
 * `kind` is one of the values returned by `kindOf`; `children` is populated for the container kinds.
 * @typedef {object} Field
 * @property {string} name
 * @property {string|null} chapter
 * @property {string} label
 * @property {boolean} labelFromDtd
 * @property {string} kind
 * @property {string} occurrences
 * @property {boolean} repeatable
 * @property {boolean} text
 * @property {string|null} refCatalog
 * @property {object[]} enumAttrs
 * @property {object[]} dataAttrs
 * @property {Field[]} children
 * @property {{element: string, catalog: string|null}[]} [refs]
 */

function parseModel(raw) {
  const model = raw.trim()
  if (model === 'EMPTY')
    return { pcdata: false, empty: true, choice: false, children: [], raw: model }
  const pcdata = /^\(\s*#PCDATA\s*\*?\s*\)$/.exec(model)
  if (pcdata) return { pcdata: true, empty: false, choice: false, children: [], raw: model }
  let body = model
  if (model.startsWith('(') && model.endsWith(')')) body = model.slice(1, -1)
  const separator = splitTop(body).length > 1 ? ',' : splitTop(body, '|').length > 1 ? '|' : ','
  const parts = splitTop(body, separator)
  const children = parts.filter((p) => p.trim() !== '').map(parseParticle)
  return {
    pcdata: false,
    empty: false,
    choice: separator === '|',
    children,
    raw: model
  }
}

/** Splits a content model on a separator that is not nested inside parentheses. */
function splitTop(text, separator = ',') {
  const parts = []
  let depth = 0
  let current = ''
  for (const c of text) {
    if (c === '(') depth += 1
    if (c === ')') depth -= 1
    if (c === separator && depth === 0) {
      parts.push(current)
      current = ''
      continue
    }
    current += c
  }
  parts.push(current)
  return parts
}

/** @returns {{name: string, occurrences: 'once'|'optional'|'zeroOrMore'|'oneOrMore'}} */
function parseParticle(particle) {
  const p = particle.trim()
  const suffix = /([*+?])$/.exec(p)
  if (!suffix) {
    // A nested group may carry its quantifier after the closing paren.
    const group = /\)\s*([*+?])$/.exec(p)
    if (group) {
      return {
        name: p.slice(0, group.index + 1).trim(),
        occurrences: occurrencesOf(group[1])
      }
    }
    return { name: p, occurrences: 'once' }
  }
  return { name: p.slice(0, -1).trim(), occurrences: occurrencesOf(suffix[1]) }
}

function occurrencesOf(symbol) {
  if (symbol === '*') return 'zeroOrMore'
  if (symbol === '+') return 'oneOrMore'
  return 'optional'
}

// --- load -----------------------------------------------------------------------------

const dtdText = readFileSync(DTD_PATH, 'utf8')
/** @type {Map<string, {model: DtdModel, attrs: Map<string, DtdAttr>}>} */
const elements = new Map()

function element(name) {
  let entry = elements.get(name)
  if (!entry) {
    entry = {
      model: { pcdata: false, empty: false, choice: false, children: [], raw: '' },
      attrs: new Map()
    }
    elements.set(name, entry)
  }
  return entry
}

for (const decl of declarations(stripComments(dtdText))) {
  const elementDecl = /^<!ELEMENT\s+([\w.-]+)\s+([\s\S]*)>$/.exec(decl)
  if (elementDecl) {
    element(elementDecl[1]).model = parseModel(elementDecl[2])
    continue
  }
  const attlistDecl = /^<!ATTLIST\s+([\w.-]+)([\s\S]*)>$/.exec(decl)
  if (attlistDecl) {
    const target = element(attlistDecl[1])
    const tokens = tokenize(attlistDecl[2])
    for (let i = 0; i < tokens.length; ) {
      const name = tokens[i]
      const type = tokens[i + 1]
      if (name === undefined || type === undefined) break
      let index = i + 2
      let required = false
      let fixed = null
      const defaultToken = tokens[index]
      if (defaultToken === '#REQUIRED') {
        required = true
        index += 1
      } else if (defaultToken === '#IMPLIED' || defaultToken === '#DEFAULT') {
        index += 1
      } else if (defaultToken === '#FIXED') {
        fixed = unquote(tokens[index + 1] ?? '')
        required = true
        index += 2
      } else if (defaultToken !== undefined && /^["']/.test(defaultToken)) {
        index += 1
      }
      /** @type {DtdAttr} */
      const attr = { name, type, required, fixed }
      const enumeration = /^\((.*)\)$/.exec(type ?? '')
      if (enumeration) attr.values = (enumeration[1] ?? '').split('|').map((v) => v.trim())
      target.attrs.set(name, attr)
      i = index
    }
  }
}

function unquote(text) {
  return /^["'].*["']$/.test(text) ? text.slice(1, -1) : text
}

// --- classify -------------------------------------------------------------------------

const DATE_FIELDS = new Set(['qmrf_date', 'qmrf_date_revision', 'model_date', 'date_publication'])
const METADATA_ATTRS = new Set(['help'])

function fixedAttr(entry, name) {
  const attr = entry.attrs.get(name)
  return attr?.fixed ?? null
}

/** Attribute sets the editor owns: everything the DTD does not fix and is not help text. */
function dataAttrs(entry) {
  const out = []
  for (const attr of entry.attrs.values()) {
    if (attr.fixed !== null) continue
    if (METADATA_ATTRS.has(attr.name)) continue
    // An IDREF attribute is a pointer into a catalog; the ref element name identifies which.
    const targets = attr.type === 'IDREF' ? (catalogByRefElement.get(attr.name) ?? null) : null
    out.push({
      name: attr.name,
      required: attr.required,
      kind: attr.values ? 'enum' : attr.type === 'ID' ? 'id' : targets ? 'ref' : 'text',
      values: attr.values,
      refCatalog: targets
    })
  }
  return out
}

function enumAttrs(entry) {
  return dataAttrs(entry).filter((a) => a.kind === 'enum')
}

function refCatalog(refName) {
  return fixedAttr(element(refName), 'catalog')
}

/** `attachment_training_data` has no DTD label, so fall back to a derived one. */
function humanize(name) {
  const words = name.replace(/_/g, ' ').trim().split(/\s+/)
  return words.map((w, i) => (i === 0 ? w[0].toUpperCase() + w.slice(1) : w)).join(' ')
}

/** @returns {'text'|'date'|'question'|'reference'|'algorithm'|'attachment'|'group'|'entry'} */
function kindOf(name, entry) {
  if (entry.model.empty) return 'entry'
  if (entry.model.pcdata) {
    if (enumAttrs(entry).length > 0) return 'question'
    if (DATE_FIELDS.has(name)) return 'date'
    return 'text'
  }
  const names = entry.model.children.map((c) => c.name)
  if (names.length > 0 && names.every((n) => n.endsWith('_ref'))) return 'reference'
  if (names.includes('equation')) return 'algorithm'
  if (names.includes('molecules') || names.includes('document')) return 'attachment'
  return 'group'
}

/**
 * @param {string} name
 * @param {Set<string>} seen guards against the cyclic chapter/reference structure
 */
function buildField(name, seen) {
  if (seen.has(name)) return null
  const entry = element(name)
  const next = new Set(seen)
  next.add(name)
  const kind = kindOf(name, entry)
  const dtdLabel = fixedAttr(entry, 'name')
  /** @type {Field} */
  const field = {
    name,
    chapter: fixedAttr(entry, 'chapter'),
    label: dtdLabel ?? humanize(name),
    labelFromDtd: dtdLabel !== null,
    kind,
    occurrences: 'once',
    repeatable: false,
    text: entry.model.pcdata,
    refCatalog: kind === 'reference' ? refCatalog(entry.model.children[0]?.name ?? '') : null,
    enumAttrs: enumAttrs(entry),
    dataAttrs: dataAttrs(entry),
    children: []
  }
  if (kind === 'reference') {
    const refs = [
      ...new Set(entry.model.children.map((c) => c.name).filter((n) => n.endsWith('_ref')))
    ]
    field.refs = refs.map((ref) => ({ element: ref, catalog: refCatalog(ref) }))
  }
  if (kind === 'group' || kind === 'algorithm' || kind === 'attachment') {
    field.children = entry.model.children.flatMap((child) => {
      const childField = buildField(child.name, next)
      if (!childField) return []
      return [
        { ...childField, occurrences: child.occurrences, repeatable: child.occurrences !== 'once' }
      ]
    })
  }
  return field
}

const ROOT = 'QMRF'
if (!elements.has(ROOT)) throw new Error(`vendor/qmrf.dtd does not declare a ${ROOT} element`)

const rootEntry = element(ROOT)
const chapterNames = element('QMRF_chapters').model.children
const catalogNames = element('Catalogs').model.children

// Catalogs first: an IDREF attribute such as `publication_ref` on an algorithm or descriptor
// resolves to a catalog by its ref element name. Register every ref name in a pre-pass, because
// `algorithms_catalog` is declared before `publications_catalog` and would otherwise miss it.
/** @type {Map<string, string>} ref element name -> catalog name */
const catalogByRefElement = new Map()

/** @type {Map<string, {entryName: string, refElement: string|null}>} */
const catalogShapes = new Map()
for (const child of catalogNames) {
  const wrapper = element(child.name)
  const entryName = wrapper.model.children[0]?.name
  if (!entryName) throw new Error(`catalog ${child.name} declares no entry element`)
  const refElement = elements.has(`${entryName}_ref`) ? `${entryName}_ref` : null
  if (refElement) catalogByRefElement.set(refElement, child.name)
  catalogShapes.set(child.name, { entryName, refElement })
}

const catalogs = catalogNames.map((child) => {
  const shape = catalogShapes.get(child.name)
  if (!shape) throw new Error(`catalog ${child.name} was not registered by the pre-pass`)
  const { entryName, refElement } = shape
  const entry = element(entryName)
  return {
    name: child.name,
    // `software_catalog` -> Software, `descriptors_catalog` -> Descriptors: already the right
    // word in the DTD, so no hand-written label and no naive pluralisation.
    label: humanize(child.name.replace(/_catalog$/, '')),
    entryElement: entryName,
    refElement,
    occurrences: child.occurrences,
    idAttr: [...entry.attrs.values()].find((a) => a.type === 'ID')?.name ?? 'id',
    attrs: dataAttrs(entry)
  }
})

const chapters = chapterNames.map((child) => {
  const chapter = buildField(child.name, new Set())
  if (!chapter) throw new Error(`chapter ${child.name} could not be classified`)
  chapter.occurrences = child.occurrences
  chapter.repeatable = child.occurrences !== 'once'
  for (const field of chapter.children ?? []) {
    const childEntry = element(field.name)
    field.repeatable = childEntry.model.children.some((c) => c.occurrences !== 'once')
  }
  return {
    name: chapter.name,
    chapter: chapter.chapter,
    label: chapter.label,
    repeatable: chapter.repeatable,
    fields: chapter.children
  }
})

/** Flat index by element name, for the validator and the UI. */
const elementIndex = {}
for (const [name, entry] of [...elements.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  elementIndex[name] = {
    pcdata: entry.model.pcdata,
    empty: entry.model.empty,
    choice: entry.model.choice,
    children: entry.model.children.map((c) => ({ name: c.name, occurrences: c.occurrences })),
    fixed: [...entry.attrs.values()]
      .filter((a) => a.fixed !== null)
      .map((a) => ({ name: a.name, value: a.fixed })),
    dataAttrs: dataAttrs(entry)
  }
}

// --- emit -----------------------------------------------------------------------------

const header = `// GENERATED FILE - DO NOT EDIT.
// Produced by scripts/gen-spec.mjs from vendor/qmrf.dtd (QMRF schema ${rootEntry.attrs.get('schema_version')?.fixed ?? '?'} / editor ${rootEntry.attrs.get('version')?.fixed ?? '?'}).
// Regenerate with \`pnpm gen:spec\`; CI fails when this file and the DTD disagree.

/** Chapter and catalog labels come from the DTD's #FIXED attributes - see scripts/gen-spec.mjs. */
export const SPEC = ${JSON.stringify({ root: ROOT, chapters, catalogs }, null, 2)}

/** Every element declared by the DTD, with cardinality, fixed attributes and editable attributes. */
export const ELEMENTS = ${JSON.stringify(elementIndex, null, 2)}
`

const args = process.argv.slice(2)
if (args.includes('--check')) {
  let current = null
  try {
    current = readFileSync(OUT_PATH, 'utf8')
  } catch {
    console.error('src/qmrf/spec.js is missing; run `pnpm gen:spec`.')
    process.exit(1)
  }
  if (current !== header) {
    console.error('src/qmrf/spec.js is stale; run `pnpm gen:spec` and commit the result.')
    process.exit(1)
  }
  console.log('spec.js matches vendor/qmrf.dtd')
} else {
  writeFileSync(OUT_PATH, header, 'utf8')
  const fieldCount = chapters.reduce((sum, c) => sum + c.fields.length, 0)
  console.log(
    `wrote src/qmrf/spec.js: ${chapters.length} chapters, ${fieldCount} fields, ${catalogs.length} catalogs, ${Object.keys(elementIndex).length} elements`
  )
}
