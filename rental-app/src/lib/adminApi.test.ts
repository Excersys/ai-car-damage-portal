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
  fetchAdminDashboard,
  fetchAdminUsers,
  fetchAdminVehicles,
  fetchAdminBookings,
  fetchAdminFinancialAnalytics,
} from './adminApi'

describe('adminApi', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  describe('fetchAdminDashboard', () => {
    it('returns dashboard data on success', async () => {
      const dashboard = {
        overview: {
          totalBookings: 100,
          activeBookings: 25,
          totalRevenue: 50000,
          totalVehicles: 50,
          availableVehicles: 30,
          pendingVerifications: 5,
          flaggedUsers: 2,
          systemHealth: 'healthy',
        },
        recentActivity: [],
        alerts: [],
      }
      mockGet.mockResolvedValueOnce({ data: dashboard })

      const result = await fetchAdminDashboard()
      expect(result).toEqual(dashboard)
      expect(mockGet).toHaveBeenCalledWith('/admin/dashboard')
    })

    it('returns null on error', async () => {
      mockGet.mockRejectedValueOnce(new Error('forbidden'))
      const result = await fetchAdminDashboard()
      expect(result).toBeNull()
    })
  })

  describe('fetchAdminUsers', () => {
    it('returns users array from data.users', async () => {
      const users = [
        { id: 'u1', email: 'test@test.com', status: 'active' },
      ]
      mockGet.mockResolvedValueOnce({ data: { users } })

      const result = await fetchAdminUsers()
      expect(result).toEqual(users)
      expect(mockGet).toHaveBeenCalledWith('/admin/users')
    })

    it('returns empty array when users is undefined', async () => {
      mockGet.mockResolvedValueOnce({ data: {} })
      const result = await fetchAdminUsers()
      expect(result).toEqual([])
    })

    it('returns null on error', async () => {
      mockGet.mockRejectedValueOnce(new Error('error'))
      const result = await fetchAdminUsers()
      expect(result).toBeNull()
    })
  })

  describe('fetchAdminVehicles', () => {
    it('returns vehicles array from data.vehicles', async () => {
      const vehicles = [
        { id: 'v1', make: 'Toyota', model: 'Camry', year: 2024, licensePlate: 'ABC123', status: 'available' },
      ]
      mockGet.mockResolvedValueOnce({ data: { vehicles } })

      const result = await fetchAdminVehicles()
      expect(result).toEqual(vehicles)
      expect(mockGet).toHaveBeenCalledWith('/admin/vehicles')
    })

    it('returns empty array when vehicles is undefined', async () => {
      mockGet.mockResolvedValueOnce({ data: {} })
      const result = await fetchAdminVehicles()
      expect(result).toEqual([])
    })

    it('returns null on error', async () => {
      mockGet.mockRejectedValueOnce(new Error('error'))
      const result = await fetchAdminVehicles()
      expect(result).toBeNull()
    })
  })

  describe('fetchAdminBookings', () => {
    it('returns bookings array from data.bookings', async () => {
      const bookings = [
        {
          id: 'b1',
          customer: { name: 'John', email: 'john@test.com' },
          vehicle: { make: 'Toyota', model: 'Camry', year: 2024, licensePlate: 'ABC123' },
          rental: { startDate: '2026-05-01', endDate: '2026-05-05' },
          pricing: { total: 200 },
          status: 'confirmed',
        },
      ]
      mockGet.mockResolvedValueOnce({ data: { bookings } })

      const result = await fetchAdminBookings()
      expect(result).toEqual(bookings)
      expect(mockGet).toHaveBeenCalledWith('/admin/bookings')
    })

    it('returns empty array when bookings is undefined', async () => {
      mockGet.mockResolvedValueOnce({ data: {} })
      const result = await fetchAdminBookings()
      expect(result).toEqual([])
    })

    it('returns null on error', async () => {
      mockGet.mockRejectedValueOnce(new Error('error'))
      const result = await fetchAdminBookings()
      expect(result).toBeNull()
    })
  })

  describe('fetchAdminFinancialAnalytics', () => {
    it('returns summary from data.summary', async () => {
      const summary = {
        totalRevenue: 100000,
        totalBookings: 500,
        averageBookingValue: 200,
        revenueGrowth: 15,
        bookingGrowth: 10,
      }
      mockGet.mockResolvedValueOnce({ data: { summary } })

      const result = await fetchAdminFinancialAnalytics()
      expect(result).toEqual(summary)
      expect(mockGet).toHaveBeenCalledWith('/admin/analytics/financial')
    })

    it('returns null when summary is undefined', async () => {
      mockGet.mockResolvedValueOnce({ data: {} })
      const result = await fetchAdminFinancialAnalytics()
      expect(result).toBeNull()
    })

    it('returns null on error', async () => {
      mockGet.mockRejectedValueOnce(new Error('error'))
      const result = await fetchAdminFinancialAnalytics()
      expect(result).toBeNull()
    })
  })
})

describe('adminApi when API is not configured', () => {
  it('all functions return null', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_API_BASE_URL', '')
    const mod = await import('./adminApi')

    expect(await mod.fetchAdminDashboard()).toBeNull()
    expect(await mod.fetchAdminUsers()).toBeNull()
    expect(await mod.fetchAdminVehicles()).toBeNull()
    expect(await mod.fetchAdminBookings()).toBeNull()
    expect(await mod.fetchAdminFinancialAnalytics()).toBeNull()
  })
})
