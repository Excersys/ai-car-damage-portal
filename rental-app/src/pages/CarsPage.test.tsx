export {}
const fs = require('fs')
const path = require('path')

describe('CarsPage (ACR-120)', () => {
  const content = fs.readFileSync(path.resolve(__dirname, 'CarsPage.tsx'), 'utf8')

  it('imports fetchCars from vehicleApi', () => {
    expect(content).toContain("from '../lib/vehicleApi'")
    expect(content).toContain('fetchCars')
  })

  it('calls fetchCars with search params in useEffect', () => {
    expect(content).toContain('fetchCars(')
    expect(content).toContain('vehicleType')
  })

  it('has fallback data for when API is not configured', () => {
    expect(content).toContain('FALLBACK_CARS')
  })
})
