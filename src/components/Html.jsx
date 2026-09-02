import { useEffect, useRef } from 'react'
import { sanitizeFieldHtml, secureLinks } from './sanitize.js'

/**
 * Field content is HTML written by the Java editor's rich-text kit, so it is untrusted input from
 * whoever wrote the document: it is sanitised on the way in, always. Same tool as `jtoxkit-react`
 * uses for its legacy fragments; the rules themselves are in `sanitize.js`, which the field editor
 * reads from too, so a field cannot hold something on save that the viewer would have stripped.
 *
 * @param {{html: string, className?: string}} props
 */
export default function Html({ html, className }) {
  const node = useRef(/** @type {HTMLDivElement|null} */ (null))
  const clean = sanitizeFieldHtml(html)

  // The effect reaches into markup that `dangerouslySetInnerHTML` replaced, which React does not
  // count as a dependency of this hook — without `clean` it would run once and never re-secure the
  // links of a document that replaces the one first rendered.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  useEffect(() => {
    secureLinks(node.current)
  }, [clean])

  if (!clean) return null
  return (
    <div
      ref={node}
      className={className}
      // The markup is DOMPurify's output and nothing else: this component's one job is to be the
      // place a QMRF field's stored HTML becomes page content, which is why the sanitising lives
      // one file over.
      // biome-ignore lint/security/noDangerouslySetInnerHtml: `clean` is DOMPurify's output
      dangerouslySetInnerHTML={{ __html: /** @type {string} */ (clean) }}
    />
  )
}
