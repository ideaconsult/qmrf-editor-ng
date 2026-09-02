/**
 * Dates in QMRF documents, filled in the shape the document already uses.
 *
 * The schema types the four date fields as `#PCDATA`, which means the format is whatever the author
 * typed. The published fixture proves it: 2.1 and 2.6 hold `29.06.2009` and `20.06.2009` inside
 * their rich-text envelope, while 10.2 — filled by the JRC inventory importer — holds bare
 * year-first text with no envelope at all. An editor that imposes one format on save would rewrite
 * dates nobody asked it to touch, so the rule here is the opposite: a value the user did not edit
 * keeps its bytes, and a value they did keep the format the field was already written in.
 */

/** @typedef {'yyyy-MM-dd'|'yyyy/MM/dd'|'dd.MM.yyyy'|'dd/MM/yyyy'} DateFormat */

/**
 * Recognised shapes. A bare `9/6/2009` is ambiguous in a way nothing in the file can settle, so it
 * reads as day/month — the convention the JRC documents themselves use. A leading four-digit group
 * can only be a year, which is what tells `2009/12/03` apart from `3/6/2009`.
 */
const FORMATS = [
  { format: /** @type {DateFormat} */ ('yyyy-MM-dd'), pattern: /^\d{4}-\d{2}-\d{2}$/ },
  { format: /** @type {DateFormat} */ ('yyyy/MM/dd'), pattern: /^\d{4}\/\d{1,2}\/\d{1,2}$/ },
  { format: /** @type {DateFormat} */ ('dd.MM.yyyy'), pattern: /^\d{1,2}\.\d{1,2}\.\d{4}$/ },
  { format: /** @type {DateFormat} */ ('dd/MM/yyyy'), pattern: /^\d{1,2}\/\d{1,2}\/\d{4}$/ }
]

/**
 * The format a field is written in, or null when nothing here can be read as a date — in which case
 * the field's own text stays untouched and a new value goes in ISO.
 * @param {string} text a field's readable value, already stripped of its envelope
 * @returns {DateFormat|null}
 */
export function dateFormatOf(/** @type {string} */ text) {
  const value = (text ?? '').trim()
  for (const candidate of FORMATS) if (candidate.pattern.test(value)) return candidate.format
  return null
}

/**
 * One day as one format.
 * @param {Date} day
 * @param {DateFormat} format
 */
export function formatDate(/** @type {Date} */ day, /** @type {DateFormat} */ format) {
  const pad = (/** @type {number} */ n) => String(n).padStart(2, '0')
  const y = String(day.getFullYear())
  const m = pad(day.getMonth() + 1)
  const d = pad(day.getDate())
  if (format === 'dd.MM.yyyy') return `${d}.${m}.${y}`
  if (format === 'dd/MM/yyyy') return `${d}/${m}/${y}`
  if (format === 'yyyy/MM/dd') return `${y}/${m}/${d}`
  return `${y}-${m}-${d}`
}

/**
 * Today, in the format this field already uses (ISO when it uses none).
 * @param {Date} [now]
 * @param {string} [like] the field's current readable value
 */
export function todayIn(/** @type {Date} */ now = new Date(), /** @type {string} */ like = '') {
  return formatDate(now, dateFormatOf(like) ?? 'yyyy-MM-dd')
}
