import React from 'react'
import legacyCss from '../index.css?inline'
import appCss from '../App.css?inline'
import { useStyleSheet } from '../ezpz/useStyleSheet'

/**
 * Wraps the pages that have not been moved to the EZPZ design yet (and the
 * admin portal). They keep the original stylesheet, which is only present in
 * the document while one of them is on screen so it cannot affect the EZPZ pages.
 */
const LegacyShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useStyleSheet(legacyCss, 'legacy')
  useStyleSheet(appCss, 'legacy-app')
  return <div className="App">{children}</div>
}

export default LegacyShell
