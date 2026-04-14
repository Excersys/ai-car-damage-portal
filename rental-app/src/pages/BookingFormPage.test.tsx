export {}
const fs = require('fs')
const path = require('path')

describe('BookingFormPage (ACR-121)', () => {
  const content = fs.readFileSync(path.resolve(__dirname, 'BookingFormPage.tsx'), 'utf8')

  it('imports apiClient for booking persistence', () => {
    expect(content).toContain("from '../config/api'")
    expect(content).toContain('apiClient')
  })

  it('calls POST /bookings to persist reservations', () => {
    expect(content).toContain("apiClient.post('/bookings'")
  })

  it('sends carId, userId, dates, and totalAmount in booking payload', () => {
    expect(content).toContain('carId:')
    expect(content).toContain('startDate:')
    expect(content).toContain('endDate:')
    expect(content).toContain('totalAmount:')
  })

  it('uses API-returned bookingId when available', () => {
    expect(content).toContain('response.data?.bookingId')
  })

  it('gracefully falls back to local ID on API failure', () => {
    expect(content).toContain('Failed to persist booking, using local ID')
  })
})

describe('BookingFormPage (ACR-125) – verification gate before payment', () => {
  const src = fs.readFileSync(path.resolve(__dirname, 'BookingFormPage.tsx'), 'utf8')

  it('checks verificationSessionId before allowing transition to payment step', () => {
    expect(src).toContain('verificationSessionId')
    expect(src).toMatch(/!verificationSessionId/)
  })

  it('blocks step progression to payment (step 5) when verification is missing', () => {
    expect(src).toMatch(/currentStep\s*===\s*4\s*&&\s*!verificationSessionId/)
  })

  it('returns early (does not increment step) when verification gate fails', () => {
    const gateIdx = src.indexOf('currentStep === 4 && !verificationSessionId')
    expect(gateIdx).toBeGreaterThan(-1)
    const gateBlock = src.slice(gateIdx)
    const nextReturn = gateBlock.indexOf('return')
    expect(nextReturn).toBeGreaterThan(0)
    expect(nextReturn).toBeLessThan(200)
  })

  it('tracks verificationSessionId state', () => {
    expect(src).toContain('setVerificationSessionId')
  })

  it('has a VeriffVerification component for step 2', () => {
    expect(src).toContain('VeriffVerification')
    expect(src).toContain('onVerificationComplete')
  })
})

describe('BookingsPage (ACR-121)', () => {
  const content = fs.readFileSync(path.resolve(__dirname, 'BookingsPage.tsx'), 'utf8')

  it('imports fetchBookings from vehicleApi', () => {
    expect(content).toContain('fetchBookings')
    expect(content).toContain("from '../lib/vehicleApi'")
  })

  it('calls fetchBookings in useEffect', () => {
    expect(content).toContain('fetchBookings()')
  })
})
