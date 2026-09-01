/**
 * Undo and redo over immutable models.
 *
 * A snapshot is only a model reference. Because model.js edits copy-on-write along the edited
 * spine, two snapshots share every node they agree on, so keeping a hundred undo steps costs a
 * hundred root pointers plus the spines that differ - not a hundred copies of the document. That
 * is the whole reason the editor keeps its own tree instead of re-parsing text per keystroke.
 *
 * Typing is coalesced by `mergeKey`: consecutive pushes carrying the same key collapse into one
 * step, so a paragraph typed into one rich-text field is a single undo rather than a hundred.
 * The caller owns the key (usually the field's path, refreshed when the field gains focus);
 * timers would make the behaviour depend on typing speed.
 */

/** @typedef {import('./xml.js').XmlDocument} Model */

/** @typedef {{ model: Model, label: string, mergeKey: string|null }} Entry */

/**
 * @typedef {object} History
 * @property {Entry[]} entries snapshots, oldest first; entries[0] is the document as opened
 * @property {number} index    the live snapshot
 * @property {number} saved    index of the snapshot that was last saved, for the dirty flag
 * @property {number} limit    oldest snapshots are discarded past this
 */

const DEFAULT_LIMIT = 100

/** @returns {History} */
export function createHistory(/** @type {Model} */ model, /** @type {string} */ label = 'opened') {
  return { entries: [{ model, label, mergeKey: null }], index: 0, saved: 0, limit: DEFAULT_LIMIT }
}

/** @returns {Model} */
export function current(/** @type {History} */ history) {
  return /** @type {Entry} */ (history.entries[history.index]).model
}

/**
 * Records a new model, discarding the redo tail.
 * @param {History} history
 * @param {Model} model
 * @param {{ label?: string, mergeKey?: string|null }} [options]
 */
export function push(
  /** @type {History} */ history,
  /** @type {Model} */ model,
  /** @type {{ label?: string, mergeKey?: string|null }} */ options = {}
) {
  const { label = 'edit', mergeKey = null } = options
  const entries = history.entries.slice(0, history.index + 1)
  const last = /** @type {Entry} */ (entries.at(-1))
  if (mergeKey !== null && last.mergeKey === mergeKey) {
    // Same editing gesture: fold into the step already at the top, keeping its label so undo
    // says "edit title" rather than the label of whichever keystroke happened last.
    entries[entries.length - 1] = { model, label: last.label, mergeKey }
    return { ...history, entries }
  }
  entries.push({ model, label, mergeKey })
  const dropped = Math.max(0, entries.length - history.limit)
  return {
    ...history,
    entries: entries.slice(dropped),
    index: entries.length - 1 - dropped,
    saved: Math.max(0, history.saved - dropped)
  }
}

/** @returns {History} */
export function undo(/** @type {History} */ history) {
  return history.index > 0 ? { ...history, index: history.index - 1 } : history
}

/** @returns {History} */
export function redo(/** @type {History} */ history) {
  return history.index < history.entries.length - 1
    ? { ...history, index: history.index + 1 }
    : history
}

export function canUndo(/** @type {History} */ history) {
  return history.index > 0
}

export function canRedo(/** @type {History} */ history) {
  return history.index < history.entries.length - 1
}

/**
 * What undo is about to take back - the change at the live end of the tape, which is how an Edit
 * menu words it ("Undo Typing", not "Undo the state you land on").
 * @returns {string|null}
 */
export function undoLabel(/** @type {History} */ history) {
  return canUndo(history) ? /** @type {Entry} */ (history.entries[history.index]).label : null
}

/** What redo would re-apply. @returns {string|null} */
export function redoLabel(/** @type {History} */ history) {
  return canRedo(history) ? /** @type {Entry} */ (history.entries[history.index + 1]).label : null
}

/** True when the live snapshot differs from the saved one. */
export function isDirty(/** @type {History} */ history) {
  return history.index !== history.saved
}

/** @returns {History} */
export function markSaved(/** @type {History} */ history) {
  return { ...history, saved: history.index }
}
