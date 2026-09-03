import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Header from '../components/Header.jsx'
import ReportView from '../components/ReportView.jsx'
import Sidebar from '../components/Sidebar.jsx'
import { EditorProvider, useEditor } from '../context/EditorContext.jsx'
import { ViewerConfigProvider } from '../context/ViewerConfig.jsx'
import { formatDate } from '../qmrf/dates.js'
import { saveModel } from '../qmrf/model.js'
import fixture from './fixtures/qmrf-0.9-real.xml?raw'

/**
 * The field editors, driven the way a reader drives them.
 *
 * These run through the real shell rather than against the components directly, because the things
 * that broke in the wild are shell-shaped: an edit that throws the reader back to the first chapter,
 * and an "add" button that quietly does nothing. Both are only observable with a document, a
 * provider and a report on screen.
 *
 * Every assertion about what was *written* is made against the bytes `saveModel` would put in the
 * file, not against component state — a model the viewer renders but cannot serialise is not an edit.
 */

const CH = 'QMRF_chapters[0]'
const TITLE = `${CH}/QSAR_identifier[0]/QSAR_title[0]`
const CREATED = `${CH}/QSAR_General_information[0]/qmrf_date[0]`
const REVISED = `${CH}/QSAR_General_information[0]/qmrf_date_revision[0]`
const BARE_DATE = `${CH}/QMRF_Summary[0]/date_publication[0]`
const AVAILABILITY = `${CH}/QSAR_Robustness[0]/training_set_availability[0]`
const INFORMATION = `${CH}/QSAR_Robustness[0]/training_set_data[0]`
const ENDPOINT = `${CH}/QSAR_Endpoint[0]/model_endpoint[0]`
const BIBLIOGRAPHY = `${CH}/QSAR_Miscelaneous[0]/bibliography[0]`
const TRAINING = `${CH}/QSAR_Miscelaneous[0]/attachments[0]/attachment_training_data[0]`

/** The same document with its endpoint catalog taken out — the case an "add" has to explain. */
const NO_ENDPOINT_CATALOG = fixture.replace(/<endpoints_catalog>[\s\S]*?<\/endpoints_catalog>/, '')

/** @type {import('../qmrf/model.js').Model|null} */
let open = null

