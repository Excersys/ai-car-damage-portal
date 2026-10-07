import React, { useEffect, useRef, useState } from 'react'
import { TIMES } from './bookSearch'

interface Props {
  id?: string
  name: string
  value: string
  labelledBy: string
  onChange: (value: string) => void
}

/**
 * A listbox that replaces the native time <select> on phones. The browser draws a native dropdown itself,
 * so its width cannot be matched to the field; this list is exactly as wide as the field.
 */
const TimeSelect: React.FC<Props> = ({ id, name, value, labelledBy, onChange }) => {
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const current = Math.max(0, TIMES.findIndex((t) => t.v === value))

  const openList = () => {
    setHi(current)
    setOpen(true)
  }

  // bring the chosen time into view when the list opens, and keep the highlighted one visible
  useEffect(() => {
    if (!open) return
    const el = list.current?.children[hi] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [open, hi])

  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open])

  const choose = (i: number) => {
    onChange(TIMES[i].v)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openList()
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setHi((h) => Math.min(TIMES.length - 1, h + 1)); break
      case 'ArrowUp': e.preventDefault(); setHi((h) => Math.max(0, h - 1)); break
      case 'Home': e.preventDefault(); setHi(0); break
      case 'End': e.preventDefault(); setHi(TIMES.length - 1); break
      case 'Enter':
      case ' ': e.preventDefault(); choose(hi); break
      case 'Escape': e.preventDefault(); setOpen(false); break
      case 'Tab': setOpen(false); break
    }
  }

  return (
    <div className="tsel" ref={root}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        id={id}
        className="tsel-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelledBy}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        {TIMES[current].l}
      </button>
      {open && (
        <ul className="tsel-list" role="listbox" aria-labelledby={labelledBy} ref={list}>
          {TIMES.map((t, i) => (
            <li
              key={t.v}
              role="option"
              aria-selected={i === current}
              className={`${i === current ? 'is-current' : ''}${i === hi ? ' is-hi' : ''}`.trim()}
              onPointerEnter={() => setHi(i)}
              onClick={() => choose(i)}
            >
              {t.l}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default TimeSelect
