import { describe, expect, it } from 'vitest'
import {
  collectIds,
  collectReferences,
  formatPath,
  getAttr,
  getValue,
  insertOccurrence,
  openModel,
  parsePath,
  referencesTo,
  removeAttr,
  removeElement,
  renameId,
  saveModel,
  setAttr,
  setValue
} from '../../qmrf/model.js'
import { SPEC } from '../../qmrf/spec.js'
import { validate } from '../../qmrf/validate.js'
import fixture from '../fixtures/qmrf-0.9-real.xml?raw'

const P = parsePath

/**
 * The text up to / from the first occurrence of `marker`, for asserting that an edit left
 * everything outside the edited element byte-identical.
 */
function head(/** @type {string} */ text, /** @type {string} */ marker) {
  return text.slice(0, text.indexOf(marker))
}

function tail(/** @type {string} */ text, /** @type {string} */ marker) {
  return text.slice(text.indexOf(marker))
}

/**
 * Narrows an optional result so the assertions below read without casts.
 * @template T
 * @param {T} value
 * @param {string} what
 * @returns {Exclude<T, null | undefined>}
 */
function must(value, what) {
  if (value === null || value === undefined) throw new Error(`expected ${what}`)
  return /** @type {Exclude<T, null | undefined>} */ (value)
}

describe('fidelity of an edit', () => {
  const TITLE = P('QMRF_chapters[0]/QSAR_identifier[0]/QSAR_title[0]')

  it('changes only the edited element, leaving the rest byte-identical', () => {
    const model = openModel(fixture)
    const edited = saveModel(setValue(model, TITLE, '<p>Retitled</p>'))

    expect(edited).not.toBe(fixture)
    expect(head(edited, '<QSAR_title')).toBe(head(fixture, '<QSAR_title'))
    expect(tail(edited, '</QSAR_title>')).toBe(tail(fixture, '</QSAR_title>'))
    expect(getValue(openModel(edited), TITLE)).toBe('<p>Retitled</p>')
  })

  it('keeps the original attribute spelling of the edited element', () => {
    const model = openModel(fixture)
    const edited = saveModel(setValue(model, TITLE, '<p>Retitled</p>'))
    const line = edited.slice(
      edited.indexOf('<QSAR_title'),
      edited.indexOf('>', edited.indexOf('<QSAR_title')) + 1
    )
    expect(line).toBe('<QSAR_title chapter="1.1" help="" name="QSAR identifier (title)">')
  })

  it('re-escapes chapter text on the way out, so the value round-trips', () => {
    const model = openModel(fixture)
    const edited = setValue(model, TITLE, '<p style="margin-top: 0">A & B <i>styled</i></p>')
    const reopened = openModel(saveModel(edited))
    expect(getValue(reopened, TITLE)).toBe('<p style="margin-top: 0">A & B <i>styled</i></p>')
  })

  it('does not disturb the model when the path does not resolve', () => {
    const model = openModel(fixture)
    expect(setValue(model, P('QMRF_chapters[0]/NoSuch_field[0]'), 'x')).toBe(model)
    expect(setAttr(model, P('nope[0]'), 'answer', 'Yes')).toBe(model)
  })

  it('restores the original bytes when a value is set back', () => {
    const model = openModel(fixture)
    const question = P('QMRF_chapters[0]/QSAR_Robustness[0]/training_set_availability[0]')
    const edited = setAttr(model, question, 'answer', 'No')
    expect(getAttr(edited, question, 'answer')).toBe('No')
    expect(saveModel(edited)).not.toBe(fixture)

    // Writing the original value back must reproduce the original file: attribute order, spacing
    // and entity spelling may not drift just because an element was touched twice.
    expect(saveModel(setAttr(edited, question, 'answer', 'Yes'))).toBe(fixture)
  })

  it('survives a second editing session on the saved output', () => {
    const first = saveModel(
      setValue(openModel(fixture), P('QMRF_chapters[0]/QMRF_Summary[0]/keywords[0]'), 'fish; acute')
    )
    const reopened = openModel(first)
    expect(validate(reopened).counts.error).toBe(0)

    const second = saveModel(
      setValue(reopened, P('QMRF_chapters[0]/QMRF_Summary[0]/date_publication[0]'), '2026')
    )
    expect(head(second, '<QMRF_Summary')).toBe(head(first, '<QMRF_Summary'))
    expect(getValue(openModel(second), P('QMRF_chapters[0]/QMRF_Summary[0]/keywords[0]'))).toBe(
      'fish; acute'
    )
    expect(tail(second, '</keywords>')).toBe(tail(first, '</keywords>'))
  })
})

