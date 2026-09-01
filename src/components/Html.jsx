import DOMPurify from 'dompurify'
import { useEffect, useRef } from 'react'

/**
 * Field content is HTML written by the Java editor's rich-text kit, so it is untrusted input from
 * whoever wrote the document: it is sanitised on the way in, always. Same tool as `jtoxkit-react`
 * uses for its legacy fragments, with the additions a QMRF document needs.
 *
 * `<style>` is forbidden outright: a stylesheet element injected into a host page styles the whole
 * page, not just this field, while the inline `style="margin-top: 0"` attributes these documents
 * carry are only layout. Form and media elements go for the same reason — a viewer has no use for
 * them, and each is a way to attack the page that embeds it.
 *
 * Links keep their `target` and get `rel` added after mount, so the third-party targets inside
 * these documents cannot reach back into the host page via `window.opener`. That is done here
 * rather than as a global DOMPurify hook, which would leak into any other component in the host
 * that also sanitises HTML.
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
 * @param {{html: string, className?: string}} props
 */
export default function Html({ html, className }) {
  const node = useRef(/** @type {HTMLDivElement|null} */ (null))
  const clean = html ? DOMPurify.sanitize(html, CONFIG) : ''

  // The effect reaches into markup that `dangerouslySetInnerHTML` replaced, which React does not
  // count as a dependency of this hook — without `clean` it would run once and never re-secure the
  // links of a document that replaces the one first rendered.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  useEffect(() => {
    const root = node.current
    if (!root) return
    for (const link of root.querySelectorAll('a[target]')) {
      const rel = new Set((link.getAttribute('rel') ?? '').split(/\s+/).filter(Boolean))
      rel.add('noopener')
      rel.add('noreferrer')
      link.setAttribute('rel', [...rel].join(' '))
    }
  }, [clean])

  if (!clean) return null
  return (
    <div
      ref={node}
      className={className}
      // The markup is DOMPurify's output and nothing else: this component's one job is to be the
      // place a QMRF field's stored HTML becomes page content, which is why the sanitising lives
      // here and nowhere else.
      // biome-ignore lint/security/noDangerouslySetInnerHtml: `clean` is DOMPurify's output
      dangerouslySetInnerHTML={{ __html: /** @type {string} */ (clean) }}
    />
  )
}
