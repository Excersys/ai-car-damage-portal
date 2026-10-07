/**
 * EZPZ booking search — shared by the home page, /book and /cars.
 * One search object lives in sessionStorage under `ezpz.search`
 * (port of the design's book.js).
 */
export interface EzpzSearch {
  from: string
  to: string
  d1: string
  t1: string
  d2: string
  t2: string
}

const KEY = 'ezpz.search'

export const TIMES: { v: string; l: string }[] = (() => {
  const out: { v: string; l: string }[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const ampm = h < 12 ? 'am' : 'pm'
      const hh = h % 12 === 0 ? 12 : h % 12
      out.push({
        v: `${h < 10 ? '0' : ''}${h}:${m === 0 ? '00' : '30'}`,
        l: `${hh}:${m === 0 ? '00' : '30'}${ampm}`,
      })
    }
  }
  return out
})()

export const AIRPORTS = [
  'LAX, Los Angeles',
  'SFO, San Francisco',
  'SAN, San Diego',
  'LAS, Las Vegas',
  'PHX, Phoenix',
  'JFK, New York',
  'MIA, Miami',
  'ORD, Chicago',
]

export function timeLabel(v: string): string {
  return TIMES.find((t) => t.v === v)?.l ?? v
}

/** yyyy-mm-dd in the visitor's local time zone */
export function isoDate(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10)
}

export function prettyDate(dstr: string): string {
  const p = String(dstr).split('-')
  if (p.length !== 3) return dstr
  const dt = new Date(+p[0], +p[1] - 1, +p[2])
  return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

/** Whole rental days between two yyyy-mm-dd strings, never below 1. */
export function rentalDays(a: string, b: string): number {
  const pa = String(a).split('-')
  const pb = String(b).split('-')
  if (pa.length !== 3 || pb.length !== 3) return 1
  const d = (Date.UTC(+pb[0], +pb[1] - 1, +pb[2]) - Date.UTC(+pa[0], +pa[1] - 1, +pa[2])) / 864e5
  return Math.max(1, Math.round(d) || 1)
}

export function readSearch(): EzpzSearch | null {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || 'null')
  } catch {
    return null
  }
}

export function writeSearch(s: EzpzSearch): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* storage unavailable: the search just is not remembered */
  }
}

export function defaultSearch(): EzpzSearch {
  return {
    from: '',
    to: '',
    d1: isoDate(new Date(Date.now() + 864e5)),
    t1: '10:30',
    d2: isoDate(new Date(Date.now() + 4 * 864e5)),
    t2: '10:30',
  }
}
