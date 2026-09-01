/**
 * Tolerant XML reader and fidelity-preserving writer for QMRF documents.
 *
 * Why not DOMParser? Two reasons. First, fidelity: an editor must be able to write back a
 * document whose untouched parts are byte-identical to what was read, which requires knowing
 * each node's exact source span; DOMParser discards source offsets and does not expose the
 * prolog verbatim. Second, parity: upstream reads QMRF with `setValidating(false)` and an
 * error handler that keeps going, because real documents carry drifted schema versions,
 * arbitrary doctypes and stray whitespace. This parser mirrors that: it never throws, and it
 * reports well-formedness problems as notes instead.
 *
 * The writer emits `node.raw` verbatim whenever a node was not edited, and only re-renders the
 * nodes on an edited path. Combined with path-copy updates (see model.js), that gives both
 * byte-exact output for untouched content and cheap snapshots for undo.
 */

/** @typedef {{ name: string, value: string, raw: string|null }} XmlAttr */
/** @typedef {{ type: 'text', value: string, raw: string|null }} XmlText */
/** @typedef {{ type: 'comment', raw: string|null }} XmlComment */
/** @typedef {{ type: 'cdata', value: string, raw: string|null }} XmlCdata */

/** @typedef {XmlText|XmlComment|XmlCdata|XmlElement} XmlNode */

/** @typedef {{ type:'element', name: string, attrs: XmlAttr[], children: XmlNode[], selfClosing: boolean, raw: string|null, start: number, end: number }} XmlElement */

/**
 * @typedef {object} XmlDocument
 * @property {string} prolog   everything before the root element, verbatim (declaration, doctype, comments, whitespace)
 * @property {XmlElement|null} root
 * @property {string} epilog   everything after the root element, verbatim
 * @property {XmlNote[]} notes non-fatal well-formedness problems
 */

/** @typedef {{ code: string, message: string, offset: number }} XmlNote */

const NAMED_ENTITIES = {
  lt: '<',
  gt: '>',
  amp: '&',
  quot: '"',
  apos: "'"
}

/** Decodes the five XML built-in entities plus numeric character references. */
export function decodeEntities(text) {
  if (!text.includes('&')) return text
  return text.replace(
    /&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|([a-zA-Z][\w.-]*));/g,
    (match, dec, hex, name) => {
      if (dec !== undefined) return codePoint(Number(dec), match)
      if (hex !== undefined) return codePoint(Number.parseInt(hex, 16), match)
      const known = NAMED_ENTITIES[name]
      // An undeclared entity (only legal with a DTD) survives literally rather than being dropped.
      return known ?? match
    }
  )
}

function codePoint(code, fallback) {
  try {
    return String.fromCodePoint(code)
  } catch {
    return fallback
  }
}

export function escapeText(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\r', '&#13;')
}

export function escapeAttribute(text) {
  return escapeText(text).replaceAll('"', '&quot;')
}

/**
 * Reads an XML document without throwing.
 * @param {string} text
 * @returns {{ doc: XmlDocument, notes: XmlNote[] }}
 */
