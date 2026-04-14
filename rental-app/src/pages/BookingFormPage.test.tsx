import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const { mockFetchCarById, mockPost } = vi.hoisted(() => ({
  mockFetchCarById: vi.fn(),
  mockPost: vi.fn(),
}))

vi.mock('../lib/vehicleApi', () => ({
  fetchCarById: mockFetchCarById,
}))

vi.mock('../config/api', () => ({
  apiClient: {
    post: mockPost,
    get: vi.fn(),
    create: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    defaults: { baseURL: '', timeout: 10000, headers: {} },
  },
}))

vi.mock('../components/PaymentForm', () => ({
  default: ({ onPaymentComplete }: any) => (
    <div data-testid="payment-form">
      <button onClick={() => onPaymentComplete({ paymentIntentId: 'pi_test' })}>
        Complete Payment
      </button>
    </div>
  ),
}))

vi.mock('../components/VeriffVerification', () => ({
  default: ({ onVerificationComplete }: any) => (
    <div data-testid="veriff">
      <button onClick={() => onVerificationComplete(true, 'session-123', {})}>
        Complete Verification
      </button>
    </div>
  ),
}))

import BookingFormPage from './BookingFormPage'

describe('BookingFormPage', () => {
  beforeEach(() => {
    mockFetchCarById.mockReset()
    mockPost.mockReset()
    mockFetchCarById.mockResolvedValue(null)
  })

  const renderBookingForm = (carId = '1', searchParams = '') => {
    return render(
      <MemoryRouter initialEntries={[`/book/${carId}${searchParams}`]}>
        <Routes>
          <Route path="/book/:carId" element={<BookingFormPage />} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('renders without crashing', async () => {
    renderBookingForm()
    await waitFor(() => {
      expect(document.body.textContent!.length).toBeGreaterThan(0)
    })
  })

  it('shows booking steps', async () => {
    renderBookingForm()
    await waitFor(() => {
      // The booking form has step indicators
      const text = document.body.textContent || ''
      expect(text).toContain('Confirmation')
    })
  })

  it('loads car data from fallback when API returns null', async () => {
    renderBookingForm('1')
    await waitFor(() => {
      const text = document.body.textContent || ''
      expect(text).toContain('Tesla')
    })
  })

  it('loads car data from API when available', async () => {
    mockFetchCarById.mockResolvedValueOnce({
      id: '1',
      make: 'Honda',
      model: 'Civic',
      year: 2024,
      pricePerDay: 45,
      features: [],
      type: 'sedan',
      available: true,
    })

    renderBookingForm('1')
    await waitFor(() => {
      expect(screen.getByText(/Honda/)).toBeInTheDocument()
    })
  })

  it('shows step navigation', async () => {
    renderBookingForm()
    await waitFor(() => {
      // Should have a Next or Continue button
      const buttons = document.querySelectorAll('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  it('exports a valid React component', () => {
    expect(typeof BookingFormPage).toBe('function')
  })
})
