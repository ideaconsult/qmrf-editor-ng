import { describe, expect, it } from 'vitest'
import { ELEMENTS, SPEC } from '../../qmrf/spec.js'

/**
 * The spec is generated, and `gen:spec -- --check` already proves it matches the vendored DTD
 * byte-for-byte. What that gate cannot catch is a generator that reads the DTD faithfully but
 * understands it wrongly — so these assertions pin the *meaning*: the chapter sequence, how the
 * kinds partition, and where a pointer actually resolves. A generator change that moves one of
 * these numbers is a decision to make deliberately, not a diff to merge.
 */

/**
 * The generated object literal types as a union of ~70 distinct field shapes, which array methods
 * cannot be called across; naming the shape is what lets this file walk the tree. Kept to the
 * properties asserted below, in the same spirit as the `SpecField` typedef in `validate.js`.
 * @typedef {object} Field
 * @property {string} name
 * @property {string|null} chapter
 * @property {string} label
 * @property {boolean} labelFromDtd
 * @property {string} kind
 * @property {boolean} text
 * @property {string|null} refCatalog
 * @property {SpecAttr[]} enumAttrs
 * @property {Field[]} children
 * @property {{element: string, catalog: string}[]} [refs]
 * @typedef {object} SpecAttr
 * @property {string} name
 * @property {boolean} required
 * @property {string[]} values
 */

/** @type {Field[]} the 61 fields the ten chapters hold directly */
const topLevel = []
for (const chapter of SPEC.chapters) topLevel.push(...chapter.fields)

/** @type {Field[]} everything nested below a chapter field, at any depth */
const below = []
/** @param {Field[]} fields @param {number} depth */
function walk(fields, depth) {
  for (const field of fields) {
    if (depth > 0) below.push(field)
    walk(field.children ?? [], depth + 1)
  }
}
for (const chapter of SPEC.chapters) walk(chapter.fields, 0)

/** @param {Field[]} fields */
function tally(fields) {
  /** @type {Record<string, number>} */
  const counts = {}
  for (const field of fields) counts[field.kind] = (counts[field.kind] ?? 0) + 1
  return counts
}

function fieldNamed(/** @type {string} */ name) {
  const found = topLevel.find((f) => f.name === name)
  if (!found) throw new Error(`no chapter-level field named ${name}`)
  return found
}

describe('chapters', () => {
  it('numbers the ten chapters in the sequence the schema fixes', () => {
    expect(SPEC.chapters.map((c) => [c.chapter, c.name])).toEqual([
      ['1', 'QSAR_identifier'],
      ['2', 'QSAR_General_information'],
      ['3', 'QSAR_Endpoint'],
      ['4', 'QSAR_Algorithm'],
      ['5', 'QSAR_Applicability_domain'],
      ['6', 'QSAR_Robustness'],
      ['7', 'QSAR_Predictivity'],
      ['8', 'QSAR_Interpretation'],
      ['9', 'QSAR_Miscelaneous'],
      ['10', 'QMRF_Summary']
    ])
  })

  it('carries the OECD principle each chapter answers', () => {
    expect(SPEC.chapters.map((c) => c.label)).toEqual([
      'QSAR identifier',
      'General information',
      'Defining the endpoint - OECD Principle 1',
      'Defining the algorithm - OECD Principle 2',
      'Defining the applicability domain - OECD Principle 3',
      'Internal validation - OECD Principle 4',
      'External validation - OECD Principle 4',
      'Providing a mechanistic interpretation - OECD Principle 5',
      'Miscellaneous information',
      'Summary (JRC QSAR Model Database)'
    ])
  })

  it('repeats only the applicability domain and the external validation', () => {
    expect(SPEC.chapters.filter((c) => c.repeatable).map((c) => `${c.chapter} ${c.name}`)).toEqual([
      '5 QSAR_Applicability_domain',
      '7 QSAR_Predictivity'
    ])
  })
})

