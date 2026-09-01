/**
 * The only place that touches the browser for document I/O.
 *
 * Keeping `File`, `fetch`, `Blob` and the download anchor here — rather than in components — is
 * what lets the viewer be embedded anywhere and still be testable: everything above this module
 * works on document text, and a host that saves through an API (`onSave`) never runs any of it.
 */

/** @typedef {import('./model.js').Model} Model */

import { plainText } from './html.js'
import { getValue, parsePath } from './model.js'

const TITLE = parsePath('QMRF_chapters[0]/QSAR_identifier[0]/QSAR_title[0]')

/** @param {Blob|string} body @returns {Promise<string>} */
export async function readText(body) {
  return typeof body === 'string' ? body : await body.text()
}

/**
 * The document behind a URL, with an optional bearer token (the standalone app's `?url=`/`?token=`,
 * and a host that embeds with one). Errors name the status: a document that failed to load is
 * shown to the user, so "403" has to survive as information.
 * @returns {Promise<string>}
 */
export async function fetchText(
  /** @type {string} */ url,
  /** @type {{token?: string}} */ { token } = {}
) {
  /** @type {Record<string, string>} */
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(url, { headers })
  if (!response.ok) {
    throw new Error(`Could not read ${url}: ${response.status} ${response.statusText}`.trim())
  }
  return await response.text()
}

/**
 * Offer the document as a file download — the save path when there is no host to save to.
 * @param {string} filename
 * @param {string} text
 */
export function downloadText(/** @type {string} */ filename, /** @type {string} */ text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/xml' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  // Revoked on the next tick rather than now: a click has to be dispatched before its object URL
  // can go away, and some browsers do that asynchronously.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * A file name worth keeping: the model's title as the user typed it, sluged enough for any
 * filesystem. Falls back to `qmrf.xml` for an untitled document, which is what an in-progress
 * model usually is.
 * @param {Model} model
 * @param {string} [fallback]
 * @returns {string}
 */
export function suggestedFilename(model, fallback = 'qmrf') {
  const slug = plainText(getValue(model, TITLE))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')
  return `${slug || fallback}.xml`
}
