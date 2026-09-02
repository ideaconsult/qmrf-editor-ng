import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Header from '../components/Header.jsx'
import ReportView from '../components/ReportView.jsx'
import { EditorProvider, useEditor } from '../context/EditorContext.jsx'
import { ViewerConfigProvider } from '../context/ViewerConfig.jsx'
import { saveModel } from '../qmrf/model.js'
import fixture from './fixtures/qmrf-0.9-real.xml?raw'

/**
 * The catalogs, worked on.
 *
 * What is being defended here is the part an editor gets wrong quietly: an id that collides, a row
 * deleted out from under a chapter that still points at it, and an "add" that appears to do nothing.
 * So the assertions are made against the bytes `saveModel` would write, and the guard is checked
 * both ways — that a cited entry cannot go, and that the reader is told which field has to let go.
 *
 * @typedef {import('../qmrf/model.js').Model} Model
 */

/** @type {Model|null} */
let open = null

function Shell() {
  const { doc, reportRef } = useEditor()
  return (
    <>
      <Header />
      <div className="qmrf-report-area" ref={reportRef}>
        {doc.model ? <ReportView model={doc.model} /> : null}
      </div>
      <Probe />
    </>
  )
}

/** Hands the open model out to the assertions, which read it as saved text. */
function Probe() {
  const { doc } = useEditor()
  open = doc.model
  return null
}

/** @param {{xml?: string, readOnly?: boolean}} props */
function Harness({ xml = fixture, readOnly = false }) {
  return (
    <ViewerConfigProvider config={{ readOnly, uid: 'test' }}>
      <EditorProvider xml={xml}>
        <Shell />
      </EditorProvider>
    </ViewerConfigProvider>
  )
}

const SOFTWARE = 'Catalogs[0]/software_catalog[0]'
const ALGORITHMS = 'Catalogs[0]/algorithms_catalog[0]'
const AUTHORS = 'Catalogs[0]/authors_catalog[0]'
const PUBLICATIONS = 'Catalogs[0]/publications_catalog[0]'
const DESCRIPTORS = 'Catalogs[0]/descriptors_catalog[0]'
const ENDPOINTS = 'Catalogs[0]/endpoints_catalog[0]'

/** One entry, addressed the way the report addresses it. */
const row = (
  /** @type {string} */ catalogAddress,
  /** @type {string} */ element,
  /** @type {number} */ index
) => `${catalogAddress}/${element}[${index}]`

const scrollIntoView = vi.fn()

beforeEach(() => {
  Element.prototype.scrollIntoView = scrollIntoView
  scrollIntoView.mockClear()
  open = null
})

afterEach(() => {
  delete (/** @type {any} */ (Element.prototype).scrollIntoView)
})

function editOn() {
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
}

function saved() {
  if (!open) throw new Error('no document is open')
  return saveModel(open)
}

/** @returns {HTMLElement} one catalog's section */
function catalogBlock(/** @type {string} */ address) {
  const node = /** @type {HTMLElement|null} */ (
    document.querySelector(`[data-qmrf-path="${address}"]`)
  )
  if (!node) throw new Error(`the report has nothing at ${address}`)
  return node
}

/** @returns {HTMLElement[]} the entry rows a catalog currently shows */
function entryRows(/** @type {string} */ address) {
  const found = catalogBlock(address).querySelectorAll('.qmrf-catalog-entry')
  return Array.from(/** @type {NodeListOf<HTMLElement>} */ (found))
}

/** @returns {HTMLElement} one entry, named by its handle */
function entryById(/** @type {string} */ address, /** @type {string} */ id) {
  const found = entryRows(address).find((node) => node.textContent?.includes(id))
  if (!found) throw new Error(`${address} shows no entry called ${id}`)
  return found
}

/**
 * Open one entry's form, the way a reader does.
 * @returns {HTMLElement} the entry, with its fields mounted
 */
function openEntry(
  /** @type {string} */ address,
  /** @type {string} */ id,
  /** @type {string} */ name
) {
  fireEvent.click(within(catalogBlock(address)).getByRole('button', { name: `Edit ${id}` }))
  const found = entryById(address, name)
  // The form is only mounted once it is open, which is what keeps a catalog of a hundred
  // descriptors from mounting six hundred inputs.
  expect(within(found).getAllByRole('textbox').length).toBeGreaterThan(0)
  return found
}

/** @returns {HTMLElement} the row for a freshly added entry, by its minted id */
function addedEntry(
  /** @type {string} */ address,
  /** @type {string} */ element,
  /** @type {number} */ index,
  /** @type {string} */ id
) {
  const addressOf = row(address, element, index)
  const found = /** @type {HTMLElement|null} */ (
    document.querySelector(`[data-qmrf-path="${addressOf}"]`)
  )
  if (!found) throw new Error(`nothing was added at ${addressOf}`)
  expect(found.textContent).toContain(id)
  return found
}

