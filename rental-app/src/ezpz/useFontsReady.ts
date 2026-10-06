import { useEffect, useState } from 'react'

const FACES = [
  '700 1em "Big Shoulders Stencil Display"',
  '800 1em "Big Shoulders Stencil Display"',
  '900 1em "Big Shoulders Stencil Display"',
  '700 1em "Big Shoulders Display"',
  '800 1em "Big Shoulders Display"',
  '400 1em "Bricolage Grotesque"',
  '600 1em "Bricolage Grotesque"',
]
const SAMPLE = 'ABCabc0123'

let loadedOnce = false

/**
 * True once the design's web fonts are in (or after `timeout` ms, so a blocked
 * font host never hides the page). The design sizes headings in `ch` units;
 * Chrome keeps the width it measured with the fallback font if the heading is
 * laid out before the web font arrives, which made the hero highlight wider
 * than in the static design. Mounting the page after the fonts avoids that
 * and the layout jump with it.
 */
export function useFontsReady(timeout = 2500): boolean {
  const [ready, setReady] = useState(loadedOnce)

  useEffect(() => {
    if (loadedOnce) return
    let done = false
    const finish = () => {
      if (done) return
      done = true
      loadedOnce = true
      setReady(true)
    }
    const timer = window.setTimeout(finish, timeout)

    const link = document.querySelector<HTMLLinkElement>('link[href*="fonts.googleapis.com/css2"]')
    const cssReady = new Promise<void>((resolve) => {
      if (!link || link.sheet) resolve()
      else {
        link.addEventListener('load', () => resolve(), { once: true })
        link.addEventListener('error', () => resolve(), { once: true })
      }
    })
    cssReady
      .then(() => Promise.all(FACES.map((f) => document.fonts.load(f, SAMPLE))))
      .then(finish, finish)

    return () => window.clearTimeout(timer)
  }, [timeout])

  return ready
}
