/**
 * The document a viewer or editor is working on: which model is open, how it got there, whether it
 * differs from what is saved, and what the schema says about it.
 *
 * Everything here is state over the pure modules — `history.js` holds the undo tape, `model.js` the
 * immutable edits, `validate.js` the report. That is what lets a host embed the viewer with an
 * `onSave` callback, a download, or nothing at all without any of the persistence logic knowing the
 * difference.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  canRedo,
  canUndo,
  createHistory,
  current,
  isDirty,
  markSaved,
  push,
  redo,
  undo
} from '../qmrf/history.js'
import { downloadText, fetchText, readText, suggestedFilename } from '../qmrf/io.js'
import { openModel, saveModel } from '../qmrf/model.js'
import { newDocument } from '../qmrf/newDocument.js'
import { validate } from '../qmrf/validate.js'

/** @typedef {import('../qmrf/model.js').Model} Model */
/** @typedef {import('../qmrf/history.js').History} History */
/** @typedef {import('../qmrf/validate.js').Report} Report */

/**
 * @typedef {object} DocumentState
 * @property {Model|null} model
 * @property {History|null} history
 * @property {boolean} loading a `url` fetch is in flight
 * @property {string|null} error why the document could not be opened or saved
 * @property {boolean} dirty the open document differs from the saved one
 * @property {Report|null} report the current validation report
 * @property {(text: string, label?: string) => void} open replace the document with parsed text
 * @property {(file: File) => void} openFile open a file picked from disk or dropped on the viewer
 * @property {() => void} create start a new, empty document
 * @property {(model: Model, step?: {label?: string, mergeKey?: string}) => void} edit
 * @property {() => void} save write the document out, through `onSave` if there is one
 * @property {() => void} undoStep
 * @property {() => void} redoStep
 * @property {() => boolean} canUndoStep
 * @property {() => boolean} canRedoStep
 */

/**
 * @param {{xml?: string, url?: string, token?: string, onSave?: (xml: string) => void | Promise<void>}} props
 * @returns {DocumentState}
 */
export function useDocument({ xml, url, token, onSave }) {
  const [history, setHistory] = useState(/** @type {History|null} */ (null))
  const [loading, setLoading] = useState(Boolean(url))
  const [error, setError] = useState(/** @type {string|null} */ (null))
  /** The `xml`/`url` this was last opened from, so a re-render does not reopen over the user's edits. */
  const openedFrom = useRef(/** @type {{xml?: string, url?: string} | null} */ (null))

  const open = useCallback(
    /** @type {(text: string, label?: string) => void} */
    (text, label = 'opened') => {
      const next = openModel(text)
      // Text arrives from a host or a file chooser, so this is a boundary: a file that is not an XML
      // document at all has to become a message next to the last document, not a blank viewer.
      if (!next.root) {
        setHistory(null)
        setError('Could not open the document: it holds no XML element. Is this a QMRF .xml file?')
        return
      }
      setHistory(createHistory(next, label))
      setError(null)
    },
    []
  )

  useEffect(() => {
    if (openedFrom.current?.xml === xml && openedFrom.current?.url === url) return
    openedFrom.current = { xml, url }
    if (xml !== undefined) {
      setLoading(false)
      open(xml)
      return
    }
    if (url === undefined) {
      setLoading(false)
      setHistory(null)
      return
    }
    let live = true
    setLoading(true)
    fetchText(url, { token })
      .then((text) => {
        if (!live) return
        openedFrom.current = { xml: text, url }
        open(text)
        setLoading(false)
      })
      .catch((cause) => {
        if (!live) return
        setError(cause instanceof Error ? cause.message : String(cause))
        setLoading(false)
      })
    return () => {
      live = false
    }
  }, [xml, url, token, open])

  const model = history ? current(history) : null
  const report = useMemo(() => (model ? validate(model) : null), [model])
  const openFile = useMemo(() => openFileWith(open, setError), [open])

  const edit = useCallback(
    /** @type {(model: Model, step?: {label?: string, mergeKey?: string}) => void} */
    (next, step) => {
      setHistory((existing) => (existing ? push(existing, next, step ?? {}) : existing))
    },
    []
  )

  const save = useCallback(() => {
    if (!history) return
    const text = saveModel(current(history))
    if (!onSave) {
      downloadText(suggestedFilename(current(history)), text)
      setHistory(markSaved(history))
      return
    }
    Promise.resolve(onSave(text))
      .then(() => setHistory((existing) => (existing ? markSaved(existing) : existing)))
      .catch((cause) =>
        setError(
          `The document could not be saved: ${cause instanceof Error ? cause.message : String(cause)}`
        )
      )
  }, [history, onSave])

  return {
    model,
    history,
    loading,
    error,
    dirty: history ? isDirty(history) : false,
    report,
    open,
    openFile,
    create: () => {
      setHistory(createHistory(newDocument(), 'new document'))
      setError(null)
    },
    edit,
    save,
    undoStep: () => setHistory((existing) => (existing ? undo(existing) : existing)),
    redoStep: () => setHistory((existing) => (existing ? redo(existing) : existing)),
    canUndoStep: () => Boolean(history && canUndo(history)),
    canRedoStep: () => Boolean(history && canRedo(history))
  }
}

/**
 * A dropped or picked file, opened. Kept separate from the hook so a drop target and a file input
 * can share it without either owning the state.
 * @param {(text: string, label?: string) => void} open
 * @param {(message: string) => void} onError
 * @returns {(file: File) => void}
 */
export function openFileWith(open, onError) {
  return (file) => {
    readText(file)
      .then((text) => open(text, `opened ${file.name}`))
      .catch((cause) =>
        onError(
          `Could not read ${file.name}: ${cause instanceof Error ? cause.message : String(cause)}`
        )
      )
  }
}
