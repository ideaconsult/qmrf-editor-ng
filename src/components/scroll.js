/**
 * Keeping the reader where they were.
 *
 * An edit changes the document, and a document that grows or shrinks above the viewport moves the
 * text under the reader's eyes: the paragraph they were reading is suddenly somewhere else, or the
 * page is back at the first chapter. Upstream's editor does exactly this on every save, and it is
 * the single most annoying thing about it — setting a date in chapter 2 throws you out of chapter 6.
 *
 * So the shell records where the page stood *before* applying an edit and puts it back after React
 * has written the new tree, which is invisible to the reader: the layout effect runs before paint.
 * The one exception is a jump the reader asked for themselves (an outline row, the findings chip),
 * which goes through `showAddress` and is not a scroll to keep.
 *
 * The scroll container is found rather than assumed. A standalone app scrolls the window; a host
 * that embeds the viewer in its own panel often scrolls a div, and getting that wrong restores the
 * wrong scrollbar — which looks exactly like the bug this file exists to prevent.
 */

/** @typedef {{restore: () => void}} Anchor */

/**
 * The nearest element that actually scrolls, or the page's own scrolling element when the page
 * itself is what moves.
 * @param {Element|null} inside
 * @returns {Element|null}
 */
function scrollContainer(/** @type {Element|null} */ inside) {
  let node = inside?.parentElement ?? null
  while (node) {
    const style = getComputedStyle(node)
    if (/(auto|scroll)/.test(`${style.overflowY} ${style.overflowX}`) && scrolls(node)) return node
    node = node.parentElement
  }
  // A browser's scrolling element is the page's own: in both quirks-mode and standards-mode it is
  // the element whose offsets move the viewport, so one lookup covers a standalone app and a host
  // that scrolls one of its own panels instead.
  return typeof document === 'undefined' ? null : (document.scrollingElement ?? document.body)
}

/** Does this element have content sticking out of it right now? */
function scrolls(/** @type {Element} */ node) {
  return node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1
}

/**
 * Where the scrollable area stands, as something restorable later.
 * @param {Element|null} inside an element within the area of interest
 * @returns {Anchor|null} null when there is nothing to record (no DOM, no scroller found)
 */
export function captureScroll(/** @type {Element|null} */ inside) {
  if (!inside || typeof getComputedStyle !== 'function') return null
  const container = scrollContainer(inside)
  if (!container) return null
  const top = container.scrollTop
  const left = container.scrollLeft
  // `scrollTo` is not on every scroller — a host's custom element or a test environment may have
  // none — and writing the offsets directly is the same instruction without that assumption. It is
  // also what moves the page, because the fallback container is the page's own scrolling element.
  return {
    restore: () => {
      if (typeof container.scrollTo === 'function') container.scrollTo(left, top)
      else {
        container.scrollTop = top
        container.scrollLeft = left
      }
    }
  }
}