function Shell() {
  const { doc, reportRef } = useEditor()
  return (
    <>
      <Header />
      <div className="qmrf-layout">
        <Sidebar />
        {/* The shape a host embed has: the viewer's report inside a panel that scrolls. Which of
            the two scrolls is exactly what the scroll-keeping has to work out for itself. (The two
            longhands rather than the shorthand: jsdom does not expand `overflow`.) */}
        <div className="qmrf-host" style={{ overflowX: 'auto', overflowY: 'auto' }}>
          <div className="qmrf-report-area" ref={reportRef}>
            {doc.model ? <ReportView model={doc.model} /> : null}
          </div>
        </div>
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

const scrollIntoView = vi.fn()

beforeEach(() => {
  Element.prototype.scrollIntoView = scrollIntoView
  scrollIntoView.mockClear()
  open = null
})

afterEach(() => {
  delete (/** @type {any} */ (Element.prototype).scrollIntoView)
})

/** Open the editors, the way a reader does. */
function editOn() {
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
}

/** @returns {HTMLElement} the rendered field, addressed the way the editor addresses it */
function field(/** @type {string} */ address) {
  const node = /** @type {HTMLElement|null} */ (
    document.querySelector(`[data-qmrf-path="${address}"]`)
  )
  if (!node) throw new Error(`the report has nothing at ${address}`)
  return node
}

/**
 * The pointer rows one reference field currently shows.
 * @returns {HTMLElement[]}
 */
function rows(/** @type {string} */ address) {
  // Cast rather than a type argument: in a `.jsx` file, `querySelectorAll<HTMLElement>(...)` reads
  // as a JSX element to both the checker and the formatter.
  const found = field(address).querySelectorAll('.qmrf-edit-item')
  return Array.from(/** @type {NodeListOf<HTMLElement>} */ (found))
}

/**
 * One entry out of a list, named by its position when it is not there.
 *
 * The assertions here are all about *which* row did something, so a missing row should read as
 * "row 1 of this field is missing" rather than as a `TypeError` about `undefined`.
 * @template {Element} T
 * @param {T[]} list
 * @param {number} index
 * @returns {T}
 */
function at(/** @type {T[]} */ list, /** @type {number} */ index) {
  const item = list[index]
  if (!item) throw new Error(`nothing at row ${index} of ${list.length}`)
  return item
}

function saved() {
  if (!open) throw new Error('no document is open')
  return saveModel(open)
}

function dirty() {
  return Boolean(document.querySelector('.qmrf-dirty'))
}

function documentTitle() {
  return document.querySelector('.qmrf-document-title')?.textContent ?? ''
}

/** @returns {HTMLElement} */
function richBox(/** @type {string} */ address) {
  const box = /** @type {HTMLElement|null} */ (field(address).querySelector('.qmrf-rich-body'))
  if (!box) throw new Error(`${address} has no rich-text editor`)
  return box
}

describe('the mode switch', () => {
  it('leaves the report a report until the reader asks to work on it', () => {
    render(<Harness />)
    expect(document.querySelector('.qmrf-rich')).toBeNull()

    editOn()
    expect(richBox(TITLE)).not.toBeNull()
    // One answer per field: while it is being written, the reading view of that field is gone.
    expect(field(TITLE).querySelector('.qmrf-field-body')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'View' }))
    expect(document.querySelector('.qmrf-rich')).toBeNull()
    expect(field(TITLE).querySelector('.qmrf-field-body')).not.toBeNull()
  })

  it('offers no way to switch to a host that forbids writing', () => {
    render(<Harness readOnly />)
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'View' })).toBeNull()
    expect(document.querySelector('.qmrf-rich')).toBeNull()
  })
})

describe('a rich-text field', () => {
  it('writes a paragraph back through the envelope, and nothing when nothing changed', () => {
    render(<Harness />)
    editOn()
    const box = richBox(TITLE)
    expect(box.textContent).toContain('QSAR for acute toxicity to fish')
    expect(field(TITLE).querySelectorAll('.qmrf-rich-tools button')).toHaveLength(5)

    // A focus that changes nothing must not cost an undo step, nor mark the document unsaved.
    fireEvent.focus(box)
    fireEvent.blur(box)
    expect(dirty()).toBe(false)

    fireEvent.focus(box)
    box.innerHTML = '<p>Renamed by hand</p>'
    fireEvent.blur(box)
    expect(documentTitle()).toBe('Renamed by hand')
    // The value goes back into the file the way it came out: as an HTML document escaped as text.
    expect(saved()).toContain('&lt;p&gt;Renamed by hand&lt;/p&gt;')
    // One edit, one step: undo returns the file the document was opened from.
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(documentTitle()).toContain('QSAR for acute toxicity to fish')
    expect(dirty()).toBe(false)
  })

  it('refuses to store markup the viewer itself would refuse to show', () => {
    render(<Harness />)
    editOn()
    const box = richBox(TITLE)
    fireEvent.focus(box)
    box.innerHTML =
      '<p>Kept</p><iframe src="https://evil.example"></iframe><script>window.stolen=1</script>' +
      '<a href="https://example" target="_blank">a link</a>'
    fireEvent.blur(box)
    expect(saved()).toContain('Kept')
    expect(saved()).not.toContain('iframe')
    expect(saved()).not.toContain('window.stolen')
    // What survives is stored with the viewer's own link hardening already on it.
    expect(saved()).toContain('rel="noopener noreferrer"')
    expect(box.querySelector('iframe')).toBeNull()
  })

  it('takes a paste as words, not as whatever the clipboard also carried', () => {
    render(<Harness />)
    editOn()
    const box = richBox(TITLE)
    // `fireEvent` returns false when the handler cancelled the event, which is the whole of the
    // assertion: the browser's own HTML insertion is what we are declining.
    const handled = fireEvent.paste(box, { clipboardData: { getData: () => 'plain words' } })
    expect(handled).toBe(false)
  })
})

