import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import BookBar from '../ezpz/BookBar'
import { useDocumentTitle } from '../ezpz/useDocumentTitle'
import {
  defaultSearch,
  prettyDate,
  readSearch,
  rentalDays,
  timeLabel,
  type EzpzSearch,
} from '../ezpz/bookSearch'
import { apiClient } from '../config/api'
import type { VehicleSearchResponse, VehicleSearchResult } from '../types/vehicleSearch'

type Body = 'sedan' | 'suv' | 'ev' | 'van' | 'convertible' | 'truck'

interface CarCardData {
  id: string
  title: string
  example: string
  body: Body
  day: number
  seats: number
  bags: number
  doors: number
  transmission: string
  range: string
  awd: boolean
  tag: string
  image: string
  vehicle: VehicleSearchResult
}

const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'sedan', label: 'Cars' },
  { key: 'suv', label: 'SUVs' },
  { key: 'van', label: 'Vans' },
  { key: 'ev', label: 'Electric' },
  { key: 'big', label: '6 plus seats' },
  { key: 'bags', label: '4 plus bags' },
  { key: 'awd', label: 'AWD or 4x4' },
  { key: 'cheap', label: 'Under $60 a day' },
]

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

function bodyFor(v: VehicleSearchResult): Body {
  if (v.fuelType === 'electric' || v.type === 'electric') return 'ev'
  switch (v.type) {
    case 'suv':
    case 'crossover':
      return 'suv'
    case 'van':
    case 'minivan':
      return 'van'
    case 'sports':
    case 'convertible':
      return 'convertible'
    case 'truck':
    case 'pickup':
      return 'truck'
    default:
      return 'sedan'
  }
}

const DOORS: Record<Body, number> = { sedan: 4, suv: 5, ev: 4, van: 5, convertible: 2, truck: 4 }

function toCard(v: VehicleSearchResult, topReviews: number): CarCardData {
  const body = bodyFor(v)
  const features = (v.features || []).join(' ').toLowerCase()
  let tag = ''
  if (body === 'ev') tag = 'Charged to 100%'
  else if (topReviews > 0 && v.reviewCount === topReviews) tag = 'Most booked'
  return {
    id: v.id,
    title: `${v.make} ${v.model}`,
    example: `${v.year} · ${cap(v.category)}`,
    body,
    day: v.pricePerDay,
    seats: v.passengers,
    bags: v.luggage,
    doors: DOORS[body],
    transmission: cap(v.transmission),
    range: v.range ? `${v.range} mi range` : v.mpg ? `${v.mpg} mpg` : cap(v.fuelType),
    awd: /awd|4x4|all-wheel|four-wheel/.test(features),
    tag,
    image: v.images?.[0]?.trim() || '',
    vehicle: v,
  }
}

const SILHOUETTES: Record<Body, React.ReactNode> = {
  sedan: (
    <>
      <path d="M14 74h172M32 74c0-8 6-14 14-14s14 6 14 14M140 74c0-8 6-14 14-14s14 6 14 14" />
      <path d="M18 74c-2-12 2-20 12-23l16-4 18-17c4-4 9-6 15-6h44c7 0 13 3 17 8l14 17 18 5c8 2 12 8 11 20" />
      <path d="M62 30l-14 17h44V30zM106 30v17h42l-13-16c-2-1-4-1-6-1z" />
    </>
  ),
  suv: (
    <>
      <path d="M12 76h176M34 76c0-9 7-16 16-16s16 7 16 16M136 76c0-9 7-16 16-16s16 7 16 16" />
      <path d="M16 76c-3-14 0-24 10-27l10-3 6-22c2-6 7-10 14-10h84c7 0 13 4 15 10l7 22 12 4c8 3 11 12 9 26" />
      <path d="M52 24l-5 22h48V24zM101 24v22h50l-6-21c-1-1-2-1-4-1z" />
    </>
  ),
  ev: (
    <>
      <path d="M14 74h172M34 74c0-8 6-14 14-14s14 6 14 14M138 74c0-8 6-14 14-14s14 6 14 14" />
      <path d="M16 74c-2-13 3-21 13-24l22-6 20-16c4-3 8-5 13-5h36c6 0 11 2 15 6l19 17 20 6c8 3 11 10 10 22" />
      <path d="M70 28l-16 16h44V28zM104 28v16h44l-16-15c-2-1-3-1-5-1z" />
      <path d="M96 52l-8 12h10l-4 10 12-14h-10l6-8z" fill="currentColor" stroke="none" />
    </>
  ),
  van: (
    <>
      <path d="M12 76h176M36 76c0-9 7-16 16-16s16 7 16 16M132 76c0-9 7-16 16-16s16 7 16 16" />
      <path d="M16 76c-3-16 0-28 10-32l16-6 12-18c3-4 8-6 13-6h78c8 0 14 6 14 14v42" />
      <path d="M60 22l-9 16h40V22zM99 22v16h46V29c0-4-3-7-7-7z" />
    </>
  ),
  convertible: (
    <>
      <path d="M14 74h172M34 74c0-8 6-14 14-14s14 6 14 14M138 74c0-8 6-14 14-14s14 6 14 14" />
      <path d="M16 74c-2-12 2-20 12-23l20-5 22-11c4-2 8-3 12-3h34c6 0 11 2 15 6l16 13 20 5c8 2 12 8 11 20" />
      <path d="M60 38c14-8 26-11 40-11s26 3 38 10" strokeDasharray="5 6" />
    </>
  ),
  truck: (
    <>
      <path d="M12 76h176M34 76c0-9 7-16 16-16s16 7 16 16M134 76c0-9 7-16 16-16s16 7 16 16" />
      <path d="M16 76c-3-14 0-24 10-27l10-3 8-22c2-6 7-10 14-10h44c7 0 12 4 14 10l7 22h48v30" />
      <path d="M56 24l-6 22h40V24zM95 24v22h44l-6-21c-1-1-2-1-4-1z" />
      <path d="M110 50h78v26h-78z" />
    </>
  ),
}