export function parseXml(text) {
  const notes = []
  let pos = 0

  /** Consumes misc constructs (PI, comment, doctype) and whitespace; stops at the root element. */
  function skipMisc() {
    for (;;) {
      while (pos < text.length && /\s/.test(text.charAt(pos))) pos += 1
      if (!text.startsWith('<', pos)) return
      if (text.startsWith('<?', pos)) {
        const end = text.indexOf('?>', pos)
        pos = end === -1 ? text.length : end + 2
        continue
      }
      if (text.startsWith('<!--', pos)) {
        const end = text.indexOf('-->', pos)
        pos = end === -1 ? text.length : end + 3
        continue
      }
      if (/^<!\s*[Dd][Oo][Cc][Tt][Yy][Pp][Ee]/.test(text.slice(pos))) {
        pos = skipDoctype(pos)
        continue
      }
      return
    }
  }

  /** `<!DOCTYPE …>` possibly containing an internal `[` … `]` subset. */
  function skipDoctype(/** @type {number} */ start) {
    let i = start + 2
    let bracket = false
    let quote = null
    while (i < text.length) {
      const c = text[i]
      if (quote) {
        if (c === quote) quote = null
      } else if (c === '"' || c === "'") {
        quote = c
      } else if (c === '[') {
        bracket = true
      } else if (c === ']') {
        bracket = false
      } else if (c === '>' && !bracket) {
        return i + 1
      }
      i += 1
    }
    notes.push({
      code: 'unclosed-doctype',
      message: 'DOCTYPE declaration is not closed',
      offset: start
    })
    return text.length
  }

  /** @returns {XmlAttr[]} */
  function readAttributes(/** @type {number} */ from, /** @type {number} */ to) {
    const attrs = []
    let i = from
    while (i < to) {
      while (i < to && /\s/.test(text.charAt(i))) i += 1
      const nameStart = i
      while (i < to && !/[\s=/]/.test(text.charAt(i))) i += 1
      const name = text.slice(nameStart, i)
      if (!name) break
      while (i < to && /\s/.test(text.charAt(i))) i += 1
      if (text.charAt(i) !== '=') {
        notes.push({
          code: 'attribute-missing-value',
          message: `Attribute ${name} has no value`,
          offset: nameStart
        })
        attrs.push({ name, value: '', raw: text.slice(nameStart, i) })
        continue
      }
      i += 1
      while (i < to && /\s/.test(text.charAt(i))) i += 1
      const quote = text.charAt(i)
      if (quote !== '"' && quote !== "'") {
        notes.push({
          code: 'attribute-unquoted',
          message: `Attribute ${name} value is not quoted`,
          offset: i
        })
        let end = i
        while (end < to && !/[\s/>]/.test(text.charAt(end))) end += 1
        attrs.push({
          name,
          value: decodeEntities(text.slice(i, end)),
          raw: text.slice(nameStart, end)
        })
        i = end
        continue
      }
      let end = i + 1
      while (end < to && text.charAt(end) !== quote) end += 1
      const value = decodeEntities(text.slice(i + 1, end))
      attrs.push({ name, value, raw: text.slice(nameStart, Math.min(end + 1, to)) })
      i = Math.min(end + 1, to)
    }
    return attrs
  }

  /** Reads the `<name …>` or `<name …/>` tag beginning at `start`. */
  function readStartTag(/** @type {number} */ start) {
    let i = start + 1
    while (i < text.length && /[^\s/>]/.test(text.charAt(i))) i += 1
    const name = text.slice(start + 1, i)
    let quote = null
    let selfClosing = false
    let end = -1
    for (; i < text.length; i += 1) {
      const c = text.charAt(i)
      if (quote) {
        if (c === quote) quote = null
        continue
      }
      if (c === '"' || c === "'") {
        quote = c
        continue
      }
      if (c === '/' && text[i + 1] === '>') {
        selfClosing = true
        end = i + 2
        break
      }
      if (c === '>') {
        end = i + 1
        break
      }
    }
    if (end === -1) {
      notes.push({
        code: 'unclosed-start-tag',
        message: `Start tag <${name}> is not closed`,
        offset: start
      })
      end = text.length
    }
    // Attribute text ends at the `/` of a self-closing tag, or just before `>`.
    const attrsEnd = selfClosing ? end - 2 : end - 1
    return { name, attrs: readAttributes(start + 1 + name.length, attrsEnd), selfClosing, end }
  }

  /** @returns {XmlElement} */
  function parseElement(/** @type {number} */ start) {
    const tag = readStartTag(start)
    if (tag.selfClosing) {
      return {
        type: 'element',
        name: tag.name,
        attrs: tag.attrs,
        children: [],
        selfClosing: true,
        raw: text.slice(start, tag.end),
        start,
        end: tag.end
      }
    }

    /** @type {XmlNode[]} */
    const children = []
    let textStart = tag.end
    let closedAt = -1

    const flushText = (/** @type {number} */ upto) => {
      if (upto > textStart) {
        const raw = text.slice(textStart, upto)
        children.push({ type: 'text', value: decodeEntities(raw), raw })
      }
    }

    let i = tag.end
    for (;;) {
      if (i >= text.length) break
      if (text[i] !== '<') {
        i += 1
        continue
      }
      if (text.startsWith('</', i)) {
        flushText(i)
        let j = i + 2
        while (j < text.length && !/[\s>]/.test(text.charAt(j))) j += 1
        const closeName = text.slice(i + 2, j)
        if (closeName !== tag.name) {
          notes.push({
            code: 'mismatched-end-tag',
            message: `</${closeName}> closes <${tag.name}>`,
            offset: i
          })
        }
        const gt = text.indexOf('>', j)
        closedAt = gt === -1 ? text.length : gt + 1
        break
      }
      if (text.startsWith('<!--', i)) {
        flushText(i)
        const end = text.indexOf('-->', i)
        const stop = end === -1 ? text.length : end + 3
        children.push({ type: 'comment', raw: text.slice(i, stop) })
        i = stop
        textStart = stop
        continue
      }
      if (text.startsWith('<![CDATA[', i)) {
        flushText(i)
        const end = text.indexOf(']]>', i)
        const stop = end === -1 ? text.length : end + 3
        const value = text.slice(i + 9, end === -1 ? text.length : end)
        children.push({ type: 'cdata', value, raw: text.slice(i, stop) })
        i = stop
        textStart = stop
        continue
      }
      // A child element: flush pending text, recurse.
      flushText(i)
      const child = parseElement(i)
      children.push(child)
      i = child.end
      textStart = child.end
    }

    if (closedAt === -1) {
      notes.push({
        code: 'unclosed-element',
        message: `<${tag.name}> is never closed`,
        offset: start
      })
      flushText(text.length)
      closedAt = text.length
    }

    return {
      type: 'element',
      name: tag.name,
      attrs: tag.attrs,
      children,
      selfClosing: false,
      raw: text.slice(start, closedAt),
      start,
      end: closedAt
    }
  }

  skipMisc()
  const prolog = text.slice(0, pos)
  /** @type {XmlElement|null} */
  let root = null
  if (text.startsWith('<', pos) && !text.startsWith('</', pos)) {
    root = parseElement(pos)
  }
  // Note it however the input ran out: trailing text, a stray end tag, or nothing at all after
  // the prolog. A document without a root is not a QMRF document, and the caller needs to say so.
  if (!root) {
    notes.push({
      code: 'no-root-element',
      message: 'Document does not contain a root element',
      offset: pos
    })
  }
  const epilog = root ? text.slice(root.end) : text.slice(pos)

  return { doc: { prolog, root, epilog, notes }, notes }
}

