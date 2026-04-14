import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { mockFetchBookings } = vi.hoisted(() => ({
  mockFetchBookings: vi.fn(),
}))

vi.mock('../lib/vehicleApi', () => ({
  fetchBookings: mockFetchBookings,
}))

import BookingsPage from './BookingsPage'

describe('BookingsPage', () => {
  it('renders with fallback bookings when API returns null', async () => {
    mockFetchBookings.mockResolvedValueOnce(null)

    render(
      <MemoryRouter>
        <BookingsPage />
      </MemoryRouter>
    )

    expect(screen.getByText('My Bookings')).toBeInTheDocument()
    expect(screen.getByText('Manage your car rental reservations')).toBeInTheDocument()
    // Should show fallback bookings
    await waitFor(() => {
      expect(screen.getByText('Tesla Model 3')).toBeInTheDocument()
      expect(screen.getByText('BMW X5')).toBeInTheDocument()
    })
  })

  it('renders API bookings when available', async () => {
    mockFetchBookings.mockResolvedValueOnce([
      { id: 'b1', vehicleName: 'Honda Civic', startDate: '2026-05-01', endDate: '2026-05-05', status: 'confirmed', totalAmount: 300 },
    ])

    render(
      <MemoryRouter>
        <BookingsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Honda Civic')).toBeInTheDocument()
    })
  })

  it('shows booking status', async () => {
    mockFetchBookings.mockResolvedValueOnce(null)

    render(
      <MemoryRouter>
        <BookingsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Confirmed')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })
  })

  it('shows booking total', async () => {
    mockFetchBookings.mockResolvedValueOnce(null)

    render(
      <MemoryRouter>
        <BookingsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('$445')).toBeInTheDocument()
      expect(screen.getByText('$625')).toBeInTheDocument()
    })
  })
})
