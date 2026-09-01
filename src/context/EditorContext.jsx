/**
 * The open document, shared.
 *
 * `useDocument` owns the state; this provider owns *who gets to see it*, so that the header, the
 * outline and a field editor three levels down all read the same document without every component in
 * between having to forward it. It is also where the jump lives: the outline asks for an address and
 * the provider scrolls the report it was given to that address, because only here is it known which
 * DOM subtree belongs to which document.
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { useDocument } from '../hooks/useDocument.js'
import { buildOutline, emptyOutline } from '../qmrf/outline.js'

/**
 * @typedef {import('../hooks/useDocument.js').DocumentState} DocumentState
 * @typedef {import('../qmrf/outline.js').Outline} Outline
 */

/**
 * @typedef {object} EditorValue
 * @property {DocumentState} doc
 * @property {Outline} outline the document's chapters and catalogs, with per-part issue counts
 * @property {string|null} focus the address the reader last jumped to
 * @property {(address: string) => void} showAddress scroll the report to one address
 * @property {React.MutableRefObject<HTMLDivElement|null>} reportRef where the rendered report lives,
 *   set by the layout so that jumps stay inside this viewer rather than anywhere in the host page
 */

/** @type {React.Context<EditorValue|null>} */
const EditorContext = createContext(/** @type {EditorValue|null} */ (null))

/**
 * @param {{
 *   xml?: string,
 *   url?: string,
 *   token?: string,
 *   onSave?: (xml: string) => void | Promise<void>,
 *   children: React.ReactNode
 * }} props
 */
export function EditorProvider({ xml, url, token, onSave, children }) {
  const doc = useDocument({ xml, url, token, onSave })
  const [focus, setFocus] = useState(/** @type {string|null} */ (null))
  const reportRef = useRef(/** @type {HTMLDivElement|null} */ (null))

  const outline = useMemo(
    () => (doc.model ? buildOutline(doc.model, doc.report) : emptyOutline()),
    [doc.model, doc.report]
  )

  const showAddress = useCallback(
    /** @param {string} address */
    (address) => {
      setFocus(address)
      const scope = reportRef.current
      // `''` is a real address here — the document's own properties block — so only a jump with no
      // report to look in does nothing at all.
      if (!scope) return
      const target = scope.querySelector(`[data-qmrf-path="${cssEscape(address)}"]`)
      // A host page that has not laid the report out, and a test environment, both have nowhere to
      // scroll to. The address is still remembered, so the outline shows where the reader asked.
      if (typeof target?.scrollIntoView === 'function')
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    []
  )

  const value = useMemo(
    () => ({ doc, outline, focus, showAddress, reportRef }),
    [doc, outline, focus, showAddress]
  )

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

/** @returns {EditorValue} the document this component is rendered under */
export function useEditor() {
  const value = useContext(EditorContext)
  if (!value) throw new Error('useEditor must be called inside an EditorProvider')
  return value
}

/** Addresses hold `[` and `]`, which an attribute selector would otherwise read as syntax. */
function cssEscape(/** @type {string} */ value) {
  return typeof CSS === 'undefined' ? value.replace(/["\\]/g, '\\$&') : CSS.escape(value)
}
