import { describe, expect, it } from 'vitest'
import { openModel } from '../../qmrf/model.js'
import { newDocument } from '../../qmrf/newDocument.js'
import { buildOutline, emptyCounts, totalOf } from '../../qmrf/outline.js'
import { SPEC } from '../../qmrf/spec.js'
import { validate } from '../../qmrf/validate.js'
import fixture from '../fixtures/qmrf-0.9-real.xml?raw'

/**
 * The outline is what the sidebar shows and what a click jumps by, so its contract is that nothing
 * goes missing: every finding lands in exactly one bucket, and every chapter and catalog the
 * document holds appears in the list.
 */

const model = openModel(fixture)
const report = validate(model)
const outline = buildOutline(model, report)

describe('buildOutline', () => {
  it('lists the chapters the document holds, each addressed once', () => {
    expect(outline.chapters.map((chapter) => chapter.address)).toEqual(
      SPEC.chapters.map((chapter) => `QMRF_chapters[0]/${chapter.name}[0]`)
    )
    expect(outline.chapters.map((chapter) => chapter.heading)).toEqual([
      '1. QSAR identifier',
      '2. General information',
      '3. Defining the endpoint - OECD Principle 1',
      '4. Defining the algorithm - OECD Principle 2',
      '5. Defining the applicability domain - OECD Principle 3',
      '6. Internal validation - OECD Principle 4',
      '7. External validation - OECD Principle 4',
      '8. Providing a mechanistic interpretation - OECD Principle 5',
      '9. Miscellaneous information',
      '10. Summary (JRC Inventory)'
    ])
    for (const chapter of outline.chapters) expect(chapter.occurrences).toBe(1)
  })

  it('marks the chapters the schema lets a document repeat', () => {
    expect(
      outline.chapters.filter((chapter) => chapter.repeated).map((chapter) => chapter.name)
    ).toEqual(['QSAR_Applicability_domain', 'QSAR_Predictivity'])
  })

  it('lists the catalogs with their entry counts', () => {
    expect(outline.catalogs.map((catalog) => [catalog.name, catalog.entries])).toEqual([
      ['software_catalog', 3],
      ['algorithms_catalog', 1],
      ['descriptors_catalog', 6],
      ['endpoints_catalog', 1],
      ['publications_catalog', 5],
      ['authors_catalog', 6]
    ])
    expect(outline.catalogs.map((catalog) => catalog.label)).toEqual(
      SPEC.catalogs.map((catalog) => catalog.label)
    )
  })
})

describe('issue counts', () => {
  it('place every finding in exactly one bucket', () => {
    expect(totalOf(outline)).toEqual(report.counts)
    expect(report.counts.error).toBe(0)
  })

  it('puts the version drift on the document and a field drift on its chapter', () => {
    // The document declares 0.9 while the DTD fixes 3.0, which is a finding about the file rather
    // than about a field; the two drifted `name` attributes belong to whoever holds the field.
    expect(outline.document.warning).toBeGreaterThan(0)
    const drifts = report.issues.filter((issue) => issue.code === 'fixed-attr-drift')
    expect(drifts.length).toBeGreaterThan(1)
    for (const issue of drifts) {
      const chapter = issue.path.split('/')[1]?.replace(/\[\d+]$/, '') ?? ''
      const bucket = outline.chapters.find((entry) => entry.name === chapter)
      expect(bucket?.counts.warning, issue.path).toBeGreaterThan(0)
    }
  })

  it('says nothing is wrong with a document that has nothing wrong with it', () => {
    const fresh = newDocument()
    const clean = buildOutline(fresh, validate(fresh))
    expect(clean.chapters).toHaveLength(SPEC.chapters.length)
    expect(clean.catalogs).toHaveLength(SPEC.catalogs.length)
    expect(totalOf(clean)).toEqual(emptyCounts())
    for (const chapter of clean.chapters) expect(chapter.counts).toEqual(emptyCounts())
    // Only the two authors a document cannot be valid without are seeded.
    expect(clean.catalogs.map((catalog) => [catalog.name, catalog.entries])).toEqual([
      ['software_catalog', 0],
      ['algorithms_catalog', 0],
      ['descriptors_catalog', 0],
      ['endpoints_catalog', 0],
      ['publications_catalog', 0],
      ['authors_catalog', 2]
    ])
  })

  it('survives a document with no report yet', () => {
    expect(totalOf(buildOutline(model))).toEqual(emptyCounts())
  })
})