describe('a date field', () => {
  it('fills Today in the format the document already uses', () => {
    render(<Harness />)
    editOn()
    const created = field(CREATED)
    expect(within(created).getByRole('textbox', { name: 'Date' })).toHaveValue('29.06.2009')
    expect(created.textContent).toContain('this document writes dd.MM.yyyy')

    fireEvent.click(within(created).getByRole('button', { name: 'Today' }))
    const today = formatDate(new Date(), 'dd.MM.yyyy')
    expect(within(field(CREATED)).getByRole('textbox', { name: 'Date' })).toHaveValue(today)
    expect(saved()).toContain(today)
  })

  it('leaves a date nobody touched exactly as it was written', () => {
    render(<Harness />)
    editOn()
    // An edit to chapter 10's date touches one field: 2.1 and 2.6 keep both their value and the
    // envelope they arrived in, which is the whole of the fidelity promise.
    fireEvent.click(within(field(BARE_DATE)).getByRole('button', { name: 'Today' }))
    expect(saved()).toContain('29.06.2009')
    expect(saved()).toContain('20.06.2009')
  })

  it('keeps a bare field bare and an enveloped field enveloped', () => {
    render(<Harness />)
    editOn()
    const dateBox = () =>
      /** @type {HTMLInputElement} */ (
        within(field(BARE_DATE)).getByRole('textbox', { name: 'Date' })
      )
    // 10.2 came in as bare, year-first text from the inventory importer. It goes back out bare and
    // in the same shape: an editor that always wrapped would rewrite the field as well as its value,
    // and one that always used one date format would rewrite that too.
    const before = dateBox().value
    expect(before).toMatch(/^2009.12.03$/)
    expect(field(BARE_DATE).textContent).toContain('this document writes yyyy')

    fireEvent.click(within(field(BARE_DATE)).getByRole('button', { name: 'Today' }))
    const after = dateBox().value
    expect(after).not.toBe(before)
    expect(after).toHaveLength(before.length)
    expect(after.at(4)).toBe(before.at(4))
    // One line of text, no `<html>` envelope introduced into a field that never had one.
    expect(saved()).toMatch(/<date_publication[^>]*>[^<]+<\/date_publication>/)

    // 2.3 holds an empty envelope, so a date typed into it goes back inside one.
    expect(field(REVISED).textContent).toContain('no date here yet')
    fireEvent.change(within(field(REVISED)).getByRole('textbox', { name: 'Date' }), {
      target: { value: '03.07.2026' }
    })
    fireEvent.blur(within(field(REVISED)).getByRole('textbox', { name: 'Date' }))
    expect(saved()).toMatch(/<qmrf_date_revision[^>]*>&lt;html&gt;[\s\S]*?03\.07\.2026/)
  })
})

describe('a question field', () => {
  it('answers with the attribute the schema asks for', () => {
    render(<Harness />)
    editOn()
    expect(saved()).toContain('answer="Yes"')
    fireEvent.click(within(field(AVAILABILITY)).getByRole('radio', { name: 'No' }))
    expect(saved()).toContain('answer="No"')
    // The four-answer questions offer the four the DTD lists, not Yes/No.
    const answers = within(field(`${CH}/QSAR_Robustness[0]/training_set_descriptors[0]`))
      .getAllByRole('radio')
      .map((input) => input.getAttribute('value'))
    expect(answers).toEqual(['All', 'Some', 'No', 'Unknown'])
  })

  it('writes a flag the document never carried, rather than leaving the hole', () => {
    render(<Harness />)
    editOn()
    // 6.2 of a 2009 document predates `nanomaterial`, so it declares nothing about it.
    expect(saved()).not.toContain('nanomaterial')
    fireEvent.click(within(field(INFORMATION)).getByRole('checkbox', { name: 'Nanomaterials' }))
    expect(saved()).toContain('nanomaterial="Yes"')
    // An unchecked box is a No, not a silence: these attributes are required.
    fireEvent.click(within(field(INFORMATION)).getByRole('checkbox', { name: 'Chemical names' }))
    expect(saved()).toContain('chemname="No"')
  })
})

