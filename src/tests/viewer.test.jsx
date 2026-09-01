import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ReportView from '../components/ReportView.jsx'
import QMRFViewer from '../QMRFViewer.jsx'
import { openModel } from '../qmrf/model.js'
import { newDocumentText } from '../qmrf/newDocument.js'
import { SPEC } from '../qmrf/spec.js'
import fixture from './fixtures/qmrf-0.9-real.xml?raw'

/**
 * The viewer as a browser sees it: what the published document turns into, and — the part no
 * pure-data test can check — that a document's stored HTML becomes page content without becoming
 * page script. A QMRF file arrives from whoever wrote it and a host embeds this component into a
 * page it does not own, so the second half matters more than the first.
 */

const model = openModel(fixture)

/** The published document, as the report. */
function renderFixture() {
  return render(<ReportView model={model} />)
}

describe('ReportView on the published document', () => {
  it('shows every chapter the document holds, in the order it holds them', () => {
    const { container } = renderFixture()
    const chapters = Array.from(container.querySelectorAll('.qmrf-chapter'))
    expect(chapters.map((chapter) => chapter.querySelector('h3')?.textContent)).toEqual([
      '1. QSAR identifier',
      '2. General information',
      '3. Defining the endpoint - OECD Principle 1',
      '4. Defining the algorithm - OECD Principle 2',
      '5. Defining the applicability domain - OECD Principle 3',
      '6. Internal validation - OECD Principle 4',
      '7. External validation - OECD Principle 4',
      '8. Providing a mechanistic interpretation - OECD Principle 5',
      '9. Miscellaneous information',
      // This document's chapter 10 label drifted from today's schema; the heading says what the
      // document actually says, which is what `fixed-attr-drift` reports.
      '10. Summary (JRC Inventory)'
    ])
    expect(chapters.length).toBe(SPEC.chapters.length)
  })

  it('titles the report with the model title rather than with a heading', () => {
    const { container } = renderFixture()
    expect(container.querySelector('.qmrf-document-title')?.textContent).toContain(
      'QSAR for acute toxicity to fish'
    )
  })

  it('shows a pointer as the entry it names, never as an id', () => {
    const { container } = renderFixture()
    const refs = Array.from(container.querySelectorAll('.qmrf-ref'))
    // 22 pointers in the chapters of this document, every one of them naming a real entry.
    expect(refs).toHaveLength(22)
    expect(refs.some((ref) => ref.textContent?.includes('QSARModel 3.3.8'))).toBe(true)
    expect(refs.some((ref) => ref.textContent?.includes('Indrek Tulp'))).toBe(true)
    expect(refs.some((ref) => ref.textContent?.includes('firstauthor'))).toBe(false)
    expect(container.querySelectorAll('.qmrf-ref--missing')).toHaveLength(0)
  })

  it('lists an attachment slot as its files', () => {
    const { container } = renderFixture()
    const files = Array.from(container.querySelectorAll('.qmrf-attachment'))
    expect(files).toHaveLength(2)
    for (const file of files) {
      const link = /** @type {HTMLAnchorElement|null} */ (file.querySelector('a'))
      expect(link?.getAttribute('href')).toContain('download_attachment.jsp')
      expect(link?.getAttribute('target')).toBe('_blank')
      expect(file.textContent).toContain('sdf')
    }
    // The third slot of chapter 9.3 is absent in this document, so there is nothing to list.
    expect(container.querySelectorAll('.qmrf-attachments')).toHaveLength(2)
  })

  it('answers a question field with its answer and its inventory flags', () => {
    const { container } = renderFixture()
    // 6.2 is answered by its flags rather than by an `answer` attribute, which this document leaves
    // out — and it predates the nanomaterial flag, so it lists six of the seven.
    const question = container.querySelector(
      '[data-qmrf-path="QMRF_chapters[0]/QSAR_Robustness[0]/training_set_data[0]"]'
    )
    expect(question?.classList.contains('qmrf-field--question')).toBe(true)
    const flags = Array.from(question?.querySelectorAll('.qmrf-flags li') ?? [])
    expect(flags.map((flag) => flag.textContent)).toEqual([
      'Chemical names: Yes',
      'CAS numbers: Yes',
      'SMILES: No',
      'InChI codes: No',
      'MOL files: Yes',
      'Structural formula: No'
    ])
    // The other kind of question field — one with an `answer` attribute — prints it above its
    // content; this document answers most of them.
    expect(container.querySelectorAll('.qmrf-answer').length).toBeGreaterThan(3)
  })

  it('appends the six catalogs, without their internal id column', () => {
    const { container } = renderFixture()
    const catalogs = Array.from(container.querySelectorAll('.qmrf-catalog'))
    expect(catalogs).toHaveLength(SPEC.catalogs.length)
    expect(catalogs.map((catalog) => catalog.id)).toEqual(
      SPEC.catalogs.map((c) => `qmrf-${c.name}`)
    )
    const headings = Array.from(container.querySelectorAll('.qmrf-catalog-table th')).map(
      (cell) => cell.textContent
    )
    expect(headings).not.toContain('id')
    expect(headings).toContain('url')
    // The vocabulary is a picker here, so this document's one cited endpoint is its own row.
    const endpoints = catalogs.find((c) => c.id === 'qmrf-endpoints_catalog')
    expect(endpoints?.querySelectorAll('tbody tr')).toHaveLength(1)
    expect(endpoints?.textContent).toContain('Acute toxicity to fish')
  })

  it('addresses every chapter, field, pointer and row the way the editor addresses them', () => {
    const { container } = renderFixture()
    const paths = Array.from(
      container.querySelectorAll(
        '.qmrf-chapter, .qmrf-field, .qmrf-ref, .qmrf-attachment, .qmrf-catalog-table tbody tr'
      )
    ).map((node) => /** @type {HTMLElement} */ (node).dataset.qmrfPath)
    expect(paths.length).toBeGreaterThan(80)
    // One address per thing on screen: the M6 issue list scrolls to one of these, so an address
    // that named two of them would jump to the wrong place.
    expect(new Set(paths).size).toBe(paths.length)
    expect(paths[0]).toBe('QMRF_chapters[0]/QSAR_identifier[0]')
  })

  it('keeps a pointer addressed to itself and carries the entry it names alongside', () => {
    const { container } = renderFixture()
    const ref = /** @type {HTMLElement|null} */ (container.querySelector('.qmrf-ref'))
    expect(ref?.dataset.qmrfPath).toMatch(/_ref\[\d+]$/)
    expect(ref?.dataset.qmrfTarget).toContain('Catalogs[0]/')
    // The entry it names is exactly one row of the report, which is what a jump needs.
    expect(document.querySelectorAll(`[data-qmrf-path="${ref?.dataset.qmrfTarget}"]`).length).toBe(
      1
    )
  })
})

