import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { mockFetchAdminBookings, mockUpdateBookingStatus } = vi.hoisted(() => ({
  mockFetchAdminBookings: vi.fn(),
  mockUpdateBookingStatus: vi.fn(),
}))

vi.mock('../../lib/adminApi', () => ({
  fetchAdminBookings: mockFetchAdminBookings,
  updateBookingStatus: mockUpdateBookingStatus,
}))

import AdminReservationsPage from './AdminReservationsPage'

describe('AdminReservationsPage', () => {
  beforeEach(() => {
    mockFetchAdminBookings.mockReset()
    mockFetchAdminBookings.mockResolvedValue(null)
    mockUpdateBookingStatus.mockReset()
    mockUpdateBookingStatus.mockResolvedValue(null)
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const renderPage = () =>
    render(
      <MemoryRouter>
        <AdminReservationsPage />
      </MemoryRouter>
    )

  it('renders reservations management page', async () => {
    await act(async () => {
      renderPage()
    })
    expect(screen.getByText('Reservations Management')).toBeInTheDocument()
  })

  it('shows filter tabs with counts', async () => {
    await act(async () => {
      renderPage()
    })
    expect(screen.getByText(/All \(4\)/)).toBeInTheDocument()
    expect(screen.getByText(/Pending \(1\)/)).toBeInTheDocument()
    expect(screen.getByText(/Confirmed \(1\)/)).toBeInTheDocument()
    expect(screen.getByText(/Active \(1\)/)).toBeInTheDocument()
    expect(screen.getByText(/Completed \(1\)/)).toBeInTheDocument()
  })

  it('shows all reservations by default', async () => {
    await act(async () => {
      renderPage()
    })
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Mike Johnson')).toBeInTheDocument()
    expect(screen.getByText('Sarah Wilson')).toBeInTheDocument()
  })

  it('filters by pending status', async () => {
    await act(async () => {
      renderPage()
    })
    fireEvent.click(screen.getByText(/Pending/))

    await waitFor(() => {
      expect(screen.getByText('Sarah Wilson')).toBeInTheDocument()
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })
  })

  it('filters by confirmed status', async () => {
    await act(async () => {
      renderPage()
    })
    fireEvent.click(screen.getByText(/Confirmed/))

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
    })
  })

  it('filters by active status', async () => {
    await act(async () => {
      renderPage()
    })
    fireEvent.click(screen.getByText(/^Active/))

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })
  })

  it('filters by completed status', async () => {
    await act(async () => {
      renderPage()
    })
    fireEvent.click(screen.getByText(/Completed/))

    await waitFor(() => {
      expect(screen.getByText('Mike Johnson')).toBeInTheDocument()
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })
  })

  it('shows reservation details in table', async () => {
    await act(async () => {
      renderPage()
    })
    expect(screen.getByText('BK1722814756432')).toBeInTheDocument()
    expect(screen.getByText('john.doe@email.com')).toBeInTheDocument()
    expect(screen.getAllByText(/Tesla Model 3/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('ABC-1234')).toBeInTheDocument()
    expect(screen.getByText('4 days')).toBeInTheDocument()
  })

  it('opens reservation details modal', async () => {
    await act(async () => {
      renderPage()
    })

    const viewBtns = screen.getAllByText('View')
    fireEvent.click(viewBtns[0])

    await waitFor(() => {
      expect(screen.getByText('Reservation Details')).toBeInTheDocument()
      expect(screen.getByText('Booking Information')).toBeInTheDocument()
      expect(screen.getByText('Customer Details')).toBeInTheDocument()
      expect(screen.getByText('Vehicle Information')).toBeInTheDocument()
      expect(screen.getByText('Rental Period')).toBeInTheDocument()
      expect(screen.getByText('Locations')).toBeInTheDocument()
      expect(screen.getByText('Pricing')).toBeInTheDocument()
    })
  })

  it('closes details modal by clicking close button', async () => {
    await act(async () => {
      renderPage()
    })

    fireEvent.click(screen.getAllByText('View')[0])
    await waitFor(() => screen.getByText('Reservation Details'))

    fireEvent.click(screen.getByText('✕'))

    await waitFor(() => {
      expect(screen.queryByText('Reservation Details')).not.toBeInTheDocument()
    })
  })

  it('closes details modal by clicking overlay', async () => {
    await act(async () => {
      renderPage()
    })

    fireEvent.click(screen.getAllByText('View')[0])
    await waitFor(() => screen.getByText('Reservation Details'))

    fireEvent.click(document.querySelector('.modal-overlay')!)

    await waitFor(() => {
      expect(screen.queryByText('Reservation Details')).not.toBeInTheDocument()
    })
  })

  it('does not close modal when clicking modal content', async () => {
    await act(async () => {
      renderPage()
    })

    fireEvent.click(screen.getAllByText('View')[0])
    await waitFor(() => screen.getByText('Reservation Details'))

    fireEvent.click(document.querySelector('.modal-content')!)
    expect(screen.getByText('Reservation Details')).toBeInTheDocument()
  })

  it('handles status change actions', async () => {
    await act(async () => {
      renderPage()
    })

    const confirmBtns = screen.getAllByText('Confirm')
    await act(async () => {
      fireEvent.click(confirmBtns[0])
    })

    expect(mockUpdateBookingStatus).toHaveBeenCalled()
  })

  it('handles start rental action', async () => {
    await act(async () => {
      renderPage()
    })

    const startBtns = screen.getAllByText('Start Rental')
    await act(async () => {
      fireEvent.click(startBtns[0])
    })

    expect(mockUpdateBookingStatus).toHaveBeenCalled()
  })

  it('handles complete action', async () => {
    await act(async () => {
      renderPage()
    })

    const completeBtns = screen.getAllByText('Complete')
    await act(async () => {
      fireEvent.click(completeBtns[0])
    })

    expect(mockUpdateBookingStatus).toHaveBeenCalled()
  })

  it('handles cancel action', async () => {
    await act(async () => {
      renderPage()
    })

    const cancelBtns = screen.getAllByText('Cancel')
    await act(async () => {
      fireEvent.click(cancelBtns[0])
    })

    expect(mockUpdateBookingStatus).toHaveBeenCalled()
  })

  it('shows API bookings when available', async () => {
    mockFetchAdminBookings.mockResolvedValueOnce([
      {
        id: 'b1',
        bookingReference: 'REF-001',
        customer: { name: 'API Customer', email: 'api@test.com', phone: '555-0000' },
        vehicle: { make: 'Porsche', model: '911', year: 2025, licensePlate: 'POR-001' },
        rental: {
          startDate: '2026-05-01',
          endDate: '2026-05-05',
          totalDays: 4,
          pickupLocation: 'Airport',
          returnLocation: 'Downtown',
        },
        pricing: { total: 2000 },
        status: 'confirmed',
        createdAt: '2026-04-30T10:00:00Z',
      },
    ])

    await act(async () => {
      renderPage()
    })

    await waitFor(() => {
      expect(screen.getByText('API Customer')).toBeInTheDocument()
      expect(screen.getByText('api@test.com')).toBeInTheDocument()
      expect(screen.getByText(/Porsche 911/)).toBeInTheDocument()
      expect(screen.getByText('POR-001')).toBeInTheDocument()
      expect(screen.getByText('$2000')).toBeInTheDocument()
    })
  })

  it('shows header action buttons', async () => {
    await act(async () => {
      renderPage()
    })
    expect(screen.getByText(/Export Data/)).toBeInTheDocument()
    expect(screen.getByText(/New Reservation/)).toBeInTheDocument()
  })

  it('shows modal action buttons', async () => {
    await act(async () => {
      renderPage()
    })
    fireEvent.click(screen.getAllByText('View')[0])

    await waitFor(() => {
      expect(screen.getByText('Send Email')).toBeInTheDocument()
      expect(screen.getByText('Print Receipt')).toBeInTheDocument()
      expect(screen.getByText('Edit Reservation')).toBeInTheDocument()
    })
  })

  it('returns to all tab after filtering', async () => {
    await act(async () => {
      renderPage()
    })

    fireEvent.click(screen.getByText(/Pending/))
    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/All/))
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })
})