describe('attributes', () => {
  const FLAGS = P('QMRF_chapters[0]/QSAR_Robustness[0]/training_set_data[0]')
  const QUESTION = P('QMRF_chapters[0]/QSAR_Robustness[0]/training_set_availability[0]')

  it('reads and writes an answer flag', () => {
    const model = openModel(fixture)
    expect(getAttr(model, QUESTION, 'answer')).toBe('Yes')
    const edited = setAttr(model, QUESTION, 'answer', 'No')
    expect(getAttr(edited, QUESTION, 'answer')).toBe('No')
    // The original model is untouched: every edit is a copy.
    expect(getAttr(model, QUESTION, 'answer')).toBe('Yes')
  })

  it('adds an attribute the older document never carried', () => {
    const model = openModel(fixture)
    const flagIssue = (/** @type {import('../../qmrf/model.js').Model} */ m) =>
      validate(m).issues.find(
        (i) => i.attr === 'nanomaterial' && i.path.includes('QSAR_Robustness')
      )
    expect(getAttr(model, FLAGS, 'nanomaterial')).toBe('')
    expect(flagIssue(model)).toBeDefined()

    const edited = setAttr(model, FLAGS, 'nanomaterial', 'No')
    expect(flagIssue(edited)).toBeUndefined()
    expect(saveModel(edited)).toContain('nanomaterial="No"')
  })

  it('writes an empty attribute rather than dropping it', () => {
    const model = openModel(fixture)
    const edited = setAttr(model, QUESTION, 'answer', '')
    expect(saveModel(edited)).toMatch(/<training_set_availability[^>]*answer=""[^>]*\/>/)
  })
})

describe('repeatable elements', () => {
  const CHAPTERS = P('QMRF_chapters[0]')

  it('adds a repeatable chapter in sequence, labelled from the DTD', () => {
    const model = openModel(fixture)
    const added = must(
      insertOccurrence(model, CHAPTERS, 'QSAR_Applicability_domain'),
      'chapter 5 to be insertable'
    )

    expect(formatPath(added.path)).toBe('QMRF_chapters[0]/QSAR_Applicability_domain[1]')
    // Seeded from the DTD's own #FIXED attributes rather than a copy of them in this test.
    const chapter5 = must(
      SPEC.chapters.find((c) => c.name === 'QSAR_Applicability_domain'),
      'chapter 5 in the generated spec'
    )
    expect(getAttr(added.model, added.path, 'chapter')).toBe(chapter5.chapter)
    expect(getAttr(added.model, added.path, 'name')).toBe(chapter5.label)

    const out = saveModel(added.model)
    // Copied the file's own separator instead of jamming the new element against its neighbour.
    expect(out).toContain('\n<QSAR_Applicability_domain chapter="5"')
    expect(validate(added.model).issues.some((i) => i.code === 'out-of-order')).toBe(false)
    expect(head(out, '<QSAR_Applicability_domain')).toBe(
      head(fixture, '<QSAR_Applicability_domain')
    )
  })

  it('removes an element together with the blank line in front of it', () => {
    const model = openModel(fixture)
    const target = P('Catalogs[0]/software_catalog[0]/software[2]')
    const removedId = getAttr(model, target, 'id')
    expect(removedId).not.toBe('')

    const out = saveModel(removeElement(model, target))
    expect(out).not.toContain(`id="${removedId}"`)
    expect(occurrenceCount(out, '<software ')).toBe(2)

    const catalog = out.slice(out.indexOf('<software_catalog'), out.indexOf('</software_catalog>'))
    expect(catalog).not.toContain('\n\n')
    expect(head(out, '<software_catalog')).toBe(head(fixture, '<software_catalog'))
  })

  it('reports a dangling reference after deleting a referenced entry', () => {
    const model = openModel(fixture)
    const ref = must(
      collectReferences(model).find((r) => r.value !== '' && r.via === 'ref-element'),
      'a reference'
    )
    const victim = must(
      collectIds(model).find((e) => e.id === ref.value),
      'the referenced entry'
    )

    const edited = removeElement(model, victim.path)
    const report = validate(edited)
    expect(report.counts.error).toBeGreaterThan(0)
    expect(report.issues.some((i) => i.code === 'dangling-ref')).toBe(true)
  })
})