describe('the catalog tables', () => {
  it('stay a table until the reader asks to work on them', () => {
    render(<Harness />)
    expect(document.querySelectorAll('.qmrf-catalog-table')).toHaveLength(6)
    expect(document.querySelectorAll('.qmrf-catalog-entry')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Add publication' })).toBeNull()
  })

  it('name each entry by what it is, and say who cites it', () => {
    render(<Harness />)
    editOn()
    const held = entryById(SOFTWARE, 'firstsoftware')
    expect(held.textContent).toContain('QSARModel 3.3.8')
    expect(held.textContent).toContain('In use, cited by')
    expect(held.textContent).toContain('1.3. Software coding the model')
    // Closed means closed: the fields are not in the document at all.
    expect(within(held).queryAllByRole('textbox')).toHaveLength(0)
    expect(entryRows(SOFTWARE)).toHaveLength(3)
  })

  it('offer the add control for every catalog, named by what it adds', () => {
    render(<Harness />)
    editOn()
    // Searched for inside each catalog, not the whole report: chapter 3.2 offers an "Add endpoint"
    // of its own, which is a picker into this catalog rather than the catalog's own add.
    /** @type {[string, string][]} */
    const adds = [
      [SOFTWARE, 'Add software'],
      [ALGORITHMS, 'Add algorithm'],
      [DESCRIPTORS, 'Add descriptor'],
      [ENDPOINTS, 'Add endpoint'],
      [PUBLICATIONS, 'Add publication'],
      [AUTHORS, 'Add author']
    ]
    for (const [address, name] of adds)
      expect(within(catalogBlock(address)).getByRole('button', { name })).toBeEnabled()
  })
})

describe('working on one entry', () => {
  it('edits an attribute where it lives', () => {
    render(<Harness />)
    editOn()
    const held = openEntry(AUTHORS, 'firstauthor', 'firstauthor')
    const name = within(held).getByRole('textbox', { name: 'name' })
    expect(/** @type {HTMLInputElement} */ (name).value).toBe('Indrek Tulp')

    fireEvent.change(name, { target: { value: 'Indrek Tulp-Kaljurand' } })
    fireEvent.blur(name)
    expect(saved()).toContain('name="Indrek Tulp-Kaljurand"')
    // The row it did not touch is untouched, blank attributes and all.
    expect(saved()).toContain('id="authors_catalog_3" name="Bilbo Baggins" number=""')
    expect(entryRows(AUTHORS)).toHaveLength(6)
  })

  it('points an entry at another catalog, and means it when told not to', () => {
    render(<Harness />)
    editOn()
    const held = openEntry(DESCRIPTORS, 'descriptors_catalog_10', 'descriptors_catalog_10')
    const ref = /** @type {HTMLSelectElement} */ (
      within(held).getByRole('combobox', { name: 'publication_ref' })
    )

    fireEvent.change(ref, { target: { value: 'publications_catalog_5' } })
    expect(saved()).toContain('publication_ref="publications_catalog_5"')
    expect(saved()).toContain('US EPA ECOTox Database')

    // "not cited" removes the attribute rather than leaving the empty one the fixture carries.
    fireEvent.change(ref, { target: { value: '' } })
    const line = saved()
      .split('\n')
      .find((text) => text.includes('descriptors_catalog_10'))
    expect(line).toBeDefined()
    expect(line).not.toContain('publication_ref')
  })

  it('is worth one undo step, however many keystrokes it took', () => {
    render(<Harness />)
    editOn()
    const held = openEntry(DESCRIPTORS, 'descriptors_catalog_12', 'descriptors_catalog_12')
    const units = within(held).getByRole('textbox', { name: 'units' })
    fireEvent.change(units, { target: { value: 'aromatic bonds' } })
    fireEvent.blur(units)
    expect(saved()).toContain('units="aromatic bonds"')

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(saved()).not.toContain('units="aromatic bonds"')
  })
})

describe('adding an entry', () => {
  it('mints an id, appends the row, and opens what it made', () => {
    render(<Harness />)
    editOn()
    fireEvent.click(
      within(catalogBlock(PUBLICATIONS)).getByRole('button', { name: 'Add publication' })
    )

    expect(saved()).toContain('id="publications_catalog_10"')
    expect(entryRows(PUBLICATIONS)).toHaveLength(6)
    const made = addedEntry(PUBLICATIONS, 'publication', 5, 'publications_catalog_10')
    // Open, because an entry with a minted id and nothing else is not finished: the required
    // attribute says so on its way to being filled.
    expect(within(made).getByRole('textbox', { name: 'title' })).toHaveAttribute('aria-describedby')
    expect(made.textContent).toContain('required by the schema')
    // No pointer names it yet, so nothing above the catalogs changed.
    expect(saved()).not.toContain('idref="publications_catalog_10"')
  })

  it('takes the whole thing back in one step', () => {
    render(<Harness />)
    editOn()
    fireEvent.click(within(catalogBlock(ENDPOINTS)).getByRole('button', { name: 'Add endpoint' }))
    expect(saved()).toContain('id="endpoints_catalog_4"')
    expect(entryRows(ENDPOINTS)).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(saved()).not.toContain('endpoints_catalog_4')
    expect(entryRows(ENDPOINTS)).toHaveLength(1)
  })

  it('removes the entry nothing cites, and leaves the catalog it came from alone', () => {
    render(<Harness />)
    editOn()
    fireEvent.click(within(catalogBlock(AUTHORS)).getByRole('button', { name: 'Add author' }))
    const made = addedEntry(AUTHORS, 'author', 6, 'authors_catalog_7')
    expect(within(made).getByRole('button', { name: 'Remove authors_catalog_7' })).toBeEnabled()

    fireEvent.click(within(made).getByRole('button', { name: 'Remove authors_catalog_7' }))
    expect(entryRows(AUTHORS)).toHaveLength(6)
    expect(saved()).not.toContain('authors_catalog_7')
    // The entry next to it is byte-for-byte what the file said.
    expect(saved()).toContain('id="authors_catalog_6" name="dragon Smaug"')
  })
})

describe('removing an entry that is cited', () => {
  it('refuses, and names the field that has to let go', () => {
    render(<Harness />)
    editOn()
    const held = entryById(ENDPOINTS, 'endpoints_catalog_3')
    expect(held.textContent).toContain('In use, cited by')
    expect(held.textContent).toContain('Remove the citation there to free this entry')
    // Named by the entry even though it does nothing, so the dead control a reader reached by hand
    // still tells them which entry it was about.
    const dead = within(held).getByRole('button', { name: 'Remove endpoints_catalog_3' })
    expect(dead).toBeDisabled()

    // And the refusal is real: clicking a dead button writes nothing.
    const before = saved()
    fireEvent.click(dead)
    expect(saved()).toBe(before)
  })

  it('takes the reader to the citation instead of leaving them to find it', () => {
    render(<Harness />)
    editOn()
    const held = entryById(SOFTWARE, 'software_catalog_2')
    fireEvent.click(
      within(held).getByRole('button', {
        name: '4.6. Software name and version for descriptor generation'
      })
    )
    expect(scrollIntoView).toHaveBeenCalled()
  })

  it('lets the entry go once the chapter stops naming it', () => {
    render(<Harness />)
    editOn()
    const before = entryRows(SOFTWARE)
    expect(before).toHaveLength(3)

    // 4.6 releases software_catalog_2, which is the only thing holding it.
    const pointer = /** @type {HTMLElement|null} */ (
      document.querySelector(
        '[data-qmrf-path="QMRF_chapters[0]/QSAR_Algorithm[0]/descriptors_generation_software[0]/software_ref[0]"]'
      )
    )
    if (!pointer) throw new Error('the report has no 4.6 pointer')
    fireEvent.click(within(pointer).getByRole('button', { name: 'Remove' }))

    const freed = entryById(SOFTWARE, 'software_catalog_2')
    expect(freed.textContent).not.toContain('In use')
    fireEvent.click(within(freed).getByRole('button', { name: 'Remove software_catalog_2' }))
    expect(entryRows(SOFTWARE)).toHaveLength(2)
    expect(saved()).not.toContain('id="software_catalog_2"')
  })
})

describe('a document whose catalog block is missing one', () => {
  it('shows no table for it and says what the pointers are pointing at', () => {
    // The authors catalog gone, while chapters 2.2 and 2.5 still name six people: the failure has to
    // be visible at the pointer, since there is no table left to fix it in.
    const xml = fixture.replace(/<authors_catalog>[\s\S]*?<\/authors_catalog>/, '')
    render(<Harness xml={xml} />)
    editOn()
    expect(() => catalogBlock(AUTHORS)).toThrow('the report has nothing at')
    expect(document.querySelectorAll('.qmrf-catalog')).toHaveLength(5)

    const field = document.querySelector(
      '[data-qmrf-path="QMRF_chapters[0]/QSAR_General_information[0]/qmrf_authors[0]"]'
    )
    if (!field) throw new Error('the report lost the QMRF authors field')
    expect(field.textContent).toContain('not in the catalog')
    // The five catalogs that are there are still editable.
    expect(entryRows(SOFTWARE)).toHaveLength(3)
    expect(
      within(catalogBlock(SOFTWARE)).getByRole('button', { name: 'Add software' })
    ).toBeEnabled()
  })
})
