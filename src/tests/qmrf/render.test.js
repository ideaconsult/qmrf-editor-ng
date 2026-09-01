import { describe, expect, it } from 'vitest'
import { openModel } from '../../qmrf/model.js'
import { newDocumentText } from '../../qmrf/newDocument.js'
import {
  ATTACHMENT_GROUPS,
  attachmentRows,
  CATALOG_NOTES,
  DOCUMENT_META,
  documentMeta,
  elements,
  FLAG_LABELS,
  fieldKind,
  flagRows,
  headingOf,
  linkHref,
  resolveReference
} from '../../qmrf/render.js'
import { SPEC } from '../../qmrf/spec.js'
import fixture from '../fixtures/qmrf-0.9-real.xml?raw'

/**
 * The reading rules are `render.js`'s, and they are the part of the viewer most easily lost in a
 * refactor: which element is a field, which columns of a catalog entry a pointer shows, which flags
 * an inventory carries. The published document is the input because it is the one that has to look
 * right — it predates 3.0 and renames chapter 9, so a rule that only works on today's names is
 * already wrong.
 */

const model = openModel(fixture)
const root = /** @type {NonNullable<typeof model.root>} */ (model.root)
const chapters = elements(elements(root).find((child) => child.name === 'QMRF_chapters') ?? root)
const skeletonModel = openModel(newDocumentText())
const skeletonRoot = /** @type {NonNullable<typeof skeletonModel.root>} */ (skeletonModel.root)

/** @param {string} field @param {number} [index] */
function fieldNode(field, index = 0) {
  // Depth-first over the whole chapter subtree: the attachment slots are grandchildren of a chapter,
  // and a field the view has to find is findable at any depth.
  /** @type {import('../../qmrf/xml.js').XmlElement[]} */
  const hits = []
  /** @param {import('../../qmrf/xml.js').XmlElement} node */
  const collect = (node) => {
    for (const child of elements(node)) {
      if (child.name === field) hits.push(child)
      collect(child)
    }
  }
  for (const chapter of chapters) collect(chapter)
  const found = hits[index]
  if (!found) throw new Error(`${field} is not in the published document`)
  return found
}

/** @param {import('../../qmrf/xml.js').XmlElement} node @param {string} name */
function descendant(node, name) {
  for (const child of elements(node)) {
    if (child.name === name) return child
    const deeper = descendant(child, name)
    if (deeper) return deeper
  }
  return null
}

describe('fieldKind', () => {
  it('names the eight shapes the schema says a field can have', () => {
    // The whole view dispatches on this, so a kind that silently disappears is a field that stops
    // rendering. `spec.test.js` pins the counts; this pins the ones the view actually switches on.
    expect(fieldKind('QSAR_title')).toBe('text')
    expect(fieldKind('qmrf_date')).toBe('date')
    expect(fieldKind('training_set_data')).toBe('question')
    expect(fieldKind('QSAR_software')).toBe('reference')
    expect(fieldKind('algorithm_explicit')).toBe('algorithm')
    expect(fieldKind('attachments')).toBe('group')
    const firstSlot = ATTACHMENT_GROUPS[0]
    if (!firstSlot) throw new Error('the schema declares no attachment slots')
    expect(fieldKind(firstSlot.element)).toBe('attachment')
    expect(fieldKind('algorithm_ref')).toBe('entry')
  })

  it('is null for what is not a field, which is how the view finds inline content', () => {
    expect(fieldKind('QMRF_chapters')).toBeNull()
    expect(fieldKind('Catalogs')).toBeNull()
    expect(fieldKind('software')).toBeNull()
    expect(fieldKind('author_ref')).toBeNull()
    expect(fieldKind('molecules')).toBe('entry')
  })

  it('covers every field the schema generates, chapters included', () => {
    for (const chapter of SPEC.chapters) {
      for (const field of chapter.fields) expect(fieldKind(field.name), field.name).toBe(field.kind)
    }
  })
})

describe('headingOf', () => {
  it('puts the schema number in front of the schema label', () => {
    expect(headingOf(fieldNode('QSAR_title'))).toBe('1.1. QSAR identifier (title)')
  })

  it('says what the document actually says when its label drifted', () => {
    // Chapter 10 of this document calls itself "Summary (JRC Inventory)"; the validator reports the
    // drift, and the heading shows it rather than silently substituting today's wording.
    const summary = chapters.find((chapter) => chapter.name === 'QMRF_Summary')
    expect(headingOf(summary ?? root)).toContain('Summary (JRC Inventory)')
  })

  it('labels the attachment slots, which carry no label of their own', () => {
    for (const slot of ATTACHMENT_GROUPS) {
      const node = elements(fieldNode('attachments')).find((child) => child.name === slot.element)
      if (!node) continue
      expect(headingOf(node)).toBe(slot.label)
    }
  })
})

describe('documentMeta', () => {
  it('shows the root block in the order the reference report does', () => {
    const labels = documentMeta(model).map((row) => row.label)
    expect(labels.length).toBeGreaterThan(3)
    expect(labels.slice(0, DOCUMENT_META.length)).toEqual(
      DOCUMENT_META.filter((column) => labels.includes(column.label)).map((column) => column.label)
    )
  })

  it('is empty for a document with no root', () => {
    expect(documentMeta({ prolog: '', root: null, epilog: '', notes: [] })).toEqual([])
  })
})

