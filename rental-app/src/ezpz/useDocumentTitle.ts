import { useEffect } from 'react'

/** Sets document.title while the page is mounted and restores the previous one. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const prev = document.title
    document.title = title
    return () => {
      document.title = prev
    }
  }, [title])
}