describe('fields', () => {
  it('numbers and labels every field, and never reuses a name', () => {
    expect(topLevel).toHaveLength(61)
    expect(new Set(topLevel.map((f) => f.name)).size).toBe(topLevel.length)
    expect(topLevel.every((f) => f.chapter && f.label)).toBe(true)
  })

  it('partitions the chapter-level fields into the kinds an editor must render', () => {
    expect(tally(topLevel)).toEqual({
      text: 38,
      reference: 9,
      question: 8,
      date: 4,
      algorithm: 1,
      group: 1
    })
  })

  it('nests only the 9.3 attachments and the attribute-only rows they hold', () => {
    // `entry` is an element with no content at all — attributes only — so it gets its own kind
    // instead of pretending to be a text field with nothing in it.
    expect(below).toHaveLength(8)
    expect(tally(below)).toEqual({ text: 1, attachment: 3, entry: 4 })
    expect(below.filter((f) => f.kind === 'attachment').map((f) => f.name)).toEqual([
      'attachment_training_data',
      'attachment_validation_data',
      'attachment_documents'
    ])
    expect(
      below
        .filter((f) => f.kind === 'entry')
        .map((f) => f.name)
        .sort()
    ).toEqual(['algorithm_ref', 'document', 'molecules', 'molecules'])
  })

  it('labels what the schema labels and admits what it does not', () => {
    // `chapter`/`name` are #FIXED on real fields. The parts below a field carry no label in the
    // DTD, so the generator derives one and marks it as derived rather than inventing a citation.
    expect(topLevel.every((f) => f.labelFromDtd)).toBe(true)
    expect(below.every((f) => !f.labelFromDtd)).toBe(true)
    expect(below.map((f) => f.label).sort()).toEqual([
      'Algorithm ref',
      'Attachment documents',
      'Attachment training data',
      'Attachment validation data',
      'Document',
      'Equation',
      'Molecules',
      'Molecules'
    ])
  })

  it('marks a field as text exactly where the schema says #PCDATA', () => {
    // Question and date fields are #PCDATA too: their answer/flag sets ride on attributes, so a
    // field editor cannot dispatch on `text` alone — `kind` is the switch.
    const pcdata = topLevel.filter((f) => f.text)
    expect(pcdata).toHaveLength(50)
    expect([...new Set(pcdata.map((f) => f.kind))].sort()).toEqual(['date', 'question', 'text'])
    expect(fieldNamed('QSAR_software').text).toBe(false)
  })
})

describe('question fields', () => {
  it('keeps the answer sets the DTD declares', () => {
    expect(fieldNamed('training_set_availability').enumAttrs).toEqual([
      expect.objectContaining({ name: 'answer', required: true, values: ['Yes', 'No'] })
    ])
    expect(fieldNamed('training_set_descriptors').enumAttrs).toEqual([
      expect.objectContaining({
        name: 'answer',
        required: true,
        values: ['All', 'Some', 'No', 'Unknown']
      })
    ])
    expect(fieldNamed('QSAR_title').enumAttrs).toEqual([])
  })

  it('carries the seven structural flags on both dataset inventories', () => {
    const flags = (/** @type {string} */ name) =>
      fieldNamed(name)
        .enumAttrs.map((a) => a.name)
        .sort()
        .join(' ')
    // A 0.9 document omits `nanomaterial` because the field did not exist yet, which is what lets
    // the validator tell "the author forgot" from "the schema grew since they wrote it".
    for (const name of ['training_set_data', 'validation_set_data']) {
      expect(flags(name)).toBe('cas chemname formula inchi mol nanomaterial smiles')
      expect(fieldNamed(name).enumAttrs.every((a) => a.values.join('|') === 'Yes|No')).toBe(true)
      expect(fieldNamed(name).enumAttrs.every((a) => a.required)).toBe(true)
    }
  })
})

