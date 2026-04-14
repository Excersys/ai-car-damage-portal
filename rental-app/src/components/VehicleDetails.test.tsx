import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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

const makeVehicle = (overrides: any = {}) => ({
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
  features: ['autopilot', 'navigation', 'bluetooth', 'premium-audio', 'leather-seats', 'sunroof', 'heated-seats', 'backup-camera', 'performance-package', 'wifi'],
  images: ['tesla1.jpg', 'tesla2.jpg', 'tesla3.jpg'],
  rating: 4.9,
  reviewCount: 200,
  available: true,
  transmission: 'Automatic',
  passengers: 5,
  luggage: 3,
  fuelType: 'electric',
  range: 400,
  chargeTime: '30 min',
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
    { id: 'r2', rating: 4, comment: 'Great experience', author: 'Jane', date: '2026-01-15', verified: false },
    { id: 'r3', rating: 5, comment: 'Perfect ride', author: 'Bob', date: '2026-02-01', verified: true },
    { id: 'r4', rating: 3, comment: 'Decent car', author: 'Alice', date: '2026-02-15', verified: true },
    { id: 'r5', rating: 5, comment: 'Love it!', author: 'Charlie', date: '2026-03-01', verified: false },
  ],
  ...overrides,
})

const mockVehicleResponse = (vehicle = makeVehicle()) => ({
  data: { vehicle },
})