describe('resolveReference', () => {
  it('shows a pointer as the entry it names', () => {
    const software = resolveReference(model, 'firstsoftware', 'software_catalog')
    expect(software.found).toBe(true)
    expect(software.heading).toEqual(['QSARModel 3.3.8 '])
    expect(software.rows.map((row) => row.label)).toContain('url')
    expect(software.path?.length).toBeGreaterThan(0)
  })

  it('says so when a pointer names nothing, rather than dropping the row', () => {
    const missing = resolveReference(model, 'no_such_entry', 'software_catalog')
    expect(missing.found).toBe(false)
    expect(missing.heading).toEqual([])
    expect(missing.path).toBeNull()
  })

  it('shows an author by name and affiliation, and nothing for a catalog it has no shape for', () => {
    expect(resolveReference(model, 'firstauthor', 'authors_catalog').heading).toEqual([
      'Indrek Tulp'
    ])
    const shapeless = resolveReference(model, 'firstauthor', 'whatever_catalog')
    expect(shapeless.found).toBe(true)
    expect(shapeless.heading).toEqual([])
    expect(shapeless.rows).toEqual([])
  })

  it('resolves from every catalog the chapters can point at', () => {
    const catalogs = new Set(SPEC.catalogs.map((catalog) => catalog.name))
    for (const catalog of catalogs) {
      const entries = elements(
        elements(elements(root).find((child) => child.name === 'Catalogs') ?? root).find(
          (child) => child.name === catalog
        ) ?? root
      )
      if (entries.length === 0) continue
      const id = entries[0]?.attrs.find((attr) => attr.name === 'id')?.value ?? ''
      expect(resolveReference(model, id, catalog).found, catalog).toBe(true)
    }
  })
})

describe('flagRows', () => {
  it('lists the inventory flags of a 3.0 document, nanomaterial included', () => {
    // The reference stylesheet predates the nanomaterial flag, so it is missing there rather than
    // here; the generated skeleton is the 3.0 document to compare against.
    const rows = flagRows(descendant(skeletonRoot, 'training_set_data') ?? skeletonRoot)
    expect(rows.map((row) => row.label)).toEqual(FLAG_LABELS.map((flag) => flag.label))
    expect(rows.at(-1)).toEqual({ label: 'Nanomaterials', value: 'No', link: false })
  })

  it('skips a flag the older document never carried', () => {
    const rows = flagRows(fieldNode('training_set_data'))
    expect(rows.map((row) => row.label)).not.toContain('Nanomaterials')
    expect(rows.length).toBe(6)
  })
})

describe('attachmentRows', () => {
  it('reads a slot as its files, naming the element each one sits in', () => {
    const rows = attachmentRows(fieldNode('attachment_training_data'))
    expect(rows.length).toBe(1)
    const file = rows[0]
    if (!file) throw new Error('the training slot of the published document holds no file')
    expect(file).toMatchObject({ entry: 'molecules', filetype: 'sdf' })
    expect(file.description).toContain('Danio rerio')
    expect(file.url).toContain('download_attachment.jsp')
  })

  it('is empty for a slot nobody filled', () => {
    // The published document carries two of the three slots and fills both; the third is absent
    // there and empty in a document created here, and either way it reads as no files rather than
    // as a rendering error.
    expect(elements(fieldNode('attachments')).map((slot) => slot.name)).toEqual([
      'attachment_training_data',
      'attachment_validation_data'
    ])
    expect(attachmentRows(fieldNode('attachment_validation_data')).length).toBe(1)
    expect(
      attachmentRows(descendant(skeletonRoot, 'attachment_documents') ?? skeletonRoot)
    ).toEqual([])
  })
})

describe('linkHref', () => {
  it('passes on what is already a link', () => {
    expect(linkHref('url', 'http://www.TestCode.com')).toBe('http://www.TestCode.com')
    expect(linkHref('url', 'https://example.org/a?b=1#c')).toBe('https://example.org/a?b=1#c')
  })

  it('repairs the shorthand these documents write', () => {
    expect(linkHref('url', 'www.echa.europa.eu')).toBe('https://www.echa.europa.eu')
    expect(linkHref('doi', '10.1039/c5em90064c')).toBe('https://doi.org/10.1039/c5em90064c')
    expect(linkHref('doi', 'https://doi.org/10.1039/c5em90064c')).toBe(
      'https://doi.org/10.1039/c5em90064c'
    )
    expect(linkHref('email', 'qmrf@TestCode.com')).toBe('mailto:qmrf@TestCode.com')
  })

  it('refuses a value that is not a link, so it stays plain text instead of a broken target', () => {
    // `mailto:` and `https://` are what an author leaves behind mid-typing, so a bare scheme is
    // treated as no value at all rather than as a link to nowhere.
    for (const value of [
      '',
      '   ',
      'as far as we know',
      'javascript:alert(1)',
      'mailto:',
      'https://',
      'ftp://'
    ]) {
      expect(linkHref('url', value), value).toBe('')
    }
    expect(linkHref('doi', 'not a doi')).toBe('')
    expect(linkHref('email', 'not an email')).toBe('')
    expect(linkHref('email', 'mailto:')).toBe('')
  })
})

describe('CATALOG_NOTES', () => {
  it('describes exactly the catalogs the schema has', () => {
    expect(Object.keys(CATALOG_NOTES).sort()).toEqual(SPEC.catalogs.map((c) => c.name).sort())
  })
})
