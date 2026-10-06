import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AIRPORTS,
  TIMES,
  defaultSearch,
  isoDate,
  prettyDate,
  readSearch,
  timeLabel,
  writeSearch,
  type EzpzSearch,
} from './bookSearch'

type Variant = 'home' | 'book' | 'cars'

interface Props {
  variant: Variant
  /** cars variant: re-price in place instead of navigating */
  onSearch?: (s: EzpzSearch) => void
}

const ARROW = (
  <span className="arrow">
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7h10M7 2l5 5-5 5" />
    </svg>
  </span>
)

const COPY: Record<Variant, { formClass: string; formId: string; returnLabel: string; dateLabel: string; note: string; button: string; buttonClass: string }> = {
  home: {
    formClass: 'bookbar',
    formId: 'book',
    returnLabel: 'Drop-off',
    dateLabel: 'Drop-off date',
    note: 'Pick a bay, we hold the car. No counter, no queue.',
    button: 'Show cars',
    buttonClass: 'btn btn-paint bookbar-go',
  },
  book: {
    formClass: 'bookbar bookbar-lg',
    formId: 'book',
    returnLabel: 'Return',
    dateLabel: 'Return date',
    note: 'Free to cancel until pickup.',
    button: 'Show cars',
    buttonClass: 'btn btn-paint bookbar-go',
  },
  cars: {
    formClass: 'bookbar bookbar-slim',
    formId: 'cars-search',
    returnLabel: 'Return',
    dateLabel: 'Return date',
    note: '',
    button: 'Update',
    buttonClass: 'btn btn-ink bookbar-go',
  },
}

/**
 * The painted booking plaque: airport, return airport, dates and times.
 * Validates, stores the search and either goes to the car list or reports the
 * new search to the page (cars variant).
 */
const BookBar: React.FC<Props> = ({ variant, onSearch }) => {
  const navigate = useNavigate()
  const copy = COPY[variant]
  const [s, setS] = useState<EzpzSearch>(() => {
    const base = defaultSearch()
    // the home page always starts fresh, /book and /cars remember the last search
    const saved = variant === 'home' ? null : readSearch()
    return saved ? { ...base, ...saved } : base
  })
  const [note, setNote] = useState<{ text: string; kind: '' | 'is-error' | 'is-ok' }>({ text: copy.note, kind: '' })
  const today = isoDate(new Date())
  const ids = variant !== 'cars'
  const fromRef = React.useRef<HTMLInputElement>(null)
  const d2Ref = React.useRef<HTMLInputElement>(null)

  const set = (patch: Partial<EzpzSearch>) => setS((cur) => ({ ...cur, ...patch }))

  const onD1 = (v: string) => set({ d1: v, d2: s.d2 < v ? v : s.d2 })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const bad = (text: string, el?: HTMLInputElement | null) => {
      setNote({ text, kind: 'is-error' })
      el?.focus()
    }
    if (!s.from.trim()) return bad('Tell us which airport you are landing at.', fromRef.current)
    if (!s.d1 || !s.d2) return bad('Pick both dates so we know how long to hold the car.')
    if (s.d2 < s.d1) return bad('The drop-off date cannot be before the pick-up date.', d2Ref.current)

    const dest = s.to.trim() || s.from.trim()
    const next: EzpzSearch = { ...s, from: s.from.trim(), to: dest }
    writeSearch(next)
    if (variant === 'home') {
      setNote({
        text: `${next.from} to ${dest}, ${prettyDate(next.d1)} ${timeLabel(next.t1)} until ${prettyDate(next.d2)} ${timeLabel(next.t2)}. Showing the cars.`,
        kind: 'is-ok',
      })
    } else {
      setNote({ text: copy.note, kind: '' })
    }
    if (onSearch) onSearch(next)
    else navigate('/cars')
  }

  return (
    <form
      className={copy.formClass}
      id={copy.formId}
      noValidate
      aria-label={variant === 'cars' ? 'Change your search' : 'Find a car'}
      onSubmit={submit}
    >
      <div className="bookbar-grid">
        <label className="bk">
          <span>Pick-up</span>
          <input
            ref={fromRef}
            type="text"
            id={ids ? 'bk-from' : undefined}
            name="from"
            list="ezpz-airports"
            placeholder="Airport or city"
            autoComplete="off"
            required
            value={s.from}
            onChange={(e) => set({ from: e.target.value })}
          />
        </label>
        <label className="bk">
          <span>{copy.returnLabel}</span>
          <input
            type="text"
            id={ids ? 'bk-to' : undefined}
            name="to"
            list="ezpz-airports"
            placeholder="Same as pick-up"
            autoComplete="off"
            value={s.to}
            onChange={(e) => set({ to: e.target.value })}
          />
        </label>
        <label className="bk bk-s">
          <span>Pick-up date</span>
          <input type="date" id={ids ? 'bk-d1' : undefined} name="d1" required min={today} value={s.d1} onChange={(e) => onD1(e.target.value)} />
        </label>
        <label className="bk bk-s">
          <span>Time</span>
          <select id={ids ? 'bk-t1' : undefined} name="t1" value={s.t1} onChange={(e) => set({ t1: e.target.value })}>
            {TIMES.map((t) => (
              <option key={t.v} value={t.v}>
                {t.l}
              </option>
            ))}
          </select>
        </label>
        <label className="bk bk-s">
          <span>{copy.dateLabel}</span>
          <input
            ref={d2Ref}
            type="date"
            id={ids ? 'bk-d2' : undefined}
            name="d2"
            required
            min={s.d1 || today}
            value={s.d2}
            onChange={(e) => set({ d2: e.target.value })}
          />
        </label>
        <label className="bk bk-s">
          <span>Time</span>
          <select id={ids ? 'bk-t2' : undefined} name="t2" value={s.t2} onChange={(e) => set({ t2: e.target.value })}>
            {TIMES.map((t) => (
              <option key={t.v} value={t.v}>
                {t.l}
              </option>
            ))}
          </select>
        </label>
        <button className={copy.buttonClass} type="submit">
          {copy.button} {ARROW}
        </button>
      </div>
      <p className={`bookbar-note${note.kind ? ' ' + note.kind : ''}`} id={ids ? 'bk-note' : undefined} role="status">
        {note.text}
      </p>
      <datalist id="ezpz-airports">
        {AIRPORTS.map((a) => (
          <option key={a} value={a}></option>
        ))}
      </datalist>
    </form>
  )
}

export default BookBar
