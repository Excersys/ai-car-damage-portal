import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const { mockFetchCars } = vi.hoisted(() => ({
  mockFetchCars: vi.fn(),
}))

vi.mock('../lib/vehicleApi', () => ({
  fetchCars: mockFetchCars,
}))

// Mock image imports
vi.mock('../images/SFAR.rendition.vlarge.png', () => ({ default: 'tesla.png' }))
vi.mock('../images/IFAR.rendition.vlarge.png', () => ({ default: 'bmw.png' }))
vi.mock('../images/CCAR.rendition.vlarge.png', () => ({ default: 'camry.png' }))
vi.mock('../images/FRAR.rendition.vlarge.png', () => ({ default: 'explorer.png' }))
vi.mock('../images/IJAR.rendition.vlarge.png', () => ({ default: 'wrangler.png' }))

import CarsPage from './CarsPage'

describe('CarsPage', () => {
  beforeEach(() => {
    mockFetchCars.mockReset()
    mockNavigate.mockReset()
    mockFetchCars.mockResolvedValue(null)
  })

  const renderCarsPage = (search = '') => {
    return render(
      <MemoryRouter initialEntries={[`/cars${search}`]}>
        <CarsPage />
      </MemoryRouter>
    )
  }

  it('renders without crashing with fallback data', async () => {
    renderCarsPage()
    await waitFor(() => {
      expect(screen.getByText('Available Cars')).toBeInTheDocument()
    })
  })

  it('shows car listings from fallback data', async () => {
    renderCarsPage()
    await waitFor(() => {
      expect(screen.getByText(/Tesla/)).toBeInTheDocument()
      expect(screen.getByText(/BMW/)).toBeInTheDocument()
    })
  })

  it('shows search summary with URL params', async () => {
    renderCarsPage('?pickup=SFO&dropoff=LAX&pickupDate=2026-03-01&dropoffDate=2026-03-05')
    await waitFor(() => {
      expect(screen.getByText(/SFO/)).toBeInTheDocument()
      expect(screen.getByText(/LAX/)).toBeInTheDocument()
    })
  })

  it('filters by car type', async () => {
    renderCarsPage()
    await waitFor(() => {
      expect(screen.getByText(/Tesla/)).toBeInTheDocument()
    })

    const carTypeSelect = screen.getByDisplayValue('All Types')
    fireEvent.change(carTypeSelect, { target: { value: 'SUV' } })

    await waitFor(() => {
      expect(screen.getByText(/BMW/)).toBeInTheDocument()
      expect(screen.queryByText(/Tesla Model 3/)).not.toBeInTheDocument()
    })
  })

  it('filters by price range $0 - $75', async () => {
    renderCarsPage()
    await waitFor(() => {
      expect(screen.getByText(/Tesla/)).toBeInTheDocument()
    })

    const priceSelect = screen.getByDisplayValue('All Prices')
    fireEvent.change(priceSelect, { target: { value: '$0 - $75' } })

    await waitFor(() => {
      expect(screen.getByText(/Toyota/)).toBeInTheDocument()
      expect(screen.getByText(/Chevrolet/)).toBeInTheDocument()
      expect(screen.queryByText(/Tesla/)).not.toBeInTheDocument()
    })
  })

  it('filters by price range $75 - $150', async () => {
    renderCarsPage()
    await waitFor(() => {
      expect(screen.getByText(/Tesla/)).toBeInTheDocument()
    })

    const priceSelect = screen.getByDisplayValue('All Prices')
    fireEvent.change(priceSelect, { target: { value: '$75 - $150' } })

    await waitFor(() => {
      expect(screen.getByText(/Tesla/)).toBeInTheDocument()
      expect(screen.getByText(/BMW/)).toBeInTheDocument()
      expect(screen.queryByText(/Chevrolet/)).not.toBeInTheDocument()
    })
  })

  it('filters by price range $150+', async () => {
    renderCarsPage()

    const priceSelect = screen.getByDisplayValue('All Prices')
    fireEvent.change(priceSelect, { target: { value: '$150+' } })

    await waitFor(() => {
      // Only Mercedes at $145 doesn't match $150+. Actually Mercedes is $145 which is not > 150
      expect(screen.getByText('No cars found')).toBeInTheDocument()
    })
  })

  it('shows no results message when filters eliminate all cars', async () => {
    renderCarsPage()

    const priceSelect = screen.getByDisplayValue('All Prices')
    fireEvent.change(priceSelect, { target: { value: '$150+' } })

    await waitFor(() => {
      expect(screen.getByText('No cars found')).toBeInTheDocument()
      expect(screen.getByText(/Try adjusting your filters/)).toBeInTheDocument()
    })
  })

  it('navigates to car details when clicking a car card', async () => {
    renderCarsPage()
    await waitFor(() => {
      expect(screen.getByText(/Tesla/)).toBeInTheDocument()
    })

    const carCards = document.querySelectorAll('.car-card')
    fireEvent.click(carCards[0])

    expect(mockNavigate).toHaveBeenCalledWith('/cars/1')
  })

  it('opens edit search form when clicking Edit Search', async () => {
    renderCarsPage('?pickup=SFO&dropoff=LAX&pickupDate=2026-03-01&dropoffDate=2026-03-05')

    await waitFor(() => {
      expect(screen.getByText('Edit Search')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Edit Search'))

    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })
  })

  it('cancels edit search form', async () => {
    renderCarsPage('?pickup=SFO&dropoff=LAX&pickupDate=2026-03-01&dropoffDate=2026-03-05')

    await waitFor(() => {
      expect(screen.getByText('Edit Search')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Edit Search'))
    fireEvent.click(screen.getByText('Cancel'))

    await waitFor(() => {
      expect(screen.getByText('Edit Search')).toBeInTheDocument()
    })
  })

  it('saves edit search form and navigates', async () => {
    renderCarsPage('?pickup=SFO&dropoff=LAX&pickupDate=2026-03-01&dropoffDate=2026-03-05')

    await waitFor(() => {
      expect(screen.getByText('Edit Search')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Edit Search'))

    // Change pickup location
    const pickupInput = screen.getByDisplayValue('SFO')
    fireEvent.change(pickupInput, { target: { value: 'JFK' } })

    fireEvent.click(screen.getByText('Save Changes'))

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining('pickup=JFK'),
      { replace: true }
    )
  })

  it('edits all fields in edit form', async () => {
    renderCarsPage('?pickup=SFO&dropoff=LAX&pickupDate=2026-03-01&dropoffDate=2026-03-05')

    fireEvent.click(screen.getByText('Edit Search'))

    const dropoffInput = screen.getByDisplayValue('LAX')
    fireEvent.change(dropoffInput, { target: { value: 'ORD' } })

    const pickupDateInput = screen.getByDisplayValue('2026-03-01')
    fireEvent.change(pickupDateInput, { target: { value: '2026-04-01' } })

    const dropoffDateInput = screen.getByDisplayValue('2026-03-05')
    fireEvent.change(dropoffDateInput, { target: { value: '2026-04-10' } })

    fireEvent.click(screen.getByText('Save Changes'))

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining('dropoff=ORD'),
      { replace: true }
    )
  })

  it('uses API cars when available', async () => {
    mockFetchCars.mockResolvedValueOnce([
      {
        id: '99',
        make: 'Porsche',
        model: '911',
        year: 2025,
        pricePerDay: 300,
        type: 'Luxury',
        features: ['AWD'],
        specs: { transmission: 'Manual', fuelType: 'Gasoline', seats: 2, doors: 2 },
        available: true,
      },
    ])

    renderCarsPage()

    await waitFor(() => {
      expect(screen.getByText(/Porsche/)).toBeInTheDocument()
    })
  })

  it('shows results count', async () => {
    renderCarsPage()
    await waitFor(() => {
      expect(screen.getByText(/cars available/)).toBeInTheDocument()
    })
  })
})
