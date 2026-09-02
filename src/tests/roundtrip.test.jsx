import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import QMRFViewer from '../QMRFViewer.jsx'
import { formatDate } from '../qmrf/dates.js'
import { openModel, saveModel } from '../qmrf/model.js'
import { validate } from '../qmrf/validate.js'
import fixture from './fixtures/qmrf-0.9-real.xml?raw'

/**
 * The whole loop, in one place: open the published document, edit it, take the edit back, put it
 * on again, hand the bytes to the host, and open those bytes as a new document.
 *
 * Each link is tested where it lives: the writer's byte fidelity in `qmrf/model.test.js`, the
 * editors against saved text in `editors.test.jsx`, the shell's chrome in `shell.test.jsx`. What
 * nothing tested until now is the join: that the text the **Save button** hands a host is a
 * document this viewer can open again, with the edit in it, the untouched parts byte-identical, and
 * nothing new broken. Rendering an edited model is not the same claim as a file that survives being
 * read back, and the file is the deliverable.
 */

const CREATED = 'QMRF_chapters[0]/QSAR_General_information[0]/qmrf_date[0]'

/** @param {string} address @returns {HTMLElement} */
function field(address) {
  const node = /** @type {HTMLElement|null} */ (
    document.querySelector(`[data-qmrf-path="${address}"]`)
  )
  if (!node) throw new Error(`the report renders no ${address}`)
  return node
}

/** 2.1's date box, asked for again each time: the field is rebuilt by every edit. */
function dateBox() {
  return /** @type {HTMLInputElement} */ (
    within(field(CREATED)).getByRole('textbox', { name: 'Date' })
  )
}

describe('the loop a document makes', () => {
  it('saves what it edited and opens it again', async () => {
    /** @type {string[]} */
    const handed = []
    const before = validate(openModel(fixture))
    const { unmount } = render(
      <QMRFViewer
        xml={fixture}
        readOnly={false}
        onSave={(text) => {
          handed.push(text)
        }}
      />
    )
    // Read as itself: the file declares a version this app does not ship, and says so.
    expect(document.querySelector('.qmrf-banner--drift')).not.toBeNull()
    expect(document.querySelector('.qmrf-banner--error')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(dateBox()).toHaveValue('29.06.2009')

    fireEvent.click(within(field(CREATED)).getByRole('button', { name: 'Today' }))
    const today = formatDate(new Date(), 'dd.MM.yyyy')
    expect(dateBox()).toHaveValue(today)

    // The tape, from the header rather than from the hook: what a reader actually steps on.
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(dateBox()).toHaveValue('29.06.2009')
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(dateBox()).toHaveValue(today)
    // The dot on Save: there is something the file does not have yet.
    expect(document.querySelector('.qmrf-dirty')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(handed).toHaveLength(1)
    const saved = handed[0] ?? ''
    // The host is handed the text at once, and the dot goes a step later: `onSave` may be a
    // promise, and a document is saved when someone has kept it, not when someone tried.
    await waitFor(() => expect(document.querySelector('.qmrf-dirty')).toBeNull())
    expect(saved).toContain(today)
    // The edit reached the bytes rather than only the screen: 2.1's date is written over, not kept
    // beside the new one. What nobody touched is still the file that came in: 2.6's date, chapter
    // 10.2's year-first one (written with slashes, as the importer wrote it), the title, and the
    // version the document declares.
    expect(saved).not.toContain('29.06.2009')
    expect(saved).toContain('20.06.2009')
    expect(saved).toContain('2009/12/03')
    expect(saved).toContain('QSAR for acute toxicity to fish')
    expect(saved).toContain('schema_version="0.9"')

    // Reopened as data: the same findings it had before and no new ones, and writing it again moves
    // nothing: a saved document is a fixed point of the writer, not a near miss.
    const reopened = openModel(saved)
    expect(validate(reopened).counts).toEqual(before.counts)
    expect(saveModel(reopened)).toBe(saved)

    // Reopened as a document, the way a download is reopened: the edit is on screen and nothing
    // about it is an error.
    unmount()
    render(<QMRFViewer xml={saved} />)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(document.querySelector('.qmrf-banner--error')).toBeNull()
    expect(field(CREATED).textContent).toContain(today)
    expect(document.querySelectorAll('.qmrf-chapter')).toHaveLength(10)
  })
})