const mockAvailabilityResponse = (available = true) => ({
  data: {
    available,
    vehicleId: '1',
    startDate: '2026-06-01',
    endDate: '2026-06-05',
    duration: '4 days',
    pricing: {
      pricePerDay: 150,
      duration: 4,
      subtotal: 600,
      tax: 60,
      total: 660,
      currency: 'USD',
    },
    ...(available ? {} : {
      conflictReason: 'Vehicle is booked for those dates',
      alternativeDates: [
        { startDate: '2026-06-10', endDate: '2026-06-14' },
        { startDate: '2026-06-20', endDate: '2026-06-24' },
      ],
    }),
  },
})

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
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())

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

  it('calls onBack when Back to Search button is clicked', async () => {
    const onBack = vi.fn()
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" onBack={onBack} />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Tesla Model S')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Back to Search/))
    expect(onBack).toHaveBeenCalled()
  })

  it('shows image gallery with thumbnails', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Tesla Model S')).toBeInTheDocument()
    })

    // Should have thumbnails for each image
    const thumbnails = screen.getAllByAltText(/Tesla Model S view/)
    expect(thumbnails).toHaveLength(3)
  })

  it('changes selected image when thumbnail is clicked', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Tesla Model S')).toBeInTheDocument()
    })

    // Click second thumbnail
    const thumbnailButtons = document.querySelectorAll('.thumbnail')
    fireEvent.click(thumbnailButtons[1])

    const mainImage = screen.getByAltText('Tesla Model S') as HTMLImageElement
    expect(mainImage.src).toContain('tesla2.jpg')
  })

  it('does not show thumbnails when only 1 image', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(
      mockVehicleResponse(makeVehicle({ images: ['single.jpg'] }))
    )

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Tesla Model S')).toBeInTheDocument()
    })

    expect(screen.queryByAltText(/Tesla Model S view/)).not.toBeInTheDocument()
  })

  it('shows electric vehicle stats', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('400 mi')).toBeInTheDocument()
      expect(screen.getByText('Range')).toBeInTheDocument()
      expect(screen.getByText('30 min')).toBeInTheDocument() // chargeTime
    })
  })

  it('shows gas vehicle stats with MPG', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(
      mockVehicleResponse(makeVehicle({ fuelType: 'gas', mpg: 28, range: undefined, chargeTime: undefined }))
    )

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('28 MPG')).toBeInTheDocument()
      expect(screen.getByText('Fuel Economy')).toBeInTheDocument()
    })
  })

  it('renders all features with icons', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Features & Amenities')).toBeInTheDocument()
    })
  })

  it('renders all vehicle specifications', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Specifications')).toBeInTheDocument()
      expect(screen.getByText('0-60 in 3.1s')).toBeInTheDocument()
      expect(screen.getByText('155 mph')).toBeInTheDocument()
      expect(screen.getByText('5-star')).toBeInTheDocument()
      expect(screen.getByText('Full Self-Driving')).toBeInTheDocument()
    })
  })

  it('renders pricing info', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('$150.00')).toBeInTheDocument()
      expect(screen.getByText(/Weekly/)).toBeInTheDocument()
      expect(screen.getByText(/Monthly/)).toBeInTheDocument()
    })
  })

  it('renders rental policies', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Rental Policies')).toBeInTheDocument()
      expect(screen.getByText('Minimum age: 25 years')).toBeInTheDocument()
      expect(screen.getByText('Full coverage included')).toBeInTheDocument()
      expect(screen.getByText('Free cancellation up to 24 hours')).toBeInTheDocument()
      expect(screen.getByText('Unlimited')).toBeInTheDocument()
    })
  })

  it('renders pickup location info', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Pickup Location')).toBeInTheDocument()
      expect(screen.getByText('123 Main St, SF, CA')).toBeInTheDocument()
      expect(screen.getByText('Go to counter B')).toBeInTheDocument()
    })
  })

  // Date selection and availability
  it('checks availability when both dates are set', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())
    vi.mocked(axios.post).mockResolvedValueOnce(mockAvailabilityResponse(true))

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Tesla Model S')).toBeInTheDocument()
    })

    const pickupInput = document.querySelectorAll('.date-input input[type="date"]')[0] as HTMLInputElement
    const returnInput = document.querySelectorAll('.date-input input[type="date"]')[1] as HTMLInputElement

    fireEvent.change(pickupInput, { target: { value: '2026-06-01' } })
    fireEvent.change(returnInput, { target: { value: '2026-06-05' } })

    await waitFor(() => {
      expect(vi.mocked(axios.post)).toHaveBeenCalledWith('/api/vehicles/availability', {
        vehicleId: '1',
        startDate: '2026-06-01',
        endDate: '2026-06-05',
      })
    })
  })

  it('shows available result with pricing breakdown', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())
    vi.mocked(axios.post).mockResolvedValueOnce(mockAvailabilityResponse(true))

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Tesla Model S'))

    fireEvent.change(document.querySelectorAll('.date-input input[type="date"]')[0] as HTMLInputElement, { target: { value: '2026-06-01' } })
    fireEvent.change(document.querySelectorAll('.date-input input[type="date"]')[1] as HTMLInputElement, { target: { value: '2026-06-05' } })

    await waitFor(() => {
      expect(screen.getByText(/Available for 4 days/)).toBeInTheDocument()
      expect(screen.getByText('$600.00')).toBeInTheDocument() // subtotal
      expect(screen.getByText('$60.00')).toBeInTheDocument() // tax
      expect(screen.getByText('$660.00')).toBeInTheDocument() // total
    })
  })

  it('shows unavailable result with alternative dates', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())
    vi.mocked(axios.post).mockResolvedValueOnce(mockAvailabilityResponse(false))

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Tesla Model S'))

    fireEvent.change(document.querySelectorAll('.date-input input[type="date"]')[0] as HTMLInputElement, { target: { value: '2026-06-01' } })
    fireEvent.change(document.querySelectorAll('.date-input input[type="date"]')[1] as HTMLInputElement, { target: { value: '2026-06-05' } })

    await waitFor(() => {
      expect(screen.getByText('Not Available')).toBeInTheDocument()
      expect(screen.getByText('Vehicle is booked for those dates')).toBeInTheDocument()
      expect(screen.getByText('Available Alternative Dates:')).toBeInTheDocument()
    })
  })

  it('clicking alternative date sets dates', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())
    vi.mocked(axios.post)
      .mockResolvedValueOnce(mockAvailabilityResponse(false))
      .mockResolvedValueOnce(mockAvailabilityResponse(true))

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Tesla Model S'))

    fireEvent.change(document.querySelectorAll('.date-input input[type="date"]')[0] as HTMLInputElement, { target: { value: '2026-06-01' } })
    fireEvent.change(document.querySelectorAll('.date-input input[type="date"]')[1] as HTMLInputElement, { target: { value: '2026-06-05' } })

    await waitFor(() => {
      expect(screen.getByText('Available Alternative Dates:')).toBeInTheDocument()
    })

    // Click first alternative date button
    const altDateButtons = document.querySelectorAll('.alt-date-btn')
    fireEvent.click(altDateButtons[0])

    await waitFor(() => {
      expect(vi.mocked(axios.post)).toHaveBeenCalledTimes(2)
    })
  })

  it('handles availability check error gracefully', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())
    vi.mocked(axios.post).mockRejectedValueOnce(new Error('Network error'))

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Tesla Model S'))

    fireEvent.change(document.querySelectorAll('.date-input input[type="date"]')[0] as HTMLInputElement, { target: { value: '2026-06-01' } })
    fireEvent.change(document.querySelectorAll('.date-input input[type="date"]')[1] as HTMLInputElement, { target: { value: '2026-06-05' } })

    await waitFor(() => {
      // Should not crash, availability result should be null
      expect(screen.queryByText('Not Available')).not.toBeInTheDocument()
    })
  })

  it('does not check availability when dates are the same', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Tesla Model S'))

    fireEvent.change(document.querySelectorAll('.date-input input[type="date"]')[0] as HTMLInputElement, { target: { value: '2026-06-01' } })
    fireEvent.change(document.querySelectorAll('.date-input input[type="date"]')[1] as HTMLInputElement, { target: { value: '2026-06-01' } })

    // Post should not have been called
    expect(vi.mocked(axios.post)).not.toHaveBeenCalled()
  })

  // Customer info and reservation
  it('shows customer info form when vehicle is available', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())
    vi.mocked(axios.post).mockResolvedValueOnce(mockAvailabilityResponse(true))

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Tesla Model S'))

    fireEvent.change(document.querySelectorAll('.date-input input[type="date"]')[0] as HTMLInputElement, { target: { value: '2026-06-01' } })
    fireEvent.change(document.querySelectorAll('.date-input input[type="date"]')[1] as HTMLInputElement, { target: { value: '2026-06-05' } })

    await waitFor(() => {
      expect(screen.getByText('Contact Information')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('First Name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Last Name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Phone Number')).toBeInTheDocument()
    })
  })

  it('reserve button is disabled when customer info is incomplete', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())
    vi.mocked(axios.post).mockResolvedValueOnce(mockAvailabilityResponse(true))

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Tesla Model S'))

    fireEvent.change(document.querySelectorAll('.date-input input[type="date"]')[0] as HTMLInputElement, { target: { value: '2026-06-01' } })
    fireEvent.change(document.querySelectorAll('.date-input input[type="date"]')[1] as HTMLInputElement, { target: { value: '2026-06-05' } })

    await waitFor(() => {
      expect(screen.getByText('Reserve Now')).toBeDisabled()
    })
  })

  it('reserve button is enabled when customer info is complete', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())
    vi.mocked(axios.post).mockResolvedValueOnce(mockAvailabilityResponse(true))

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Tesla Model S'))

    fireEvent.change(document.querySelectorAll('.date-input input[type="date"]')[0] as HTMLInputElement, { target: { value: '2026-06-01' } })
    fireEvent.change(document.querySelectorAll('.date-input input[type="date"]')[1] as HTMLInputElement, { target: { value: '2026-06-05' } })

    await waitFor(() => screen.getByText('Contact Information'))

    fireEvent.change(screen.getByPlaceholderText('First Name'), { target: { value: 'John' } })
    fireEvent.change(screen.getByPlaceholderText('Last Name'), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByPlaceholderText('Email Address'), { target: { value: 'john@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('Phone Number'), { target: { value: '555-1234' } })

    expect(screen.getByText('Reserve Now')).not.toBeDisabled()
  })

  it('creates reservation when Reserve Now is clicked', async () => {
    const onReserve = vi.fn()
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())
    vi.mocked(axios.post)
      .mockResolvedValueOnce(mockAvailabilityResponse(true))
      .mockResolvedValueOnce({ data: { reservationId: 'res-123', status: 'confirmed' } })

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" onReserve={onReserve} />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Tesla Model S'))

    fireEvent.change(document.querySelectorAll('.date-input input[type="date"]')[0] as HTMLInputElement, { target: { value: '2026-06-01' } })
    fireEvent.change(document.querySelectorAll('.date-input input[type="date"]')[1] as HTMLInputElement, { target: { value: '2026-06-05' } })

    await waitFor(() => screen.getByText('Contact Information'))

    fireEvent.change(screen.getByPlaceholderText('First Name'), { target: { value: 'John' } })
    fireEvent.change(screen.getByPlaceholderText('Last Name'), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByPlaceholderText('Email Address'), { target: { value: 'john@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('Phone Number'), { target: { value: '555-1234' } })

    fireEvent.click(screen.getByText('Reserve Now'))

    await waitFor(() => {
      expect(vi.mocked(axios.post)).toHaveBeenCalledWith('/api/vehicles/reserve', expect.objectContaining({
        vehicleId: '1',
        startDate: '2026-06-01',
        endDate: '2026-06-05',
      }))
      expect(onReserve).toHaveBeenCalledWith(expect.objectContaining({ reservationId: 'res-123' }))
    })
  })

  it('shows error when reservation fails', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())
    vi.mocked(axios.post)
      .mockResolvedValueOnce(mockAvailabilityResponse(true))
      .mockRejectedValueOnce({ response: { data: { error: 'Reservation failed' } } })

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Tesla Model S'))

    fireEvent.change(document.querySelectorAll('.date-input input[type="date"]')[0] as HTMLInputElement, { target: { value: '2026-06-01' } })
    fireEvent.change(document.querySelectorAll('.date-input input[type="date"]')[1] as HTMLInputElement, { target: { value: '2026-06-05' } })

    await waitFor(() => screen.getByText('Contact Information'))

    fireEvent.change(screen.getByPlaceholderText('First Name'), { target: { value: 'John' } })
    fireEvent.change(screen.getByPlaceholderText('Last Name'), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByPlaceholderText('Email Address'), { target: { value: 'john@test.com' } })

    fireEvent.click(screen.getByText('Reserve Now'))

    await waitFor(() => {
      expect(screen.getByText('Reservation failed')).toBeInTheDocument()
    })
  })

  it('shows generic error when reservation fails without response', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())
    vi.mocked(axios.post)
      .mockResolvedValueOnce(mockAvailabilityResponse(true))
      .mockRejectedValueOnce(new Error('Network error'))

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Tesla Model S'))

    fireEvent.change(document.querySelectorAll('.date-input input[type="date"]')[0] as HTMLInputElement, { target: { value: '2026-06-01' } })
    fireEvent.change(document.querySelectorAll('.date-input input[type="date"]')[1] as HTMLInputElement, { target: { value: '2026-06-05' } })

    await waitFor(() => screen.getByText('Contact Information'))

    fireEvent.change(screen.getByPlaceholderText('First Name'), { target: { value: 'John' } })
    fireEvent.change(screen.getByPlaceholderText('Last Name'), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByPlaceholderText('Email Address'), { target: { value: 'john@test.com' } })

    fireEvent.click(screen.getByText('Reserve Now'))

    await waitFor(() => {
      expect(screen.getByText('Failed to create reservation')).toBeInTheDocument()
    })
  })

  // Reviews section
  it('shows only 3 reviews initially and has Show All button', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Amazing car!')).toBeInTheDocument()
      expect(screen.getByText('Great experience')).toBeInTheDocument()
      expect(screen.getByText('Perfect ride')).toBeInTheDocument()
      // 4th and 5th reviews should not be visible
      expect(screen.queryByText('Decent car')).not.toBeInTheDocument()
      expect(screen.queryByText('Love it!')).not.toBeInTheDocument()
    })

    expect(screen.getByText(/Show All 200 Reviews/)).toBeInTheDocument()
  })

  it('shows all reviews when Show All button is clicked', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Amazing car!'))

    fireEvent.click(screen.getByText(/Show All 200 Reviews/))

    await waitFor(() => {
      expect(screen.getByText('Decent car')).toBeInTheDocument()
      expect(screen.getByText('Love it!')).toBeInTheDocument()
      expect(screen.getByText('Show Less')).toBeInTheDocument()
    })
  })

  it('hides reviews when Show Less is clicked', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Amazing car!'))

    fireEvent.click(screen.getByText(/Show All 200 Reviews/))
    await waitFor(() => screen.getByText('Decent car'))

    fireEvent.click(screen.getByText('Show Less'))
    expect(screen.queryByText('Decent car')).not.toBeInTheDocument()
  })

  it('does not show Show All button when 3 or fewer reviews', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(
      mockVehicleResponse(makeVehicle({
        reviews: [
          { id: 'r1', rating: 5, comment: 'Great!', author: 'John', date: '2026-01-01', verified: true },
        ],
      }))
    )

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Great!')).toBeInTheDocument()
    })

    expect(screen.queryByText(/Show All/)).not.toBeInTheDocument()
  })

  it('shows verified badge for verified reviews', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => {
      const verifiedBadges = screen.getAllByText(/Verified/)
      expect(verifiedBadges.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('handles image error by setting placeholder', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Tesla Model S'))

    const mainImage = screen.getByAltText('Tesla Model S') as HTMLImageElement
    fireEvent.error(mainImage)
    expect(mainImage.src).toContain('/placeholder-car.jpg')
  })

  it('handles thumbnail image error', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Tesla Model S'))

    const thumbnails = screen.getAllByAltText(/Tesla Model S view/)
    fireEvent.error(thumbnails[0])
    expect((thumbnails[0] as HTMLImageElement).src).toContain('/placeholder-car.jpg')
  })

  it('renders with initialDates and triggers availability check', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())
    vi.mocked(axios.post).mockResolvedValueOnce(mockAvailabilityResponse(true))

    render(
      <MemoryRouter>
        <VehicleDetails
          vehicleId="1"
          initialDates={{ startDate: '2026-06-01', endDate: '2026-06-05' }}
        />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Tesla Model S')).toBeInTheDocument()
    })

    // Availability check should have been triggered automatically
    await waitFor(() => {
      expect(vi.mocked(axios.post)).toHaveBeenCalledWith('/api/vehicles/availability', {
        vehicleId: '1',
        startDate: '2026-06-01',
        endDate: '2026-06-05',
      })
    })
  })

  it('shows checking availability spinner', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())
    vi.mocked(axios.post).mockReturnValue(new Promise(() => {})) // never resolves

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Tesla Model S'))

    fireEvent.change(document.querySelectorAll('.date-input input[type="date"]')[0] as HTMLInputElement, { target: { value: '2026-06-01' } })
    fireEvent.change(document.querySelectorAll('.date-input input[type="date"]')[1] as HTMLInputElement, { target: { value: '2026-06-05' } })

    await waitFor(() => {
      expect(screen.getByText('Checking availability...')).toBeInTheDocument()
    })
  })

  it('shows feature icons including default for unknown features', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(
      mockVehicleResponse(makeVehicle({ features: ['unknown-feature'] }))
    )

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Tesla Model S')).toBeInTheDocument()
    })
  })

  it('does not show customer info when vehicle is not available', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce(mockVehicleResponse())
    vi.mocked(axios.post).mockResolvedValueOnce(mockAvailabilityResponse(false))

    render(
      <MemoryRouter>
        <VehicleDetails vehicleId="1" />
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Tesla Model S'))

    fireEvent.change(document.querySelectorAll('.date-input input[type="date"]')[0] as HTMLInputElement, { target: { value: '2026-06-01' } })
    fireEvent.change(document.querySelectorAll('.date-input input[type="date"]')[1] as HTMLInputElement, { target: { value: '2026-06-05' } })

    await waitFor(() => {
      expect(screen.getByText('Not Available')).toBeInTheDocument()
    })

    expect(screen.queryByText('Contact Information')).not.toBeInTheDocument()
    expect(screen.queryByText('Reserve Now')).not.toBeInTheDocument()
  })
})
