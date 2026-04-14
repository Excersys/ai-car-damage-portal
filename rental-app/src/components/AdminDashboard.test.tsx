import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    })),
  },
}))

import axios from 'axios'
import AdminDashboard from './AdminDashboard'

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockReset()
    localStorage.clear()
  })

  it('shows loading state initially', () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockReturnValue(new Promise(() => {})) // never resolves

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )
    expect(screen.getByText('Loading admin dashboard...')).toBeInTheDocument()
  })

  it('shows error when no auth token', async () => {
    // No token in localStorage
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Access Error')).toBeInTheDocument()
    })
  })

  it('shows error on API failure', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockRejectedValueOnce({
      response: { data: { error: 'Forbidden' } },
    })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Forbidden')).toBeInTheDocument()
    })
  })

  it('renders dashboard data on success', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: {
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
        recentActivity: [
          { id: 'a1', type: 'booking_created', user: 'John', vehicle: 'Tesla Model 3', timestamp: '2026-01-01T00:00:00Z' },
        ],
        alerts: [
          { id: 'al1', type: 'warning', message: 'Low inventory', severity: 'warning', timestamp: '2026-01-01T00:00:00Z' },
        ],
        userRole: 'super-admin',
        permissions: {
          canManageUsers: true,
          canManageVehicles: true,
          canViewFinancials: true,
          canManageBookings: true,
          canViewAnalytics: true,
        },
      },
    })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Super Administrator')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
    })
  })
})
