import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

import axios from 'axios'
import VehicleDetails from './VehicleDetails'

describe('VehicleDetails', () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockReset()
    vi.mocked(axios.post).mockReset()
  })

  it('shows loading state initially', () => {
    vi.mocked(axios.get).mockReturnValue(new Promise(() => {}))

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )
    expect(screen.getByText('Loading vehicle details...')).toBeInTheDocument()
  })

  it('shows error state on API failure', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce({
      response: { data: { error: 'Vehicle not found' } },
    })

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Error Loading Vehicle')).toBeInTheDocument()
      expect(screen.getByText('Vehicle not found')).toBeInTheDocument()
    })
  })

  it('shows error fallback with no error message', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('fail'))

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Error Loading Vehicle')).toBeInTheDocument()
    })
  })

  it('renders vehicle details on success', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: {
        vehicle: {
          id: '1',
          make: 'Tesla',
          model: 'Model S',
          year: 2024,
          type: 'electric',
          category: 'luxury',
          pricePerDay: 150,
          pricePerWeek: 900,
          pricePerMonth: 3000,
          location: 'san-francisco',
          locationDetails: {
            address: '123 Main St, SF, CA',
            coordinates: { lat: 37.7749, lng: -122.4194 },
            pickupInstructions: 'Go to counter B',
          },
          features: ['autopilot', 'navigation'],
          images: ['tesla.jpg'],
          rating: 4.9,
          reviewCount: 200,
          available: true,
          transmission: 'Automatic',
          passengers: 5,
          luggage: 3,
          fuelType: 'electric',
          range: 400,
          specifications: {
            acceleration: '0-60 in 3.1s',
            topSpeed: '155 mph',
            safety: '5-star',
            technology: 'Full Self-Driving',
          },
          policies: {
            minimumAge: 25,
            insurance: 'Full coverage included',
            cancellation: 'Free cancellation up to 24 hours',
            mileage: 'Unlimited',
          },
          reviews: [
            { id: 'r1', rating: 5, comment: 'Amazing car!', author: 'John', date: '2026-01-01', verified: true },
          ],
        },
      },
    })

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Tesla Model S')).toBeInTheDocument()
      expect(screen.getByText('0-60 in 3.1s')).toBeInTheDocument()
      expect(screen.getByText('Amazing car!')).toBeInTheDocument()
    })
  })

  it('calls onBack when Go Back button is clicked', async () => {
    const onBack = vi.fn()
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('not found'))

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" onBack={onBack} />
      </MemoryRouter>
    )

    await waitFor(() => {
      screen.getByText('Go Back').click()
    })

    expect(onBack).toHaveBeenCalled()
  })
})
