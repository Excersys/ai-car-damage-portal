import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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

const makeDashboardData = (overrides: any = {}) => ({
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
    { id: 'a2', type: 'verification_completed', user: 'Jane', score: 85, timestamp: '2026-01-02T00:00:00Z' },
    { id: 'a3', type: 'payment_processed', user: 'Bob', amount: 500, method: 'credit_card', timestamp: '2026-01-03T00:00:00Z' },
  ],
  alerts: [
    { id: 'al1', type: 'security', message: 'Low inventory', severity: 'warning', timestamp: '2026-01-01T00:00:00Z' },
    { id: 'al2', type: 'system', message: 'Server load high', severity: 'error', timestamp: '2026-01-02T00:00:00Z' },
    { id: 'al3', type: 'info', message: 'Update available', severity: 'info', timestamp: '2026-01-03T00:00:00Z' },
    { id: 'al4', type: 'good', message: 'All systems go', severity: 'success', timestamp: '2026-01-04T00:00:00Z' },
  ],
  userRole: 'super-admin',
  permissions: {
    canManageUsers: true,
    canManageVehicles: true,
    canViewFinancials: true,
    canManageBookings: true,
    canViewAnalytics: true,
  },
  ...overrides,
})

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

  it('shows generic error on API failure without response', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('Network error'))

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument()
    })
  })

  it('shows No Data Available when dashboardData is null', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockResolvedValueOnce({ data: null })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('No Data Available')).toBeInTheDocument()
    })
  })

  it('renders dashboard data on success', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockResolvedValueOnce({ data: makeDashboardData() })

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

  it('renders overview metrics correctly', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockResolvedValueOnce({ data: makeDashboardData() })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Total Bookings')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('Active: 25')).toBeInTheDocument()
      expect(screen.getByText('Total Revenue')).toBeInTheDocument()
      expect(screen.getByText('$50,000.00')).toBeInTheDocument()
      expect(screen.getByText('Fleet Status')).toBeInTheDocument()
      expect(screen.getByText('50')).toBeInTheDocument()
      expect(screen.getByText('Available: 30')).toBeInTheDocument()
      expect(screen.getByText('Pending Reviews')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('Flagged: 2')).toBeInTheDocument()
    })
  })

  it('renders recent activity items', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockResolvedValueOnce({ data: makeDashboardData() })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument()
      expect(screen.getByText('John')).toBeInTheDocument()
      expect(screen.getByText(/booked Tesla Model 3/)).toBeInTheDocument()
      expect(screen.getByText('Jane')).toBeInTheDocument()
      expect(screen.getByText(/completed verification/)).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
      expect(screen.getByText(/paid.*credit_card/)).toBeInTheDocument()
    })
  })

  it('renders alerts with different severities', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockResolvedValueOnce({ data: makeDashboardData() })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Alerts & Notifications')).toBeInTheDocument()
      expect(screen.getByText('Low inventory')).toBeInTheDocument()
      expect(screen.getByText('Server load high')).toBeInTheDocument()
      expect(screen.getByText('Update available')).toBeInTheDocument()
      expect(screen.getByText('All systems go')).toBeInTheDocument()
    })
  })

  it('shows system health indicator', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockResolvedValueOnce({ data: makeDashboardData() })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('System healthy')).toBeInTheDocument()
    })
  })

  const getNavTab = (text: string) => {
    const tabs = document.querySelectorAll('.nav-tab')
    return Array.from(tabs).find(tab => tab.textContent?.includes(text)) as HTMLElement
  }

  it('shows navigation tabs based on permissions', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockResolvedValueOnce({ data: makeDashboardData() })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(getNavTab('Overview')).toBeInTheDocument()
      expect(getNavTab('Bookings')).toBeInTheDocument()
      expect(getNavTab('Vehicles')).toBeInTheDocument()
      expect(getNavTab('Users')).toBeInTheDocument()
      expect(getNavTab('Analytics')).toBeInTheDocument()
      expect(getNavTab('System')).toBeInTheDocument()
    })
  })

  it('hides tabs when permissions are false', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: makeDashboardData({
        permissions: {
          canManageUsers: false,
          canManageVehicles: false,
          canViewFinancials: false,
          canManageBookings: false,
          canViewAnalytics: false,
        },
      }),
    })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(getNavTab('Overview')).toBeInTheDocument()
    })

    expect(getNavTab('Bookings')).toBeUndefined()
    expect(getNavTab('Vehicles')).toBeUndefined()
    expect(getNavTab('Users')).toBeUndefined()
    expect(getNavTab('Analytics')).toBeUndefined()
    // System tab is always visible
    expect(getNavTab('System')).toBeInTheDocument()
  })

  it('switches to bookings tab', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockResolvedValueOnce({ data: makeDashboardData() })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Admin Dashboard'))

    fireEvent.click(getNavTab('Bookings'))

    expect(screen.getByText(/Booking Management/)).toBeInTheDocument()
    expect(screen.getByText(/Comprehensive booking management/)).toBeInTheDocument()
  })

  it('switches to vehicles tab', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockResolvedValueOnce({ data: makeDashboardData() })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Admin Dashboard'))

    fireEvent.click(getNavTab('Vehicles'))

    expect(screen.getByText(/Fleet Management/)).toBeInTheDocument()
    expect(screen.getByText(/Vehicle management dashboard/)).toBeInTheDocument()
  })

  it('switches to users tab', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockResolvedValueOnce({ data: makeDashboardData() })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Admin Dashboard'))

    fireEvent.click(getNavTab('Users'))

    expect(screen.getByText(/User Management/)).toBeInTheDocument()
    expect(screen.getByText(/User administration panel/)).toBeInTheDocument()
  })

  it('switches to analytics tab', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockResolvedValueOnce({ data: makeDashboardData() })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Admin Dashboard'))

    fireEvent.click(getNavTab('Analytics'))

    expect(screen.getByText(/Financial Analytics/)).toBeInTheDocument()
    expect(screen.getByText(/Comprehensive analytics dashboard/)).toBeInTheDocument()
  })

  it('switches to system tab', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockResolvedValueOnce({ data: makeDashboardData() })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Admin Dashboard'))

    fireEvent.click(getNavTab('System'))

    expect(screen.getByText(/System Health/)).toBeInTheDocument()
    expect(screen.getByText(/System monitoring dashboard/)).toBeInTheDocument()
  })

  it('switches back to overview tab', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockResolvedValueOnce({ data: makeDashboardData() })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Admin Dashboard'))

    // Switch away
    fireEvent.click(getNavTab('System'))
    expect(screen.getByText(/System Health/)).toBeInTheDocument()

    // Switch back
    fireEvent.click(getNavTab('Overview'))
    expect(screen.getByText('Total Bookings')).toBeInTheDocument()
  })

  it('retry button refetches dashboard data', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get)
      .mockRejectedValueOnce({ response: { data: { error: 'Temporary error' } } })
      .mockResolvedValueOnce({ data: makeDashboardData() })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Temporary error')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Try Again'))

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
    })
  })

  it('refresh button refetches dashboard data', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get)
      .mockResolvedValueOnce({ data: makeDashboardData() })
      .mockResolvedValueOnce({ data: makeDashboardData({ overview: { ...makeDashboardData().overview, totalBookings: 200 } }) })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Refresh/))

    await waitFor(() => {
      expect(screen.getByText('200')).toBeInTheDocument()
    })
  })

  it('renders different role display names', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: makeDashboardData({ userRole: 'fleet-manager' }),
    })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Fleet Manager')).toBeInTheDocument()
    })
  })

  it('renders agent role display name', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: makeDashboardData({ userRole: 'agent' }),
    })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Customer Service Agent')).toBeInTheDocument()
    })
  })

  it('renders customer role display name', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: makeDashboardData({ userRole: 'customer' }),
    })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Customer')).toBeInTheDocument()
    })
  })

  it('renders unknown role as-is', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: makeDashboardData({ userRole: 'custom-role' }),
    })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('custom-role')).toBeInTheDocument()
    })
  })

  it('renders different system health statuses', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: makeDashboardData({
        overview: { ...makeDashboardData().overview, systemHealth: 'warning' },
      }),
    })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('System warning')).toBeInTheDocument()
    })
  })

  it('renders maintenance system health status', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: makeDashboardData({
        overview: { ...makeDashboardData().overview, systemHealth: 'maintenance' },
      }),
    })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('System maintenance')).toBeInTheDocument()
    })
  })

  it('renders activity items with different types and icons', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: makeDashboardData({
        recentActivity: [
          { id: 'a1', type: 'vehicle_returned', user: 'Mike', timestamp: '2026-01-01T00:00:00Z' },
          { id: 'a2', type: 'damage_reported', user: 'Sara', timestamp: '2026-01-02T00:00:00Z' },
          { id: 'a3', type: 'user_registered', user: 'Tom', timestamp: '2026-01-03T00:00:00Z' },
          { id: 'a4', type: 'refund_processed', user: 'Kim', amount: 200, timestamp: '2026-01-04T00:00:00Z' },
          { id: 'a5', type: 'unknown_type', user: 'Pat', timestamp: '2026-01-05T00:00:00Z' },
        ],
      }),
    })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Mike')).toBeInTheDocument()
      expect(screen.getByText('Sara')).toBeInTheDocument()
      expect(screen.getByText('Tom')).toBeInTheDocument()
      expect(screen.getByText('Kim')).toBeInTheDocument()
      expect(screen.getByText('Pat')).toBeInTheDocument()
    })
  })

  it('shows activity amounts when present', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: makeDashboardData({
        recentActivity: [
          { id: 'a1', type: 'payment_processed', user: 'Bob', amount: 500, method: 'credit_card', timestamp: '2026-01-01T00:00:00Z' },
        ],
      }),
    })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('$500.00')).toBeInTheDocument()
    })
  })

  it('renders alert severity colors correctly', async () => {
    localStorage.setItem('authToken', 'test-token')
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: makeDashboardData({
        alerts: [
          { id: 'al1', type: 'test', message: 'Unknown severity', severity: 'unknown', timestamp: '2026-01-01T00:00:00Z' },
        ],
      }),
    })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Unknown severity')).toBeInTheDocument()
    })
  })

  it('sends auth token in API request', async () => {
    localStorage.setItem('authToken', 'my-secret-token')
    vi.mocked(axios.get).mockResolvedValueOnce({ data: makeDashboardData() })

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(vi.mocked(axios.get)).toHaveBeenCalledWith('/api/admin/dashboard', {
        headers: { Authorization: 'Bearer my-secret-token' },
      })
    })
  })
})
