import { describe, expect, it } from 'vitest'
import { collectIds, openModel, saveModel } from '../../qmrf/model.js'
import { newDocument, newDocumentText } from '../../qmrf/newDocument.js'
import { elements } from '../../qmrf/render.js'
import { SPEC } from '../../qmrf/spec.js'
import { validate } from '../../qmrf/validate.js'
import template from '../fixtures/qmrf-new-template.xml?raw'

/**
 * The new-document skeleton is generated from the schema, so its contract is with the schema rather
 * than with a stored copy of the output. These tests therefore read the spec and the document back
 * and compare, which makes the generator's rules observable: `once` and `oneOrMore` children appear,
 * `zeroOrMore` ones do not, `#FIXED` attributes are seeded, and required answers are filled from the
 * schema's own enum rather than from a hard-coded opinion.
 */

const model = newDocument()
const root = /** @type {NonNullable<typeof model.root>} */ (model.root)
const chaptersBlock = block('QMRF_chapters')
const catalogsBlock = block('Catalogs')

/** @param {string} name */
function blockOf(name) {
  return elements(root).find((child) => child.name === name)
}

/**
 * Both blocks are required of the root by the schema, so a skeleton missing one is a broken
 * generator rather than a case to write an assertion around.
 * @param {string} name
 */
function block(name) {
  const found = blockOf(name)
  if (!found) throw new Error(`the skeleton holds no ${name} block`)
  return found
}

/** @param {import('../../qmrf/xml.js').XmlElement|undefined} node */
function namesOf(node) {
  return node ? elements(node).map((child) => child.name) : []
}

/** @param {import('../../qmrf/xml.js').XmlElement|undefined} node */
function attrsOf(node) {
  return new Map((node?.attrs ?? []).map((attr) => [attr.name, attr.value]))
}

/** @param {string} name @param {string} chapterName */
function fieldOf(name, chapterName) {
  const chapter = elements(chaptersBlock).find((child) => child.name === chapterName)
  return elements(chapter ?? chaptersBlock).find((child) => child.name === name)
}

/** The chapter a generated field was written into, by field name. */
function chapterNameOf(/** @type {string} */ field) {
  for (const chapter of SPEC.chapters) {
    if (chapter.fields.some((entry) => entry.name === field)) return chapter.name
  }
  throw new Error(`${field} is not a chapter field`)
}

describe('newDocumentText', () => {
  it('declares the schema the document is written against', () => {
    expect(newDocumentText()).toContain('<!DOCTYPE QMRF PUBLIC')
    expect(newDocumentText()).toContain('qmrf.dtd')
  })

  it('saves back exactly what it opened', () => {
    // What the viewer writes must be what the viewer read, or an untouched New document would
    // arrive in a host's storage with something changed.
    expect(saveModel(openModel(newDocumentText()))).toBe(newDocumentText())
  })
})

