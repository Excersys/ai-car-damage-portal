import { describe, it, expect, vi, beforeEach } from 'vitest'

// Stub env before importing
vi.stubEnv('VITE_API_BASE_URL', 'http://test-api.example.com')

// Use vi.hoisted to create mock before hoisting
const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}))

vi.mock('../config/api', () => ({
  apiClient: { get: mockGet },
}))

import {
  fetchCars,
  fetchCarById,
  fetchBookings,
  fetchBookingById,
  type VehicleSearchParams,
  type ApiCar,
  type ApiBooking,
} from './vehicleApi'

describe('vehicleApi', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  describe('fetchCars', () => {
    it('returns array when API returns an array', async () => {
      const cars: ApiCar[] = [
        { id: '1', make: 'Toyota', model: 'Camry', year: 2024, type: 'sedan', pricePerDay: 50, available: true, features: [] },
      ]
      mockGet.mockResolvedValueOnce({ data: cars })

      const result = await fetchCars()
      expect(result).toEqual(cars)
      expect(mockGet).toHaveBeenCalledWith('/vehicles/search')
    })

    it('returns data.vehicles when response is an object with vehicles', async () => {
      const cars = [{ id: '2', make: 'Honda', model: 'Civic', year: 2024, type: 'sedan', pricePerDay: 45, available: true, features: [] }]
      mockGet.mockResolvedValueOnce({ data: { vehicles: cars } })

      const result = await fetchCars()
      expect(result).toEqual(cars)
    })

    it('returns data.cars when response has cars key', async () => {
      const cars = [{ id: '3', make: 'Ford', model: 'Mustang', year: 2024, type: 'sports', pricePerDay: 80, available: true, features: [] }]
      mockGet.mockResolvedValueOnce({ data: { cars } })

      const result = await fetchCars()
      expect(result).toEqual(cars)
    })

    it('builds search params from VehicleSearchParams', async () => {
      mockGet.mockResolvedValueOnce({ data: [] })

      const params: VehicleSearchParams = {
        location: 'Denver',
        vehicleType: 'SUV',
        minPrice: 30,
        maxPrice: 100,
        startDate: '2026-05-01',
        endDate: '2026-05-05',
        sortBy: 'price',
        sortOrder: 'asc',
        page: 2,
        limit: 20,
      }

      await fetchCars(params)

      const calledUrl = mockGet.mock.calls[0][0] as string
      expect(calledUrl).toContain('location=Denver')
      expect(calledUrl).toContain('vehicleType=SUV')
      expect(calledUrl).toContain('minPrice=30')
      expect(calledUrl).toContain('maxPrice=100')
      expect(calledUrl).toContain('startDate=2026-05-01')
      expect(calledUrl).toContain('endDate=2026-05-05')
      expect(calledUrl).toContain('sortBy=price')
      expect(calledUrl).toContain('sortOrder=asc')
      expect(calledUrl).toContain('page=2')
      expect(calledUrl).toContain('limit=20')
    })

    it('skips location when set to "all"', async () => {
      mockGet.mockResolvedValueOnce({ data: [] })
      await fetchCars({ location: 'all' })
      const calledUrl = mockGet.mock.calls[0][0] as string
      expect(calledUrl).not.toContain('location=')
    })

    it('skips vehicleType when set to "All Types"', async () => {
      mockGet.mockResolvedValueOnce({ data: [] })
      await fetchCars({ vehicleType: 'All Types' })
      const calledUrl = mockGet.mock.calls[0][0] as string
      expect(calledUrl).not.toContain('vehicleType=')
    })

    it('falls back to /cars endpoint on search failure', async () => {
      mockGet
        .mockRejectedValueOnce(new Error('search failed'))
        .mockResolvedValueOnce({ data: [{ id: 'fallback' }] })

      const result = await fetchCars()
      expect(mockGet).toHaveBeenCalledTimes(2)
      expect(mockGet).toHaveBeenLastCalledWith('/cars')
      expect(result).toEqual([{ id: 'fallback' }])
    })

    it('returns null when both endpoints fail', async () => {
      mockGet
        .mockRejectedValueOnce(new Error('search failed'))
        .mockRejectedValueOnce(new Error('cars failed'))

      const result = await fetchCars()
      expect(result).toBeNull()
    })

    it('handles fallback endpoint returning object with cars key', async () => {
      mockGet
        .mockRejectedValueOnce(new Error('search failed'))
        .mockResolvedValueOnce({ data: { cars: [{ id: 'fb' }] } })

      const result = await fetchCars()
      expect(result).toEqual([{ id: 'fb' }])
    })

    it('returns null from fallback when data is not array and has no cars key', async () => {
      mockGet
        .mockRejectedValueOnce(new Error('search failed'))
        .mockResolvedValueOnce({ data: { something: 'else' } })

      const result = await fetchCars()
      expect(result).toBeNull()
    })

    it('returns null when data is neither array nor has vehicles/cars', async () => {
      mockGet.mockResolvedValueOnce({ data: { other: 'thing' } })
      const result = await fetchCars()
      expect(result).toBeNull()
    })

    it('calls base URL without query when no params', async () => {
      mockGet.mockResolvedValueOnce({ data: [] })
      await fetchCars()
      expect(mockGet).toHaveBeenCalledWith('/vehicles/search')
    })
  })

  describe('fetchCarById', () => {
    it('returns car data on success', async () => {
      const car = { id: '1', make: 'Toyota', model: 'Camry' }
      mockGet.mockResolvedValueOnce({ data: car })

      const result = await fetchCarById('1')
      expect(result).toEqual(car)
      expect(mockGet).toHaveBeenCalledWith('/cars/1')
    })

    it('returns null on error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Not found'))
      const result = await fetchCarById('999')
      expect(result).toBeNull()
    })

    it('returns null when data is undefined', async () => {
      mockGet.mockResolvedValueOnce({ data: undefined })
      const result = await fetchCarById('1')
      expect(result).toBeNull()
    })
  })

  describe('fetchBookings', () => {
    it('returns array when API returns an array', async () => {
      const bookings: ApiBooking[] = [
        { id: 'b1', startDate: '2026-05-01', endDate: '2026-05-05', status: 'confirmed' },
      ]
      mockGet.mockResolvedValueOnce({ data: bookings })

      const result = await fetchBookings()
      expect(result).toEqual(bookings)
      expect(mockGet).toHaveBeenCalledWith('/bookings')
    })

    it('returns data.bookings when response is object', async () => {
      const bookings = [{ id: 'b2', startDate: '2026-06-01', endDate: '2026-06-03', status: 'pending' }]
      mockGet.mockResolvedValueOnce({ data: { bookings } })

      const result = await fetchBookings()
      expect(result).toEqual(bookings)
    })

    it('returns null on error', async () => {
      mockGet.mockRejectedValueOnce(new Error('failed'))
      const result = await fetchBookings()
      expect(result).toBeNull()
    })

    it('returns null when data is not array and has no bookings key', async () => {
      mockGet.mockResolvedValueOnce({ data: { other: 'value' } })
      const result = await fetchBookings()
      expect(result).toBeNull()
    })
  })

  describe('fetchBookingById', () => {
    it('returns booking data on success', async () => {
      const booking = { id: 'b1', startDate: '2026-05-01', endDate: '2026-05-05', status: 'confirmed' }
      mockGet.mockResolvedValueOnce({ data: booking })

      const result = await fetchBookingById('b1')
      expect(result).toEqual(booking)
      expect(mockGet).toHaveBeenCalledWith('/bookings/b1')
    })

    it('returns null on error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Not found'))
      const result = await fetchBookingById('999')
      expect(result).toBeNull()
    })

    it('returns null when data is undefined', async () => {
      mockGet.mockResolvedValueOnce({ data: undefined })
      const result = await fetchBookingById('b1')
      expect(result).toBeNull()
    })
  })
})

describe('vehicleApi when API is not configured', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', '')
  })

  it('fetchCars returns null', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_API_BASE_URL', '')
    const mod = await import('./vehicleApi')
    const result = await mod.fetchCars()
    expect(result).toBeNull()
  })

  it('fetchCarById returns null', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_API_BASE_URL', '')
    const mod = await import('./vehicleApi')
    const result = await mod.fetchCarById('1')
    expect(result).toBeNull()
  })

  it('fetchBookings returns null', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_API_BASE_URL', '')
    const mod = await import('./vehicleApi')
    const result = await mod.fetchBookings()
    expect(result).toBeNull()
  })

  it('fetchBookingById returns null', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_API_BASE_URL', '')
    const mod = await import('./vehicleApi')
    const result = await mod.fetchBookingById('1')
    expect(result).toBeNull()
  })
})
