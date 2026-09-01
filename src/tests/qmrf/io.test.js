import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadText, fetchText, readText, suggestedFilename } from '../../qmrf/io.js'
import { openModel } from '../../qmrf/model.js'
import { newDocumentText } from '../../qmrf/newDocument.js'
import fixture from '../fixtures/qmrf-0.9-real.xml?raw'

/**
 * The one module that touches the browser for I/O, so it is the one module whose tests have to
 * pretend: a fetch that answers, an object URL, a clicked anchor. Everything above it works on text,
 * which is why the rest of the suite never needs any of this.
 */

/** @param {{ok: boolean, status?: number, statusText?: string, body?: string}} answer */
function respondTo(answer) {
  return vi.fn(async () => ({
    ok: answer.ok,
    status: answer.status ?? 200,
    statusText: answer.statusText ?? '',
    text: async () => answer.body ?? ''
  }))
}

beforeEach(() => {
  vi.stubGlobal('fetch', respondTo({ ok: true, body: '<QMRF/>' }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchText', () => {
  it('reads the document behind a url', async () => {
    expect(await fetchText('https://example.org/qmrf.xml')).toBe('<QMRF/>')
    expect(fetch).toHaveBeenCalledWith('https://example.org/qmrf.xml', { headers: {} })
  })

  it('sends the host token as a bearer token, and not at all without one', async () => {
    await fetchText('https://example.org/qmrf.xml', { token: 'abc' })
    expect(vi.mocked(fetch).mock.calls[0]?.[1]).toEqual({
      headers: { Authorization: 'Bearer abc' }
    })
  })

  it('keeps the status in the message, because that is what the user gets to read', async () => {
    vi.stubGlobal('fetch', respondTo({ ok: false, status: 403, statusText: 'Forbidden' }))
    await expect(fetchText('https://example.org/private.xml')).rejects.toThrow(
      'Could not read https://example.org/private.xml: 403 Forbidden'
    )
  })

  it('names a plain 500 without a status text, rather than ending in a space', async () => {
    vi.stubGlobal('fetch', respondTo({ ok: false, status: 500, statusText: '' }))
    await expect(fetchText('https://example.org/x.xml')).rejects.toThrow(
      'Could not read https://example.org/x.xml: 500'
    )
  })
})

describe('readText', () => {
  it('reads a chosen file and passes text straight through', async () => {
    expect(await readText(new File(['<QMRF/>'], 'a.xml'))).toBe('<QMRF/>')
    expect(await readText('<QMRF/>')).toBe('<QMRF/>')
  })
})

describe('suggestedFilename', () => {
  it('names the file after the model title', () => {
    expect(suggestedFilename(openModel(fixture))).toBe(
      'qsar-for-acute-toxicity-to-fish-danio-rerio.xml'
    )
  })

  it('falls back for a document nobody has titled yet', () => {
    expect(suggestedFilename(openModel(newDocumentText()))).toBe('qmrf.xml')
  })
})

describe('downloadText', () => {
  it('offers the text as a file and lets go of the object URL afterwards', () => {
    vi.useFakeTimers()
    /** @type {HTMLAnchorElement[]} */
    const clicked = []
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      /** @this {HTMLAnchorElement} */
      function clickAnchor() {
        clicked.push(this)
      }
    )
    const revoked = vi.fn()
    const saved = { create: URL.createObjectURL, revoke: URL.revokeObjectURL }
    URL.createObjectURL = () => 'blob:qmrf'
    URL.revokeObjectURL = revoked
    try {
      downloadText('model.xml', '<QMRF/>')
      expect(clicked).toHaveLength(1)
      const link = /** @type {HTMLAnchorElement} */ (clicked[0])
      expect(link.download).toBe('model.xml')
      expect(link.rel).toContain('noopener')
      expect(link.href).toBe('blob:qmrf')
      // Gone by the time the caller looks again, so repeated saves do not pile anchors up in the
      // host page, and the object URL is released once the click has been dispatched.
      expect(document.body.querySelector('a[download]')).toBeNull()
      vi.runAllTimers()
      expect(revoked).toHaveBeenCalledWith('blob:qmrf')
    } finally {
      click.mockRestore()
      URL.createObjectURL = saved.create
      URL.revokeObjectURL = saved.revoke
      vi.useRealTimers()
    }
  })
})
