import type { EzpzSearch } from './bookSearch'

/** The car picked on /cars, kept next to the search for checkout (design: ezpz.pick). */
export interface EzpzPick {
  id?: string
  cls: string
  day: number
  days: number
  total: number
  body: string
  seats: string
  example: string
  img: string
}

export interface EzpzDriver {
  name: string
  email: string
  phone: string
  dob: string
  license: string
  primary: boolean
  /** downsized license photo as a data URL; kept in this browser only until a verification vendor is wired */
  photo?: string
}

/** The finished reservation, read by /confirmed (design: ezpz.order). */
export interface EzpzOrder {
  num: string
  ts: string
  search: EzpzSearch
  pick: EzpzPick
  days: number
  total: number
  name: string
  email: string
  phone: string
  drivers: EzpzDriver[]
  pm: string
  /** true when no real charge was made (Stripe test keys, no backend payment) */
  test: boolean
}

function read<T>(key: string): T | null {
  try {
    return JSON.parse(sessionStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}

export const readPick = () => read<EzpzPick>('ezpz.pick')
export const readOrder = () => read<EzpzOrder>('ezpz.order')

export function writeOrder(order: EzpzOrder): void {
  try {
    sessionStorage.setItem('ezpz.order', JSON.stringify(order))
  } catch {
    // license photos can push a four driver order past the storage quota: keep the order without them
    const slim = { ...order, drivers: order.drivers.map(({ photo: _photo, ...d }) => d) }
    try {
      sessionStorage.setItem('ezpz.order', JSON.stringify(slim))
    } catch {
      /* storage unavailable */
    }
  }
}
