import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}))

import axios from 'axios'
import VehicleSearch from './VehicleSearch'

describe('VehicleSearch', () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockReset()
  })

  it('renders the search header', () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('not configured'))

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )
    expect(screen.getByText('Find Your Perfect Rental')).toBeInTheDocument()
    expect(screen.getByText('Choose from our premium fleet of vehicles')).toBeInTheDocument()
  })

  it('shows loading state during search', () => {
    vi.mocked(axios.get).mockReturnValue(new Promise(() => {}))

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )
    expect(screen.getByText('Searching vehicles...')).toBeInTheDocument()
  })

  it('shows error state on API failure', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce({
      response: { data: { error: 'Server error' } },
    })

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument()
    })
  })

  it('shows empty state when no vehicles found', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: {
        vehicles: [],
        pagination: { totalPages: 1 },
      },
    })

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('No vehicles found')).toBeInTheDocument()
    })
  })

  it('renders vehicle cards when data is returned', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: {
        vehicles: [
          {
            id: '1',
            make: 'Tesla',
            model: 'Model 3',
            year: 2024,
            type: 'electric',
            category: 'sedan',
            pricePerDay: 89,
            location: 'san-francisco',
            features: ['autopilot', 'navigation'],
            images: ['tesla.jpg'],
            rating: 4.8,
            reviewCount: 156,
            available: true,
            transmission: 'Automatic',
            passengers: 5,
            luggage: 3,
            fuelType: 'electric',
            range: 358,
          },
        ],
        pagination: { totalPages: 1 },
      },
    })

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Tesla Model 3')).toBeInTheDocument()
      expect(screen.getByText('1 vehicles found')).toBeInTheDocument()
    })
  })

  it('has a filter toggle button', () => {
    vi.mocked(axios.get).mockReturnValue(new Promise(() => {}))

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )
    expect(screen.getByText(/Filters/)).toBeInTheDocument()
  })
})
