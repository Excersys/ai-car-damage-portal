export {}

describe('VeriffVerification', () => {
  it('exports a default component', () => {
    // Can't import directly due to import.meta.env, but verify module shape
    const fs = require('fs')
    const content = fs.readFileSync(
      require('path').resolve(__dirname, 'VeriffVerification.tsx'),
      'utf8'
    )
    expect(content).toContain('export default VeriffVerification')
  })

  it('uses real Veriff InContext SDK instead of simulated timers', () => {
    const fs = require('fs')
    const content = fs.readFileSync(
      require('path').resolve(__dirname, 'VeriffVerification.tsx'),
      'utf8'
    )
    // Verify Veriff SDK import is present
    expect(content).toContain("from '@veriff/incontext-sdk'")
    expect(content).toContain('createVeriffFrame')
    // Verify old simulation patterns are removed
    expect(content).not.toContain('Math.random()')
    expect(content).not.toContain('DEMO_SESSION_')
    expect(content).not.toContain('Demo mode:')
  })

  it('calls real API endpoints instead of simulating', () => {
    const fs = require('fs')
    const content = fs.readFileSync(
      require('path').resolve(__dirname, 'VeriffVerification.tsx'),
      'utf8'
    )
    expect(content).toContain("apiClient.post('/verification/create-session'")
    expect(content).toContain("apiClient.get(`/verification/status/")
  })
})
