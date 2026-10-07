import React, { Suspense, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import ezpzCss from './ezpz.css?inline'
import mobileCss from './mobile.css?inline'
import { useStyleSheet } from './useStyleSheet'
import { useFontsReady } from './useFontsReady'

const ARROW_DIAG = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12 12 2M5 2h7v7" />
  </svg>
)
const ARROW_RIGHT = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 7h10M7 2l5 5-5 5" />
  </svg>
)

const Nav: React.FC<{ home: boolean }> = ({ home }) => {
  // phones and tablets get a menu button; the link list is hidden by the stylesheet below 1000px
  const [open, setOpen] = useState(false)
  const { pathname, hash } = useLocation()
  useEffect(() => setOpen(false), [pathname, hash])

  return (
    <header className={`nav${open ? ' is-open' : ''}`}>
      <Link className="brand" to="/" aria-label="EZPZ home" onClick={() => home && window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <span className="plaque">EZPZ</span>
        <small>Land. Tap. Drive.</small>
      </Link>
      <ul id="nav-links">
        <li><Link to="/book">Book a car</Link></li>
        <li><Link to="/#scan">The scan</Link></li>
        <li><Link to="/#compare">Why it is fair</Link></li>
        {home && <li><Link to="/#where">Where</Link></li>}
        <li><Link to="/business">For Business</Link></li>
      </ul>
      {home ? (
        <a className="btn btn-ink cta" href="#get">
          Get the app <span className="arrow">{ARROW_DIAG}</span>
        </a>
      ) : (
        <Link className="btn btn-ink cta" to="/book">
          Book now <span className="arrow">{ARROW_RIGHT}</span>
        </Link>
      )}
      <button type="button" className="nav-toggle" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="nav-links" onClick={() => setOpen((o) => !o)}>
        <span aria-hidden="true"></span>
      </button>
    </header>
  )
}

const Footer: React.FC<{ home: boolean }> = ({ home }) => (
  <footer>
    <div className="inner">
      <div className="fbrand">
        <span className="plaque" style={{ fontSize: '18px', padding: '6px 9px 5px' }}>EZPZ</span>
        <span>Land. Tap. Drive.</span>
      </div>
      <nav>
        {home ? (
          <>
            <Link to="/#walk">The pickup</Link>
            <Link to="/#scan">The scan</Link>
            <Link to="/#compare">Why it is fair</Link>
            <Link to="/#where">Where</Link>
            <Link to="/business">For business</Link>
          </>
        ) : (
          <>
            <Link to="/book">Book a car</Link>
            <Link to="/#scan">The scan</Link>
            <Link to="/#compare">Why it is fair</Link>
            <Link to="/business">For Business</Link>
          </>
        )}
      </nav>
      <div>&copy; 2026 EZPZ</div>
    </div>
  </footer>
)

/**
 * Layout for every page that has been moved to the EZPZ design.
 * Owns the design stylesheet, the nav and the footer, and handles in-page
 * (#hash) scrolling, which the static site got for free from the browser.
 */
const EzpzLayout: React.FC = () => {
  useStyleSheet(ezpzCss, 'ezpz')
  useStyleSheet(mobileCss, 'ezpz-mobile')
  const { pathname, hash } = useLocation()
  const home = pathname === '/'
  const fontsReady = useFontsReady()

  useEffect(() => {
    if (!fontsReady) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    const id = hash.slice(1)
    // let the routed page mount before looking for the anchor
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    }, 60)
    return () => window.clearTimeout(t)
  }, [pathname, hash, fontsReady])

  return (
    <>
      <Nav home={home} />
      <main>
        {fontsReady && (
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        )}
      </main>
      {fontsReady && <Footer home={home} />}
    </>
  )
}

export default EzpzLayout
