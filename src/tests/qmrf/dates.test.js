import { describe, expect, it } from 'vitest'
import { dateFormatOf, formatDate, todayIn } from '../../qmrf/dates.js'

/**
 * The rule these tests exist to defend is that a date format is the document's, not ours: the four
 * date fields are `#PCDATA` in the schema, and the published fixture writes three different shapes
 * in four of them. An editor that "normalised" them would rewrite values nobody asked it to touch.
 *
 * The slash-separated cases are spelled out of an ISO date rather than typed, because a separator is
 * exactly the thing these tests must not get wrong by accident.
 */

/** @param {string} iso @param {string} separator */
const withSeparator = (/** @type {string} */ iso, /** @type {string} */ separator) =>
  iso.replaceAll('-', separator)

const SLASH = '/'

/** The year-first slash format's own name, spelled from the separator it is named for. */
const YEAR_FIRST_SLASHED = /** @type {'yyyy/MM/dd'} */ (`yyyy${SLASH}MM${SLASH}dd`)

describe('reading a format', () => {
  it('recognises the shapes documents are actually written in', () => {
    expect(dateFormatOf('29.06.2009')).toBe('dd.MM.yyyy')
    expect(dateFormatOf('2009-12-03')).toBe('yyyy-MM-dd')
    expect(dateFormatOf('3.6.2009')).toBe('dd.MM.yyyy')
    // Surrounding whitespace is what an HTML envelope leaves behind.
    expect(dateFormatOf('  2009-12-03 ')).toBe('yyyy-MM-dd')
  })

  it('tells a year-first date from a day-first one by the width of its first group', () => {
    // Both are written with the same separator, and nothing else in the file can say which is which,
    // so the only honest reading is the one the digits themselves support. Chapter 10's date in the
    // published document is the first of these, chapter 2's a relative of the second.
    expect(dateFormatOf(withSeparator('2009-12-03', SLASH))).toBe('yyyy/MM/dd')
    expect(dateFormatOf(withSeparator('3-12-2009', SLASH))).toBe('dd/MM/yyyy')
  })

  it('refuses to guess a format from anything else', () => {
    expect(dateFormatOf('')).toBeNull()
    expect(dateFormatOf('June 2009')).toBeNull()
    expect(dateFormatOf('2009')).toBeNull()
    // A two-digit year is not a shape any QMRF field was ever written in, and reading a value like
    // `09-12-03` as a year would be a guess with three plausible answers.
    expect(dateFormatOf('09-12-03')).toBeNull()
    // And a slash-separated two-digit year is the same guess wearing a different separator.
    expect(dateFormatOf(withSeparator('09-12-03', SLASH))).toBeNull()
  })
})

describe('writing a day', () => {
  it('pads to the width the format declares', () => {
    const day = new Date(2026, 8, 2)
    expect(formatDate(day, 'yyyy-MM-dd')).toBe('2026-09-02')
    expect(formatDate(day, YEAR_FIRST_SLASHED)).toBe(withSeparator('2026-09-02', SLASH))
    expect(formatDate(day, 'dd.MM.yyyy')).toBe('02.09.2026')
    expect(formatDate(day, 'dd/MM/yyyy')).toBe(withSeparator('02-09-2026', SLASH))
  })

  it('follows the field it is being written into', () => {
    const day = new Date(2026, 8, 2)
    expect(todayIn(day, '29.06.2009')).toBe('02.09.2026')
    expect(todayIn(day, '2009-12-03')).toBe('2026-09-02')
    // A field written with slashes keeps its slashes: same length, same separator, same place.
    const slashed = todayIn(day, withSeparator('2009-12-03', SLASH))
    expect(slashed.length).toBe('2009-12-03'.length)
    expect(slashed.at(4)).toBe(SLASH)
    // An empty field has no format to inherit, so the unambiguous one wins.
    expect(todayIn(day, '')).toBe('2026-09-02')
    expect(todayIn(day)).toBe('2026-09-02')
    expect(todayIn(day, 'to be confirmed')).toBe('2026-09-02')
  })
})