describe('a pointer into a catalog', () => {
  it('shows each citation as the entry it names and lets the reader change it', () => {
    render(<Harness />)
    editOn()
    const found = rows(BIBLIOGRAPHY)
    expect(found).toHaveLength(3)
    expect(at(found, 0).textContent).toContain('US EPA ECOTox Database')

    fireEvent.change(within(at(found, 0)).getByRole('combobox', { name: /^Entry cited by/ }), {
      target: { value: 'publications_catalog_7' }
    })
    expect(at(rows(BIBLIOGRAPHY), 0).textContent).toContain(
      'QSAR study of pharmacological permeabilities'
    )
  })

  it('writes the extra attribute the schema allows on a pointer', () => {
    render(<Harness />)
    editOn()
    const number = within(at(rows(BIBLIOGRAPHY), 0)).getByRole('textbox', { name: 'number' })
    fireEvent.change(number, { target: { value: '12' } })
    fireEvent.blur(number)
    expect(saved()).toContain('number="12"')
  })

  it('cites the entry on offer without waiting for a choice to be made', () => {
    render(<Harness />)
    editOn()
    const cite = within(field(BIBLIOGRAPHY)).getByRole('combobox', { name: 'Cite' })
    // Chosen before the reader touches it, so the button beside it can never be waiting on nothing.
    expect(cite).toHaveValue('publications_catalog_6')
    fireEvent.click(within(field(BIBLIOGRAPHY)).getByRole('button', { name: 'Cite entry' }))
    expect(rows(BIBLIOGRAPHY)).toHaveLength(4)
    expect(saved()).toContain('idref="publications_catalog_6"')
  })

  it('mints a new entry, cites it, and says where it put it', () => {
    render(<Harness />)
    editOn()
    fireEvent.click(
      within(field(BIBLIOGRAPHY)).getByRole('button', { name: 'New publications entry' })
    )
    expect(saved()).toContain('id="publications_catalog_10"')
    expect(rows(BIBLIOGRAPHY)).toHaveLength(4)
    expect(within(field(BIBLIOGRAPHY)).getByRole('status').textContent).toContain(
      'publications_catalog_10'
    )
  })

  it('stops citing without touching the entry it pointed at', () => {
    render(<Harness />)
    editOn()
    fireEvent.click(within(at(rows(BIBLIOGRAPHY), 1)).getByRole('button', { name: 'Remove' }))
    expect(rows(BIBLIOGRAPHY)).toHaveLength(2)
    expect(saved()).not.toContain('idref="publications_catalog_8"')
    // The entry itself is the catalog's, and the catalog still has it.
    expect(saved()).toContain('id="publications_catalog_8"')
  })
})

