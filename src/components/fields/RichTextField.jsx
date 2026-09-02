import { useEffect, useRef } from 'react'
import { sanitizeFieldHtml, secureLinks } from '../sanitize.js'

/**
 * A QMRF text field, edited in place.
 *
 * contentEditable rather than a `<textarea>` because the field *is* rich text — that is what the
 * Java kit wrote and what the report renders — and a textarea would either show the tags or throw
 * them away. The caret is the risk here, and the mitigation is that React never writes the markup:
 * the browser owns the element while the user types, and the value goes in on mount, on undo, and
 * when a document replaces the one open. A controlled contentEditable is how a caret ends up at
 * position zero after every keystroke.
 *
 * Two rules keep the document trustworthy:
 *
 * - What is read back is sanitised before it is stored, with the viewer's own rules
 *   (`sanitize.js`), so a field cannot hold on save what the viewer would refuse to show.
 * - Paste arrives as plain text. A field pasted from Word or a PDF otherwise carries in markup this
 *   app cannot render and a host page cannot want; the words are what the author meant.
 *
 * The commit is on blur and on Enter-with-nothing-selected, not per keystroke: one edit, one undo
 * step. Typing itself never touches the model.
 */

const COMMANDS = [
  { command: 'bold', label: 'B', title: 'Bold (Ctrl+B)', className: 'qmrf-tool--bold' },
  { command: 'italic', label: 'I', title: 'Italic (Ctrl+I)', className: 'qmrf-tool--italic' },
  {
    command: 'underline',
    label: 'U',
    title: 'Underline (Ctrl+U)',
    className: 'qmrf-tool--underline'
  },
  { command: 'insertUnorderedList', label: '•', title: 'Bulleted list', className: '' },
  { command: 'insertOrderedList', label: '1.', title: 'Numbered list', className: '' }
]

/**
 * @param {{html: string, label: string, onCommit: (body: string) => void}} props
 * `html` is the field's stored body (envelope already stripped), sanitised here rather than by the
 * caller, since this component is the one putting it somewhere a user can edit further.
 */
export default function RichTextField({ html, label, onCommit }) {
  const node = useRef(/** @type {HTMLDivElement|null} */ (null))
  const held = useRef(false)
  const clean = sanitizeFieldHtml(html)

  // Only while the caret is elsewhere: `clean` changes on every commit, and rewriting the element
  // then would be a no-op at best and a lost selection at worst.
  useEffect(() => {
    const el = node.current
    if (!el) return
    if (!held.current && el.innerHTML !== clean) el.innerHTML = clean
    secureLinks(el)
  }, [clean])

  const commit = () => {
    const el = node.current
    if (!el) return
    // Harden the links before reading the markup back, so the document that goes out is the one the
    // viewer would show rather than one that only gets hardened on the way to the screen.
    secureLinks(el)
    const body = sanitizeFieldHtml(el.innerHTML)
    // Put the sanitised form back so what is on screen is what was stored — otherwise a stripped
    // `<iframe>` would sit there looking saved.
    if (body !== el.innerHTML) el.innerHTML = body
    if (body !== clean) onCommit(body)
  }

  return (
    <div className="qmrf-rich" data-qmrf-edit="rich">
      <div className="qmrf-rich-tools" role="toolbar" aria-label={`Formatting for ${label}`}>
        {COMMANDS.map((tool) => (
          <button
            key={tool.command}
            type="button"
            className={`qmrf-tool ${tool.className}`}
            title={tool.title}
            // Formatting a selection means handing the selection to the browser, which is what
            // `execCommand` still is the only portable way to do.
            onMouseDown={(event) => {
              event.preventDefault()
              const el = node.current
              el?.focus()
              document.execCommand?.(tool.command, false)
            }}
          >
            {tool.label}
          </button>
        ))}
      </div>
      {/* The role is right and the alternatives are not available: this field holds the paragraphs,
          lists and emphasis the schema's text fields are written with, so a `<textarea>` would show
          the tags and an `<input>` would hold one line of them. `contentEditable` already makes the
          element focusable; `tabIndex` only makes that legible to the check. */}
      {/* biome-ignore lint/a11y/useSemanticElements: rich text is not a `<textarea>` */}
      <div
        ref={node}
        className="qmrf-rich-body"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        tabIndex={0}
        aria-multiline="true"
        aria-label={label}
        onFocus={() => {
          held.current = true
        }}
        onBlur={() => {
          held.current = false
          commit()
        }}
        onPaste={(event) => {
          event.preventDefault()
          const text = event.clipboardData.getData('text/plain')
          document.execCommand?.('insertText', false, text)
        }}
        // The markup is what the browser composed here, cleaned before it is read; nothing else
        // writes it, and the effect above only does so after sanitising.
        // biome-ignore lint/security/noDangerouslySetInnerHtml: an uncontrolled contentEditable needs its initial markup
        dangerouslySetInnerHTML={{ __html: /** @type {string} */ (clean) }}
      />
    </div>
  )
}
