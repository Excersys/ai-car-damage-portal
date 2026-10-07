import React from 'react'
import { createPortal } from 'react-dom'
import BookBar from '../ezpz/BookBar'
import { useHomeEffects } from '../ezpz/useHomeEffects'
import { useDocumentTitle } from '../ezpz/useDocumentTitle'

/**
 * EZPZ home page. Markup is a 1:1 port of the static design (index.html);
 * the scroll / cursor / 3D behaviour lives in useHomeEffects.
 */
const HomePage: React.FC = () => {
  const rootRef = React.useRef<HTMLDivElement>(null)
  useDocumentTitle('EZPZ · Land. Tap. Drive.')
  useHomeEffects(rootRef)

  return (
    <>
      {createPortal(
        <>
        <div className="cur" id="cur" aria-hidden="true">
          <div className="dash"></div>
          <div className="ring"><span></span></div>
          <div className="dot"></div>
        </div>
        <div className="line" aria-hidden="true">
          <div className="paint"></div>
          <div className="lead" id="lead">
            <svg viewBox="0 0 14 14" fill="none" stroke="#F2C400" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 5l5 5 5-5" /></svg>
          </div>
        </div>
        </>,
        document.body,
      )}
      <div ref={rootRef} id="top">
      <section className="hero wrap">
        <div className="inner">
          <div>
            <h1 className="stencil">Off the plane.<br /><span className="accent">Into the car.</span></h1>
            <p className="lede">EZPZ is the rental counter with nobody behind it. <strong>Tell us where and when, pick your car, tap the kiosk and drive.</strong> Every car is scanned by cameras and sensors on the way out and on the way back, so you pay for what actually changed and nothing else.</p>
            <div className="actions">
              <a className="btn btn-paint" href="#book">Find a car <span className="arrow"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12 12 2M5 2h7v7" /></svg></span></a>
              <a className="btn btn-ghost" href="#get">Get the app <span className="arrow"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 2v10M2 7l5 5 5-5" /></svg></span></a>
            </div>
            <div className="meta num">
              <div><b>0</b> people at the counter</div>
              <div><b>0</b> minutes in line</div>
              <div><b>2</b> scans per rental, out and back</div>
            </div>
          </div>

          <div className="bay-in">
          <div className="bay" id="bay" aria-label="Illustration: parking bay 26 on level P2 with an EZPZ car already parked, the painted guidance line arriving into the bay, and a sensor sweep passing over the car. Moves with the cursor.">
            <svg viewBox="0 0 600 520" role="img" aria-hidden="true">
              <defs>
                <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#C9C8C1" /><stop offset="1" stopColor="#B9B8B0" /></linearGradient>
                <linearGradient id="body" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#2A2D33" /><stop offset=".5" stopColor="#3C4048" /><stop offset="1" stopColor="#23262B" /></linearGradient>
                <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8FA6B8" /><stop offset="1" stopColor="#5C6E7C" /></linearGradient>
                <linearGradient id="sweepG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4DE8B4" stopOpacity="0" /><stop offset=".5" stopColor="#4DE8B4" stopOpacity=".55" /><stop offset="1" stopColor="#4DE8B4" stopOpacity="0" /></linearGradient>
                <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0v24" fill="none" stroke="#4DE8B4" strokeOpacity=".18" strokeWidth="1" /></pattern>
                <clipPath id="floorclip"><rect x="0" y="0" width="600" height="520" rx="10" /></clipPath>
              </defs>
              <g clipPath="url(#floorclip)">
                <rect width="600" height="520" fill="url(#floor)" />
                <g stroke="#B0AFA7" strokeWidth="1"><path d="M0 130H600M0 260H600M0 390H600" opacity=".7" /></g>
                <g fill="none" stroke="#F4F3EF" strokeWidth="5" strokeLinecap="square"><path d="M60 60V505M540 60V505" /></g>
                <g fill="none" stroke="#F2C400" strokeWidth="7" strokeLinecap="square"><path d="M190 60V505M410 60V505" /></g>
                <text x="300" y="500" textAnchor="middle" fontFamily="Big Shoulders Stencil Display, Impact, sans-serif" fontWeight="900" fontSize="92" fill="#F4F3EF" opacity=".95">26</text>
                <text x="125" y="496" textAnchor="middle" fontFamily="Big Shoulders Stencil Display, Impact, sans-serif" fontWeight="900" fontSize="54" fill="#F4F3EF" opacity=".5">25</text>
                <text x="475" y="496" textAnchor="middle" fontFamily="Big Shoulders Stencil Display, Impact, sans-serif" fontWeight="900" fontSize="54" fill="#F4F3EF" opacity=".5">27</text>
                <text x="582" y="46" textAnchor="end" fontFamily="Big Shoulders Display, Impact, sans-serif" fontWeight="800" fontSize="20" letterSpacing="4" fill="#1B1D21" opacity=".55">LEVEL P2 · EZPZ</text>
                <path d="M-20 34H286c14 0 22 8 22 22v16" fill="none" stroke="#F2C400" strokeWidth="12" strokeDasharray="46 22" strokeLinecap="butt" />
                <path d="M282 62l26 26 26-26" fill="none" stroke="#F2C400" strokeWidth="12" strokeLinejoin="round" strokeLinecap="round" />
                <ellipse cx="300" cy="262" rx="98" ry="150" fill="#000" opacity=".22" />
                <g transform="translate(300 256)">
                  <path d="M-84-142c0-12 10-22 22-22h124c12 0 22 10 22 22v284c0 12-10 22-22 22H-62c-12 0-22-10-22-22z" fill="url(#body)" />
                  <path d="M-84-142c0-12 10-22 22-22h124c12 0 22 10 22 22v284c0 12-10 22-22 22H-62c-12 0-22-10-22-22z" fill="none" stroke="#0D0F12" strokeWidth="2" />
                  <path d="M-64-72 -50-114h100l14 42z" fill="url(#glass)" />
                  <rect x="-62" y="-70" width="124" height="118" rx="10" fill="#33373E" />
                  <path d="M-64 50h128l-12 36H-52z" fill="url(#glass)" />
                  <rect x="-102" y="-84" width="18" height="10" rx="3" fill="#2A2D33" /><rect x="84" y="-84" width="18" height="10" rx="3" fill="#2A2D33" />
                  <rect x="-70" y="-164" width="34" height="8" rx="3" fill="#E9F1F7" opacity=".9" /><rect x="36" y="-164" width="34" height="8" rx="3" fill="#E9F1F7" opacity=".9" />
                  <rect x="-70" y="156" width="34" height="8" rx="3" fill="#FF5A3C" opacity=".9" /><rect x="36" y="156" width="34" height="8" rx="3" fill="#FF5A3C" opacity=".9" />
                  <path d="M-40-150c-10 60-10 240 0 300" fill="none" stroke="#fff" strokeOpacity=".08" strokeWidth="10" />
                </g>
                <rect x="206" y="92" width="188" height="330" fill="url(#grid)" rx="12" />
                <g className="sweep">
                  <rect x="200" y="80" width="200" height="40" fill="url(#sweepG)" />
                  <rect x="200" y="99" width="200" height="2" fill="#4DE8B4" opacity=".9" />
                </g>
                <g fill="none" stroke="#4DE8B4" strokeWidth="2" opacity=".9">
                  <path d="M206 108v-16h16M394 92v16M394 92h-16M206 406v16h16M394 422v-16M394 422h-16" />
                </g>
              </g>
            </svg>
            <div className="tag">
              <b>Bay 26 · Level P2</b>
              Departure scan complete · 14:21<br />
              <span className="ok">2 marks on record. None yours.</span>
            </div>
          </div>
          </div>
        </div>


        <BookBar variant="home" />
      </section>


      <section className="section wrap" id="walk">
        <div className="section-head">
          <h2 className="display">Get in the car and go, minutes after you land.</h2>
          <p>Tell us where and when, pick your car, tap and drive. That is the whole process. No counter, no line, no paperwork at pickup, and the car is already in its bay when you get there.</p>
        </div>
        <ol className="walk">
          <li className="stop">
            <span className="big-n" aria-hidden="true">1</span>
            <span className="mark" aria-hidden="true"></span>
            <div className="t"><span className="num">0 min</span><small>Before you land</small></div>
            <h3 className="display">Tell us where and when.</h3>
            <p>Airport, dates, times. On the plane or a week before. Every car you see next is really in the lot and really available for your dates.</p>
            <div className="art" aria-hidden="true">
              <svg viewBox="0 0 250 200" fill="none">
                <rect x="18" y="24" width="214" height="152" rx="8" fill="#F4F3EF" stroke="#1B1D21" strokeWidth="3" />
                <path d="M18 112h214" stroke="#1B1D21" strokeWidth="2" strokeDasharray="6 6" />
                <text x="34" y="52" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="700" fontSize="9" letterSpacing="1.6" fill="#5B5F66">PICK UP</text>
                <text x="34" y="86" fontFamily="Big Shoulders Display, Impact, sans-serif" fontWeight="800" fontSize="34" fill="#1B1D21">LAX</text>
                <text x="150" y="52" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="700" fontSize="9" letterSpacing="1.6" fill="#5B5F66">DROP OFF</text>
                <text x="150" y="86" fontFamily="Big Shoulders Display, Impact, sans-serif" fontWeight="800" fontSize="34" fill="#1B1D21">LAX</text>
                <path d="M108 74h28M130 68l6 6-6 6" stroke="#F2C400" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <text x="34" y="134" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="600" fontSize="11" fill="#1B1D21">Thu 10:30</text>
                <text x="150" y="134" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="600" fontSize="11" fill="#1B1D21">Sun 10:30</text>
                <rect x="34" y="146" width="182" height="20" rx="3" fill="#F2C400" />
                <text x="125" y="160" textAnchor="middle" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="700" fontSize="10" letterSpacing="1" fill="#1B1D21">FIND CARS</text>
                <circle cx="18" cy="112" r="7" fill="#D8D7D2" stroke="#1B1D21" strokeWidth="3" /><circle cx="232" cy="112" r="7" fill="#D8D7D2" stroke="#1B1D21" strokeWidth="3" />
              </svg>
            </div>
          </li>
          <li className="stop">
            <span className="big-n" aria-hidden="true">2</span>
            <span className="mark" aria-hidden="true"></span>
            <div className="t"><span className="num">2 min</span><small>Still in your seat</small></div>
            <h3 className="display">Pick your car.</h3>
            <p>Filter by type, seats, bags and price. Accept one contract, on the site or in the app. Your bay is assigned the moment you do.</p>
            <div className="art phone-wrap">
              <div className="tap-hint" aria-hidden="true">Tap the screen to try it</div>
              <div className="phone" id="phone">
              <div className="scr" id="scr" data-screen="cars">
                <div className="bar"><span>14:09</span><span>EZPZ</span></div>
                <div className="screen s-cars">
                  <div className="sttl">Choose your car<small>LAX · Level P2 · ready now</small></div>
                  <button type="button" className="carrow" data-car="Compact · automatic">
                    <svg viewBox="0 0 120 40" width="58" height="20"><path d="M10 30h100M18 30c0-8 4-14 14-16l10-8h30l12 8c10 2 16 8 16 16" fill="none" stroke="#1B1D21" strokeWidth="2.5" strokeLinejoin="round" /><circle cx="34" cy="30" r="6" fill="#1B1D21" /><circle cx="88" cy="30" r="6" fill="#1B1D21" /></svg>
                    <span><b>Compact</b><i>Auto · 5 seats</i></span><em>$49/day</em>
                  </button>
                  <button type="button" className="carrow" data-car="SUV · all wheel drive">
                    <svg viewBox="0 0 120 40" width="58" height="20"><path d="M8 30h104M16 30c0-8 3-14 12-16l8-9h40l14 9c9 2 14 8 14 16" fill="none" stroke="#1B1D21" strokeWidth="2.5" strokeLinejoin="round" /><circle cx="34" cy="30" r="7" fill="#1B1D21" /><circle cx="90" cy="30" r="7" fill="#1B1D21" /></svg>
                    <span><b>SUV</b><i>AWD · 7 seats</i></span><em>$79/day</em>
                  </button>
                  <button type="button" className="carrow" data-car="Electric · 310 mi range">
                    <svg viewBox="0 0 120 40" width="58" height="20"><path d="M10 30h100M20 30c0-6 2-12 10-14l14-10h32l14 10c8 2 10 8 10 14" fill="none" stroke="#1B1D21" strokeWidth="2.5" strokeLinejoin="round" /><circle cx="36" cy="30" r="6" fill="#1B1D21" /><circle cx="86" cy="30" r="6" fill="#1B1D21" /><path d="M58 12l-4 8h6l-4 8" stroke="#1B1D21" strokeWidth="2" fill="none" /></svg>
                    <span><b>Electric</b><i>310 mi · 5 seats</i></span><em>$69/day</em>
                  </button>
                  <div className="sfoot">Example cars and rates</div>
                </div>
                <div className="screen s-contract">
                  <div className="sttl">Your contract<small id="pick-car">Compact · automatic</small></div>
                  <div className="crow"><span>Pickup</span><b>Today · bay assigned on accept</b></div>
                  <div className="crow"><span>Return</span><b>Fri 09:30 · any EZPZ bay</b></div>
                  <div className="crow"><span>Damage terms</span><b>§4.2 · itemized, photo evidence</b></div>
                  <div className="crow"><span>Deposit</span><b>None. Two scans instead.</b></div>
                  <div className="sfoot">You can only ever be charged against these terms.</div>
                  <button type="button" className="go" data-next="bay">Accept and reserve</button>
                </div>
                <div className="screen s-bay">
                  <div className="big">P2 · 26<small>YOUR BAY · 6 MIN WALK</small></div>
                  <div className="card">
                    <div className="ttl" id="bay-car">Compact · automatic</div>
                    <div className="row"><span>Contract</span><b>Accepted 14:09</b></div>
                    <div className="row"><span>Return</span><b>Fri 09:30</b></div>
                  </div>
                  <div className="map">
                    <svg viewBox="0 0 200 74" width="100%" fill="none">
                      <rect x="0" y="0" width="200" height="74" rx="8" fill="#DAD9D4" />
                      <path d="M0 40h200M70 0v74M140 0v74" stroke="#C3C2BB" strokeWidth="2" />
                      <rect x="8" y="8" width="52" height="24" rx="3" fill="#C3C2BB" />
                      <rect x="150" y="48" width="42" height="18" rx="3" fill="#F2C400" />
                      <path d="M22 62h48V22h70v36h20" stroke="#F2C400" strokeWidth="4" strokeDasharray="8 5" strokeLinejoin="round" />
                      <circle cx="22" cy="62" r="5" fill="#1B1D21" />
                      <text x="171" y="61" textAnchor="middle" fontFamily="Big Shoulders Stencil Display, Impact, sans-serif" fontWeight="900" fontSize="12" fill="#1B1D21">26</text>
                      <text x="34" y="24" textAnchor="middle" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="600" fontSize="8" fill="#F4F3EF">KIOSK</text>
                    </svg>
                  </div>
                  <button type="button" className="go" data-next="code">Show kiosk code</button>
                </div>
                <div className="screen s-code">
                  <div className="sttl">Hold to the kiosk<small>Locker 14 opens when it reads this</small></div>
                  <div className="qr" aria-hidden="true"></div>
                  <div className="sfoot">Keys inside. The gantry scans the car as you leave.</div>
                  <button type="button" className="go ghost" data-next="cars">Start over</button>
                </div>
              </div>
              </div>
            </div>
          </li>
          <li className="stop now">
            <span className="big-n" aria-hidden="true">3</span>
            <span className="mark" aria-hidden="true"></span>
            <div className="t"><span className="num">12 min</span><small>Driving</small></div>
            <h3 className="display">Tap. Drive.</h3>
            <p>Hold your phone to the kiosk, the locker opens, keys in hand. Roll through the gantry, it scans the car out in seconds, and go.</p>
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
          </li>
        </ol>

        <div className="clock" aria-label="Illustrative time from landing to driving, EZPZ compared with a traditional rental counter">
          <div className="clock-head">
            <h3 className="display">The clock, side by side.</h3>
            <p>Illustrative minutes from wheels down to driving away.</p>
          </div>
          <div className="lanes">
            <div className="lanerow ez">
              <div className="lbl"><b>EZPZ</b><span>reserve, kiosk, gantry</span></div>
              <div className="bar"><div className="fill" style={{ '--w': '14%' } as React.CSSProperties}><span>12 min</span></div></div>
            </div>
            <div className="lanerow old">
              <div className="lbl"><b>Traditional counter</b><span>shuttle, line, paperwork, walk around</span></div>
              <div className="bar"><div className="fill" style={{ '--w': '88%' } as React.CSSProperties}><i style={{ '--s': '18%' } as React.CSSProperties}>shuttle</i><i style={{ '--s': '40%' } as React.CSSProperties}>line</i><i style={{ '--s': '22%' } as React.CSSProperties}>paperwork</i><i style={{ '--s': '20%' } as React.CSSProperties}>walk around</i><span>75 min</span></div></div>
            </div>
          </div>
          <p className="clock-note">Example durations for the concept, replace with measured pickup times.</p>
        </div>
      </section>


      <section className="freeway wrap" id="freeway" aria-label="Animation: as you scroll, the car leaves bay 26, takes the exit ramp and merges onto the freeway.">
        <div className="fw-stage">
          <svg className="fw-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMinYMid slice" aria-hidden="true">
            <defs>
              <linearGradient id="fw-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9FB6C8" /><stop offset="1" stopColor="#D8D7D2" /></linearGradient>
              <linearGradient id="fw-in" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#BFBEB7" /><stop offset="1" stopColor="#A9A8A1" /></linearGradient>
              <linearGradient id="fw-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4A4F58" /><stop offset=".55" stopColor="#2E3238" /><stop offset="1" stopColor="#1B1D21" /></linearGradient>
              <linearGradient id="fw-win" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9DB4C6" /><stop offset="1" stopColor="#4E606E" /></linearGradient>
              <linearGradient id="fw-road" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2A2E35" /><stop offset="1" stopColor="#15171B" /></linearGradient>
              <symbol id="fw-car" viewBox="0 0 700 340">
                <path d="M140 300c-8 0-14-6-14-14v-42c0-10 6-18 16-22l70-24 62-46c8-6 18-9 28-9h132c14 0 26 5 36 14l60 48 70 18c14 4 24 16 24 30v34c0 8-6 13-14 13z" fill="url(#fw-body)" stroke="#0B0D0F" strokeWidth="2" />
                <path d="M280 200l58-42c6-4 12-6 18-6h60v48z" fill="url(#fw-win)" />
                <path d="M428 152h84c10 0 18 3 24 9l44 39H428z" fill="url(#fw-win)" />
                <rect x="420" y="152" width="8" height="48" fill="#1A1D21" />
                <rect x="128" y="246" width="26" height="12" rx="3" fill="#FF5A3C" opacity=".9" />
                <rect x="608" y="246" width="30" height="12" rx="3" fill="#E9F1F7" opacity=".9" />
                <circle cx="240" cy="300" r="40" fill="#0E1013" /><circle cx="240" cy="300" r="22" fill="#3A3E46" /><circle cx="240" cy="300" r="8" fill="#0E1013" />
                <circle cx="530" cy="300" r="40" fill="#0E1013" /><circle cx="530" cy="300" r="22" fill="#3A3E46" /><circle cx="530" cy="300" r="8" fill="#0E1013" />
              </symbol>
            </defs>
      
            <g id="fw-world">
        
              <rect x="1500" y="-900" width="3700" height="1800" fill="url(#fw-sky)" />
        
              <rect x="0" y="-900" width="1900" height="1800" fill="url(#fw-in)" />
              <rect x="0" y="0" width="1900" height="70" fill="#8F8E88" />
              <g fill="#7E7D77"><rect x="120" y="70" width="46" height="560" /><rect x="620" y="70" width="46" height="560" /><rect x="1120" y="70" width="46" height="560" /><rect x="1620" y="70" width="46" height="560" /></g>
              <g fill="#F2C400"><rect x="120" y="70" width="46" height="18" /><rect x="620" y="70" width="46" height="18" /><rect x="1120" y="70" width="46" height="18" /><rect x="1620" y="70" width="46" height="18" /></g>
              <text x="60" y="270" fontFamily="Big Shoulders Stencil Display, Impact, sans-serif" fontWeight="900" fontSize="230" fill="#1B1D21" opacity=".08">P2</text>
        
              <rect x="0" y="630" width="1900" height="270" fill="#B4B3AC" />
              <path d="M0 640H1900" stroke="#1B1D21" strokeOpacity=".18" strokeWidth="2" />
        
              <g className="fw-bay" transform="translate(300 560)">
                <path d="M0 0v120M400 0v120" stroke="#F2C400" strokeWidth="8" />
                <path d="M0 0h400" stroke="#F2C400" strokeWidth="8" />
                <text x="200" y="-22" textAnchor="middle" fontFamily="Big Shoulders Stencil Display, Impact, sans-serif" fontWeight="900" fontSize="72" fill="#1B1D21">26</text>
              </g>
        
              <path d="M500 700H1780" stroke="#F2C400" strokeWidth="6" strokeDasharray="46 26" opacity=".95" />
        
              <g transform="translate(1560 150)"><rect width="300" height="86" rx="6" fill="#1B1D21" /><text x="150" y="60" textAnchor="middle" fontFamily="Big Shoulders Display, Impact, sans-serif" fontWeight="800" fontSize="52" fill="#F2C400" letterSpacing="6">EXIT</text></g>
        
              <path id="fw-rampfill" d="M1780 630 L2000 630 C2300 630 2450 800 2750 800 L3000 800 L3000 900 L1780 900Z" fill="#2A2E35" />
              <path d="M1780 632 L2000 632 C2300 632 2450 802 2750 802 L3000 802" stroke="#F2C400" strokeWidth="5" strokeDasharray="36 22" fill="none" opacity=".9" />
        
              <rect x="2750" y="700" width="2450" height="200" fill="url(#fw-road)" />
              <rect x="2750" y="696" width="2450" height="6" fill="#F4F3EF" opacity=".55" />
              <path id="fw-dash" d="M2750 770H5200" stroke="#F4F3EF" strokeWidth="6" strokeDasharray="70 60" opacity=".85" />
        
              <g transform="translate(3350 300)">
                <rect x="0" y="0" width="14" height="400" fill="#3A3D43" />
                <rect x="0" y="0" width="620" height="16" fill="#3A3D43" />
                <rect x="120" y="16" width="470" height="150" rx="8" fill="#1E6B3A" />
                <text x="150" y="80" fontFamily="Big Shoulders Display, Impact, sans-serif" fontWeight="700" fontSize="52" fill="#F4F3EF">405 NORTH</text>
                <text x="150" y="136" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="600" fontSize="34" fill="#F4F3EF">Downtown · Beach cities</text>
                <path d="M540 60l40 40-40 40" fill="none" stroke="#F4F3EF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
              </g>
        
              <g fill="#7C8FA0" opacity=".55"><rect x="2900" y="460" width="90" height="240" /><rect x="3010" y="410" width="60" height="290" /><rect x="3090" y="500" width="120" height="200" /><rect x="3900" y="440" width="80" height="260" /><rect x="4000" y="370" width="70" height="330" /><rect x="4090" y="480" width="130" height="220" /><rect x="4700" y="420" width="100" height="280" /></g>
        
              <path id="fw-path" d="M500 700 L1780 700 C2100 700 2300 835 2750 835 L5300 835" fill="none" stroke="none" />
              <g id="fw-carg"><use href="#fw-car" width="252" height="122" x="-126" y="-116" /></g>
            </g>
          </svg>
          <div className="fw-cap"><span className="dot" aria-hidden="true"></span><span id="fw-state">Bay 26, level P2</span><b className="num" id="fw-time">12 min after wheels down</b></div>
          <div className="fw-hint" aria-hidden="true">Scroll to drive</div>
          <div className="fw-plate"><p className="tagline">Land. Tap. Drive.</p><h2 className="stencil">Out of the bay,<br />onto the freeway.</h2><p>Keys from the kiosk, out through the gantry, and the trip starts. Nobody to see on the way out.</p></div>
        </div>
      </section>


      <section className="lane wrap" id="scan" data-state="departure">
        <div className="drive" id="drive" aria-label="Animation: as you scroll, the car rolls through the exit gantry and is scanned.">
          <div className="stage">
            <svg className="road" viewBox="0 0 1600 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              <defs>
                <linearGradient id="dfloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1E2126" /><stop offset="1" stopColor="#121417" /></linearGradient>
                <linearGradient id="dbeam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#4DE8B4" stopOpacity="0" /><stop offset=".5" stopColor="#4DE8B4" stopOpacity=".55" /><stop offset="1" stopColor="#4DE8B4" stopOpacity="0" /></linearGradient>
                <pattern id="dgrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0v20" fill="none" stroke="#4DE8B4" strokeOpacity=".1" /></pattern>
              </defs>
              <rect width="1600" height="420" fill="url(#dfloor)" />
              <rect x="0" y="330" width="1600" height="90" fill="#0E1013" />
              <path d="M0 330H1600" stroke="#F2C400" strokeWidth="4" strokeDasharray="40 22" opacity=".9" />
              <text x="60" y="80" fontFamily="Big Shoulders Stencil Display, Impact, sans-serif" fontWeight="900" fontSize="120" fill="#F4F3EF" opacity=".06">EXIT</text>
              <text x="1380" y="80" fontFamily="Big Shoulders Stencil Display, Impact, sans-serif" fontWeight="900" fontSize="120" fill="#F4F3EF" opacity=".06">P2</text>
              <rect x="560" y="120" width="480" height="210" fill="url(#dgrid)" />
              <rect x="560" y="30" width="16" height="300" fill="#2A2E35" /><rect x="1024" y="30" width="16" height="300" fill="#2A2E35" />
              <rect x="560" y="24" width="480" height="18" fill="#2A2E35" />
              <g fill="#4DE8B4"><circle cx="640" cy="33" r="4" /><circle cx="800" cy="33" r="4" /><circle cx="960" cy="33" r="4" /></g>
              <g className="dcones" stroke="#4DE8B4" strokeOpacity=".16" strokeWidth="1.5"><path d="M640 40 570 330M640 40 710 330M800 40 720 330M800 40 880 330M960 40 890 330M960 40 1030 330" /></g>
              <g id="drive-car" transform="translate(-700 0)">
                    <path d="M140 300c-8 0-14-6-14-14v-42c0-10 6-18 16-22l70-24 62-46c8-6 18-9 28-9h132c14 0 26 5 36 14l60 48 70 18c14 4 24 16 24 30v34c0 8-6 13-14 13z" fill="url(#carside)" stroke="#0B0D0F" strokeWidth="2" />
                    <path d="M280 200l58-42c6-4 12-6 18-6h60v48z" fill="url(#win)" />
                    <path d="M428 152h84c10 0 18 3 24 9l44 39H428z" fill="url(#win)" />
                    <rect x="420" y="152" width="8" height="48" fill="#1A1D21" />
                    <path d="M300 236h100" stroke="#0B0D0F" strokeWidth="2" opacity=".6" />
                    <path d="M436 236h100" stroke="#0B0D0F" strokeWidth="2" opacity=".6" />
                    <rect x="128" y="246" width="26" height="12" rx="3" fill="#FF5A3C" opacity=".9" />
                    <rect x="608" y="246" width="30" height="12" rx="3" fill="#E9F1F7" opacity=".9" />
                    <circle cx="240" cy="300" r="40" fill="#0E1013" /><circle cx="240" cy="300" r="22" fill="#3A3E46" /><circle cx="240" cy="300" r="8" fill="#0E1013" />
                    <circle cx="530" cy="300" r="40" fill="#0E1013" /><circle cx="530" cy="300" r="22" fill="#3A3E46" /><circle cx="530" cy="300" r="8" fill="#0E1013" />
                          </g>
              <g id="drive-beam" opacity="0"><rect x="740" y="42" width="120" height="290" fill="url(#dbeam)" /><rect x="799" y="42" width="2" height="290" fill="#4DE8B4" opacity=".9" /></g>
            </svg>
            <div className="drive-cap"><span className="dot" aria-hidden="true"></span><span id="drive-state">Approaching gantry 2</span><b className="num"><span id="drive-frames">0</span> / 1,120 frames</b></div>
            <div className="drive-hint" aria-hidden="true">Scroll to drive through</div>
          </div>
        </div>
        <div className="section-head">
          <h2 className="display">Two scans. One honest bill.</h2>
          <p>The gantry photographs and measures the whole car on the way out and again on the way in. The bill is the difference between the two, itemized, with the evidence attached. Flip between the scans. In Sensor view you can drag the car around, and on a desktop the beam follows your cursor.</p>
        </div>
        <div className="inner">
          <div>
            <div className="controls">
              <div className="toggle" role="group" aria-label="Choose which scan to view">
                <button type="button" data-set="departure" aria-pressed="true">Departure<span className="hide-m"> · Mon 14:21</span></button>
                <button type="button" data-set="return" aria-pressed="false">Return<span className="hide-m"> · Fri 09:26</span></button>
              </div>
              <div className="view" role="group" aria-label="Choose how to view the car" id="viewgroup" hidden>
                <button type="button" data-view="cloud" aria-pressed="true">Sensor view</button>
                <button type="button" data-view="photo" aria-pressed="false">Camera view</button>
              </div>
            </div>
            <div className="scanner" id="scanner" data-state="departure" data-view="photo">
              <div className="core">
                <div className="hud"><i aria-hidden="true"></i><span className="hl">Gantry 2 ·</span><span id="hud-state">Departure baseline</span></div>
                <svg viewBox="0 0 760 420" role="img" aria-label="Side view of a car under the scanning gantry. Markers show where the sensors found existing marks at departure, and one new scratch at return.">
                  <defs>
                    <linearGradient id="lanefloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1E2126" /><stop offset="1" stopColor="#121417" /></linearGradient>
                    <linearGradient id="beamG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#4DE8B4" stopOpacity="0" /><stop offset=".5" stopColor="#4DE8B4" stopOpacity=".5" /><stop offset="1" stopColor="#4DE8B4" stopOpacity="0" /></linearGradient>
                    <linearGradient id="carside" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4A4F58" /><stop offset=".55" stopColor="#2E3238" /><stop offset="1" stopColor="#1C1F24" /></linearGradient>
                    <linearGradient id="win" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9DB4C6" /><stop offset="1" stopColor="#4E606E" /></linearGradient>
                    <pattern id="grid2" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0v20" fill="none" stroke="#4DE8B4" strokeOpacity=".12" /></pattern>
                  </defs>
                  <rect width="760" height="420" fill="url(#lanefloor)" />
                  <rect x="0" y="330" width="760" height="90" fill="#0E1013" />
                  <path d="M0 330H760" stroke="#F2C400" strokeWidth="4" strokeDasharray="40 22" opacity=".9" />
                  <rect x="60" y="30" width="16" height="300" fill="#2A2E35" /><rect x="684" y="30" width="16" height="300" fill="#2A2E35" />
                  <rect x="60" y="24" width="640" height="18" fill="#2A2E35" />
                  <g fill="#4DE8B4"><circle cx="160" cy="33" r="4" /><circle cx="300" cy="33" r="4" /><circle cx="460" cy="33" r="4" /><circle cx="600" cy="33" r="4" /></g>
                  <g stroke="#4DE8B4" strokeOpacity=".16" strokeWidth="1.5"><path d="M160 40 90 330M160 40 230 330M300 40 220 330M300 40 380 330M460 40 380 330M460 40 540 330M600 40 530 330M600 40 670 330" /></g>
                  <rect x="110" y="120" width="540" height="210" fill="url(#grid2)" />
                  <g>
                    <path d="M140 300c-8 0-14-6-14-14v-42c0-10 6-18 16-22l70-24 62-46c8-6 18-9 28-9h132c14 0 26 5 36 14l60 48 70 18c14 4 24 16 24 30v34c0 8-6 13-14 13z" fill="url(#carside)" stroke="#0B0D0F" strokeWidth="2" />
                    <path d="M280 200l58-42c6-4 12-6 18-6h60v48z" fill="url(#win)" />
                    <path d="M428 152h84c10 0 18 3 24 9l44 39H428z" fill="url(#win)" />
                    <rect x="420" y="152" width="8" height="48" fill="#1A1D21" />
                    <path d="M300 236h100" stroke="#0B0D0F" strokeWidth="2" opacity=".6" />
                    <path d="M436 236h100" stroke="#0B0D0F" strokeWidth="2" opacity=".6" />
                    <rect x="128" y="246" width="26" height="12" rx="3" fill="#FF5A3C" opacity=".9" />
                    <rect x="608" y="246" width="30" height="12" rx="3" fill="#E9F1F7" opacity=".9" />
                    <circle cx="240" cy="300" r="40" fill="#0E1013" /><circle cx="240" cy="300" r="22" fill="#3A3E46" /><circle cx="240" cy="300" r="8" fill="#0E1013" />
                    <circle cx="530" cy="300" r="40" fill="#0E1013" /><circle cx="530" cy="300" r="22" fill="#3A3E46" /><circle cx="530" cy="300" r="8" fill="#0E1013" />
                  </g>
                  <g className="beam"><rect x="80" y="42" width="120" height="290" fill="url(#beamG)" /><rect x="139" y="42" width="2" height="290" fill="#4DE8B4" opacity=".9" /></g>
                  <g className="finding old" style={{ opacity: '1', transform: 'none' }}>
                    <circle cx="596" cy="222" r="9" fill="none" stroke="#4DE8B4" strokeWidth="2" /><circle cx="596" cy="222" r="2.5" fill="#4DE8B4" />
                    <path className="lbl" d="M604 214l26-18h106" fill="none" stroke="#4DE8B4" strokeWidth="1.5" />
                    <text className="lbl" x="736" y="176" textAnchor="end" fontFamily="Bricolage Grotesque, sans-serif" fontSize="13" fill="#F4F3EF">Chip · 6 mm · front bumper</text>
                    <text className="lbl" x="736" y="191" textAnchor="end" fontFamily="Bricolage Grotesque, sans-serif" fontSize="12" fill="#4DE8B4">On record at departure</text>
                  </g>
                  <g className="finding old" style={{ opacity: '1', transform: 'none' }}>
                    <circle cx="222" cy="244" r="9" fill="none" stroke="#4DE8B4" strokeWidth="2" /><circle cx="222" cy="244" r="2.5" fill="#4DE8B4" />
                    <path className="lbl" d="M214 252l-34 34h-70" fill="none" stroke="#4DE8B4" strokeWidth="1.5" />
                    <text className="lbl" x="110" y="304" fontFamily="Bricolage Grotesque, sans-serif" fontSize="13" fill="#F4F3EF">Scuff · 18 mm · rear wheel arch</text>
                    <text className="lbl" x="110" y="320" fontFamily="Bricolage Grotesque, sans-serif" fontSize="12" fill="#4DE8B4">On record at departure</text>
                  </g>
                  <g className="finding new">
                    <circle className="ring" cx="350" cy="228" r="12" fill="none" stroke="#FF5A3C" strokeWidth="2" />
                    <circle cx="350" cy="228" r="9" fill="none" stroke="#FF5A3C" strokeWidth="2" /><circle cx="350" cy="228" r="2.5" fill="#FF5A3C" />
                    <path className="lbl" d="M336 216l-26-42h-90" fill="none" stroke="#FF5A3C" strokeWidth="1.5" />
                    <text className="lbl" x="118" y="168" fontFamily="Bricolage Grotesque, sans-serif" fontSize="13" fill="#F4F3EF">Scratch · 41 mm · rear left door</text>
                    <text className="lbl" x="118" y="184" fontFamily="Bricolage Grotesque, sans-serif" fontSize="12" fill="#FF8A73">New since departure</text>
                  </g>
                  <text x="80" y="392" fontFamily="Big Shoulders Display, sans-serif" fontWeight="700" fontSize="26" letterSpacing="2" fill="#F4F3EF" opacity=".85">SCAN 4.0 S · 360° · 1,120 FRAMES</text>
                </svg>
                <div className="cmp" id="cmp" aria-label="Drag the handle to compare the departure scan with the return scan">
                  <div className="after" id="cmp-after"></div>
                  <div className="cmp-lbl l">Departure</div><div className="cmp-lbl r">Return</div>
                  <div className="handle" id="cmp-handle" role="slider" aria-valuemin={0} aria-valuemax={100} aria-valuenow={50} tabIndex={0} aria-label="Compare departure and return scans"><i></i></div>
                </div>
                <div className="cloud" id="cloud">
                  <canvas></canvas>
                  <div className="hud"><i aria-hidden="true"></i><span className="hl">Gantry 2 · sensor ·</span><span id="hud-state2">Departure baseline</span></div>
                  <div className="pin" data-pin="chip"><i></i><span>Chip · 6 mm · front bumper</span></div>
                  <div className="pin" data-pin="scuff"><i></i><span>Scuff · 18 mm · rear wheel arch</span></div>
                  <div className="pin flag" data-pin="scratch"><i></i><span>Scratch · 41 mm · new since departure</span></div>
                  <div className="hint">Drag to orbit · move to scan</div>
                </div>
              </div>
            </div>
            <p className="caption">Synthetic demonstration. Findings, times and amounts are examples for the concept. In Camera view, drag the yellow handle left to reveal the return scan.</p>

            <ul className="log" aria-live="polite">
              <li><span className="t num">14:21</span><div className="what"><b>Departure baseline saved</b><span>1,120 frames, 360°, paint depth and panel gap measured</span></div><span className="st">Recorded</span></li>
              <li className="ret-hide"><span className="t num">14:21</span><div className="what"><b>2 existing marks on record</b><span>Chip on front bumper, scuff on rear wheel arch. Not yours.</span></div><span className="st">Not yours</span></li>
              <li className="new"><span className="t num">09:26</span><div className="what"><b>Return scan compared to baseline</b><span>2 existing marks matched. 1 new mark found.</span></div><span className="st">Compared</span></li>
              <li className="new"><span className="t num">09:26</span><div className="what"><b>Scratch, 41 mm, rear left door</b><span>Photo, depth map and timestamp attached in the app</span></div><span className="st flag">New</span></li>
              <li className="new"><span className="t num">09:27</span><div className="what"><b>Charged under the contract you accepted Monday</b><span>Section 4.2, minor paint damage. Dispute in one tap.</span></div><span className="st">Itemized</span></li>
            </ul>
          </div>

          <div className="side">
            <h3 className="display">The bill is the difference, nothing more.</h3>
            <p>Anything on the car when you picked it up is on record and <b>not yours</b>. Anything new is measured, photographed and priced against the terms you already agreed to, before you reach the terminal door. No walk around with a clipboard, no letter three weeks later.</p>
            <div className="ticket" id="ticket" hidden>
              <div className="h"><span>Return receipt</span><b>Fri 09:27</b></div>
              <div className="rows num">
                <div><span>Compact · Mon 14:21 to Fri 09:26</span><span>as booked</span></div>
                <div className="zero"><span>Chip, front bumper (on record)</span><span>$0</span></div>
                <div className="zero"><span>Scuff, rear wheel arch (on record)</span><span>$0</span></div>
                <div><span>Scratch, 41 mm, rear left door · §4.2</span><span>$140</span></div>
              </div>
              <div className="total"><span>New charges</span><span className="num">$140</span></div>
              <p className="foot">Evidence attached: 6 photos, depth map, both timestamps. Example amounts, to be replaced with the real rate card.</p>
            </div>
            <div className="ticket" id="ticket-dep">
              <div className="h"><span>Departure record</span><b>Mon 14:21</b></div>
              <div className="rows">
                <div><span>Compact · bay 26 · Level P2</span><span>released</span></div>
                <div className="zero"><span>Chip, front bumper</span><span>on record</span></div>
                <div className="zero"><span>Scuff, rear wheel arch</span><span>on record</span></div>
              </div>
              <div className="total"><span>New charges</span><span className="num">$0</span></div>
              <p className="foot">This record is yours too. It is in the app before you leave the lot.</p>
            </div>
            <a className="btn btn-paint" href="#get">Rent this way <span className="arrow"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12 12 2M5 2h7v7" /></svg></span></a>
          </div>
        </div>
      </section>


      <section className="section wrap" id="compare">
        <div className="section-head">
          <h2 className="display">No counter. No clipboard. No argument at the desk.</h2>
          <p>The old rental hands you a car and a stranger's opinion of its condition. EZPZ hands you a car and a record.</p>
        </div>
        <div className="compare">
          <div className="laneA">
            <h3 className="display">The usual way</h3>
            <ol>
              <li><span className="k num">40'</span><div><b>Stand in line at the counter</b><span>after the flight, with the bags, behind the family with the questions.</span></div></li>
              <li><span className="k num">9</span><div><b>Sign nine pages you did not read</b><span>plus the upsell you did not want.</span></div></li>
              <li><span className="k num">1</span><div><b>One person, one clipboard, one opinion</b><span>walks around the car in the rain and marks what they feel like marking.</span></div></li>
              <li><span className="k num">3w</span><div><b>A damage letter three weeks later</b><span>for a scratch you are fairly sure was already there.</span></div></li>
            </ol>
          </div>
          <div className="laneB">
            <h3 className="display">EZPZ</h3>
            <ol>
              <li><span className="k num">0'</span><div><b>No line, no counter</b><span>you reserved while you walked. The kiosk knows you are coming.</span></div></li>
              <li><span className="k num">1</span><div><b>One contract, accepted in the app</b><span>the only terms you can ever be charged against.</span></div></li>
              <li><span className="k num">2</span><div><b>Two scans, out and in, the same for everyone</b><span>cameras and sensors on every panel, the same way every time, for every renter.</span></div></li>
              <li><span className="k num">0</span><div><b>Zero surprises</b><span>the bill is itemized with photos before you reach the terminal door, and you can dispute any line in the app.</span></div></li>
            </ol>
          </div>
        </div>
        <p className="compare-note">Waits and page counts are illustrative for the concept.</p>
      </section>


      <section className="section wrap" id="where">
        <div className="section-head">
          <h2 className="display">Any airport. Same three steps.</h2>
        </div>
        <div className="directory">
          <div className="board" role="table" aria-label="Example EZPZ locations">
            <div className="hd" role="row"><span>Code</span><span>Airport</span><span className="lot">EZPZ lot</span><span style={{ textAlign: 'right' }}>Walk</span></div>
            <div className="row" role="row"><span className="code">LAX</span><span className="city">Los Angeles</span><span className="lot">Structure P2, Level 2</span><span className="walk-t num">6 min</span></div>
            <div className="row" role="row"><span className="code">JFK</span><span className="city">New York</span><span className="lot">Yellow garage, Level 4</span><span className="walk-t num">8 min</span></div>
            <div className="row" role="row"><span className="code">LHR</span><span className="city">London Heathrow</span><span className="lot">Short stay, T2, Level 1</span><span className="walk-t num">7 min</span></div>
            <div className="row" role="row"><span className="code">CDG</span><span className="city">Paris</span><span className="lot">PAB, Level B1</span><span className="walk-t num">9 min</span></div>
            <div className="row" role="row"><span className="code">HND</span><span className="city">Tokyo Haneda</span><span className="lot">P3, Level 2</span><span className="walk-t num">5 min</span></div>
            <div className="row" role="row"><span className="code">DXB</span><span className="city">Dubai</span><span className="lot">T3 parking, Level G</span><span className="walk-t num">6 min</span></div>
            <div className="row" role="row"><span className="code">SYD</span><span className="city">Sydney</span><span className="lot">P7, Level 1</span><span className="walk-t num">7 min</span></div>
            <div className="note">Example network for the concept. Replace with launch locations.</div>
          </div>
          <div className="txt">
            <h3 className="display">The same kiosk, the same scan, the same bill, wherever you land.</h3>
            <p>EZPZ runs the whole handover, so the process does not change with the country, the brand of the car or the person on shift. There is no person on shift.</p>
            <div className="steps">
              <div><i>1</i><span>Tell us where and when, on the site or in the app, any time before you land.</span></div>
              <div><i>2</i><span>Pick your car. One contract, accepted once.</span></div>
              <div><i>3</i><span>Tap the kiosk, take the keys, drive out through the gantry. Drop it in any EZPZ bay and the return scan closes the bill.</span></div>
            </div>
          </div>
        </div>
      </section>


      <section className="close wrap" id="get">
        <div className="inner">
          <div className="stamp" aria-hidden="true">P2</div>
          <p className="tagline">Land. Tap. Drive.</p>
          <h2 className="stencil">Reserve it before you land.</h2>
          <div className="row">
            <p>Get EZPZ on your phone now, so the next time you walk out of arrivals the car is already in its bay, scanned, with the keys waiting at the kiosk.</p>
            <div className="stores">
              <a className="store" href="#get" aria-label="Download on the App Store, link added at launch">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.4 12.6c0-2.5 2-3.6 2.1-3.7-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.8-1.7 0-3.2 1-4.1 2.5-1.8 3.1-.5 7.6 1.3 10.1.9 1.2 1.9 2.6 3.2 2.5 1.3-.1 1.8-.8 3.3-.8s2 .8 3.3.8c1.4 0 2.2-1.2 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.9-1.1-2.9-4.1zM14 5.3c.7-.8 1.2-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z" /></svg>
                <span><small>Download on the</small><b>App Store</b></span>
              </a>
              <a className="store" href="#get" aria-label="Get it on Google Play, link added at launch">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.6 2.2 13 12l-9.4 9.8c-.4-.2-.6-.6-.6-1.2V3.4c0-.6.2-1 .6-1.2zm11.3 11.7 2.6 2.6-11 6.2c-.5.3-1 .3-1.4.1l9.8-8.9zm0-3.8L5.1 1.2c.4-.2.9-.2 1.4.1l11 6.2-2.6 2.6zm3.9 1.1 2.3 1.3c.8.5.8 1.4 0 1.9l-2.3 1.3L15.9 12l2.9-2.8z" /></svg>
                <span><small>Get it on</small><b>Google Play</b></span>
              </a>
            </div>
          </div>
        </div>
      </section>
      </div>
    </>
  )
}

export default HomePage
