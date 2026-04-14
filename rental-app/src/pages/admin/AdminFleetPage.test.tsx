import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { mockFetchAdminVehicles } = vi.hoisted(() => ({
  mockFetchAdminVehicles: vi.fn(),
}))

vi.mock('../../lib/adminApi', () => ({
  fetchAdminVehicles: mockFetchAdminVehicles,
}))

import AdminFleetPage from './AdminFleetPage'

describe('AdminFleetPage', () => {
  beforeEach(() => {
    mockFetchAdminVehicles.mockReset()
    mockFetchAdminVehicles.mockResolvedValue(null)
  })

  const renderPage = () =>
    render(
      <MemoryRouter>
        <AdminFleetPage />
      </MemoryRouter>
    )

  it('renders fleet management page with overview tab', async () => {
    await act(async () => {
      renderPage()
    })
    expect(screen.getByText(/Fleet Management/)).toBeInTheDocument()
    expect(screen.getByText('Total Vehicles')).toBeInTheDocument()
    expect(screen.getByText('Available')).toBeInTheDocument()
    expect(screen.getByText('Currently Rented')).toBeInTheDocument()
    expect(screen.getByText('In Maintenance')).toBeInTheDocument()
  })

  it('shows fleet statistics', async () => {
    await act(async () => {
      renderPage()
    })
    expect(screen.getByText('Fleet Utilization')).toBeInTheDocument()
    expect(screen.getByText('Avg Mileage')).toBeInTheDocument()
    expect(screen.getByText('Fleet Value')).toBeInTheDocument()
  })

  it('shows fleet composition', async () => {
    await act(async () => {
      renderPage()
    })
    expect(screen.getByText('Fleet Composition')).toBeInTheDocument()
    expect(screen.getByText('Economy')).toBeInTheDocument()
    expect(screen.getByText('Compact')).toBeInTheDocument()
    expect(screen.getByText('Midsize')).toBeInTheDocument()
    expect(screen.getByText('Electric')).toBeInTheDocument()
    expect(screen.getByText('Luxury')).toBeInTheDocument()
  })

  it('switches to vehicles tab', async () => {
    await act(async () => {
      renderPage()
    })
    fireEvent.click(screen.getByText(/Vehicles \(/))

    await waitFor(() => {
      expect(screen.getByText(/Tesla/)).toBeInTheDocument()
      expect(screen.getByText(/ABC-1234/)).toBeInTheDocument()
    })
  })

  it('filters vehicles by status', async () => {
    await act(async () => {
      renderPage()
    })
    fireEvent.click(screen.getByText(/Vehicles \(/))

    const statusSelect = screen.getByDisplayValue('All Status')
    fireEvent.change(statusSelect, { target: { value: 'available' } })

    await waitFor(() => {
      expect(screen.getByText(/BMW/)).toBeInTheDocument()
      expect(screen.queryByText('ABC-1234')).not.toBeInTheDocument() // Tesla is rented
    })
  })

  it('filters vehicles by category', async () => {
    await act(async () => {
      renderPage()
    })
    fireEvent.click(screen.getByText(/Vehicles \(/))

    const categorySelect = screen.getByDisplayValue('All Categories')
    fireEvent.change(categorySelect, { target: { value: 'electric' } })

    await waitFor(() => {
      expect(screen.getByText(/Tesla/)).toBeInTheDocument()
      expect(screen.queryByText(/BMW/)).not.toBeInTheDocument()
    })
  })

  it('opens vehicle details modal', async () => {
    await act(async () => {
      renderPage()
    })
    fireEvent.click(screen.getByText(/Vehicles \(/))

    await waitFor(() => {
      expect(screen.getAllByText('View Details').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getAllByText('View Details')[0])

    await waitFor(() => {
      expect(screen.getByText('Vehicle Information')).toBeInTheDocument()
      expect(screen.getByText(/VIN:/)).toBeInTheDocument()
      expect(screen.getByText('Status & Location')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Maintenance' })).toBeInTheDocument()
      expect(screen.getByText('Insurance & Registration')).toBeInTheDocument()
      expect(screen.getByText('Purchase Information')).toBeInTheDocument()
      expect(screen.getByText('Features')).toBeInTheDocument()
    })
  })

  it('closes vehicle details modal by clicking close button', async () => {
    await act(async () => {
      renderPage()
    })
    fireEvent.click(screen.getByText(/Vehicles \(/))
    await waitFor(() => screen.getAllByText('View Details'))
    fireEvent.click(screen.getAllByText('View Details')[0])

    await waitFor(() => {
      expect(screen.getByText('Vehicle Information')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('✕'))

    await waitFor(() => {
      expect(screen.queryByText('Vehicle Information')).not.toBeInTheDocument()
    })
  })

  it('closes vehicle details modal by clicking overlay', async () => {
    await act(async () => {
      renderPage()
    })
    fireEvent.click(screen.getByText(/Vehicles \(/))
    await waitFor(() => screen.getAllByText('View Details'))
    fireEvent.click(screen.getAllByText('View Details')[0])

    await waitFor(() => {
      expect(screen.getByText('Vehicle Information')).toBeInTheDocument()
    })

    fireEvent.click(document.querySelector('.modal-overlay')!)

    await waitFor(() => {
      expect(screen.queryByText('Vehicle Information')).not.toBeInTheDocument()
    })
  })

  it('opens add vehicle modal', async () => {
    await act(async () => {
      renderPage()
    })
    fireEvent.click(screen.getByText(/Add Vehicle/))

    await waitFor(() => {
      expect(screen.getByText('Add New Vehicle')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('e.g., Toyota')).toBeInTheDocument()
    })
  })

  it('closes add vehicle modal', async () => {
    await act(async () => {
      renderPage()
    })
    fireEvent.click(screen.getByText(/Add Vehicle/))
    await waitFor(() => screen.getByText('Add New Vehicle'))

    // Close via Cancel button
    fireEvent.click(screen.getAllByText('Cancel')[0])

    await waitFor(() => {
      expect(screen.queryByText('Add New Vehicle')).not.toBeInTheDocument()
    })
  })

  it('switches to maintenance tab', async () => {
    await act(async () => {
      renderPage()
    })
    fireEvent.click(screen.getByText(/Maintenance \(/))

    await waitFor(() => {
      expect(screen.getByText('Maintenance Schedule')).toBeInTheDocument()
      expect(screen.getByText('Last Service')).toBeInTheDocument()
      expect(screen.getByText('Next Service Due')).toBeInTheDocument()
    })
  })

  it('shows maintenance data for all vehicles', async () => {
    await act(async () => {
      renderPage()
    })
    fireEvent.click(screen.getByText(/Maintenance \(/))

    await waitFor(() => {
      const scheduleButtons = screen.getAllByText('Schedule Service')
      expect(scheduleButtons.length).toBe(5) // 5 mock vehicles
    })
  })

  it('uses API vehicles when available', async () => {
    mockFetchAdminVehicles.mockResolvedValueOnce([
      {
        id: 'v1',
        make: 'Porsche',
        model: '911',
        year: 2025,
        licensePlate: 'POR-001',
        status: 'available',
        mileage: 1000,
        dailyRate: 500,
        location: 'Showroom',
      },
    ])

    await act(async () => {
      renderPage()
    })

    // Switch to vehicles tab to see the API data
    fireEvent.click(screen.getByText(/Vehicles \(/))

    await waitFor(() => {
      expect(screen.getByText(/Porsche/)).toBeInTheDocument()
      expect(screen.getByText('POR-001')).toBeInTheDocument()
    })
  })

  it('shows vehicle placeholder when no imageUrl', async () => {
    await act(async () => {
      renderPage()
    })
    fireEvent.click(screen.getByText(/Vehicles \(/))

    await waitFor(() => {
      const placeholders = document.querySelectorAll('.vehicle-placeholder')
      // Some mock vehicles don't have imageUrl
      expect(placeholders.length).toBeGreaterThan(0)
    })
  })

  it('does not stop propagation on modal content click', async () => {
    await act(async () => {
      renderPage()
    })
    fireEvent.click(screen.getByText(/Vehicles \(/))
    await waitFor(() => screen.getAllByText('View Details'))
    fireEvent.click(screen.getAllByText('View Details')[0])

    await waitFor(() => {
      expect(screen.getByText('Vehicle Information')).toBeInTheDocument()
    })

    // Click on modal content - should NOT close
    fireEvent.click(document.querySelector('.modal-content')!)
    expect(screen.getByText('Vehicle Information')).toBeInTheDocument()
  })

  it('filters by rented status', async () => {
    await act(async () => {
      renderPage()
    })
    fireEvent.click(screen.getByText(/Vehicles \(/))

    const statusSelect = screen.getByDisplayValue('All Status')
    fireEvent.change(statusSelect, { target: { value: 'rented' } })

    await waitFor(() => {
      expect(screen.getByText(/Tesla/)).toBeInTheDocument()
      // Only Tesla is rented
      const cards = document.querySelectorAll('.vehicle-card')
      expect(cards.length).toBe(1)
    })
  })

  it('filters by maintenance status', async () => {
    await act(async () => {
      renderPage()
    })
    fireEvent.click(screen.getByText(/Vehicles \(/))

    const statusSelect = screen.getByDisplayValue('All Status')
    fireEvent.change(statusSelect, { target: { value: 'maintenance' } })

    await waitFor(() => {
      expect(screen.getByText(/Mustang/)).toBeInTheDocument()
      const cards = document.querySelectorAll('.vehicle-card')
      expect(cards.length).toBe(1)
    })
  })
})
