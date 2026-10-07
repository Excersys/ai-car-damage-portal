import { useLayoutEffect } from 'react'

/**
 * Injects a stylesheet (imported with `?inline`) into <head> while the calling
 * layout is mounted and removes it on unmount. The EZPZ design and the legacy
 * admin stylesheet both target bare elements and share class names (.btn, .nav,
 * .section ...), so each layout only ever has its own sheet in the document.
 */
export function useStyleSheet(css: string, id: string): void {
  useLayoutEffect(() => {
    const el = document.createElement('style')
    el.setAttribute('data-sheet', id)
    el.textContent = css
    document.head.appendChild(el)
    return () => {
      el.remove()
    }
  }, [css, id])
}
