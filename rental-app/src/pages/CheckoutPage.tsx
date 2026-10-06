import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js'
import { apiClient } from '../config/api'
import { useDocumentTitle } from '../ezpz/useDocumentTitle'
import { prettyDate, readSearch, rentalDays, timeLabel } from '../ezpz/bookSearch'
import { readPick, writeOrder, type EzpzDriver } from '../ezpz/orderStore'

/**
 * Checkout (design: book/checkout). Drivers, license photos and the card on one page.
 *
 * Payment has two modes, picked by configuration:
 *  - VITE_STRIPE_PUBLISHABLE_KEY set: the real flow the rest of the app uses. The API creates the
 *    PaymentIntent, the card is confirmed with Stripe and /bookings/complete records the booking.
 *  - not set: TEST MODE, as in the design. The card is only tokenized with Stripe's public
 *    documentation key, nothing is charged and no backend call is made.
 */
const DOCS_TEST_KEY = 'pk_test_TYooMQauvdEDq54NiTphI7jx'
const CONFIGURED_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined
const TEST_MODE = !CONFIGURED_KEY
const stripePromise = loadStripe(CONFIGURED_KEY || DOCS_TEST_KEY)

const MAX_DRIVERS = 4
const FONTS = [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600&display=swap' }]

interface DriverForm {
  name: string
  email: string
  phone: string
  dob: string
  license: string
  photo: string
}
const blankDriver = (): DriverForm => ({ name: '', email: '', phone: '', dob: '', license: '', photo: '' })

const ARROW = (
  <span className="arrow">
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7h10M7 2l5 5-5 5" />
    </svg>
  </span>
)

function ageOf(dob: string): number {
  const d = new Date(dob)
  const t = new Date()
  let a = t.getFullYear() - d.getFullYear()
  const m = t.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--
  return a
}

/** Downsizes a license photo on the device before it is kept (max 900px, JPEG). */
function downsize(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const rd = new FileReader()
    rd.onerror = () => reject(new Error('read'))
    rd.onload = () => {
      const pic = new Image()
      pic.onerror = () => reject(new Error('decode'))
      pic.onload = () => {
        const sc = Math.min(1, 900 / Math.max(pic.width, pic.height))
        const c = document.createElement('canvas')
        c.width = Math.round(pic.width * sc)
        c.height = Math.round(pic.height * sc)
        c.getContext('2d')!.drawImage(pic, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/jpeg', 0.82))
      }
      pic.src = rd.result as string
    }
    rd.readAsDataURL(file)
  })
}

