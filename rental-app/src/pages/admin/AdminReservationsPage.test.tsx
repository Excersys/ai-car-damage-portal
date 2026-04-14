import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { mockFetchAdminBookings } = vi.hoisted(() => ({
  mockFetchAdminBookings: vi.fn(),
}))

vi.mock('../../lib/adminApi', () => ({
  fetchAdminBookings: mockFetchAdminBookings,
}))

import AdminReservationsPage from './AdminReservationsPage'

describe('AdminReservationsPage', () => {
  beforeEach(() => {
    mockFetchAdminBookings.mockReset()
    mockFetchAdminBookings.mockResolvedValue(null)
  })

  it('renders without crashing', async () => {
    render(
      <MemoryRouter>
        <AdminReservationsPage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(document.body.textContent!.length).toBeGreaterThan(0)
    })
  })

  it('shows reservation management content', async () => {
    render(
      <MemoryRouter>
        <AdminReservationsPage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByText(/Reservations/)).toBeInTheDocument()
    })
  })

  it('shows API bookings when available', async () => {
    mockFetchAdminBookings.mockResolvedValueOnce([
      {
        id: 'b1',
        bookingReference: 'REF-001',
        customer: { name: 'Jane Doe', email: 'jane@test.com' },
        vehicle: { make: 'Toyota', model: 'Camry', year: 2024, licensePlate: 'ABC123' },
        rental: { startDate: '2026-05-01', endDate: '2026-05-05' },
        pricing: { total: 325 },
        status: 'confirmed',
      },
    ])

    render(
      <MemoryRouter>
        <AdminReservationsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(document.body.textContent).toContain('Jane Doe')
    })
  })

  it('exports a valid React component', () => {
    expect(typeof AdminReservationsPage).toBe('function')
  })
})
