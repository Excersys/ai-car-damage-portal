import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BookingConfirmationPage from './BookingConfirmationPage'

const bookingState = {
  bookingId: 'BK-12345',
  car: {
    make: 'Tesla',
    model: 'Model 3',
    image: 'https://example.com/tesla.jpg',
  },
  booking: {
    pickupDate: '2026-03-01',
    returnDate: '2026-03-05',
    pickupTime: '10:00 AM',
    returnTime: '10:00 AM',
    driverAge: 30,
    pickupLocation: 'main-office',
    returnLocation: 'airport',
    insuranceType: 'premium',
    addOns: ['gps', 'wifi'],
  },
  pricing: {
    basePrice: 356,
    insurancePrice: 100,
    addOnsPrice: 80,
    taxes: 45.56,
    total: 581.56,
  },
  totalDays: 4,
}

function renderWithState(state?: any) {
  const entries = state
    ? [{ pathname: '/booking-confirmation/BK-12345', state }]
    : ['/booking-confirmation/BK-12345']
  return render(
    <MemoryRouter initialEntries={entries}>
      <BookingConfirmationPage />
    </MemoryRouter>
  )
}

describe('BookingConfirmationPage', () => {
  it('shows error when no booking data', () => {
    renderWithState()
    expect(screen.getByText('Booking not found')).toBeInTheDocument()
    expect(screen.getByText(/couldn't find your booking/i)).toBeInTheDocument()
  })

  it('has a link to browse cars when no data', () => {
    renderWithState()
    expect(screen.getByText('Browse Cars').closest('a')).toHaveAttribute('href', '/cars')
  })

  it('renders confirmation header with booking reference', () => {
    renderWithState(bookingState)
    expect(screen.getByText('Booking Confirmed!')).toBeInTheDocument()
    expect(screen.getByText('BK-12345')).toBeInTheDocument()
  })

  it('renders vehicle details', () => {
    renderWithState(bookingState)
    expect(screen.getByText('Tesla Model 3')).toBeInTheDocument()
    expect(screen.getByAltText('Tesla Model 3')).toHaveAttribute('src', 'https://example.com/tesla.jpg')
  })

  it('renders rental dates and times', () => {
    renderWithState(bookingState)
    expect(screen.getAllByText(/at 10:00 AM/).length).toBe(2) // pickup and return
  })

  it('renders total days with plural form', () => {
    renderWithState(bookingState)
    expect(screen.getByText('4 days')).toBeInTheDocument()
  })

  it('renders singular day when totalDays is 1', () => {
    renderWithState({ ...bookingState, totalDays: 1 })
    expect(screen.getByText('1 day')).toBeInTheDocument()
  })

  it('renders driver age', () => {
    renderWithState(bookingState)
    expect(screen.getByText('30 years')).toBeInTheDocument()
  })

  it('renders pickup and return locations', () => {
    renderWithState(bookingState)
    expect(screen.getByText('Main Office - Downtown')).toBeInTheDocument()
    expect(screen.getByText('San Francisco Airport (SFO)')).toBeInTheDocument()
  })

  it('renders insurance coverage info', () => {
    renderWithState(bookingState)
    expect(screen.getByText('Premium Coverage')).toBeInTheDocument()
    expect(screen.getByText('Full coverage including personal injury')).toBeInTheDocument()
  })

  it('renders add-ons list', () => {
    renderWithState(bookingState)
    expect(screen.getByText('GPS Navigation')).toBeInTheDocument()
    expect(screen.getByText('Mobile WiFi')).toBeInTheDocument()
  })

  it('does not render add-ons section when empty', () => {
    const noAddOns = {
      ...bookingState,
      booking: { ...bookingState.booking, addOns: [] },
    }
    renderWithState(noAddOns)
    expect(screen.queryByText('GPS Navigation')).not.toBeInTheDocument()
  })

  it('renders pricing breakdown', () => {
    renderWithState(bookingState)
    expect(screen.getByText('$356.00')).toBeInTheDocument()
    expect(screen.getByText('$100.00')).toBeInTheDocument()
    expect(screen.getByText('$80.00')).toBeInTheDocument()
    expect(screen.getByText('$45.56')).toBeInTheDocument()
    expect(screen.getByText('$581.56')).toBeInTheDocument()
  })

  it('hides add-ons price when zero', () => {
    const noAddOnsPrice = {
      ...bookingState,
      pricing: { ...bookingState.pricing, addOnsPrice: 0 },
    }
    renderWithState(noAddOnsPrice)
    // The "Add-ons" price line in the sidebar should not appear
    const priceItems = document.querySelectorAll('.price-item')
    const texts = Array.from(priceItems).map(el => el.textContent)
    expect(texts.some(t => t?.includes('Add-ons'))).toBe(false)
  })

  it('renders download receipt button that triggers alert', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    renderWithState(bookingState)
    fireEvent.click(screen.getByText(/Download Receipt/))
    expect(alertSpy).toHaveBeenCalledWith('Receipt download feature would be implemented here')
    alertSpy.mockRestore()
  })

  it('renders add to calendar button that triggers alert', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    renderWithState(bookingState)
    fireEvent.click(screen.getByText(/Add to Calendar/))
    expect(alertSpy).toHaveBeenCalledWith('Add to calendar feature would be implemented here')
    alertSpy.mockRestore()
  })

  it('renders View All Bookings link', () => {
    renderWithState(bookingState)
    expect(screen.getByText('View All Bookings').closest('a')).toHaveAttribute('href', '/bookings')
  })

  it('renders important information sections', () => {
    renderWithState(bookingState)
    expect(screen.getByText("Valid driver's license")).toBeInTheDocument()
    expect(screen.getByText('Arrive 15 minutes before pickup time')).toBeInTheDocument()
    expect(screen.getByText('Customer Service: 1-800-EZ-RENTAL')).toBeInTheDocument()
  })

  it('renders next steps section', () => {
    renderWithState(bookingState)
    expect(screen.getByText("What's Next?")).toBeInTheDocument()
    expect(screen.getByText('Confirmation Email')).toBeInTheDocument()
    expect(screen.getByText('Prepare Documents')).toBeInTheDocument()
    expect(screen.getByText('Vehicle Pickup')).toBeInTheDocument()
    expect(screen.getByText('Enjoy Your Trip!')).toBeInTheDocument()
  })

  it('renders Live Chat button', () => {
    renderWithState(bookingState)
    const chatBtn = screen.getByRole('button', { name: /Live Chat/ })
    expect(chatBtn).toBeInTheDocument()
  })

  it('handles unknown add-on IDs gracefully', () => {
    const unknownAddOns = {
      ...bookingState,
      booking: { ...bookingState.booking, addOns: ['unknown-id'] },
    }
    renderWithState(unknownAddOns)
    // Should not crash, unknown add-on returns null
    expect(screen.getByText('Booking Confirmed!')).toBeInTheDocument()
  })
})
