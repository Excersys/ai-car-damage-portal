import React from 'react'
import { Link } from 'react-router-dom'
import businessCss from '../ezpz/business.css?inline'
import { useStyleSheet } from '../ezpz/useStyleSheet'
import { useDocumentTitle } from '../ezpz/useDocumentTitle'

/** /business — EZPZ for car rental companies (design: business/index.html). Static content. */
const BusinessPage: React.FC = () => {
  useDocumentTitle('EZPZ for rental companies')
  // the sections merged in from the old operators page carry their own styles
  useStyleSheet(businessCss, 'ezpz-business')

  return (
    <div className="bizpage">
      <section className="bizhero wrap">
        <p className="kicker">For car rental companies</p>
        <h1 className="stencil">Your fleet. <span style={{ color: 'var(--paint)', WebkitTextStroke: '2px var(--ink)', paintOrder: 'stroke fill' }}>No counter.</span></h1>
        <p className="lede">EZPZ is the booking site, the kiosk handover and the damage scan, running as one system on top of the cars you already own. Your customer books on your page, walks past the desk, taps the kiosk and drives.</p>
        <div className="actions">
          <Link className="btn btn-ink" to="/business#how">See how it works <span className="arrow"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7h10M7 2l5 5-5 5" /></svg></span></Link>
          <Link className="btn btn-paint" to="/business#talk">Book a walkthrough <span className="arrow"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7h10M7 2l5 5-5 5" /></svg></span></Link>
        </div>
        <div className="bizstats">
          <div className="bizstat"><b>0</b><span>counter staff needed to hand over a car</span></div>
          <div className="bizstat"><b>24/7</b><span>pickups, including the late flights you turn away today</span></div>
          <div className="bizstat"><b>2</b><span>full vehicle scans per rental, out and back</span></div>
          <div className="bizstat"><b>1</b><span>system for booking, handover, damage and billing</span></div>
        </div>
      </section>

      <section className="wrap sechead" id="how">
        <h2 className="stencil">What you plug in</h2>
        <p>Six pieces. You can take all of it or start with the booking site and add the rest when you are ready.</p>
        <div className="bizgrid">
          <div className="bizcard"><span className="num">01</span><h3>Your booking site</h3><p>A fast, mobile first booking page under your own brand and your own domain. Fleet classes, live availability, your rates, your rules. No third party marketplace taking a cut of every reservation.</p></div>
          <div className="bizcard"><span className="num">02</span><h3>Kiosk handover</h3><p>The customer taps the kiosk with their phone, the keys drop, the app tells them which bay. Nobody stands behind a desk at midnight waiting for a delayed flight.</p></div>
          <div className="bizcard"><span className="num">03</span><h3>The damage scan</h3><p>Every car is scanned on the way out and on the way back. The two scans are compared, so a dispute becomes a picture instead of an argument, and your team stops eating damage nobody can prove.</p></div>
          <div className="bizcard"><span className="num">04</span><h3>Pricing and rules</h3><p>Set day rates, weekend rules, minimum ages, mileage and deposits per class. Change a price and it is live on the booking page immediately.</p></div>
          <div className="bizcard"><span className="num">05</span><h3>Operator dashboard</h3><p>Every reservation, every scan, every open bay in one screen. Your staff see what is on the lot right now and what is coming back tonight.</p></div>
          <div className="bizcard"><span className="num">06</span><h3>It runs on your fleet</h3><p>You keep the cars, the insurance and the customer relationship. EZPZ is the layer that takes the counter, the paperwork and the damage fight out of the middle.</p></div>
        </div>
      </section>

      <div className="opsmerge">
    <section className="section wrap" id="kit">
      <div className="section-head">
        <h2 className="stencil">Three pieces of hardware. One handover.</h2>
        <p>Everything installs in your existing lot. No new building, no new staff.</p>
      </div>
      <div className="kit">
        <div>
          <h3 className="display">The kiosk</h3>
          <p>Checks ID and the reservation code, opens the right locker, points the customer to the bay. Twelve seconds per pickup, nobody on shift.</p>
          <div className="art" aria-hidden="true">
            <svg viewBox="0 0 250 200" fill="none">
              <rect x="80" y="10" width="110" height="180" rx="8" fill="#1B1D21" />
              <rect x="94" y="26" width="82" height="70" rx="4" fill="#F4F3EF" />
              <rect x="104" y="38" width="62" height="6" rx="2" fill="#1B1D21" opacity=".5" />
              <rect x="104" y="52" width="40" height="6" rx="2" fill="#1B1D21" opacity=".3" />
              <rect x="104" y="70" width="62" height="16" rx="3" fill="#F2C400" />
              <rect x="94" y="110" width="82" height="52" rx="4" fill="#2A2E35" />
              <rect x="102" y="118" width="66" height="36" rx="3" fill="#F2C400" />
              <path d="M124 128v16M132 128v16M140 128v16M148 128v16M156 128v16" stroke="#1B1D21" strokeWidth="3" />
              <circle cx="135" cy="176" r="5" fill="#4DE8B4" />
              <path d="M10 190h230" stroke="#1B1D21" strokeWidth="2" strokeDasharray="6 8" />
              <rect x="34" y="120" width="30" height="56" rx="6" fill="#1B1D21" />
              <rect x="38" y="126" width="22" height="40" rx="3" fill="#F4F3EF" />
              <path d="M64 140h12M64 150h12" stroke="#4DE8B4" strokeWidth="2" />
            </svg>
          </div>
          <ul className="spec">
            <li><span>Footprint</span><b>One parking bay</b></li>
            <li><span>Lockers</span><b>24 keys per unit</b></li>
            <li><span>ID check</span><b>Licence scan + face match</b></li>
          </ul>
        </div>
        <div>
          <h3 className="display">The gantry</h3>
          <p>Cameras and depth sensors over the exit and return lanes. Every car is measured on the way out and on the way in, the same way every time.</p>
          <div className="art" aria-hidden="true">
            <svg viewBox="0 0 250 200" fill="none">
              <path d="M10 190h230" stroke="#1B1D21" strokeWidth="2" strokeDasharray="6 8" />
              <rect x="30" y="40" width="10" height="150" fill="#1B1D21" /><rect x="210" y="40" width="10" height="150" fill="#1B1D21" />
              <rect x="30" y="34" width="190" height="12" fill="#1B1D21" />
              <g fill="#4DE8B4"><circle cx="70" cy="52" r="3" /><circle cx="125" cy="52" r="3" /><circle cx="180" cy="52" r="3" /></g>
              <path d="M70 54l-24 130M70 54l24 130M125 54l-40 130M125 54l40 130M180 54l-24 130M180 54l24 130" stroke="#4DE8B4" strokeOpacity=".35" strokeWidth="1.5" />
              <path d="M60 176h130M74 176c0-14 8-26 24-30l14-14h52l20 14c16 4 24 16 24 30" fill="#F4F3EF" stroke="#1B1D21" strokeWidth="3" strokeLinejoin="round" />
              <circle cx="96" cy="176" r="10" fill="#1B1D21" /><circle cx="182" cy="176" r="10" fill="#1B1D21" />
            </svg>
          </div>
          <ul className="spec">
            <li><span>Scan</span><b>Seconds, at walking pace</b></li>
            <li><span>Coverage</span><b>360°, paint depth, panel gap</b></li>
            <li><span>Output</span><b>Timestamped record, both sides</b></li>
          </ul>
        </div>
        <div>
          <h3 className="display">The app</h3>
          <p>Your brand, your rates, your fleet. Customers reserve while they walk, accept one contract, and get a bay number before they reach the lot.</p>
          <div className="art" aria-hidden="true">
            <svg viewBox="0 0 250 200" fill="none">
              <path d="M10 190h230" stroke="#1B1D21" strokeWidth="2" strokeDasharray="6 8" />
              <rect x="80" y="8" width="90" height="182" rx="14" fill="#1B1D21" />
              <rect x="87" y="16" width="76" height="166" rx="10" fill="#F4F3EF" />
              <rect x="95" y="30" width="60" height="34" rx="6" fill="#1B1D21" />
              <text x="125" y="54" textAnchor="middle" fontFamily="Big Shoulders Stencil Display, Impact, sans-serif" fontWeight="900" fontSize="22" fill="#F2C400">P2 · 26</text>
              <rect x="95" y="72" width="60" height="10" rx="3" fill="#C3C2BB" />
              <rect x="95" y="88" width="44" height="10" rx="3" fill="#C3C2BB" />
              <rect x="95" y="106" width="60" height="42" rx="5" fill="#fff" stroke="#DAD9D4" />
              <rect x="95" y="158" width="60" height="16" rx="5" fill="#F2C400" />
              <text x="40" y="120" fontFamily="Big Shoulders Display, Impact, sans-serif" fontWeight="800" fontSize="18" fill="#1B1D21" opacity=".5">YOUR</text>
              <text x="40" y="140" fontFamily="Big Shoulders Display, Impact, sans-serif" fontWeight="800" fontSize="18" fill="#1B1D21" opacity=".5">LOGO</text>
            </svg>
          </div>
          <ul className="spec">
            <li><span>Branding</span><b>White label, iOS + Android</b></li>
            <li><span>Pricing</span><b>Your rate card</b></li>
            <li><span>Disputes</span><b>One tap, evidence attached</b></li>
          </ul>
        </div>
      </div>
    </section>
    <section className="section wrap" id="ledger">
      <div className="section-head">
        <h2 className="stencil">What changes on the ledger.</h2>
        <p>The counter is your most expensive square footage and your least loved one. Here is what it costs and what replaces it. Example figures for the concept.</p>
      </div>
      <div className="ledger">
        <div className="before">
          <h3 className="display">With a counter</h3>
          <ol>
            <li><div><b>Counter staff, 3 shifts</b><span>the desk has to be open when the flights land, which is always.</span></div><em>24/7</em></li>
            <li><div><b>Walk around inspections</b><span>one person, one clipboard, one opinion, in the rain.</span></div><em>10 min</em></li>
            <li><div><b>Damage disputes</b><span>letters, chargebacks, reviews that mention the word scam.</span></div><em>weeks</em></li>
            <li><div><b>Cars idle at the desk</b><span>a car waits for paperwork instead of earning.</span></div><em>40 min</em></li>
          </ol>
        </div>
        <div className="after">
          <h3 className="display">With EZPZ</h3>
          <ol>
            <li><div><b>Kiosk on shift</b><span>every landing, every hour, no overtime.</span></div><em>0 staff</em></li>
            <li><div><b>Gantry scan</b><span>the same measurement for every car and every renter.</span></div><em>seconds</em></li>
            <li><div><b>Settled at the curb</b><span>itemized with photos before the customer reaches the terminal.</span></div><em>minutes</em></li>
            <li><div><b>Cars back in rotation</b><span>return scan, cleaning slot, next reservation.</span></div><em>same hour</em></li>
          </ol>
        </div>
      </div>
    </section>
    <section className="section wrap" id="proof">
      <div className="proof">
        <div className="txt">
          <h3 className="display">The record protects both sides.</h3>
          <p>A departure scan the customer can see removes the "it was already there" argument. A return scan with photos, depth maps and timestamps removes the "we never did that" argument. What is left is a bill both sides can read.</p>
          <div className="steps">
            <div><i>1</i><span>Departure baseline saved and shown to the customer before they leave the lot.</span></div>
            <div><i>2</i><span>Return scan compared to the baseline. Existing marks matched, new marks measured.</span></div>
            <div><i>3</i><span>Charges applied only under the contract terms the customer accepted. Disputes in the app, evidence attached.</span></div>
          </div>
        </div>
        <div className="ticket" id="ticket-op">
          <div className="h"><span>Return receipt · bay 27</span><b>Tue 14:19</b></div>
          <div className="rows num">
            <div><span>Electric · Sat 10:05 to Tue 14:19</span><span>as booked</span></div>
            <div className="zero"><span>Chip, front bumper (on record)</span><span>$0</span></div>
            <div><span>Scratch, 41 mm, rear left door · §4.2</span><span>$140</span></div>
          </div>
          <div className="total"><span>New charges</span><span className="num">$140</span></div>
          <p className="foot">Evidence attached: 6 photos, depth map, both timestamps. Example amounts.</p>
        </div>
      </div>
    </section>
    <section className="section wrap" id="rollout">
      <div className="section-head">
        <h2 className="stencil">Live in one lot in weeks, not a fleet in years.</h2>
        <p>Start with one level of one structure. Keep the counter open next to it until the numbers make the decision for you.</p>
      </div>
      <div className="rollout">
        <div><span className="mark" aria-hidden="true"></span><div className="wk">Week 1<small>Survey</small></div><h3>We walk your lot.</h3><p>Exit lanes, bays, power, network. You get an install plan and a bay map.</p></div>
        <div><span className="mark" aria-hidden="true"></span><div className="wk">Week 2<small>Install</small></div><h3>Gantry and kiosk go in.</h3><p>Two days on site. Your lot stays open.</p></div>
        <div><span className="mark" aria-hidden="true"></span><div className="wk">Week 3<small>App</small></div><h3>Your brand on the app.</h3><p>Fleet, rates and contract loaded. Your team gets the fleet board.</p></div>
        <div><span className="mark" aria-hidden="true"></span><div className="wk">Week 4<small>Live</small></div><h3>First customers walk past the counter.</h3><p>We watch every scan with you for the first month.</p></div>
      </div>
    </section>
      </div>


  

  


      <section className="wrap sechead">
        <h2 className="stencil">See it working right now</h2>
        <p>This is not a mockup. The customer side is live on this site, so a walkthrough can be done from a phone in front of you.</p>
        <div className="bizgrid">
          <div className="bizcard"><span className="num">A</span><h3>The booking page</h3><p>Airport, dates, times, three steps and almost no reading. Open it, run a search and watch how little there is to do.</p><p style={{ marginTop: '10px' }}><Link to="/book" style={{ textDecoration: 'underline', fontWeight: '600' }}>Open the booking page</Link></p></div>
          <div className="bizcard"><span className="num">B</span><h3>The results page</h3><p>Fleet classes with all in pricing that recalculates for the length of the rental, filters by size and type, and a one tap reservation.</p><p style={{ marginTop: '10px' }}><Link to="/cars" style={{ textDecoration: 'underline', fontWeight: '600' }}>Open the results page</Link></p></div>
          <div className="bizcard"><span className="num">C</span><h3>The lot side</h3><p>The kiosk, the gantry and the app, the three pieces that make the handover work without a person in the middle. All of it is further up this page.</p><p style={{ marginTop: '10px' }}><Link to="/business#kit" style={{ textDecoration: 'underline', fontWeight: '600' }}>See the lot setup</Link></p></div>
        </div>
      </section>

      <section className="wrap bizcta" id="talk">
        <div className="bizcta-in">
          <h2 className="stencil">Walk your lot with EZPZ</h2>
          <p>Pick one location and see what the same day looks like with no counter in it. The walkthrough is a conversation about your lot, not a pitch deck.</p>
          <a className="btn btn-ink" href="mailto:hello@helloezpz.com?subject=EZPZ%20for%20my%20rental%20company">Book a walkthrough <span className="arrow"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7h10M7 2l5 5-5 5" /></svg></span></a>
          <p style={{ fontSize: '14px', opacity: '.8' }}>Or see the customer side first at <Link to="/book" style={{ textDecoration: 'underline' }}>helloezpz.com/book</Link>.</p>
        </div>
      </section>
    </div>
  )
}

export default BusinessPage