describe('ReportView on a document it has to repair', () => {
  it('says so when a pointer names nothing, rather than dropping the row', () => {
    const broken = newDocumentText().replace('idref="firstauthor"', 'idref="who_is_this"')
    const { container } = render(<ReportView model={openModel(broken)} />)
    const missing = container.querySelector('.qmrf-ref--missing')
    expect(missing?.textContent).toContain('who_is_this')
    expect(missing?.textContent).toContain('names no entry')
  })
})

describe('sanitising a document that is not trusted', () => {
  const hostile = `<?xml version="1.0" encoding="UTF-8"?>
<QMRF schema_version="1.0" version="3.0" name="x" author="a" date="today" contact="c" email="c@example.org" url="http://example.org">
<QMRF_chapters>
<QSAR_identifier chapter="1" name="QSAR identification">
<QSAR_title chapter="1.1" name="QSAR identifier (title)">&lt;html&gt;&lt;body&gt;&lt;p&gt;Real title&lt;/p&gt;&lt;script&gt;globalThis.__pwned = 'script'&lt;/script&gt;&lt;img src="x" onerror="globalThis.__pwned = 'img'"/&gt;&lt;iframe src="http://example.org/track"&gt;&lt;/iframe&gt;&lt;style&gt;body{display:none}&lt;/style&gt;&lt;a href="javascript:globalThis.__pwned='link'"&gt;click&lt;/a&gt;&lt;a href="http://example.org/paper" target="_blank"&gt;The paper&lt;/a&gt;&lt;/body&gt;&lt;/html&gt;</QSAR_title>
</QSAR_identifier>
</QMRF_chapters>
<Catalogs />
</QMRF>
`

  it('renders the words of a field and none of its execution', () => {
    const { container } = render(<ReportView model={openModel(hostile)} />)
    expect(screen.getByText('Real title')).toBeInTheDocument()
    expect(
      /** @type {typeof globalThis & {__pwned?: string}} */ (globalThis).__pwned
    ).toBeUndefined()
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('iframe')).toBeNull()
    expect(container.querySelector('style')).toBeNull()
    const live = Array.from(container.querySelectorAll('*')).filter((node) =>
      Array.from(node.attributes ?? []).some((attr) => /^on/i.test(attr.name))
    )
    expect(live.map((node) => node.outerHTML)).toEqual([])
    const hrefs = Array.from(container.querySelectorAll('a')).map((link) =>
      link.getAttribute('href')
    )
    expect(hrefs.filter((href) => href?.toLowerCase().startsWith('javascript:'))).toEqual([])
  })

  it('keeps a real link and stops it reaching back into the host page', () => {
    const { container } = render(<ReportView model={openModel(hostile)} />)
    const link = Array.from(container.querySelectorAll('a')).find((candidate) =>
      candidate.getAttribute('href')?.includes('/paper')
    )
    expect(link?.textContent).toBe('The paper')
    expect(link?.getAttribute('target')).toBe('_blank')
    expect(link?.getAttribute('rel')).toContain('noopener')
    expect(link?.getAttribute('rel')).toContain('noreferrer')
  })
})