describe('references', () => {
  it('routes by element name, because idref is declared CDATA, not IDREF', () => {
    expect(
      topLevel
        .filter((f) => f.kind === 'reference')
        .map((f) => `${f.name} -> ${f.refCatalog}`)
        .sort()
    ).toEqual([
      'QSAR_software -> software_catalog',
      'algorithms_descriptors -> descriptors_catalog',
      'app_domain_software -> software_catalog',
      'bibliography -> publications_catalog',
      'descriptors_generation_software -> software_catalog',
      'model_authors -> authors_catalog',
      'model_endpoint -> endpoints_catalog',
      'qmrf_authors -> authors_catalog',
      'references -> publications_catalog'
    ])
  })

  it('lists the child elements a reference field may hold', () => {
    expect(fieldNamed('descriptors_generation_software').refs).toEqual([
      { element: 'software_ref', catalog: 'software_catalog' }
    ])
    expect(fieldNamed('QSAR_software').children).toEqual([])
  })
})

describe('catalogs', () => {
  it('describes the six tables a model draws its entries from', () => {
    expect(
      SPEC.catalogs.map((c) => `${c.name} ${c.entryElement} ${c.refElement} ${c.idAttr}`)
    ).toEqual([
      'software_catalog software software_ref id',
      'algorithms_catalog algorithm algorithm_ref id',
      'descriptors_catalog descriptor descriptor_ref id',
      'endpoints_catalog endpoint endpoint_ref id',
      'publications_catalog publication publication_ref id',
      'authors_catalog author author_ref id'
    ])
    expect(SPEC.catalogs.map((c) => c.label)).toEqual([
      'Software',
      'Algorithms',
      'Descriptors',
      'Endpoints',
      'Publications',
      'Authors'
    ])
  })

  it('marks which columns are required, in the order the DTD declares them', () => {
    const columns = (/** @type {string} */ name) =>
      SPEC.catalogs
        .find((c) => c.name === name)
        ?.attrs.map((a) => `${a.name}${a.required ? '*' : ''}${a.kind === 'id' ? '#' : ''}`)
        .join(' ')
    // `ontology_term` is free text here: the upstream ontology lookup is not implemented.
    expect(columns('software_catalog')).toBe(
      'id*# name* url number* description version contact ontology_term'
    )
    expect(columns('algorithms_catalog')).toBe(
      'id*# definition* description* publication_ref ontology_term'
    )
    expect(columns('authors_catalog')).toBe('id*# name* affiliation contact url email number*')
  })
})

describe('elements', () => {
  it('fixes the eight root attributes, so none of them is an input', () => {
    const fixed = ELEMENTS[SPEC.root]?.fixed ?? []
    expect(fixed.map((f) => f.name)).toEqual([
      'schema_version',
      'version',
      'name',
      'author',
      'date',
      'contact',
      'email',
      'url'
    ])
    expect(fixed.every((f) => (f.value ?? '') !== '')).toBe(true)
  })

  it('knows which elements hold no content: the catalog entries and every pointer', () => {
    expect(Object.keys(ELEMENTS)).toHaveLength(98)
    expect(
      Object.keys(ELEMENTS)
        .filter((name) => ELEMENTS[name]?.empty)
        .sort()
    ).toEqual([
      'algorithm',
      'algorithm_ref',
      'author',
      'author_ref',
      'descriptor',
      'descriptor_ref',
      'document',
      'endpoint',
      'endpoint_ref',
      'molecules',
      'publication',
      'publication_ref',
      'software',
      'software_ref'
    ])
  })

  it('sees #PCDATA on a flag grid, which is why kind and text are different questions', () => {
    expect(ELEMENTS.QSAR_title?.pcdata).toBe(true)
    expect(ELEMENTS.training_set_data?.pcdata).toBe(true)
    expect(ELEMENTS.attachments?.pcdata).toBe(false)
  })
})