/**
 * Serializes a document. Any node still carrying `raw` is emitted verbatim, so untouched
 * content - including its original whitespace and attribute spacing - is preserved exactly.
 * @param {XmlDocument} doc
 */
export function serializeXml(doc) {
  return `${doc.prolog}${serializeNode(doc.root)}${doc.epilog}`
}

/** @param {XmlNode|null} node */
export function serializeNode(node) {
  if (!node) return ''
  if (node.raw !== null && node.raw !== undefined) return node.raw
  switch (node.type) {
    case 'comment':
      return node.raw ?? ''
    case 'cdata':
      return `<![CDATA[${node.value}]]>`
    case 'text':
      return escapeText(node.value)
    case 'element': {
      const attrs = node.attrs
        .map((attr) => ` ${attr.raw ?? `${attr.name}="${escapeAttribute(attr.value)}"`}`)
        .join('')
      if (node.children.length === 0) return `<${node.name}${attrs}/>`
      const inner = node.children.map(serializeNode).join('')
      return `<${node.name}${attrs}>${inner}</${node.name}>`
    }
    default:
      return ''
  }
}

/**
 * Deep copy with every cached `raw` dropped, forcing the writer to re-render from structure.
 * Used by the tests to prove the renderer alone can reproduce a document, rather than the
 * round-trip succeeding only because raw spans were echoed back.
 * @param {XmlNode} node
 * @returns {XmlNode}
 */
export function stripRaw(node) {
  if (node.type === 'element') {
    return {
      ...node,
      raw: null,
      attrs: node.attrs.map((a) => ({ ...a, raw: null })),
      children: node.children.map((child) => stripRaw(child))
    }
  }
  return { ...node, raw: null }
}