describe('QMRFViewer', () => {
  it('opens the document it is handed', () => {
    render(<QMRFViewer xml={fixture} />)
    expect(screen.getByText('1. QSAR identifier')).toBeInTheDocument()
  })

  it('offers Open, and nothing that writes, to a read-only host', () => {
    render(<QMRFViewer xml={fixture} />)
    expect(screen.getByRole('button', { name: /^open/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^new/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /^save/i })).toBeNull()
  })

  it('offers New and Save once editing is allowed', () => {
    render(<QMRFViewer xml={fixture} readOnly={false} />)
    expect(screen.getByRole('button', { name: /new/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('offers Save, but not New, to a read-only host that handles saving', () => {
    render(<QMRFViewer xml={fixture} onSave={() => {}} />)
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /new/i })).toBeNull()
  })

  it('leaves the chrome out when the host brings its own', () => {
    render(<QMRFViewer xml={fixture} readOnly={false} showHeader={false} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('1. QSAR identifier')).toBeInTheDocument()
  })

  it('starts empty and says how to get a document in', () => {
    render(<QMRFViewer />)
    expect(screen.getByText(/no QMRF document loaded/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^open/i })).toBeInTheDocument()
  })

  it('reports a document it could not open instead of rendering nothing', () => {
    render(<QMRFViewer xml="a shopping list, not a QMRF document" />)
    const banner = screen.getByRole('alert')
    expect(banner.textContent).toContain('Could not open')
    expect(document.querySelector('.qmrf-report')).toBeNull()
  })

  it('opens a dropped file', async () => {
    const { container } = render(<QMRFViewer />)
    const root = container.querySelector('.qmrf-root')
    if (!root) throw new Error('the viewer rendered no root to drop on')
    const file = new File([fixture], 'qmrf.xml', { type: 'application/xml' })
    fireEvent.drop(root, { dataTransfer: { files: [file], types: ['Files'] } })
    expect(await screen.findByText('1. QSAR identifier')).toBeInTheDocument()
  })

  it('opens a picked file', async () => {
    const { container } = render(<QMRFViewer />)
    const input = container.querySelector('input[type=file]')
    if (!input) throw new Error('the toolbar rendered no file input')
    const file = new File([fixture], 'qmrf.xml', { type: 'application/xml' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    // No `value`: a file input's value may only be set to '', which is what the handler does with it
    // afterwards so that picking the same file twice still registers.
    fireEvent.change(input)
    expect(await screen.findByText('1. QSAR identifier')).toBeInTheDocument()
  })

  it('starts a new document when the user asks for one', () => {
    render(<QMRFViewer xml={fixture} readOnly={false} />)
    fireEvent.click(screen.getByRole('button', { name: /new/i }))
    // Ten chapters of an empty 3.0 skeleton rather than the published document's content.
    expect(document.querySelectorAll('.qmrf-chapter')).toHaveLength(SPEC.chapters.length)
    // A fresh document has no publications yet, unlike the published one.
    expect(document.querySelector('#qmrf-publications_catalog')?.textContent).toContain('Nothing')
  })
})
