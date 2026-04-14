import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BookingConfirmationPage from './BookingConfirmationPage'

describe('BookingConfirmationPage', () => {
  it('shows error when no booking data', () => {
    render(
      <MemoryRouter>
        <BookingConfirmationPage />
      </MemoryRouter>
    )
    expect(screen.getByText('Booking not found')).toBeInTheDocument()
    expect(screen.getByText(/couldn't find your booking/i)).toBeInTheDocument()
  })

  it('has a link to browse cars when no data', () => {
    render(
      <MemoryRouter>
        <BookingConfirmationPage />
      </MemoryRouter>
    )
    expect(screen.getByText('Browse Cars').closest('a')).toHaveAttribute('href', '/cars')
  })

  it('exports a valid component', () => {
    expect(typeof BookingConfirmationPage).toBe('function')
  })
})
