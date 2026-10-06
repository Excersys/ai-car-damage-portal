import React from 'react'
import BookBar from '../ezpz/BookBar'
import { useDocumentTitle } from '../ezpz/useDocumentTitle'

/** /book — "Easy as 1, 2, 3": the search plaque with the three steps (design: book/index.html). */
const BookPage: React.FC = () => {
  useDocumentTitle('Book a car · EZPZ')

  return (
    <div className="bookpage">
      <section className="book-hero wrap">
        <div className="book-hero-in">
          <div className="book-hero-copy">
            <p className="kicker">Book a car</p>
            <h1 className="stencil">Easy as <span className="accent">1, 2, 3</span></h1>
            <p className="lede">No counter. No line. No paperwork at pickup. Pick a car now and the keys are waiting at the kiosk when you land.</p>
          </div>
          <div className="mascot" aria-hidden="true">
            <img src="/images/ezpz/mascot.png" alt="" id="mascot-img" />
            <div className="mascot-fallback">
              <span className="plaque">EZPZ</span>
              <p>mascot goes here</p>
            </div>
          </div>
        </div>

        <ol className="steps">
          <li className="step">
            <span className="step-n">1</span>
            <h3>Tell us where and when</h3>
            <p>Airport, dates, times. Six boxes, no account needed yet.</p>
          </li>
          <li className="step">
            <span className="step-n">2</span>
            <h3>Pick your car</h3>
            <p>Real prices, all in. No counter upsell, no surprise at the desk.</p>
          </li>
          <li className="step">
            <span className="step-n">3</span>
            <h3>Tap and drive</h3>
            <p>Keys at the kiosk. The car is scanned out and back, so you pay for what changed.</p>
          </li>
        </ol>
      </section>

      <section className="wrap booksearch-wrap">
        <BookBar variant="book" />
      </section>

      <section className="wrap reassure">
        <div className="reassure-grid">
          <div><b>0</b><span>people at the counter</span></div>
          <div><b>2 min</b><span>from kiosk to driving</span></div>
          <div><b>2</b><span>scans per rental, out and back</span></div>
          <div><b>0</b><span>surprise damage charges</span></div>
        </div>
      </section>
    </div>
  )
}

export default BookPage
