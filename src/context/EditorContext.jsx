/**
 * The open document, shared.
 *
 * `useDocument` owns the state; this provider owns *who gets to see it*, so that the header, the
 * outline and a field editor three levels down all read the same document without every component in
 * between having to forward it. It is also where the two things only the shell knows live: which DOM
 * subtree belongs to this document (jumps and scroll-keeping stay inside it), and whether the reader
 * is looking at the report or working on it.
 */

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { captureScroll } from '../components/scroll.js'
import { useDocument } from '../hooks/useDocument.js'
import { buildOutline, emptyOutline } from '../qmrf/outline.js'
import { useViewerConfig } from './ViewerConfig.jsx'

/**
 * @typedef {import('../hooks/useDocument.js').DocumentState} DocumentState
 * @typedef {import('../qmrf/outline.js').Outline} Outline
 */

/**
 * @typedef {object} EditorValue
 * @property {DocumentState} doc
 * @property {Outline} outline the document's chapters and catalogs, with per-part issue counts
 * @property {string|null} focus the address the shell last pointed at
 * @property {boolean} editable whether this host may write at all (`readOnly: false`)
 * @property {boolean} editing whether the report is currently showing its editors
 * @property {(on: boolean) => void} setEditing switch between reading and working
 * @property {(address: string) => void} showAddress scroll the report to one address
 * @property {(address: string) => void} markAddress point the outline at an address without scrolling
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
  const { readOnly } = useViewerConfig()
  const [editing, setEditing] = useState(false)
  const [focus, setFocus] = useState(/** @type {string|null} */ (null))
  const reportRef = useRef(/** @type {HTMLDivElement|null} */ (null))

  // The same pair the value below publishes, computed once so the outline and the report cannot
  // disagree about which catalogs the reader is allowed to reach: `ReportView` lists all six exactly
  // while the editors are showing, and an outline row exists only where one of them will be rendered.
  const editable = !readOnly
  const isEditing = editing && !readOnly

  const outline = useMemo(
    () =>
      doc.model ? buildOutline(doc.model, doc.report, { allCatalogs: isEditing }) : emptyOutline(),
    [doc.model, doc.report, isEditing]
  )

  // Where the page stood when the document last changed is where it belongs afterwards: an entry
  // added in chapter 2 must not move what the reader is looking at in chapter 6.
  //
  // The two halves have to sit either side of React's own work, which is why they are not both in an
  // effect. The position is read during the render that carries the new document — the one point
  // certain to be before any part of the DOM has been changed for this update, since a layout
  // effect's cleanup runs while sibling subtrees may already be mutated. It is put back in the
  // layout effect, which runs once the new tree is in the DOM but before the browser paints, so the
  // reader never sees the intermediate position at all. The anchor carries the model it belongs to so
  // a render that never commits cannot spend it on the wrong update.
  const previous = useRef(doc.model)
  const anchor = useRef(/** @type {{model: unknown, restore: () => void}|null} */ (null))
  if (previous.current !== doc.model) {
    const stood = captureScroll(reportRef.current)
    anchor.current = stood ? { model: doc.model, restore: stood.restore } : null
    previous.current = doc.model
  }
  useLayoutEffect(() => {
    if (anchor.current?.model === doc.model) {
      anchor.current.restore()
      anchor.current = null
    }
  }, [doc.model])

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

  const markAddress = useCallback(/** @param {string} address */ (address) => setFocus(address), [])

  const value = useMemo(
    () => ({
      doc,
      outline,
      focus,
      editable,
      editing: isEditing,
      setEditing,
      showAddress,
      markAddress,
      reportRef
    }),
    [doc, outline, focus, editable, isEditing, showAddress, markAddress]
  )

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

/** @returns {EditorValue} the document this component is rendered under */
export function useEditor() {
  const value = useContext(EditorContext)
  if (!value) throw new Error('useEditor must be called inside an EditorProvider')
  return value
}

/**
 * Whether fields should show their editors.
 *
 * Deliberately tolerant where `useEditor` is strict: a host may render `<ReportView>` on its own,
 * with no provider and nothing to edit, and a report that throws in that case is a broken viewer.
 * @returns {boolean}
 */
export function useEditing() {
  const value = useContext(EditorContext)
  return Boolean(value?.editing)
}

/** Addresses hold `[` and `]`, which an attribute selector would otherwise read as syntax. */
function cssEscape(/** @type {string} */ value) {
  return typeof CSS === 'undefined' ? value.replace(/["\\]/g, '\\$&') : CSS.escape(value)
}
