import * as fs from 'fs'
import * as path from 'path'

const SOURCE_PATH = path.resolve(__dirname, 'AdminReservationsPage.tsx')
const source = fs.readFileSync(SOURCE_PATH, 'utf-8')

describe('AdminReservationsPage – ACR-122 real data wiring', () => {
  it('imports fetchAdminBookings from adminApi', () => {
    expect(source).toContain('fetchAdminBookings')
    expect(source).toMatch(/import\s+\{[^}]*fetchAdminBookings[^}]*\}\s+from\s+['"].*adminApi['"]/)
  })

  it('calls fetchAdminBookings inside a useEffect', () => {
    expect(source).toContain('useEffect')
    expect(source).toContain('fetchAdminBookings()')
  })

  it('maps API rows via mapApiBooking before setting state', () => {
    expect(source).toContain('mapApiBooking')
    expect(source).toMatch(/rows\.map\(mapApiBooking\)/)
  })

  it('keeps MOCK_RESERVATIONS as fallback when API returns null', () => {
    expect(source).toContain('MOCK_RESERVATIONS')
    expect(source).toMatch(/useState<Reservation\[\]>\(MOCK_RESERVATIONS\)/)
  })

  it('guards against null API response', () => {
    expect(source).toContain('rows === null')
  })
})
