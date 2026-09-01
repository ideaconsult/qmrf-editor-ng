import { describe, expect, it } from 'vitest'
import {
  canRedo,
  canUndo,
  createHistory,
  current,
  isDirty,
  markSaved,
  push,
  redo,
  redoLabel,
  undo,
  undoLabel
} from '../../qmrf/history.js'
import { getValue, openModel, saveModel, setValue } from '../../qmrf/model.js'
import fixture from '../fixtures/qmrf-0.9-real.xml?raw'

const SOURCE = `<?xml version="1.0" encoding="UTF-8"?>\n<QMRF schema_version="1.0" version="3.0">\n<QMRF_chapters/>\n</QMRF>\n`
const CHAPTERS = [{ name: 'QMRF_chapters', index: 0 }]

/** Writes a word into the chapter block; the words below are what `read` compares against. */
function written(
  /** @type {import('../../qmrf/model.js').Model} */ model,
  /** @type {string} */ word
) {
  return setValue(model, CHAPTERS, word)
}

function read(/** @type {import('../../qmrf/model.js').Model} */ model) {
  return getValue(model, CHAPTERS)
}

describe('history', () => {
  it('starts clean, with nothing to undo', () => {
    const history = createHistory(openModel(SOURCE))
    expect(canUndo(history)).toBe(false)
    expect(canRedo(history)).toBe(false)
    expect(isDirty(history)).toBe(false)
    expect(undoLabel(history)).toBeNull()
    expect(redoLabel(history)).toBeNull()
  })

  it('walks back to a previous state and forward again', () => {
    const opened = openModel(SOURCE)
    let history = createHistory(opened)
    history = push(history, written(opened, 'alpha'), { label: 'first edit' })
    history = push(history, written(opened, 'beta'), { label: 'second edit' })

    expect(undoLabel(history)).toBe('second edit')
    history = undo(history)
    expect(read(current(history))).toBe('alpha')
    expect(undoLabel(history)).toBe('first edit')
    expect(redoLabel(history)).toBe('second edit')

    history = redo(history)
    expect(read(current(history))).toBe('beta')
    expect(canRedo(history)).toBe(false)
    expect(undoLabel(history)).toBe('second edit')
  })

  it('is a no-op at either end of the tape', () => {
    const history = createHistory(openModel(SOURCE))
    expect(undo(history)).toBe(history)
    expect(redo(history)).toBe(history)
  })

  it('folds a typing gesture into one step, keeping its first label', () => {
    const opened = openModel(SOURCE)
    let history = createHistory(opened)
    history = push(history, written(opened, 'alpha'), { label: 'title', mergeKey: 'title-field' })
    history = push(history, written(opened, 'beta'), { label: 'title', mergeKey: 'title-field' })
    history = push(history, written(opened, 'gamma'), { label: 'title', mergeKey: 'title-field' })

    expect(history.entries).toHaveLength(2)
    expect(undoLabel(history)).toBe('title')
    expect(current(undo(history))).toBe(opened)
  })

  it('keeps separate gestures apart', () => {
    const opened = openModel(SOURCE)
    let history = createHistory(opened)
    history = push(history, written(opened, 'alpha'), { label: 'title', mergeKey: 'title-field' })
    history = push(history, written(opened, 'beta'), { label: 'date', mergeKey: 'date-field' })

    expect(history.entries).toHaveLength(3)
    expect(undoLabel(undo(history))).toBe('title')
  })

  it('starts a new step when the same field is revisited after another edit', () => {
    const opened = openModel(SOURCE)
    let history = createHistory(opened)
    history = push(history, written(opened, 'alpha'), { mergeKey: 'title-field' })
    history = push(history, written(opened, 'beta'), { mergeKey: 'other' })
    history = push(history, written(opened, 'gamma'), { mergeKey: 'title-field' })

    expect(history.entries).toHaveLength(4)
  })

  it('drops the redo tail when editing after an undo', () => {
    const opened = openModel(SOURCE)
    let history = createHistory(opened)
    history = push(history, written(opened, 'alpha'))
    history = push(history, written(opened, 'beta'))
    history = undo(history)
    history = push(history, written(opened, 'gamma'))

    expect(canRedo(history)).toBe(false)
    expect(read(current(history))).toBe('gamma')
    expect(read(current(undo(history)))).toBe('alpha')
    expect(saveModel(current(undo(undo(history))))).toBe(saveModel(opened))
  })

  it('is dirty only when the live state differs from the saved one', () => {
    const opened = openModel(SOURCE)
    let history = markSaved(push(createHistory(opened), written(opened, 'alpha')))
    expect(isDirty(history)).toBe(false)

    history = push(history, written(opened, 'beta'))
    expect(isDirty(history)).toBe(true)

    // Undoing an unsaved edit returns the document to what is on disk, so it stops being dirty.
    history = undo(history)
    expect(isDirty(history)).toBe(false)

    history = redo(history)
    expect(isDirty(history)).toBe(true)

    history = markSaved(history)
    expect(isDirty(history)).toBe(false)
  })

  it('discards the oldest steps past its limit', () => {
    const opened = openModel(SOURCE)
    let history = { ...createHistory(opened), limit: 3 }
    for (const word of ['alpha', 'beta', 'gamma', 'delta']) {
      history = push(history, written(opened, word), { label: word })
    }

    expect(history.entries).toHaveLength(3)
    expect(history.index).toBe(2)
    expect(read(current(history))).toBe('delta')
    expect(read(current(undo(history)))).toBe('gamma')
    expect(read(current(undo(undo(history))))).toBe('beta')
    expect(canUndo(undo(undo(undo(history))))).toBe(false)
  })

  it('hands back the original bytes of a real document, not an equivalent tree', () => {
    const opened = openModel(fixture)
    const keywords = [
      { name: 'QMRF_chapters', index: 0 },
      { name: 'QMRF_Summary', index: 0 },
      { name: 'keywords', index: 0 }
    ]
    let history = createHistory(opened)
    history = push(history, setValue(opened, keywords, 'one'), { label: 'edit', mergeKey: 'a' })
    history = push(history, setValue(opened, keywords, 'two'), { label: 'edit', mergeKey: 'b' })

    history = undo(undo(history))
    expect(saveModel(current(history))).toBe(fixture)
  })
})
