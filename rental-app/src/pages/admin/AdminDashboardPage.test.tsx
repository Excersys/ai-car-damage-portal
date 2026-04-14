import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { mockFetchAdminDashboard, mockIsTunnelConfigured, mockFetchTunnelEvents } = vi.hoisted(() => ({
  mockFetchAdminDashboard: vi.fn(),
  mockIsTunnelConfigured: vi.fn(),
  mockFetchTunnelEvents: vi.fn(),
}))

vi.mock('../../lib/adminApi', () => ({
  fetchAdminDashboard: mockFetchAdminDashboard,
}))

vi.mock('../../lib/tunnelReviewApi', () => ({
  isTunnelReviewConfigured: mockIsTunnelConfigured,
  fetchTunnelEvents: mockFetchTunnelEvents,
}))

import AdminDashboardPage from './AdminDashboardPage'

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    mockFetchAdminDashboard.mockReset()
    mockIsTunnelConfigured.mockReturnValue(false)
    mockFetchTunnelEvents.mockResolvedValue({ events: [], count: 0 })
    mockFetchAdminDashboard.mockResolvedValue(null)
  })

  const renderPage = () =>
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    )

  it('renders dashboard with metrics', async () => {
    await act(async () => {
      renderPage()
    })
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Total Revenue')).toBeInTheDocument()
    expect(screen.getByText('Active Reservations')).toBeInTheDocument()
    expect(screen.getByText('Available Vehicles')).toBeInTheDocument()
    expect(screen.getByText('Total Customers')).toBeInTheDocument()
  })

  it('renders recent activity section', async () => {
    await act(async () => {
      renderPage()
    })
    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('renders upcoming reservations section', async () => {
    await act(async () => {
      renderPage()
    })
    expect(screen.getByText("Today's Pickups")).toBeInTheDocument()
    expect(screen.getByText('Alice Brown')).toBeInTheDocument()
  })

  it('renders fleet overview section', async () => {
    await act(async () => {
      renderPage()
    })
    expect(screen.getByText('Fleet Overview')).toBeInTheDocument()
  })

  it('renders alerts section', async () => {
    await act(async () => {
      renderPage()
    })
    expect(screen.getByText(/Alerts & Notifications/)).toBeInTheDocument()
    expect(screen.getByText(/Oil change due/)).toBeInTheDocument()
    expect(screen.getByText(/New damage report/)).toBeInTheDocument()
  })

  it('renders quick actions section', async () => {
    await act(async () => {
      renderPage()
    })
    expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    expect(screen.getByText('New Reservation')).toBeInTheDocument()
    expect(screen.getByText('Damage Check')).toBeInTheDocument()
    expect(screen.getByText('Add Vehicle')).toBeInTheDocument()
    expect(screen.getByText('View Reports')).toBeInTheDocument()
  })

  it('shows tunnel config hint when not configured', async () => {
    await act(async () => {
      renderPage()
    })
    expect(screen.getByText(/VITE_TUNNEL_REVIEW_API_BASE_URL/)).toBeInTheDocument()
  })

  it('loads tunnel events when configured', async () => {
    mockIsTunnelConfigured.mockReturnValue(true)
    mockFetchTunnelEvents.mockResolvedValueOnce({
      events: [
        {
          event_id: 'ev1',
          license_plate: 'TEST123',
          camera_count: 3,
          any_damage: true,
          last_timestamp: '2026-01-15T10:00:00Z',
          qc_status: 'pending',
          preview_image_url: 'https://example.com/preview.jpg',
        },
      ],
      count: 1,
    })

    await act(async () => {
      renderPage()
    })

    await waitFor(() => {
      expect(screen.getByText('ev1')).toBeInTheDocument()
      expect(screen.getByText(/TEST123/)).toBeInTheDocument()
      expect(screen.getByText('Damage flagged')).toBeInTheDocument()
    })
  })

  it('shows tunnel loading state', async () => {
    mockIsTunnelConfigured.mockReturnValue(true)
    let resolveEvents: Function
    mockFetchTunnelEvents.mockReturnValueOnce(
      new Promise(res => { resolveEvents = res })
    )

    await act(async () => {
      renderPage()
    })

    expect(screen.getByText(/Loading tunnel events/)).toBeInTheDocument()

    await act(async () => {
      resolveEvents!({ events: [], count: 0 })
    })
  })

  it('shows tunnel error state', async () => {
    mockIsTunnelConfigured.mockReturnValue(true)
    mockFetchTunnelEvents.mockRejectedValueOnce(new Error('Connection failed'))

    await act(async () => {
      renderPage()
    })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Connection failed')
    })
  })

  it('shows no events message when configured but empty', async () => {
    mockIsTunnelConfigured.mockReturnValue(true)
    mockFetchTunnelEvents.mockResolvedValueOnce({ events: [], count: 0 })

    await act(async () => {
      renderPage()
    })

    await waitFor(() => {
      expect(screen.getByText(/No tunnel scan events/)).toBeInTheDocument()
    })
  })

  it('updates dashboard data from API', async () => {
    mockFetchAdminDashboard.mockResolvedValueOnce({
      overview: {
        totalRevenue: 99999,
        activeBookings: 42,
        availableVehicles: 15,
      },
      recentActivity: [
        {
          id: 'a1',
          type: 'booking',
          user: 'API User',
          vehicle: 'API Car',
          timestamp: new Date().toISOString(),
          status: 'confirmed',
        },
        {
          id: 'a2',
          type: 'verification',
          user: 'Verify User',
          timestamp: new Date().toISOString(),
          status: 'pending',
        },
        {
          id: 'a3',
          type: 'payment',
          user: 'Pay User',
          timestamp: new Date().toISOString(),
          status: 'completed',
        },
      ],
      alerts: [
        {
          id: 'al1',
          type: 'maintenance',
          message: 'API alert message',
          severity: 'warning',
        },
        {
          id: 'al2',
          type: 'system',
          message: 'Info alert',
          severity: 'info',
        },
        {
          id: 'al3',
          type: 'critical',
          message: 'Critical alert',
          severity: 'critical',
        },
      ],
    })

    await act(async () => {
      renderPage()
    })

    await waitFor(() => {
      expect(screen.getByText('$99,999')).toBeInTheDocument()
      expect(screen.getByText('42')).toBeInTheDocument()
      expect(screen.getByText('15')).toBeInTheDocument()
      expect(screen.getByText('API User')).toBeInTheDocument()
      expect(screen.getByText('API alert message')).toBeInTheDocument()
    })
  })

  it('shows "No preview" when tunnel event has no preview_image_url', async () => {
    mockIsTunnelConfigured.mockReturnValue(true)
    mockFetchTunnelEvents.mockResolvedValueOnce({
      events: [
        {
          event_id: 'ev2',
          license_plate: 'NO-IMG',
          camera_count: 1,
          any_damage: false,
          last_timestamp: '',
          qc_status: 'approved',
        },
      ],
      count: 1,
    })

    await act(async () => {
      renderPage()
    })

    await waitFor(() => {
      expect(screen.getByText('No preview')).toBeInTheDocument()
    })
  })

  it('renders View All and Manage All links', async () => {
    await act(async () => {
      renderPage()
    })
    expect(screen.getByText('View All').closest('a')).toHaveAttribute('href', '/admin/reservations')
    expect(screen.getByText('Manage All').closest('a')).toHaveAttribute('href', '/admin/reservations')
    expect(screen.getByText('Manage Fleet').closest('a')).toHaveAttribute('href', '/admin/fleet')
  })

  it('renders activity icons for different types', async () => {
    await act(async () => {
      renderPage()
    })
    // Default activity data has booking, damage, return types
    const activityItems = document.querySelectorAll('.activity-icon')
    expect(activityItems.length).toBeGreaterThan(0)
  })

  it('shows fleet status cards with Book Now for available vehicles', async () => {
    await act(async () => {
      renderPage()
    })
    const bookNowBtns = screen.getAllByText('Book Now')
    expect(bookNowBtns.length).toBeGreaterThan(0)
  })

  it('shows tunnel feed with no damage events (no damage flagged)', async () => {
    mockIsTunnelConfigured.mockReturnValue(true)
    mockFetchTunnelEvents.mockResolvedValueOnce({
      events: [
        {
          event_id: 'ev-clean',
          license_plate: 'CLEAN1',
          camera_count: 4,
          any_damage: false,
          last_timestamp: '2026-02-01T12:00:00Z',
          qc_status: 'approved',
        },
      ],
      count: 1,
    })

    await act(async () => {
      renderPage()
    })

    await waitFor(() => {
      expect(screen.getByText(/CLEAN1/)).toBeInTheDocument()
      expect(screen.queryByText('Damage flagged')).not.toBeInTheDocument()
    })
  })
})
