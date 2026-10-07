import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { useDocumentTitle } from '../ezpz/useDocumentTitle'
import { prettyDate, timeLabel } from '../ezpz/bookSearch'
import { readOrder } from '../ezpz/orderStore'

/*
 * Confirmation (design: book/confirmed). Shows the reservation and draws the locker code QR only when the
 * device is at the pickup lot. THE GEOFENCE IS CLIENT SIDE ONLY: browser location can be spoofed, so it is a
 * convenience and a safety net for lost phones, not the lock. Real enforcement is the backend checking the
 * reservation and the locker itself at the kiosk.
 * Demo overrides: ?geo=ok shows the code from anywhere, ?geo=far shows the locked state as if 14 miles away.
 */
const APP_LINK = 'https://helloezpz.com/app/' // PLACEHOLDER until the real store links exist
const FENCE_M = 400 // metres from the lot reference point
// Reference points are the airport rental car centres. REPLACE with the real EZPZ lot coordinates per location.
const LOTS: Record<string, { lat: number; lng: number; name: string }> = {
  LAX: { lat: 33.9535, lng: -118.4038, name: 'LAX' },
  SFO: { lat: 37.6135, lng: -122.389, name: 'SFO' },
  SAN: { lat: 32.7338, lng: -117.1933, name: 'SAN' },
  LAS: { lat: 36.084, lng: -115.1537, name: 'LAS' },
  PHX: { lat: 33.4373, lng: -112.0078, name: 'PHX' },
  JFK: { lat: 40.6413, lng: -73.7781, name: 'JFK' },
  MIA: { lat: 25.7959, lng: -80.287, name: 'MIA' },
  ORD: { lat: 41.9742, lng: -87.9073, name: 'ORD' },
}

type Geo =
  | { state: 'checking' }
  | { state: 'ok'; demo: boolean }
  | { state: 'far'; metres: number }
  | { state: 'denied' }
  | { state: 'error' }

function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const toR = Math.PI / 180
  const dLat = (b.lat - a.lat) * toR
  const dLng = (b.lng - a.lng) * toR
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function fmt(m: number): string {
  const mi = m / 1609.344
  if (mi >= 0.5) return `${mi >= 10 ? Math.round(mi) : mi.toFixed(1)} mi`
  return `${Math.round(m / 0.3048 / 10) * 10} ft`
}

const ARROW = (
  <span className="arrow">
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7h10M7 2l5 5-5 5" />
    </svg>
  </span>
)

