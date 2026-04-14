import * as fs from 'fs'
import * as path from 'path'

const SOURCE_PATH = path.resolve(__dirname, 'AdminFleetPage.tsx')
const source = fs.readFileSync(SOURCE_PATH, 'utf-8')

describe('AdminFleetPage – ACR-122 real data wiring', () => {
  it('imports fetchAdminVehicles from adminApi', () => {
    expect(source).toContain('fetchAdminVehicles')
    expect(source).toMatch(/import\s+\{[^}]*fetchAdminVehicles[^}]*\}\s+from\s+['"].*adminApi['"]/)
  })

  it('calls fetchAdminVehicles inside a useEffect', () => {
    expect(source).toContain('useEffect')
    expect(source).toContain('fetchAdminVehicles()')
  })

  it('maps API rows via mapApiVehicle before setting state', () => {
    expect(source).toContain('mapApiVehicle')
    expect(source).toMatch(/rows\.map\(mapApiVehicle\)/)
  })

  it('keeps MOCK_FLEET as fallback when API returns null', () => {
    expect(source).toContain('MOCK_FLEET')
    // The state initializes with mock data, API replaces only on success
    expect(source).toMatch(/useState<Vehicle\[\]>\(MOCK_FLEET\)/)
  })

  it('does not hardcode fleet data without fallback mechanism', () => {
    // Ensure the useEffect guards against null (cancelled || rows === null)
    expect(source).toContain('rows === null')
  })
})
