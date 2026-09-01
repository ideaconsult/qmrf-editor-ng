import { describe, expect, it } from 'vitest'
import { fieldHtml, plainText, wrapHtml } from '../../qmrf/html.js'

/** A value as the Java editor's rich-text kit wrote it, entities already decoded by our parser. */
const ENVELOPE =
  '<html>\n<head>\n\n</head>\n<body>\n<p style="margin-top: 0">Acute fish toxicity</p>\n</body>\n</html>\n'

describe('fieldHtml', () => {
  it('takes the content out of the stored envelope', () => {
    expect(fieldHtml(ENVELOPE)).toBe('<p style="margin-top: 0">Acute fish toxicity</p>')
  })

  it('leaves bare prose alone, for the documents that never carried an envelope', () => {
    expect(fieldHtml('just a sentence')).toBe('just a sentence')
  })

  it('is empty for an unanswered field, including one padded with whitespace', () => {
    expect(fieldHtml('')).toBe('')
    expect(fieldHtml('   \n ')).toBe('')
    expect(fieldHtml(undefined)).toBe('')
    expect(fieldHtml(null)).toBe('')
  })

  it('keeps a value that looks like an envelope but has no body', () => {
    expect(fieldHtml('<html>half written')).toBe('<html>half written')
  })
})

describe('plainText', () => {
  it('reads an envelope as one line', () => {
    expect(plainText(ENVELOPE)).toBe('Acute fish toxicity')
  })

  it('drops markup before decoding entities, so text that quotes markup stays text', () => {
    // The published fixture writes `a.s.&amp;lt;85% purity`: the XML parser takes one layer off, so
    // the value arrives here still written `a.s.&lt;85% purity`, and this is the layer that puts the
    // `<` back. Tags are dropped first, which is what stops that `<` reading as a tag.
    expect(plainText('a.s.&lt;85% purity')).toBe('a.s.<85% purity')
    expect(plainText('<p>a.s.&lt;85% purity</p>')).toBe('a.s.<85% purity')
  })

  it('reads a link by its words rather than by its markup', () => {
    expect(plainText('<a href="https://example.org/a">The paper</a>')).toBe('The paper')
  })

  it('does not read what a script would do', () => {
    expect(plainText('<script>alert(1)</script>gone')).toBe('gone')
    expect(plainText('<style>p{color:red}</style>body')).toBe('body')
  })

  it('collapses the whitespace these documents are full of', () => {
    expect(plainText('<p>a</p>\n  <p>b</p>')).toBe('a b')
    expect(plainText('&nbsp;&nbsp;a&nbsp;&nbsp;b&nbsp;')).toBe('a b')
    expect(plainText('a  b\n\t c')).toBe('a b c')
  })
})

describe('wrapHtml', () => {
  it('writes the envelope the Java editor wrote', () => {
    expect(wrapHtml('<p style="margin-top: 0">Hello</p>')).toBe(
      '<html>\n  <head>\n\n  </head>\n  <body>\n    <p style="margin-top: 0">Hello</p>\n  </body>\n</html>\n'
    )
  })

  it('makes a paragraph out of content that is not one', () => {
    expect(wrapHtml('Hello')).toContain('<p style="margin-top: 0">Hello</p>')
  })

  it('keeps block content as authored', () => {
    expect(wrapHtml('<ul><li>one</li></ul>')).toContain('<ul><li>one</li></ul>')
    expect(wrapHtml('<table><tr><td>1</td></tr></table>')).toContain('<table>')
  })

  it('survives an empty edit, which is a field the user cleared rather than a broken envelope', () => {
    expect(wrapHtml('')).toBe('<html>\n  <head>\n\n  </head>\n  <body>\n\n  </body>\n</html>\n')
  })

  it('round-trips single-line content, which is what an edit cycle reads back', () => {
    for (const content of [
      '<p style="margin-top: 0">Hello &amp; goodbye</p>',
      '<ul><li>one</li><li>two</li></ul>'
    ]) {
      expect(fieldHtml(wrapHtml(content))).toBe(content)
    }
  })

  it('settles after one cycle for content the envelope splits over lines', () => {
    // `fieldHtml` hands back the envelope's own line indentation — HTML collapses it on screen and
    // `wrapHtml` trims it off each line on the way out — so writing is not byte-identical to what
    // was read, but it is stable: opening and saving a multi-paragraph field repeatedly cannot grow
    // the indentation the way a naive re-wrap would.
    const content = '<p style="margin-top: 0">a</p>\n<p style="margin-top: 0">b</p>'
    const once = wrapHtml(fieldHtml(wrapHtml(content)))
    expect(wrapHtml(fieldHtml(once))).toBe(once)
    expect(plainText(once)).toBe('a b')
  })
})
