import React from 'react'
import { useDocumentTitle } from '../ezpz/useDocumentTitle'

/** /app — where the store links land once the app ships (design: app/index.html). */
const AppPage: React.FC = () => {
  useDocumentTitle('Get the app · EZPZ')

  return (
    <div className="wrap apppage">
      <div className="cfhead">
        <p className="kicker">EZPZ app</p>
        <h1 className="stencil">The keys live here.</h1>
        <p className="cklede">Reserve, find your bay, open the locker, see both scans. The store links land here the day the app ships.</p>
        {/* PLACEHOLDER: replace these two hrefs with the real App Store and Google Play links. */}
        <div className="stores apstores">
          <a className="store" href="/app" aria-label="Download on the App Store, link added at launch">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.4 12.6c0-2.5 2-3.6 2.1-3.7-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.8-1.7 0-3.2 1-4.1 2.5-1.8 3.1-.5 7.6 1.3 10.1.9 1.2 1.9 2.6 3.2 2.5 1.3-.1 1.8-.8 3.3-.8s2 .8 3.3.8c1.4 0 2.2-1.2 3.1-2.4 1-1.4 1.4-2.7 1.4-2.8-.1 0-2.8-1.1-2.9-4.3zM14 5.3c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.2 1.1.1 2.3-.6 3-1.5z" /></svg>
            <span><small>Download on the</small><b>App Store</b></span>
          </a>
          <a className="store" href="/app" aria-label="Get it on Google Play, link added at launch">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.6 2.2 13 12l-9.4 9.8c-.4-.2-.6-.6-.6-1.2V3.4c0-.6.2-1 .6-1.2zm11.3 11.7 2.6 2.6-11 6.2c-.5.3-1 .3-1.4.1l9.8-8.9zm0-3.8L5.1 1.2c.4-.2.9-.2 1.4.1l11 6.2-2.6 2.6zm3.9 1.1 2.3 1.3c.8.5.8 1.3 0 1.8l-2.3 1.3L16 12l2.8-2.8z" /></svg>
            <span><small>Get it on</small><b>Google Play</b></span>
          </a>
        </div>
        <p className="ckfine">Reserved on the site already? Your reservation is waiting in the app under the same email.</p>
      </div>
    </div>
  )
}

export default AppPage
