import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { mockPost } = vi.hoisted(() => ({
  mockPost: vi.fn(),
}))

vi.mock('../config/api', () => ({
  apiClient: { post: mockPost },
}))

// Mock Stripe
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue(null),
}))

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PaymentElement: () => <div data-testid="payment-element">Payment Element</div>,
  useStripe: () => null,
  useElements: () => null,
}))

import PaymentForm from './PaymentForm'

const defaultProps = {
  bookingData: { reservationId: 'res-1' },
  car: { id: 'car-1', make: 'Tesla', model: 'Model 3', images: [] },
  pricing: { total: 450, basePrice: 400, insurancePrice: 30, addOnsPrice: 0, taxes: 20 },
  totalDays: 5,
  verificationSessionId: 'ver-1',
  onPaymentComplete: vi.fn(),
  onCancel: vi.fn(),
}

describe('PaymentForm', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  it('shows loading state when creating payment intent', () => {
    mockPost.mockReturnValue(new Promise(() => {}))

    render(
      <MemoryRouter>
        <PaymentForm {...defaultProps} />
      </MemoryRouter>
    )
    expect(screen.getByText('Initializing secure payment...')).toBeInTheDocument()
  })

  it('shows error when payment intent creation fails', async () => {
    mockPost.mockRejectedValueOnce({
      response: { data: { error: 'Payment failed' } },
    })

    render(
      <MemoryRouter>
        <PaymentForm {...defaultProps} />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Payment Initialization Error')).toBeInTheDocument()
    })
  })

  it('shows payment form when intent is created', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        clientSecret: 'pi_test_secret',
        paymentIntentId: 'pi_test',
        amount: 45000,
        currency: 'usd',
        publishableKey: 'pk_test_123',
      },
    })

    render(
      <MemoryRouter>
        <PaymentForm {...defaultProps} />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Complete Your Payment')).toBeInTheDocument()
    })
  })

  it('shows API not configured error when no base URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    mockPost.mockRejectedValueOnce(new Error('Network error'))

    render(
      <MemoryRouter>
        <PaymentForm {...defaultProps} />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Payment Initialization Error')).toBeInTheDocument()
    })
  })
})
