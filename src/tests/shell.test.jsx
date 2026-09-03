import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Header from '../components/Header.jsx'
import ReportView from '../components/ReportView.jsx'
import Sidebar from '../components/Sidebar.jsx'
import { EditorProvider, useEditor } from '../context/EditorContext.jsx'
import { ViewerConfigProvider } from '../context/ViewerConfig.jsx'
import { openModel, parsePath, setValue } from '../qmrf/model.js'
import { newDocumentText } from '../qmrf/newDocument.js'
import { SPEC } from '../qmrf/spec.js'
import { validate } from '../qmrf/validate.js'
import fixture from './fixtures/qmrf-0.9-real.xml?raw'

/**
 * The shell: the outline a reader navigates by, the header that says how the document scores, and
 * the tape a reader steps back along. These are rendered through the real providers, with the layout
 * the viewer itself builds, because the wiring — an address in the outline reaching an element in
 * the report — is the thing that breaks when a component is refactored apart from its context.
 */

const TITLE = parsePath('QMRF_chapters[0]/QSAR_identifier[0]/QSAR_title[0]')

function Shell({ children }) {
  const { doc, reportRef } = useEditor()
  return (
    <>
      <Header />
      <div className="qmrf-layout">
        <Sidebar />
        <div className="qmrf-report-area" ref={reportRef}>
          {doc.model ? <ReportView model={doc.model} /> : null}
        </div>
      </div>
      {children}
    </>
  )
}

/** Stands in for a field editor, which arrives in M4: the tape has to be testable before it has one. */
function EditTitle() {
  const { doc } = useEditor()
  return (
    <button
      type="button"
      onClick={() => {
        if (!doc.model) return
        doc.edit(setValue(doc.model, TITLE, '<p>Renamed model</p>'), { label: 'rename' })
      }}
    >
      Rename
    </button>
  )
}

/** @param {{xml?: string, children?: React.ReactNode}} props */
function Harness({ xml = fixture, children }) {
  return (
    <ViewerConfigProvider config={{ readOnly: false, uid: 'test' }}>
      <EditorProvider xml={xml}>
        <Shell>{children}</Shell>
      </EditorProvider>
    </ViewerConfigProvider>
  )
}

const scrollIntoView = vi.fn()

beforeEach(() => {
  // A test environment has no layout, so a jump cannot actually scroll; the shell asks for it, and
  // that is what is observable here.
  Element.prototype.scrollIntoView = scrollIntoView
  scrollIntoView.mockClear()
})

afterEach(() => {
  delete (/** @type {any} */ (Element.prototype).scrollIntoView)
})

/**
 * One row of the outline, named by the label the outline gives it.
 * @param {string} label
 */
function navItem(label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const item = screen.getAllByRole('button', { name: new RegExp(`^${escaped}(,|$)`) })[0]
  if (!item) throw new Error(`the outline has no row called ${label}`)
  return item
}

/**
 * The nth thing in a list, for the assertions that are about order rather than presence — the
 * outline's order is the document's own, which is what makes it worth checking.
 * @template T
 * @param {T[]} items
 * @param {number} index
 * @returns {T}
 */
function nth(items, index) {
  const item = items[index]
  if (item === undefined) throw new Error(`nothing at ${index} of ${items.length}`)
  return item
}

/** The report's own title, which is the visible proof that the tape moved the document. */
function documentTitle() {
  return document.querySelector('.qmrf-document-title')?.textContent ?? ''
}

/** @returns {HTMLElement} the viewer's own chrome — chip, tape, toolbar */
function header() {
  const node = /** @type {HTMLElement|null} */ (document.querySelector('.qmrf-header'))
  if (!node) throw new Error('the shell has no header')
  return node
}

/** @returns {HTMLElement[]} the findings currently on screen */
function findingRows() {
  return Array.from(
    /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.qmrf-finding'))
  )
}

/** Opens the findings list the way a reader does. @returns {HTMLElement[]} its rows */
function openFindings() {
  fireEvent.click(screen.getByRole('button', { name: /^Findings/ }))
  return findingRows()
}

