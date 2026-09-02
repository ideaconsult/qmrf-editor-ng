/**
 * QMRF text fields do not hold plain text: they hold a whole HTML document escaped as PCDATA,
 * as the Java editor's Swing kit wrote it —
 *
 *     &lt;html&gt;&lt;head&gt;…&lt;/head&gt;&lt;body&gt;&lt;p style="margin-top: 0"&gt;…&lt;/p&gt;&lt;/body&gt;&lt;/html&gt;
 *
 * Because our parser decodes entities, the value we read back is real HTML with the envelope
 * still around it. Viewing means handing the `<body>` content to a sanitizer; editing means
 * writing the same envelope back, or a saved document no longer matches what other QMRF tools
 * (and our own round-trip test) expect. Both directions live here so the envelope has exactly
 * one definition.
 *
 * Nothing in this file touches the DOM: `src/components/Html.jsx` owns sanitisation, which needs
 * a browser, and keeping this module DOM-free keeps it testable as plain data.
 */

/** The `<body>` of the stored envelope, if there is one. */
const BODY = /<body[^>]*>([\s\S]*)<\/body>/i
/** A value that is a stored envelope rather than bare prose. */
const ENVELOPE = /<html[\s>]/i
/** Block elements that may sit directly inside the envelope's body. */
const BLOCK_START = /^\s*<(p|ul|ol|li|table|thead|tbody|tr|td|th|div|h[1-6]|pre|blockquote)\b/i

/**
 * The field value's HTML, ready to be sanitised and injected: the envelope's body content, or the
 * value itself when a field holds bare prose. Returns '' for a field nobody has answered.
 */
export function fieldHtml(/** @type {string|null|undefined} */ value) {
  const text = (value ?? '').trim()
  if (!text) return ''
  if (!ENVELOPE.test(text)) return text
  const body = BODY.exec(text)
  return (body ? (body[1] ?? '') : text).trim()
}

/**
 * Whether a stored value is written as the Java kit's envelope rather than as bare prose. The editor
 * asks so that a field written bare stays bare: wrapping it would be a change to bytes nobody edits.
 */
export function hasEnvelope(/** @type {string|null|undefined} */ value) {
  return ENVELOPE.test((value ?? '').trim())
}

/**
 * A readable one-line form of a field value — for `<option>` labels, `<title>` attributes and
 * search. Tags are dropped first and entities decoded second, so prose that legitimately contains
 * `&lt;` ("a.s.&lt;85% purity" in the published fixture) is read as text rather than as markup.
 */
export function plainText(/** @type {string|null|undefined} */ value) {
  const withoutMarkup = fieldHtml(value)
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
  return decodeEntities(withoutMarkup).replace(/\s+/g, ' ').trim()
}

/**
 * Wrap edited content in the envelope upstream writes. Content that already opens with a block
 * element is kept as authored; anything else becomes one paragraph, which is what the Java editor
 * produced and what the report stylesheets expect.
 */
export function wrapHtml(/** @type {string} */ content) {
  const body = content.trim()
  const paragraphs = !body || BLOCK_START.test(body) ? body : `<p style="margin-top: 0">${body}</p>`
  const indented = paragraphs
    .split('\n')
    .map((line) => (line.trim() ? `    ${line.trim()}` : ''))
    .join('\n')
  return `<html>
  <head>

  </head>
  <body>
${indented}
  </body>
</html>
`
}

/** The five XML entities plus the ones legacy documents typed by name. */
function decodeEntities(/** @type {string} */ text) {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#0?39;/g, "'")
    .replace(/&amp;/g, '&')
}
