import DOMPurify from 'dompurify'

/**
 * The one definition of what field HTML may contain, for both directions of the app: the viewer
 * injecting a stored field and the editor reading back what the user typed.
 *
 * `<style>` is forbidden outright: a stylesheet element injected into a host page styles the whole
 * page, not just this field, while the inline `style="margin-top: 0"` attributes these documents
 * carry are only layout. Form and media elements go for the same reason — a report has no use for
 * them, and each is a way to attack the page that embeds it. `<head>`/`<body>` are forbidden so a
 * value that arrives with its envelope still around it cannot become a nested document.
 *
 * Kept out of `Html.jsx` because `RichTextField` needs the same rules on `innerHTML` it puts into a
 * contentEditable, and two configs would be two answers to one question.
 */
const CONFIG = {
  ADD_ATTR: ['target'],
  FORBID_TAGS: [
    'style',
    'head',
    'html',
    'body',
    'link',
    'meta',
    'title',
    'base',
    'template',
    'slot',
    'form',
    'input',
    'button',
    'textarea',
    'select',
    'option',
    'object',
    'embed',
    'portal',
    'audio',
    'video',
    'source',
    'track',
    'iframe'
  ],
  FORBID_ATTR: ['srcdoc', 'formaction', 'autofocus', 'background', 'dynsrc', 'lowsrc']
}

/**
 * Field content as markup that is safe to show and to keep. A QMRF text field is HTML written by
 * whoever authored the document — and pasted into it from wherever they were writing — so it is
 * untrusted input on both reads and writes.
 * @param {string} html
 * @returns {string}
 */
export function sanitizeFieldHtml(/** @type {string} */ html) {
  return html ? DOMPurify.sanitize(html, CONFIG) : ''
}

/**
 * Links a document carries keep their `target` and get `rel` added, so a third-party target cannot
 * reach back into the host page through `window.opener`. Called by the component after mount rather
 * than as a global DOMPurify hook, which would leak into any other component in the host that also
 * sanitises HTML.
 * @param {Element|null} root
 */
export function secureLinks(/** @type {Element|null} */ root) {
  if (!root) return
  for (const link of root.querySelectorAll('a[target]')) {
    const rel = new Set((link.getAttribute('rel') ?? '').split(/\s+/).filter(Boolean))
    rel.add('noopener')
    rel.add('noreferrer')
    link.setAttribute('rel', [...rel].join(' '))
  }
}