describe('the endpoint vocabulary', () => {
  /** @returns {HTMLElement} */
  function picker() {
    const node = /** @type {HTMLElement|null} */ (field(ENDPOINT).querySelector('.qmrf-picker'))
    if (!node) throw new Error('the endpoint field has no vocabulary picker')
    return node
  }

  it('has something to add before the reader has typed a word', () => {
    render(<Harness />)
    editOn()
    expect(within(picker()).getByRole('combobox', { name: 'Endpoint to add' })).toHaveValue(
      'endpoint1_340'
    )
    expect(within(picker()).getByRole('button', { name: 'Add endpoint' })).toBeEnabled()
    expect(picker().textContent).toContain('347 of 347 terms')
  })

  it('mints the term as an entry and points the field at it, in one undo step', () => {
    render(<Harness />)
    editOn()
    fireEvent.click(within(picker()).getByRole('button', { name: 'Add endpoint' }))
    // The vocabulary's own id, so two documents that mean the same effect say the same thing.
    expect(saved()).toContain('id="endpoint1_340"')
    expect(saved()).toContain('QMRF 1. 1. Melting point')
    expect(
      document.querySelectorAll(`[data-qmrf-path="${ENDPOINT}/endpoint_ref[1]"]`)
    ).toHaveLength(1)

    // Entry and pointer were one write, so one step takes both back.
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(saved()).not.toContain('endpoint1_340')
    expect(rows(ENDPOINT)).toHaveLength(1)
  })

  it('narrows to what the reader typed and keeps the choice inside the narrowing', () => {
    render(<Harness />)
    editOn()
    fireEvent.change(within(picker()).getByRole('searchbox', { name: /endpoint vocabulary/ }), {
      target: { value: 'melting' }
    })
    const select = within(picker()).getByRole('combobox', { name: 'Endpoint to add' })
    const ids = Array.from(select.querySelectorAll('option'))
      .map((option) => option.value)
      .filter(Boolean)
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.length).toBeLessThan(347)
    expect(select).toHaveValue(ids[0])
    expect(picker().textContent).toContain(`${ids.length} of 347 terms`)
  })

  it('says there is nothing to add when the search found nothing', () => {
    render(<Harness />)
    editOn()
    fireEvent.change(within(picker()).getByRole('searchbox', { name: /endpoint vocabulary/ }), {
      target: { value: 'zzzzz' }
    })
    expect(within(picker()).getByRole('button', { name: 'Add endpoint' })).toBeDisabled()
    expect(picker().textContent).toContain('0 of 347 terms')
    expect(rows(ENDPOINT)).toHaveLength(1)
  })

  it('writes the catalog the document skipped, and cites the term into it', () => {
    render(<Harness xml={NO_ENDPOINT_CATALOG} />)
    editOn()
    // The picker's 347 terms are outside the document either way. What the document lacks is a place
    // to mint one — and `<!ELEMENT QMRF (QMRF_chapters,Catalogs)>` requires that place, so the add
    // writes the catalog the file skipped rather than refusing a term nobody can record.
    expect(saved()).not.toContain('<endpoints_catalog>')
    expect(within(picker()).getByRole('button', { name: 'Add endpoint' })).toBeEnabled()
    fireEvent.click(within(picker()).getByRole('button', { name: 'Add endpoint' }))

    expect(saved()).toContain('<endpoints_catalog>')
    expect(saved()).toContain('id="endpoint1_340"')
    expect(saved()).toContain('QMRF 1. 1. Melting point')
    expect(rows(ENDPOINT)).toHaveLength(2)

    // Entry, pointer and the element that holds them were one write, so one step takes all three.
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(saved()).not.toContain('endpoint1_340')
    expect(saved()).not.toContain('<endpoints_catalog>')
    expect(rows(ENDPOINT)).toHaveLength(1)
  })
})

describe('an attachment slot', () => {
  /** @returns {HTMLElement[]} every file row the slot currently shows */
  function fileRows() {
    const found = field(TRAINING).querySelectorAll('.qmrf-attachment-edit')
    return Array.from(/** @type {NodeListOf<HTMLElement>} */ (found))
  }

  /** @returns {HTMLElement} the slot's first file row */
  function firstRow() {
    return at(fileRows(), 0)
  }

  it('edits the four attributes a file row has', () => {
    render(<Harness />)
    editOn()
    const url = () =>
      /** @type {HTMLInputElement} */ (within(firstRow()).getByRole('textbox', { name: 'url' }))
    expect(url().value).toContain('Danio rerio training_61.sdf')

    fireEvent.change(url(), { target: { value: 'https://example.org/training.sdf' } })
    fireEvent.blur(url())
    expect(saved()).toContain('https://example.org/training.sdf')
    expect(saved()).not.toContain('qmrf136_Danio rerio training_61.sdf')

    fireEvent.click(within(firstRow()).getByRole('checkbox', { name: 'embedded in the document' }))
    expect(saved()).toContain('embedded="Yes"')
  })

  it('adds a row and takes it away again', () => {
    render(<Harness />)
    editOn()
    fireEvent.click(within(field(TRAINING)).getByRole('button', { name: 'Add file' }))
    expect(fileRows()).toHaveLength(2)
    const added = at(fileRows(), 1)
    // A new row arrives empty-handed but fully formable: url, filetype and description.
    expect(
      within(added)
        .getAllByRole('textbox')
        .map((input) => input.getAttribute('aria-label'))
    ).toEqual(['url', 'filetype', 'description'])

    fireEvent.click(within(added).getByRole('button', { name: 'Remove file' }))
    expect(fileRows()).toHaveLength(1)
    expect(saved()).toContain('Danio rerio training_61')
  })
})