describe('the outline', () => {
  it('lists the document, its chapters and its catalogs', () => {
    render(<Harness />)
    const items = screen.getAllByRole('button', { name: /finding|no findings/ })
    expect(items).toHaveLength(1 + SPEC.chapters.length + SPEC.catalogs.length)
    expect(nth(items, 1).textContent).toContain('1. QSAR identifier')
    expect(nth(items, items.length - 1).textContent).toContain('Authors')
    expect(screen.getByRole('navigation', { name: 'Document contents' })).toBeInTheDocument()
  })

  it('carries every finding the validator reported, once', () => {
    render(<Harness />)
    const report = validate(openModel(fixture))
    const badges = Array.from(document.querySelectorAll('.qmrf-nav-count')).map((node) =>
      Number(node.textContent)
    )
    expect(badges).toHaveLength(10)
    expect(badges.reduce((sum, count) => sum + count, 0)).toBe(report.issues.length)
    // The worst severity in a part colours its count, which is how the list says where to look.
    expect(document.querySelector('.qmrf-nav-count--error')).toBeNull()
    expect(document.querySelector('.qmrf-nav-count--warning')).not.toBeNull()
  })

  it('moves the reader to the chapter they asked for and remembers it', () => {
    render(<Harness />)
    // The outline names a chapter by the heading the document writes, drift included, so that is
    // the label the reader — and this test — has to reach it by.
    const chapter = '6. Internal validation - OECD Principle 4'
    fireEvent.click(navItem(chapter))
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(navItem(chapter)).toHaveAttribute('aria-current', 'true')
    expect(navItem('1. QSAR identifier')).not.toHaveAttribute('aria-current')
  })

  it('says what a catalog holds, and reaches the table it is talking about', () => {
    render(<Harness />)
    expect(navItem('Software').textContent).toContain('3 entries')
    expect(navItem('Endpoints').textContent).toContain('1 entry')
    fireEvent.click(navItem('Software'))
    // The catalog section carries its own address, so the outline jumps to the same kind of handle
    // it uses for chapters and fields rather than to an id another embed may own.
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(
      document.querySelector('[data-qmrf-path="Catalogs[0]/software_catalog[0]"]')
    ).not.toBeNull()
  })

  it('lists the catalogs a document lacks while its editor is open', () => {
    // A file that never wrote a `Catalogs` element. Reading it, there is nothing to list; working on
    // it, all six are, because the Add behind each row writes the missing element — so a row leads
    // somewhere instead of to a heading that is not in the report.
    const xml = fixture.replace(/\s*<Catalogs>[\s\S]*?<\/Catalogs>/, '')
    render(<Harness xml={xml} />)
    expect(screen.queryAllByRole('button', { name: /^Software(,|$)/ })).toHaveLength(0)
    expect(screen.queryAllByRole('button', { name: /^Publications(,|$)/ })).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(navItem('Software').textContent).toContain('0 entries')
    fireEvent.click(navItem('Publications'))
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(navItem('Publications')).toHaveAttribute('aria-current', 'true')
    expect(
      document.querySelector('[data-qmrf-path="Catalogs[0]/publications_catalog[0]"]')
    ).not.toBeNull()
  })
})