const CheckoutForm: React.FC = () => {
  const navigate = useNavigate()
  const stripe = useStripe()
  const elements = useElements()
  const search = readSearch()
  const pick = readPick()

  const [drivers, setDrivers] = useState<DriverForm[]>([blankDriver()])
  const [active, setActive] = useState(0)
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const n = search ? rentalDays(search.d1, search.d2) : 1
  const total = pick ? Math.round(pick.day * n) : 0
  const empty = !search || !pick

  // the "nothing picked yet" overlay locks page scroll like the design
  useEffect(() => {
    if (!empty) return
    document.body.classList.add('sheet-open')
    return () => document.body.classList.remove('sheet-open')
  }, [empty])

  const patch = (i: number, p: Partial<DriverForm>) => setDrivers((ds) => ds.map((d, k) => (k === i ? { ...d, ...p } : d)))

  const addDriver = () => {
    if (drivers.length >= MAX_DRIVERS) return
    setDrivers((ds) => [...ds, blankDriver()])
    setActive(drivers.length)
    window.setTimeout(() => document.getElementById(`d${drivers.length}-name`)?.focus(), 0)
  }
  const removeDriver = (i: number) => {
    if (i === 0) return
    setDrivers((ds) => ds.filter((_, k) => k !== i))
    setActive((a) => Math.min(a > i ? a - 1 : a, drivers.length - 2))
  }

  const fail = (msg: string, driver?: number, field?: string) => {
    setError(msg)
    if (driver !== undefined) setActive(driver)
    window.setTimeout(() => {
      const el = field ? document.getElementById(field) : null
      el?.focus()
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 0)
  }

  const onPhoto = async (i: number, file?: File) => {
    if (!file) return
    if (!/^image\//.test(file.type)) return fail('The license photo has to be an image.', i, `d${i}-photo`)
    try {
      patch(i, { photo: await downsize(file) })
    } catch {
      fail('That photo could not be read. Try another one.', i, `d${i}-photo`)
    }
  }

  /** returns the first problem, or null when every driver is complete */
  const validate = (): { msg: string; i: number; field: string } | null => {
    for (let i = 0; i < drivers.length; i++) {
      const d = drivers[i]
      const who = `Driver ${i + 1}`
      if (d.name.trim().length < 2) return { msg: `${who}: full name, as printed on the license.`, i, field: `d${i}-name` }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim()))
        return { msg: `${who}: a valid email. ${i === 0 ? 'That is where the confirmation goes.' : 'That is where the verification link goes.'}`, i, field: `d${i}-email` }
      if (i === 0 && d.phone.replace(/\D/g, '').length < 10) return { msg: 'Driver 1: a mobile number with area code, for the pickup text.', i, field: 'd0-phone' }
      if (!d.dob) return { msg: `${who}: date of birth.`, i, field: `d${i}-dob` }
      if (ageOf(d.dob) < 21) return { msg: `${who}: drivers have to be 21 or older.`, i, field: `d${i}-dob` }
      if (d.license.trim().length < 4) return { msg: `${who}: driver license number.`, i, field: `d${i}-license` }
      if (!d.photo) return { msg: `${who}: a photo of the front of the license.`, i, field: `d${i}-photo` }
    }
    return null
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!search || !pick) return
    const bad = validate()
    if (bad) return fail(bad.msg, bad.i, bad.field)
    if (!agree) return fail('Please accept the contract. It is the only terms you can be charged against.', undefined, 'ck-agree')
    const card = elements?.getElement(CardElement)
    if (!stripe || !elements || !card) return fail('The card form is not ready. Reload and try again.')

    const me = drivers[0]
    setBusy(true)
    try {
      const billing = { name: me.name.trim(), email: me.email.trim(), phone: me.phone.trim() }
      let paymentRef = ''
      let bookingNum = ''

      if (TEST_MODE) {
        // test mode: tokenize the card only, nothing is charged
        const res = await stripe.createPaymentMethod({ type: 'card', card, billing_details: billing })
        if (res.error) throw new Error(res.error.message)
        paymentRef = res.paymentMethod.id
      } else {
        const reservationId = 'temp_reservation'
        const { data: intent } = await apiClient.post('/payments/create-intent', {
          amount: total,
          currency: 'usd',
          reservationId,
          metadata: { carId: pick.id, pickupDate: search.d1, returnDate: search.d2, totalDays: String(n) },
        })
        const res = await stripe.confirmCardPayment(intent.clientSecret, { payment_method: { card, billing_details: billing } })
        if (res.error) throw new Error(res.error.message)
        const pi = res.paymentIntent
        if (!pi || (pi.status !== 'succeeded' && pi.status !== 'requires_capture')) throw new Error(`Payment did not go through (${pi?.status ?? 'no status'}).`)
        paymentRef = pi.id
        const { data: done } = await apiClient.post('/bookings/complete', {
          paymentIntentId: pi.id,
          reservationId,
          bookingDetails: { carId: pick.id, search, days: n, total, drivers: drivers.map((d) => ({ name: d.name.trim(), email: d.email.trim() })) },
        })
        bookingNum = done?.booking?.id || done?.bookingId || ''
      }

      const list: EzpzDriver[] = drivers.map((d, i) => ({
        name: d.name.trim(),
        email: d.email.trim(),
        phone: i === 0 ? d.phone.trim() : '',
        dob: d.dob,
        license: d.license.trim(),
        photo: d.photo,
        primary: i === 0,
      }))
      writeOrder({
        num: bookingNum || 'EZ ' + String(Math.floor(100000 + Math.random() * 900000)),
        ts: new Date().toISOString(),
        search,
        pick,
        days: n,
        total,
        name: me.name.trim(),
        email: me.email.trim(),
        phone: me.phone.trim(),
        drivers: list,
        pm: paymentRef,
        test: TEST_MODE,
      })
      navigate('/confirmed')
    } catch (err) {
      setBusy(false)
      const msg = (err as { response?: { data?: { error?: string } }; message?: string })
      fail(msg.response?.data?.error || msg.message || 'The payment could not be completed. Try again.')
    }
  }

  return (
    <>
      <div className="wrap ckpage">
        {TEST_MODE && (
          <div className="testbanner" role="status">
            <b>Test mode.</b> Payments run on Stripe test keys. No card is charged. Use 4242 4242 4242 4242, any future date, any CVC.
          </div>
        )}
        <div className="ckhead">
          <p className="kicker">Step 3 of 3</p>
          <h1 className="stencil">Pay once. Keys in the app.</h1>
          <p className="cklede">One page. Card now, license photo now, and the ID check happens at the kiosk when you pick up.</p>
        </div>
        <div className="ckgrid">
          <form className="ckform" id="ckform" noValidate onSubmit={submit}>
            <section className="ckcard" id="drivers-card">
              <div className="ckcard-head">
                <h2 className="stencil">Drivers</h2>
                <button type="button" className="btn btn-ghost btn-sm" id="add-driver" hidden={drivers.length >= MAX_DRIVERS} disabled={drivers.length >= MAX_DRIVERS} onClick={addDriver}>
                  Add another driver{' '}
                  <span className="arrow">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 2v10M2 7h10" /></svg>
                  </span>
                </button>
              </div>
              <div className="drvtabs" id="drvtabs" role="tablist" aria-label="Drivers" hidden={drivers.length < 2}>
                {drivers.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`drvtab${i === active ? ' is-active' : ''}`}
                    role="tab"
                    id={`drvtab-${i}`}
                    aria-selected={i === active}
                    aria-controls={`drvpanel-${i}`}
                    onClick={() => setActive(i)}
                  >
                    {i === 0 ? <>Driver 1 <small>picks up</small></> : `Driver ${i + 1}`}
                  </button>
                ))}
              </div>
              <div id="drvpanels">
                {drivers.map((d, i) => {
                  const primary = i === 0
                  return (
                    <div className="drvpanel" role="tabpanel" id={`drvpanel-${i}`} key={i} hidden={i !== active}>
                      <div className="drvpanel-head">
                        <p className="kicker">{primary ? 'Driver 1 picks up the car' : `Driver ${i + 1}`}</p>
                        {!primary && (
                          <button type="button" className="drv-remove" onClick={() => removeDriver(i)}>Remove</button>
                        )}
                      </div>
                      <div className="ckfields">
                        <label className="fld">
                          <span>Full name, as on the license</span>
                          <input type="text" id={`d${i}-name`} name={`d${i}-name`} autoComplete={primary ? 'name' : 'off'} required placeholder={primary ? 'Alex Rivera' : 'Sam Okafor'} value={d.name} onChange={(e) => patch(i, { name: e.target.value })} />
                        </label>
                        <label className="fld">
                          <span>Email</span>
                          <input type="email" id={`d${i}-email`} name={`d${i}-email`} autoComplete={primary ? 'email' : 'off'} required placeholder={primary ? 'alex@example.com' : 'sam@example.com'} value={d.email} onChange={(e) => patch(i, { email: e.target.value })} />
                        </label>
                        {primary && (
                          <label className="fld">
                            <span>Mobile, for the pickup text</span>
                            <input type="tel" id="d0-phone" name="d0-phone" autoComplete="tel" inputMode="tel" required placeholder="(310) 555 0134" value={d.phone} onChange={(e) => patch(i, { phone: e.target.value })} />
                          </label>
                        )}
                        <label className="fld">
                          <span>Date of birth</span>
                          <input type="date" id={`d${i}-dob`} name={`d${i}-dob`} autoComplete={primary ? 'bday' : 'off'} required value={d.dob} onChange={(e) => patch(i, { dob: e.target.value })} />
                        </label>
                        <label className={`fld${primary ? '' : ' fld-wide'}`}>
                          <span>Driver license number</span>
                          <input type="text" id={`d${i}-license`} name={`d${i}-license`} autoComplete="off" required placeholder="D1234567" value={d.license} onChange={(e) => patch(i, { license: e.target.value })} />
                        </label>
                        <div className="fld fld-wide upl" id={`upl-${i}`}>
                          <span>Driver license, front</span>
                          <label className={`upl-box${d.photo ? ' has-photo' : ''}`} htmlFor={`d${i}-photo`}>
                            <input type="file" id={`d${i}-photo`} name={`d${i}-photo`} accept="image/*" capture="environment" onChange={(e) => { void onPhoto(i, e.target.files?.[0]); e.target.value = '' }} />
                            {d.photo ? (
                              <img src={d.photo} alt="Your license photo" />
                            ) : (
                              <svg className="upl-ic" width="34" height="26" viewBox="0 0 34 26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
                                <rect x="1.5" y="1.5" width="31" height="23" rx="3" /><circle cx="10" cy="11" r="3.2" /><path d="M5.5 20c1-3.2 3-4.6 4.5-4.6S13.5 16.8 14.5 20M18 8h10M18 12.5h10M18 17h6" />
                              </svg>
                            )}
                            {!d.photo && <em>Tap to take a photo or choose one</em>}
                            {d.photo && <b className="upl-ok">Photo added. Tap to replace.</b>}
                          </label>
                        </div>
                      </div>
                      {!primary && (
                        <p className="drv-note" id={`drv-note-${i}`}>
                          {d.email.trim() ? `A verification link goes to ${d.email.trim()} before pickup.` : 'A verification link goes to this driver by email before pickup.'}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="ckfine">Driver 1 is the person who picks up the car and must be on the rental for insurance. Every other driver gets their own verification link by email before pickup, and each license photo travels with the reservation. The ID check itself happens at the kiosk: the camera matches the face to the license before the locker opens.</p>
            </section>
            <section className="ckcard">
              <h2 className="stencil">Payment</h2>
              <div className="fld">
                <span>Card</span>
                <CardElement
                  className="cardel"
                  options={{
                    hidePostalCode: false,
                    style: {
                      base: { fontFamily: '"Bricolage Grotesque", sans-serif', fontSize: '16px', color: '#1B1D21', '::placeholder': { color: '#8A8D93' } },
                      invalid: { color: '#FF5A3C' },
                    },
                  }}
                  onChange={(ev) => setError(ev.error ? ev.error.message : '')}
                />
              </div>
              <p className="ckerr" id="ckerr" role="alert" hidden={!error}>{error}</p>
              <label className="ckagree">
                <input type="checkbox" id="ck-agree" name="agree" required checked={agree} onChange={(e) => setAgree(e.target.checked)} />{' '}
                <span>I accept the rental contract. It is the only terms I can be charged against, and the two scans decide any damage line.</span>
              </label>
              <button className={`btn btn-paint btn-big${busy ? ' is-busy' : ''}`} type="submit" id="ckpay" disabled={busy}>
                Pay <b id="ckpay-amt">${total}</b> and reserve {ARROW}
              </button>
              <p className="ckfine">Free cancellation until pickup. Taxes and fees are in the price. A hold of $0 is placed, the two scans replace the deposit.</p>
            </section>
          </form>

          <aside className="cksum" id="cksum" aria-label="Your reservation">
            <div className="cksum-car">
              {pick?.img && <img id="cs-img" src={pick.img} alt={pick.cls} onError={(e) => ((e.target as HTMLImageElement).hidden = true)} />}
              <div>
                <p className="kicker" id="cs-kicker">Your car</p>
                <h2 className="stencil" id="cs-cls">{pick?.cls ?? 'Compact'}</h2>
                <p className="cs-ex" id="cs-ex">{pick?.example ?? ''}</p>
              </div>
            </div>
            <dl className="cstrip">
              <div><dt>Pick up</dt><dd id="cs-pick">{search && <>{search.from}<br />{prettyDate(search.d1)} {timeLabel(search.t1)}</>}</dd></div>
              <div><dt>Drop off</dt><dd id="cs-drop">{search && <>{search.to}<br />{prettyDate(search.d2)} {timeLabel(search.t2)}</>}</dd></div>
            </dl>
            <dl className="csprice">
              <div><dt id="cs-days">{n} day{n === 1 ? '' : 's'} x ${pick?.day ?? 0}</dt><dd id="cs-sub">${total}</dd></div>
              <div><dt>Taxes and fees</dt><dd>Included</dd></div>
              <div><dt>Deposit</dt><dd>None</dd></div>
              <div className="tot"><dt>Total</dt><dd id="cs-tot">${total}</dd></div>
            </dl>
            <Link className="cs-change" to="/cars">Change car or dates</Link>
            <p className="ckfine">Every number here is the search you made, priced per day.</p>
          </aside>
        </div>
      </div>

      {empty && (
        <div className="ckempty" id="ckempty">
          <div className="ckempty-in">
            <p className="kicker">Nothing picked yet</p>
            <h2 className="stencil">Start with a car</h2>
            <p>Tell us where and when, pick a car, and checkout takes a minute.</p>
            <Link className="btn btn-paint" to="/book">Find a car {ARROW}</Link>
          </div>
        </div>
      )}
    </>
  )
}

/** /checkout */
const CheckoutPage: React.FC = () => {
  useDocumentTitle('Checkout · EZPZ')
  return (
    <Elements stripe={stripePromise} options={{ fonts: FONTS }}>
      <CheckoutForm />
    </Elements>
  )
}

export default CheckoutPage
