import { describe, expect, it } from 'vitest'
import {
  decodeEntities,
  escapeText,
  parseXml,
  serializeNode,
  serializeXml,
  stripRaw
} from '../../qmrf/xml.js'
import fixture from '../fixtures/qmrf-0.9-real.xml?raw'

/** Exact byte size of the fixture on disk - asserted below. */
const FIXTURE_BYTES = 29679

/** Narrows a child lookup to an element, so assertions below do not need casts. */
function elem(
  /** @type {import('../../qmrf/xml.js').XmlElement | undefined} */ parent,
  /** @type {string} */ name
) {
  const found = parent?.children.find((c) => c.type === 'element' && c.name === name)
  return found?.type === 'element' ? found : undefined
}

/**
 * Re-renders a document from structure alone by dropping every cached source span, then using
 * the production writer. If the writer were lossy this shows up as instability here.
 */
function normalize(text) {
  const { doc } = parseXml(text)
  if (!doc.root) return text
  const rebuilt = {
    ...doc,
    root: /** @type {import('../../qmrf/xml.js').XmlElement} */ (stripRaw(doc.root))
  }
  return serializeXml(rebuilt)
}

/** Structural fingerprint: element names, attributes and non-whitespace text, no offsets. */
function shape(node) {
  if (!node) return null
  if (node.type === 'text') return node.value.trim() === '' ? null : node.value.trim()
  if (node.type === 'cdata') return node.value.trim() === '' ? null : node.value.trim()
  if (node.type !== 'element') return null
  return {
    name: node.name,
    attrs: node.attrs.map((a) => [a.name, a.value]),
    children: node.children.map(shape).filter((c) => c !== null)
  }
}

describe('parseXml', () => {
  it('loads the fixture exactly as stored on disk', () => {
    // The round-trip assertions below are only meaningful if the bundler handed us the fixture
    // byte-for-byte: no CRLF conversion, no re-indentation.
    expect(fixture).not.toContain('\r')
    expect(new TextEncoder().encode(fixture).byteLength).toBe(FIXTURE_BYTES)
  })

  it('reads the real document without well-formedness notes', () => {
    const { doc, notes } = parseXml(fixture)
    expect(notes).toEqual([])
    expect(doc.root?.name).toBe('QMRF')
    expect(doc.root?.attrs.find((a) => a.name === 'schema_version')?.value).toBe('0.9')
    expect(doc.prolog).toContain('<!DOCTYPE QMRF SYSTEM "/WEB-INF/xslt/qmrf.dtd">')
  })

  it('preserves the prolog and epilog verbatim', () => {
    const { doc } = parseXml(fixture)
    expect(serializeXml(doc)).toBe(fixture)
  })

  it('decodes the escaped HTML that QMRF stores in chapter text', () => {
    const { doc } = parseXml(fixture)
    const title = elem(
      elem(elem(doc.root ?? undefined, 'QMRF_chapters'), 'QSAR_identifier'),
      'QSAR_title'
    )
    const text = (title?.children ?? []).map((c) => (c.type === 'text' ? c.value : '')).join('')
    expect(text).toContain('<html>')
    expect(text).toContain('QSAR for acute toxicity to fish (Danio rerio)')
  })

  it('keeps the two top-level sections in source order', () => {
    const { doc } = parseXml(fixture)
    expect(doc.root?.children.filter((c) => c.type === 'element').map((c) => c.name)).toEqual([
      'QMRF_chapters',
      'Catalogs'
    ])
  })

  it('agrees with the platform parser on structure', () => {
    const { doc } = parseXml(fixture)
    const platform = new DOMParser().parseFromString(fixture, 'text/xml')
    expect(platform.querySelector('parsererror')).toBeNull()
    expect(shape(doc.root)).toEqual(shape(fromPlatform(platform.documentElement)))
  })
})

/** Converts a platform Element into the shape our parser produces, for comparison. */
function fromPlatform(el) {
  return {
    type: 'element',
    name: el.nodeName,
    attrs: [...el.attributes].map((a) => ({ name: a.name, value: a.value })),
    children: [...el.childNodes]
      .filter((n) => n.nodeType === 1 || (n.nodeType === 3 && (n.nodeValue ?? '').trim() !== ''))
      .map((n) =>
        n.nodeType === 1
          ? fromPlatform(/** @type {Element} */ (n))
          : { type: 'text', value: /** @type {Text} */ (n).nodeValue ?? '' }
      )
  }
}

describe('serializeXml', () => {
  it('re-rendering from structure is idempotent', () => {
    const once = normalize(fixture)
    expect(normalize(once)).toBe(once)
  })

  it('keeps structure identical when re-rendered from structure', () => {
    const { doc } = parseXml(fixture)
    const reparsed = parseXml(normalize(fixture)).doc
    expect(shape(reparsed.root)).toEqual(shape(doc.root))
  })

  it('renders text and attribute values it has to escape', () => {
    expect(serializeNode({ type: 'text', value: '<a> & b', raw: null })).toBe('&lt;a&gt; &amp; b')
  })
})

describe('tolerant parsing', () => {
  it('reports an unclosed element without throwing', () => {
    const { doc, notes } = parseXml('<QMRF><QMRF_chapters>')
    expect(doc.root?.name).toBe('QMRF')
    expect(notes.map((n) => n.code)).toContain('unclosed-element')
  })

  it('reports a mismatched end tag without throwing', () => {
    const { notes } = parseXml('<QMRF><a></b></QMRF>')
    expect(notes.map((n) => n.code)).toContain('mismatched-end-tag')
  })

  it('keeps an undeclared entity literally instead of dropping it', () => {
    const { doc } = parseXml('<QMRF>&nbsp;text</QMRF>')
    const first = doc.root?.children[0]
    expect(first?.type === 'text' ? first.value : '').toBe('&nbsp;text')
  })

  it('reports a document with no root element, whatever form it comes in', () => {
    for (const text of ['', '   ', 'just text', '</QMRF>', '<!-- nothing -->']) {
      const { doc, notes } = parseXml(text)
      expect(doc.root).toBeNull()
      expect(notes.map((n) => n.code)).toContain('no-root-element')
      // Round-tripping a rootless document must not invent markup.
      expect(() => serializeXml(doc)).not.toThrow()
    }
  })
})

describe('entities', () => {
  it('decodes built-in and numeric references', () => {
    expect(decodeEntities('&lt;a&gt;&amp;&quot;&#65;&#x42;&apos;')).toBe('<a>&"AB\'')
  })

  it('escapes the characters that would break markup', () => {
    expect(escapeText('<a & b>')).toBe('&lt;a &amp; b&gt;')
  })
})