const ConfirmedPage: React.FC = () => {
  useDocumentTitle('Reserved · EZPZ')
  const [params] = useSearchParams()
  const order = useMemo(() => readOrder(), [])
  const [geo, setGeo] = useState<Geo>({ state: 'checking' })
  const [qr, setQr] = useState('')

  const code = (String(order?.search.from || '').match(/^([A-Z]{3})/) || [])[1]
  const lot = LOTS[code] || LOTS.LAX
  const link = order ? `${APP_LINK}?r=${encodeURIComponent(order.num.replace(/\s/g, ''))}` : APP_LINK
  const override = params.get('geo')

  const check = useCallback(() => {
    setGeo({ state: 'checking' })
    if (!navigator.geolocation) return setGeo({ state: 'error' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const m = distance({ lat: pos.coords.latitude, lng: pos.coords.longitude }, lot)
        setGeo(m <= FENCE_M + (pos.coords.accuracy || 0) / 2 ? { state: 'ok', demo: false } : { state: 'far', metres: m })
      },
      (e) => setGeo(e && e.code === 1 ? { state: 'denied' } : { state: 'error' }),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  }, [lot])

  useEffect(() => {
    if (!order) return
    if (override === 'ok') setGeo({ state: 'ok', demo: true })
    else if (override === 'far') setGeo({ state: 'far', metres: 14 * 1609.344 })
    else check()
  }, [order, override, check])

  // the code is only generated once the device is at the lot
  useEffect(() => {
    if (geo.state !== 'ok' || qr) return
    QRCode.toDataURL(link, { width: 188, margin: 0, errorCorrectionLevel: 'M', color: { dark: '#1B1D21', light: '#F4F3EF' } })
      .then(setQr)
      .catch(() => setQr(''))
  }, [geo.state, link, qr])

  if (!order) {
    return (
      <div className="wrap cfpage">
        <div className="cfhead">
          <p className="kicker">Reserved</p>
          <h1 className="stencil">Your keys are in the app.</h1>
          <p className="cklede">No reservation found in this browser. Start with a car and it takes a minute.</p>
        </div>
        <section className="cfnext">
          <Link className="btn btn-paint" to="/book">Find a car</Link>
        </section>
      </div>
    )
  }

  const s = order.search
  const p = order.pick
  const drivers = order.drivers && order.drivers.length ? order.drivers : [{ name: order.name, email: order.email, phone: '', dob: '', license: '', primary: true }]

  let title = 'Your locker code'
  let text = 'Finding your location. The code shows once you are on the pickup lot.'
  let lockTxt = 'Checking where you are'
  if (geo.state === 'ok') {
    text = `You are at ${lot.name}. Hold this to the kiosk and the locker opens.${geo.demo ? ' Demo view, location check skipped.' : ''}`
  } else if (geo.state === 'far') {
    title = `The code unlocks at ${lot.name}`
    text = `You are ${fmt(geo.metres)} from the pickup lot. The code appears on your phone once you are on the lot, so nobody can open your locker from anywhere else.`
    lockTxt = `${fmt(geo.metres)} away`
  } else if (geo.state === 'denied') {
    title = 'Location is off'
    text = 'The code only shows at the pickup lot, so this page needs your location. Allow it for this site in your browser settings and try again.'
    lockTxt = 'Location needed'
  } else if (geo.state === 'error') {
    title = 'Could not find you yet'
    text = 'Your phone did not report a position. Step outside or wait a moment and try again.'
    lockTxt = 'Try again'
  }

  return (
    <div className="wrap cfpage">
      <div className="cfhead">
        <p className="kicker">Reserved</p>
        <h1 className="stencil">Your keys are in the app.</h1>
        <p className="cklede" id="cf-lede">A text and an email with the same link are on their way. Your locker code below unlocks when you reach the lot.</p>
      </div>
      <div className="cfgrid">
        <section className="cfcard cfqr" id="cfqr" data-state={geo.state}>
          <div className="qrwrap" id="qrwrap">
            <div className="qrbox" id="qr" aria-label="Locker code">
              {qr && <img src={qr} alt="Locker code" />}
            </div>
            <div className="qrlock" id="qrlock" aria-hidden="true">
              <svg className="qrlock-ic" width="44" height="52" viewBox="0 0 44 52" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round">
                <rect x="3" y="22" width="38" height="27" rx="4" /><path d="M12 22v-8a10 10 0 0 1 20 0v8" /><circle cx="22" cy="35" r="3" /><path d="M22 38v5" />
              </svg>
              <b id="qrlock-txt">{lockTxt}</b>
            </div>
          </div>
          <div className="qrcopy">
            <h2 className="stencil" id="qr-title">{title}</h2>
            <p id="qr-text">{text}</p>
            <div className="cfstores" id="qr-actions">
              {geo.state === 'far' && (
                <a className="btn btn-ink" id="qr-way" href={`https://www.google.com/maps/dir/?api=1&destination=${lot.lat},${lot.lng}&travelmode=driving`} target="_blank" rel="noopener noreferrer">
                  Show me the way {ARROW}
                </a>
              )}
              {(geo.state === 'denied' || geo.state === 'error') && (
                <button className="btn btn-ink" type="button" id="qr-retry" onClick={check}>
                  Try again {ARROW}
                </button>
              )}
              <Link className="btn btn-ghost" id="cf-app" to={`/app?r=${encodeURIComponent(order.num.replace(/\s/g, ''))}`}>
                Open the app link {ARROW}
              </Link>
            </div>
            <p className="ckfine" id="qr-fine">The code only appears at the lot, so a lost phone cannot open your locker from across town. Starting on the site and finishing in the app, or the other way round, both work. Same reservation.</p>
          </div>
        </section>
        <aside className="cfcard cftrip" aria-label="Trip card">
          <div className="cfconf"><span>Confirmation</span><b id="cf-num">{order.num}</b></div>
          <div className="cksum-car">
            {p.img && <img id="cf-img" src={p.img} alt={p.cls} onError={(e) => ((e.target as HTMLImageElement).hidden = true)} />}
            <div>
              <p className="kicker">Your car</p>
              <h2 className="stencil" id="cf-cls">{p.cls}</h2>
              <p className="cs-ex" id="cf-ex">{p.example || ''}</p>
            </div>
          </div>
          <dl className="cstrip">
            <div><dt>Pick up</dt><dd id="cf-pick">{s.from}<br />{prettyDate(s.d1)} {timeLabel(s.t1)}</dd></div>
            <div><dt>Drop off</dt><dd id="cf-drop">{s.to}<br />{prettyDate(s.d2)} {timeLabel(s.t2)}</dd></div>
            <div><dt>Bay</dt><dd>Assigned when you land, shown in the app</dd></div>
            <div><dt>Paid</dt><dd id="cf-tot">${order.total}{order.test ? ' (test, not charged)' : ''}</dd></div>
            <div className="cf-drivers">
              <dt>Drivers</dt>
              <dd>
                <ul id="cf-drivers">
                  {drivers.map((d, i) => (
                    <li key={i}>
                      <b>{d.name}</b>
                      <span>{i === 0 ? 'Picks up the car. ID check at the kiosk.' : `Verification link sent to ${d.email}`}</span>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
          <p className="ckfine" id="cf-sent">Confirmation sent to {order.email}{order.phone ? ` and ${order.phone}` : ''} with the same app link.</p>
        </aside>
      </div>
      <section className="cfnext">
        <h2 className="stencil">When you land</h2>
        <ol className="cfsteps">
          <li><i>1</i><span>Open the app. Your bay number and a walking line to it are on the first screen.</span></li>
          <li><i>2</i><span>Hold your phone to the kiosk. The camera matches your face to your license, the locker opens, keys in hand. About twelve seconds.</span></li>
          <li><i>3</i><span>Drive out through the gantry. That scan is your baseline, and the only thing you can ever be charged for is what changes.</span></li>
        </ol>
      </section>
    </div>
  )
}

export default ConfirmedPage
