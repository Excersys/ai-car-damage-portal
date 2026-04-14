import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}))

import axios from 'axios'
import VehicleSearch from './VehicleSearch'

const makeVehicle = (overrides: any = {}) => ({
  id: '1',
  make: 'Tesla',
  model: 'Model 3',
  year: 2024,
  type: 'electric',
  category: 'sedan',
  pricePerDay: 89,
  location: 'san-francisco',
  features: ['autopilot', 'navigation', 'bluetooth', 'wifi'],
  images: ['tesla.jpg'],
  rating: 4.8,
  reviewCount: 156,
  available: true,
  transmission: 'Automatic',
  passengers: 5,
  luggage: 3,
  fuelType: 'electric',
  range: 358,
  ...overrides,
})

const mockSearchResponse = (vehicles: any[] = [makeVehicle()], totalPages = 1) => ({
  data: {
    vehicles,
    pagination: { totalPages },
  },
})

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

  it('shows generic error on API failure without response', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('Network error'))

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Failed to search vehicles')).toBeInTheDocument()
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
    vi.mocked(axios.get).mockResolvedValueOnce(mockSearchResponse())

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

  it('toggles filters panel visibility', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockSearchResponse())

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Tesla Model 3')).toBeInTheDocument()
    })

    // Filters panel should not be visible initially
    expect(screen.queryByText('Location')).not.toBeInTheDocument()

    // Click filter toggle
    fireEvent.click(screen.getByText(/Filters/))

    // Now filters should be visible
    expect(screen.getByText('Location')).toBeInTheDocument()
    expect(screen.getByText('Vehicle Type')).toBeInTheDocument()
    expect(screen.getByText('Start Date')).toBeInTheDocument()
    expect(screen.getByText('End Date')).toBeInTheDocument()
    expect(screen.getByText('Sort By')).toBeInTheDocument()

    // Click again to hide
    fireEvent.click(screen.getByText(/Filters/))
    expect(screen.queryByText('Location')).not.toBeInTheDocument()
  })

  it('changes location filter and triggers search', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce(mockSearchResponse())
      .mockResolvedValueOnce(mockSearchResponse())

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Tesla Model 3'))

    // Open filters
    fireEvent.click(screen.getByText(/Filters/))

    // Change location
    const locationSelect = screen.getByDisplayValue('All Locations')
    fireEvent.change(locationSelect, { target: { value: 'san-francisco' } })

    await waitFor(() => {
      expect(vi.mocked(axios.get)).toHaveBeenCalledTimes(2)
    })
  })

  it('changes vehicle type filter', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce(mockSearchResponse())
      .mockResolvedValueOnce(mockSearchResponse())

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Tesla Model 3'))

    fireEvent.click(screen.getByText(/Filters/))

    const typeSelect = screen.getByDisplayValue('All Types')
    fireEvent.change(typeSelect, { target: { value: 'suv' } })

    await waitFor(() => {
      expect(vi.mocked(axios.get)).toHaveBeenCalledTimes(2)
    })
  })

  it('changes date filters', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce(mockSearchResponse())
      .mockResolvedValueOnce(mockSearchResponse())
      .mockResolvedValueOnce(mockSearchResponse())

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Tesla Model 3'))

    fireEvent.click(screen.getByText(/Filters/))

    const dateInputs = document.querySelectorAll('.filter-group input[type="date"]')
    fireEvent.change(dateInputs[0], { target: { value: '2026-05-01' } })

    await waitFor(() => {
      expect(vi.mocked(axios.get).mock.calls.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('changes price range filters', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce(mockSearchResponse())
      .mockResolvedValueOnce(mockSearchResponse())

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Tesla Model 3'))

    fireEvent.click(screen.getByText(/Filters/))

    const minPriceInput = screen.getByDisplayValue('0')
    fireEvent.change(minPriceInput, { target: { value: '50' } })

    await waitFor(() => {
      expect(vi.mocked(axios.get)).toHaveBeenCalledTimes(2)
    })
  })

  it('changes max price filter', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce(mockSearchResponse())
      .mockResolvedValueOnce(mockSearchResponse())

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Tesla Model 3'))

    fireEvent.click(screen.getByText(/Filters/))

    const maxPriceInput = screen.getByDisplayValue('1000')
    fireEvent.change(maxPriceInput, { target: { value: '500' } })

    await waitFor(() => {
      expect(vi.mocked(axios.get)).toHaveBeenCalledTimes(2)
    })
  })

  it('toggles feature filters', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce(mockSearchResponse())
      .mockResolvedValueOnce(mockSearchResponse())
      .mockResolvedValueOnce(mockSearchResponse())

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Tesla Model 3'))

    fireEvent.click(screen.getByText(/Filters/))

    // Toggle a feature on
    const autopilotCheckbox = screen.getByLabelText(/Autopilot/i)
    fireEvent.click(autopilotCheckbox)

    await waitFor(() => {
      expect(vi.mocked(axios.get)).toHaveBeenCalledTimes(2)
    })

    // Toggle the same feature off
    fireEvent.click(autopilotCheckbox)

    await waitFor(() => {
      expect(vi.mocked(axios.get)).toHaveBeenCalledTimes(3)
    })
  })

  it('changes sort option', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce(mockSearchResponse())
      .mockResolvedValue(mockSearchResponse())

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Tesla Model 3'))

    fireEvent.click(screen.getByText(/Filters/))

    const sortSelect = screen.getByDisplayValue('Price: Low to High')
    fireEvent.change(sortSelect, { target: { value: 'rating-desc' } })

    await waitFor(() => {
      // At least one additional search triggered by sort change
      expect(vi.mocked(axios.get).mock.calls.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('renders vehicle with gas fuel type showing MPG', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(
      mockSearchResponse([makeVehicle({ id: '2', fuelType: 'gas', mpg: 30, type: 'sedan' })])
    )

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/30 MPG/)).toBeInTheDocument()
    })
  })

  it('renders vehicle with electric fuel type showing range', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockSearchResponse())

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/358 mi range/)).toBeInTheDocument()
    })
  })

  it('shows "+N more" when vehicle has more than 3 features', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockSearchResponse())

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('+1 more')).toBeInTheDocument()
    })
  })

  it('does not show "+N more" when vehicle has 3 or fewer features', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(
      mockSearchResponse([makeVehicle({ features: ['autopilot', 'nav'] })])
    )

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.queryByText(/more/)).not.toBeInTheDocument()
    })
  })

  it('calls onVehicleSelect when Select Vehicle button is clicked', async () => {
    const onVehicleSelect = vi.fn()
    vi.mocked(axios.get).mockResolvedValueOnce(mockSearchResponse())

    render(
      <MemoryRouter>
        <VehicleSearch onVehicleSelect={onVehicleSelect} />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Select Vehicle')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Select Vehicle'))
    expect(onVehicleSelect).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }))
  })

  it('renders pagination when totalPages > 1', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockSearchResponse([makeVehicle()], 3))

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Previous')).toBeInTheDocument()
      expect(screen.getByText('Next')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  it('does not render pagination when totalPages is 1', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockSearchResponse([makeVehicle()], 1))

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Tesla Model 3')).toBeInTheDocument()
    })

    expect(screen.queryByText('Previous')).not.toBeInTheDocument()
    expect(screen.queryByText('Next')).not.toBeInTheDocument()
  })

  it('Previous button is disabled on first page', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockSearchResponse([makeVehicle()], 3))

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Previous')).toBeDisabled()
    })
  })

  it('Next button navigates to next page', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce(mockSearchResponse([makeVehicle()], 3))
      .mockResolvedValueOnce(mockSearchResponse([makeVehicle({ id: '2', make: 'BMW', model: 'M3' })], 3))

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Next')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Next'))

    await waitFor(() => {
      expect(vi.mocked(axios.get)).toHaveBeenCalledTimes(2)
    })
  })

  it('Previous button navigates to previous page', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce(mockSearchResponse([makeVehicle()], 3))
      .mockResolvedValueOnce(mockSearchResponse([makeVehicle()], 3))
      .mockResolvedValueOnce(mockSearchResponse([makeVehicle()], 3))

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Next'))

    // Go to page 2
    fireEvent.click(screen.getByText('Next'))
    await waitFor(() => expect(vi.mocked(axios.get)).toHaveBeenCalledTimes(2))

    // Go back to page 1
    fireEvent.click(screen.getByText('Previous'))
    await waitFor(() => expect(vi.mocked(axios.get)).toHaveBeenCalledTimes(3))
  })

  it('clicking page number navigates to that page', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce(mockSearchResponse([makeVehicle()], 3))
      .mockResolvedValueOnce(mockSearchResponse([makeVehicle()], 3))

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('3'))

    fireEvent.click(screen.getByText('3'))

    await waitFor(() => {
      expect(vi.mocked(axios.get)).toHaveBeenCalledTimes(2)
    })
  })

  it('Try Again button retries search after error', async () => {
    vi.mocked(axios.get)
      .mockRejectedValueOnce({ response: { data: { error: 'Server error' } } })
      .mockResolvedValueOnce(mockSearchResponse())

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Try Again'))

    await waitFor(() => {
      expect(screen.getByText('Tesla Model 3')).toBeInTheDocument()
    })
  })

  it('renders vehicle type icons correctly', async () => {
    const vehicles = [
      makeVehicle({ id: '1', type: 'economy' }),
      makeVehicle({ id: '2', type: 'sedan' }),
      makeVehicle({ id: '3', type: 'suv' }),
      makeVehicle({ id: '4', type: 'sports' }),
      makeVehicle({ id: '5', type: 'luxury' }),
      makeVehicle({ id: '6', type: 'unknown_type' }),
    ]
    vi.mocked(axios.get).mockResolvedValueOnce(mockSearchResponse(vehicles, 1))

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('6 vehicles found')).toBeInTheDocument()
    })
  })

  it('renders with initialFilters', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockSearchResponse())

    render(
      <MemoryRouter>
        <VehicleSearch initialFilters={{ location: 'miami', vehicleType: 'suv' }} />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Tesla Model 3')).toBeInTheDocument()
    })

    // Verify the API was called with the initial filter values
    const callUrl = vi.mocked(axios.get).mock.calls[0][0] as string
    expect(callUrl).toContain('location=miami')
    expect(callUrl).toContain('vehicleType=suv')
  })

  it('image falls back to placeholder on error', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(
      mockSearchResponse([makeVehicle({ images: [] })])
    )

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Tesla Model 3')).toBeInTheDocument()
    })

    const img = screen.getByAltText('Tesla Model 3') as HTMLImageElement
    fireEvent.error(img)
    expect(img.src).toContain('/placeholder-car.jpg')
  })

  it('handles empty features without showing +N more', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(
      mockSearchResponse([makeVehicle({ features: [] })])
    )

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Tesla Model 3')).toBeInTheDocument()
    })

    expect(screen.queryByText(/more/)).not.toBeInTheDocument()
  })

  it('formats price correctly', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(
      mockSearchResponse([makeVehicle({ pricePerDay: 125.50 })])
    )

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('$125.50')).toBeInTheDocument()
    })
  })

  it('Next button is disabled on last page', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce(mockSearchResponse([makeVehicle()], 2))
      .mockResolvedValueOnce(mockSearchResponse([makeVehicle()], 2))

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Next'))

    // Go to page 2 (last page)
    fireEvent.click(screen.getByText('Next'))

    await waitFor(() => {
      expect(screen.getByText('Next')).toBeDisabled()
    })
  })

  it('works without onVehicleSelect prop', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockSearchResponse())

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Select Vehicle')).toBeInTheDocument()
    })

    // Should not throw when clicked without handler
    fireEvent.click(screen.getByText('Select Vehicle'))
  })

  it('appends features to search params when selected', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce(mockSearchResponse())
      .mockResolvedValueOnce(mockSearchResponse())

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Tesla Model 3'))
    fireEvent.click(screen.getByText(/Filters/))

    const bluetoothCheckbox = screen.getByLabelText(/Bluetooth/i)
    fireEvent.click(bluetoothCheckbox)

    await waitFor(() => {
      const secondCallUrl = vi.mocked(axios.get).mock.calls[1][0] as string
      expect(secondCallUrl).toContain('features=bluetooth')
    })
  })

  it('appends start and end dates to search params when set', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce(mockSearchResponse())
      .mockResolvedValueOnce(mockSearchResponse())
      .mockResolvedValueOnce(mockSearchResponse())

    render(
      <MemoryRouter>
        <VehicleSearch />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Tesla Model 3'))
    fireEvent.click(screen.getByText(/Filters/))

    const dateInputs = document.querySelectorAll('.filter-group input[type="date"]')
    fireEvent.change(dateInputs[0], { target: { value: '2026-06-01' } })

    await waitFor(() => {
      const calls = vi.mocked(axios.get).mock.calls
      const lastCall = calls[calls.length - 1][0] as string
      expect(lastCall).toContain('startDate=2026-06-01')
    })

    fireEvent.change(dateInputs[1], { target: { value: '2026-06-15' } })

    await waitFor(() => {
      const calls = vi.mocked(axios.get).mock.calls
      const lastCall = calls[calls.length - 1][0] as string
      expect(lastCall).toContain('endDate=2026-06-15')
    })
  })
})