describe('the header', () => {
  it('summarises the report and takes the reader to the first finding', () => {
    render(<Harness />)
    // The findings list carries the same counts in its own toggle, so the chip is asked for where it
    // lives rather than by what it says.
    const chip = within(header()).getByRole('button', { name: /warning/ })
    expect(chip.textContent).toContain('warning')
    fireEvent.click(chip)
    // The published document's first warning is about its own declared version, so the jump lands on
    // the properties block, which is the document's own address.
    expect(navItem('Document')).toHaveAttribute('aria-current', 'true')
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
  })

  it('says a clean document is clean', () => {
    render(<Harness xml={newDocumentText()} />)
    expect(screen.getByRole('button', { name: 'no findings' })).toBeDisabled()
    expect(document.querySelectorAll('.qmrf-nav-count')).toHaveLength(0)
  })

  it('steps the tape back and forward as the document changes', () => {
    render(
      <Harness>
        <EditTitle />
      </Harness>
    )
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled()
    expect(document.querySelector('.qmrf-dirty')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Rename' }))
    expect(documentTitle()).toBe('Renamed model')
    // The unsaved change is what the save button's dot says, and nothing else.
    expect(document.querySelector('.qmrf-dirty')).not.toBeNull()
    const undo = screen.getByRole('button', { name: 'Undo' })
    expect(undo).toBeEnabled()

    fireEvent.click(undo)
    expect(documentTitle()).toContain('QSAR for acute toxicity to fish')
    expect(screen.getByRole('button', { name: 'Redo' })).toBeEnabled()
    // Back at the snapshot the file was opened from, so there is nothing left to save.
    expect(document.querySelector('.qmrf-dirty')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(documentTitle()).toBe('Renamed model')
    expect(document.querySelector('.qmrf-dirty')).not.toBeNull()
  })
})

describe('the findings list', () => {
  it('stays shut until the reader asks, then says everything', () => {
    render(<Harness />)
    const toggle = screen.getByRole('button', { name: /^Findings/ })
    const report = validate(openModel(fixture))
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(findingRows()).toHaveLength(0)

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    // Every finding, and nothing but: the outline counts them too, so the two have to agree.
    expect(findingRows()).toHaveLength(report.issues.length)
    const said = findingRows()
      .map((row) => row.textContent ?? '')
      .join('\n')
    // Three different shapes of row, all worded by the validator: the one about the file as a whole
    // (whose address is the empty one), one named by its field's DTD label, and one only the DTD's
    // required-attribute list could have produced.
    expect(said).toContain('This document')
    expect(said).toContain('4.7 Chemicals/Descriptors ratio')
    expect(said).toContain('nanomaterial is required on <training_set_data>')
  })

  it('moves the reader to the field a note was found in', () => {
    render(<Harness />)
    openFindings()
    const row = findingRows().find((r) => r.textContent?.includes('nanomaterial is required'))
    if (!row) throw new Error('no row about the Yes/No inventory')
    fireEvent.click(row)
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(
      document.querySelector(
        '[data-qmrf-path="QMRF_chapters[0]/QSAR_Robustness[0]/training_set_data[0]"]'
      )
    ).not.toBeNull()
  })

  it('opens itself when something is actually broken, and puts that first', () => {
    // A software entry loses its id, so the pointer in chapter 1.2 is left pointing at nothing.
    render(<Harness xml={fixture.replace('id="firstsoftware"', 'id="renamed"')} />)
    expect(screen.getByRole('button', { name: /^Findings/ })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
    const rows = findingRows()
    const first = rows[0]
    if (!first) throw new Error('the findings list opened but rendered no rows')
    expect(first).toHaveClass('qmrf-finding--error')
    expect(first.textContent).toContain('firstsoftware')
    expect(first.textContent).toContain('<software_ref>')
  })

  it('is not there at all when there is nothing to say', () => {
    render(<Harness xml={newDocumentText()} />)
    expect(document.querySelector('.qmrf-findings')).toBeNull()
  })
})

describe('printing', () => {
  // A QMRF is filed on paper — the printed report is what a dossier attaches — so the Print button is
  // a first-class action, and what it prints has to be the report rather than the editing form.
  it('prints the report, not the form it was being edited in', () => {
    const printed = vi.fn()
    vi.stubGlobal('print', printed)
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(document.querySelector('.qmrf-catalog-table')).toBeNull()

    fireEvent.click(within(header()).getByRole('button', { name: 'Print / PDF' }))
    expect(printed).toHaveBeenCalledTimes(1)
    // The read view is what the reader is left looking at, so the page and the screen agree.
    expect(screen.getByRole('button', { name: 'View' })).toHaveAttribute('aria-pressed', 'true')
    expect(document.querySelector('.qmrf-catalog-table')).not.toBeNull()
    vi.unstubAllGlobals()
  })

  it('is offered to a read-only viewer too', () => {
    // Printing is how most people use a viewer at all; needing write permission to hand in a PDF of
    // somebody else's model would be absurd.
    render(
      <ViewerConfigProvider config={{ readOnly: true, uid: 'test' }}>
        <EditorProvider xml={fixture}>
          <Shell>{null}</Shell>
        </EditorProvider>
      </ViewerConfigProvider>
    )
    expect(within(header()).getByRole('button', { name: 'Print / PDF' })).toBeEnabled()
    expect(within(header()).queryByRole('button', { name: 'Edit' })).toBeNull()
  })
})