const ARROW = (
  <span className="arrow">
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7h10M7 2l5 5-5 5" />
    </svg>
  </span>
)

function matches(c: CarCardData, f: string): boolean {
  switch (f) {
    case 'all': return true
    case 'big': return c.seats >= 6
    case 'sedan': return c.body === 'sedan' || c.body === 'convertible'
    case 'bags': return c.bags >= 4
    case 'cheap': return c.day < 60
    case 'awd': return c.awd
    default: return c.body === f
  }
}

const CarShot: React.FC<{ car: CarCardData }> = ({ car }) => {
  const [broken, setBroken] = useState(false)
  return (
    <div className="carshot" data-body={car.body}>
      {car.image && !broken && (
        <img src={car.image} alt={car.title} loading="lazy" onError={() => setBroken(true)} />
      )}
      <svg className="carsil" viewBox="0 0 200 90" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {SILHOUETTES[car.body]}
      </svg>
    </div>
  )
}

/** /cars — "Pick your car" (design: book/cars/index.html), cars come from the vehicles API. */
const CarsPage: React.FC = () => {
  useDocumentTitle('Pick your car · EZPZ')

  const [search, setSearch] = useState<EzpzSearch | null>(() => readSearch())
  const [filter, setFilter] = useState('all')
  const [cars, setCars] = useState<CarCardData[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [picked, setPicked] = useState<CarCardData | null>(null)

  // with nothing searched yet, price against the dates the search form is showing
  const effective = search ?? defaultSearch()
  const n = rentalDays(effective.d1, effective.d2)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setError('')
    apiClient
      .get<VehicleSearchResponse>('/vehicles/search', {
        params: {
          location: 'all',
          vehicleType: 'all',
          minPrice: 0,
          maxPrice: 100000,
          sortBy: 'price',
          sortOrder: 'asc',
          page: 1,
          limit: 100,
          startDate: effective.d1,
          endDate: effective.d2,
        },
      })
      .then(({ data }) => {
        if (cancelled) return
        const list = (data.vehicles || []).filter((v) => v.available !== false)
        const topReviews = list.length > 1 ? Math.max(...list.map((v) => v.reviewCount || 0)) : 0
        setCars(list.map((v) => toCard(v, topReviews)))
        setStatus('ready')
      })
      .catch((e: unknown) => {
        if (cancelled) return
        const msg =
          typeof e === 'object' && e !== null && 'response' in e &&
          typeof (e as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
            ? (e as { response: { data: { error: string } } }).response.data.error
            : 'Failed to load vehicles'
        setError(msg)
        setCars([])
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [effective.d1, effective.d2])

  const shown = useMemo(() => cars.filter((c) => matches(c, filter)), [cars, filter])

  // confirm sheet: lock page scroll, close on Escape
  useEffect(() => {
    if (!picked) return
    document.body.classList.add('sheet-open')
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPicked(null)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove('sheet-open')
      document.removeEventListener('keydown', onKey)
    }
  }, [picked])

  const pick = (car: CarCardData) => {
    try {
      // the pick travels to checkout in sessionStorage next to the search
      sessionStorage.setItem(
        'ezpz.pick',
        JSON.stringify({
          id: car.id,
          cls: car.title,
          day: car.day,
          days: n,
          total: Math.round(car.day * n),
          body: car.body,
          seats: String(car.seats),
          example: car.example,
          img: car.image,
        }),
      )
    } catch {
      /* storage unavailable */
    }
    setPicked(car)
  }

  return (
    <div className="carspage">
      <section className="carsbar wrap">
        <BookBar variant="cars" onSearch={setSearch} />
      </section>

      <section className="wrap carshead">
        <div>
          <p className="kicker">Step 2 of 3</p>
          <h1 className="stencil">Pick your car</h1>
          <p className="carswhen" id="carswhen">
            {search ? (
              <>
                <b>{search.from}</b> {prettyDate(search.d1)} {timeLabel(search.t1)} &rarr; <b>{search.to}</b> {prettyDate(search.d2)} {timeLabel(search.t2)} &middot; {n} day{n === 1 ? '' : 's'}
              </>
            ) : (
              <>Add your airport above to hold a car. Prices below are for {n} day{n === 1 ? '' : 's'}.</>
            )}
          </p>
        </div>
        <div className="carsfilter" role="group" aria-label="Filter cars by type, seats, bags and price">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" className={`chip${filter === f.key ? ' on' : ''}`} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
      </section>

      <section className="wrap">
        <div className="cargrid" id="cargrid">
          {shown.map((car, i) => (
            <article key={car.id} className="carcard" style={{ '--i': i } as React.CSSProperties}>
              <CarShot car={car} />
              <div className="carbody">
                <div className="carhead">
                  <h3>{car.title}</h3>
                  {car.tag && <span className="cartag">{car.tag}</span>}
                </div>
                <p className="carex">{car.example}</p>
                <ul className="carspecs">
                  <li>{car.seats} seats</li>
                  <li>{car.bags} bag{car.bags === 1 ? '' : 's'}</li>
                  <li>{car.doors} doors</li>
                  <li>{car.transmission}</li>
                  <li>{car.range}</li>
                </ul>
              </div>
              <div className="carbuy">
                <p className="carday"><b className="js-day">${car.day}</b><span>per day</span></p>
                <p className="cartot">
                  <span className="js-tot">${Math.round(car.day * n)}</span> total <span className="js-nights">for {n} day{n === 1 ? '' : 's'}</span>
                </p>
                <button className="btn btn-paint carpick" type="button" onClick={() => pick(car)}>
                  Select {ARROW}
                </button>
                <p className="carfine">All in. Taxes and fees included. Free cancellation.</p>
              </div>
            </article>
          ))}
        </div>
        {status === 'loading' && <p className="carsnone">Loading cars…</p>}
        {status === 'error' && (
          <p className="carsnone" role="alert">
            Could not load vehicles. {error}. Check that the API is running and try again.
          </p>
        )}
        {status === 'ready' && shown.length === 0 && (
          <p className="carsnone">Nothing in that group at this airport. Tap All to see everything.</p>
        )}
      </section>

      <section className="wrap carsfoot">
        <div className="carsfoot-in">
          <h2 className="stencil">Then it is just step 3</h2>
          <p>Tap the kiosk with your phone, take the keys, drive out. The car is scanned on the way out and on the way back, so the only thing you can be charged for is something that actually changed.</p>
          <Link className="btn btn-ink" to="/#scan">
            See how the scan works {ARROW}
          </Link>
        </div>
      </section>

      {picked && (
        <div className="carsheet" id="carsheet" onClick={(e) => e.target === e.currentTarget && setPicked(null)}>
          <div className="carsheet-in" role="dialog" aria-modal="true" aria-labelledby="cshead">
            <button className="carsheet-x" type="button" aria-label="Close" autoFocus onClick={() => setPicked(null)}>
              &times;
            </button>
            <p className="kicker">Step 2 of 3</p>
            <h2 className="stencil" id="cshead">Good pick</h2>
            <p className="cssum" id="cssum">
              <b>{picked.title}</b>, {n} day{n === 1 ? '' : 's'}, <b>${Math.round(picked.day * n)}</b> all in
              {search ? (
                <>
                  .<br />
                  {search.from} {prettyDate(search.d1)} {timeLabel(search.t1)} to {search.to} {prettyDate(search.d2)} {timeLabel(search.t2)}.
                </>
              ) : (
                '.'
              )}
            </p>
            <p>Next is a one page checkout: your name, your card, done. The ID and card checks happen in the background while you pay, nothing extra to do. Then the keys are in the app.</p>
            <div className="csbtns">
              <Link className="btn btn-paint" to="/checkout">
                Continue to checkout {ARROW}
              </Link>
              <button className="btn btn-ghost carsheet-back" type="button" onClick={() => setPicked(null)}>
                Pick a different car
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CarsPage