describe('a chapter the schema repeats', () => {
  it('adds a second applicability domain and takes it away again', () => {
    render(<Harness />)
    editOn()
    expect(document.querySelectorAll('.qmrf-chapter')).toHaveLength(10)
    // One block each, so there is nothing here that may be removed.
    expect(screen.queryByRole('button', { name: /^Remove this block$/ })).toBeNull()

    fireEvent.click(
      screen.getByRole('button', { name: /^Another Defining the applicability domain/ })
    )
    expect(document.querySelectorAll('.qmrf-chapter')).toHaveLength(11)
    // Both blocks now say which of the two they are, in the order the document holds them.
    expect(
      Array.from(document.querySelectorAll('.qmrf-occurrence')).map((node) => node.textContent)
    ).toEqual(['1 of 2', '2 of 2'])
    // The new block is a chapter, not a blank: the schema's fixed attributes came with it.
    expect(saved()).toContain('<QSAR_Applicability_domain chapter="5"')

    const remove = screen.getAllByRole('button', { name: /^Remove this block$/ })
    expect(remove).toHaveLength(2)
    fireEvent.click(at(remove, 1))
    expect(document.querySelectorAll('.qmrf-chapter')).toHaveLength(10)
  })

  it('says which chapter 7 is which once there are two', () => {
    render(<Harness />)
    editOn()
    fireEvent.click(screen.getByRole('button', { name: /^Another External validation/ }))
    expect(document.querySelectorAll('.qmrf-chapter')).toHaveLength(11)
    expect(document.querySelectorAll('.qmrf-occurrence')).toHaveLength(2)
    expect(
      Array.from(document.querySelectorAll('.qmrf-occurrence')).map((n) => n.textContent)
    ).toEqual(['1 of 2', '2 of 2'])
  })
})

describe('keeping the reader where they were', () => {
  it('puts the scroll position back after an edit, in the container that was scrolling', () => {
    render(<Harness />)
    editOn()
    const host = /** @type {HTMLElement|null} */ (document.querySelector('.qmrf-host'))
    if (!host) throw new Error('no scrollable host panel')

    // A stand-in for a laid-out page: the panel has content sticking out of it and is scrolled down,
    // and — as a browser does when content above the fold is replaced — it loses that position the
    // moment the document title changes. A restore that ran too early would read the stale 240; one
    // that ran too late would find 0 and leave the reader at the top.
    let position = 240
    /** @type {[number, number, string][]} */
    const restored = []
    Object.defineProperties(host, {
      scrollTop: {
        configurable: true,
        get: () => (documentTitle() === 'Renamed by hand' ? 0 : position),
        set: (/** @type {number} */ top) => {
          position = top
        }
      },
      scrollLeft: { configurable: true, get: () => 0 },
      scrollHeight: { configurable: true, get: () => 5000 },
      clientHeight: { configurable: true, get: () => 400 },
      scrollTo: {
        configurable: true,
        value: (/** @type {number} */ left, /** @type {number} */ top) => {
          position = top
          restored.push([left, top, documentTitle()])
        }
      }
    })

    const box = richBox(TITLE)
    fireEvent.focus(box)
    box.innerHTML = '<p>Renamed by hand</p>'
    fireEvent.blur(box)

    expect(restored).toEqual([[0, 240, 'Renamed by hand']])
    expect(position).toBe(240)
    // And nothing asked for a jump: an edit is not a request to move.
    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})