describe('identifiers', () => {
  it('renames an id and rewrites every pointer to it', () => {
    const model = openModel(fixture)
    const ref = must(
      collectReferences(model).find((r) => r.value !== ''),
      'a reference'
    )
    const updated = renameId(model, ref.value, 'renamed_entry')

    expect(validate(updated).issues.some((i) => i.code === 'dangling-ref')).toBe(false)
    expect(referencesTo(updated, 'renamed_entry').length).toBe(
      referencesTo(model, ref.value).length
    )
    expect(referencesTo(updated, ref.value)).toEqual([])
    expect(validate(updated).counts.error).toBe(0)
  })

  it('leaves a document with no such id alone', () => {
    const model = openModel(fixture)
    expect(renameId(model, 'not_present', 'other')).toBe(model)
  })
})

describe('dropping an attribute', () => {
  it('removes the attribute rather than leaving it blank', () => {
    const model = openModel(fixture)
    // Every descriptor in the published document carries `publication_ref=""` — upstream spells an
    // unfilled pointer that way. A control that answers "not cited" has to mean it.
    const entry = P('Catalogs[0]/descriptors_catalog[0]/descriptor[0]')
    expect(getAttr(model, entry, 'publication_ref')).toBe('')

    const cleared = removeAttr(model, entry, 'publication_ref')
    const line = saveModel(cleared)
      .split('\n')
      .find((row) => row.includes('descriptors_catalog_10'))
    expect(line).toBeDefined()
    expect(line).not.toContain('publication_ref')
    // The sibling rows keep theirs, spans and all — the edit is one attribute wide.
    expect(occurrenceCount(saveModel(cleared), 'publication_ref=""')).toBe(
      occurrenceCount(saveModel(model), 'publication_ref=""') - 1
    )
    expect(validate(cleared).counts.error).toBe(0)
  })

  it('writes the value back when it is given one', () => {
    const model = openModel(fixture)
    const entry = P('Catalogs[0]/descriptors_catalog[0]/descriptor[0]')
    const cited = setAttr(model, entry, 'publication_ref', 'publications_catalog_5')
    expect(getAttr(cited, entry, 'publication_ref')).toBe('publications_catalog_5')
    expect(saveModel(cited)).toContain('publication_ref="publications_catalog_5"')
    expect(validate(cited).counts.error).toBe(0)
    // And clearing what was just written returns to no attribute, not to `publication_ref=""`.
    expect(getAttr(removeAttr(cited, entry, 'publication_ref'), entry, 'publication_ref')).toBe('')
  })

  it('is a no-op on an attribute the element never carried', () => {
    const model = openModel(fixture)
    const entry = P('Catalogs[0]/descriptors_catalog[0]/descriptor[0]')
    const untouched = removeAttr(model, entry, 'not_an_attribute')
    expect(saveModel(untouched)).toBe(saveModel(model))
  })
})

function occurrenceCount(/** @type {string} */ text, /** @type {string} */ needle) {
  return text.split(needle).length - 1
}