describe('newDocument', () => {
  it('holds the two blocks the schema puts under the root', () => {
    expect(namesOf(root)).toEqual(['QMRF_chapters', 'Catalogs'])
  })

  it('holds every chapter, once each, in schema order', () => {
    expect(namesOf(chaptersBlock)).toEqual(SPEC.chapters.map((chapter) => chapter.name))
  })

  it('holds every field the schema requires of a chapter, and no optional repeat yet', () => {
    for (const chapter of SPEC.chapters) {
      const node = elements(chaptersBlock).find((child) => child.name === chapter.name)
      expect(namesOf(node), chapter.name).toEqual(
        chapter.fields.filter((f) => f.occurrences !== 'zeroOrMore').map((f) => f.name)
      )
    }
  })

  it('carries the numbers and labels the schema fixes, so a heading is never blank', () => {
    for (const chapter of SPEC.chapters) {
      const node = elements(chaptersBlock).find((child) => child.name === chapter.name)
      expect(attrsOf(node).get('chapter'), chapter.name).toBe(chapter.chapter)
      expect(attrsOf(node).get('name'), chapter.name).toBe(chapter.label)
      for (const field of chapter.fields) {
        const fieldNode = fieldOf(field.name, chapter.name)
        expect(attrsOf(fieldNode).get('chapter'), field.name).toBe(field.chapter)
        // Only fields the DTD fixes a label on get one; the generated spec says which those are.
        if (field.labelFromDtd) expect(attrsOf(fieldNode).get('name'), field.name).toBe(field.label)
      }
    }
  })

  it('answers every required Yes/No/All question from the schema, not from a guess', () => {
    /** @type {{field: string, attr: string, values: string[]}[]} */
    const asked = []
    for (const chapter of SPEC.chapters) {
      for (const field of chapter.fields) {
        for (const attr of field.enumAttrs) {
          if (attr.required && (attr.values ?? []).includes('Yes')) {
            asked.push({ field: field.name, attr: attr.name, values: attr.values ?? [] })
          }
        }
      }
    }
    expect(asked.length).toBeGreaterThan(8)
    for (const question of asked) {
      const value = attrsOf(fieldOf(question.field, chapterNameOf(question.field))).get(
        question.attr
      )
      expect(question.values, `${question.field} ${question.attr}`).toContain(value)
      expect(value, `${question.field} ${question.attr}`).not.toBe('')
    }
    // The inventory flags are the one place a document has to start somewhere: everything available,
    // nanomaterial not, because a chemical model's default is not a nanomaterial study.
    const flags = attrsOf(fieldOf('training_set_data', chapterNameOf('training_set_data')))
    expect(Object.fromEntries(flags)).toMatchObject({
      chemname: 'Yes',
      cas: 'Yes',
      smiles: 'Yes',
      inchi: 'Yes',
      mol: 'Yes',
      formula: 'Yes',
      nanomaterial: 'No'
    })
  })

  it('points the two author fields at catalog entries, because those pointers are required', () => {
    const ids = collectIds(model).map((entry) => entry.id)
    expect(ids).toEqual(expect.arrayContaining(['firstauthor', 'modelauthor']))
    for (const field of ['qmrf_authors', 'model_authors']) {
      const refs = elements(fieldOf(field, chapterNameOf(field)) ?? chaptersBlock).filter((child) =>
        child.name.endsWith('_ref')
      )
      expect(refs.length, field).toBeGreaterThan(0)
      // The `catalog` attribute is what routes a pointer, since the DTD types its idref as CDATA.
      for (const ref of refs) {
        expect(attrsOf(ref).get('catalog'), field).toBe('authors_catalog')
        expect(ids, field).toContain(attrsOf(ref).get('idref'))
      }
    }
  })

  it('starts with empty catalogs except the two authors it needs', () => {
    expect(namesOf(catalogsBlock)).toEqual(SPEC.catalogs.map((catalog) => catalog.name))
    for (const catalog of SPEC.catalogs) {
      const node = elements(catalogsBlock).find((child) => child.name === catalog.name)
      expect(namesOf(node), catalog.name).toEqual(
        catalog.name === 'authors_catalog' ? ['author', 'author'] : []
      )
    }
  })

  it('does not pre-copy the endpoint vocabulary, which is upstream template does', () => {
    // Upstream's template carries all 347 vocabulary terms in every new document; this one mints an
    // entry when the user picks one, so an unchosen endpoint stays out of the file.
    const templateCatalog = endpointsOf(openModel(template))
    expect(templateCatalog.length).toBeGreaterThan(300)
    expect(namesOf(elements(catalogsBlock).find((c) => c.name === 'endpoints_catalog'))).toEqual([])
  })

  it('is valid against the schema that generated it, with nothing to explain', () => {
    const report = validate(model)
    expect(report.issues).toEqual([])
    expect(report.counts).toEqual({ error: 0, warning: 0, info: 0 })
    expect(report.version.drifted).toBe(false)
  })

  it('is a skeleton rather than a form: the optional repeats are not seeded', () => {
    // Chapter 5 and 7 are `oneOrMore`, and `endpoint_data_quality` and `bibliography` hold repeatable
    // pointers. Upstream's template seeds none of those either, but it does seed 347 endpoints and
    // eight pointers whose `catalog` attribute it forgot, which is why this file is generated.
    const optional = elements(chaptersBlock).flatMap((chapter) =>
      elements(chapter).flatMap((field) =>
        elements(field)
          .filter((child) => child.name.endsWith('_ref'))
          .map((child) => child.name)
      )
    )
    expect(optional).toEqual(['author_ref', 'author_ref'])
    expect(validate(openModel(template)).counts.warning).toBeGreaterThan(0)
  })
})

/** @param {import('../../qmrf/model.js').Model} doc */
function endpointsOf(doc) {
  if (!doc.root) return []
  const catalogs = elements(doc.root).find((child) => child.name === 'Catalogs')
  const endpoints = catalogs
    ? elements(catalogs).find((c) => c.name === 'endpoints_catalog')
    : undefined
  return endpoints ? elements(endpoints) : []
}
