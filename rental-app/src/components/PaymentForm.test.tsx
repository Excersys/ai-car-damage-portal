import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { mockPost } = vi.hoisted(() => ({
  mockPost: vi.fn(),
}))

vi.mock('../config/api', () => ({
  apiClient: { post: mockPost },
}))

// Mock Stripe
const mockConfirmPayment = vi.fn()
const mockConfirmCardPayment = vi.fn()
const mockPaymentRequest = vi.fn()
const mockCanMakePayment = vi.fn()
const mockShow = vi.fn()
const mockOn = vi.fn()

let mockStripeValue: any = null
let mockElementsValue: any = null

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue(null),
}))

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PaymentElement: () => <div data-testid="payment-element">Payment Element</div>,
  useStripe: () => mockStripeValue,
  useElements: () => mockElementsValue,
}))

import PaymentForm from './PaymentForm'

const defaultProps = {
  bookingData: { reservationId: 'res-1', firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
  car: { id: 'car-1', make: 'Tesla', model: 'Model 3', images: ['tesla.jpg'] },
  pricing: { total: 450, basePrice: 400, insurancePrice: 30, addOnsPrice: 20, taxes: 20 },
  totalDays: 5,
  verificationSessionId: 'ver-1',
  onPaymentComplete: vi.fn(),
  onCancel: vi.fn(),
}

describe('PaymentForm', () => {
  beforeEach(() => {
    mockPost.mockReset()
    mockStripeValue = null
    mockElementsValue = null
    defaultProps.onPaymentComplete.mockReset()
    defaultProps.onCancel.mockReset()
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

  it('shows error when payment intent creation fails with API error', async () => {
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
    vi.unstubAllEnvs()
  })

  it('retries payment intent creation when clicking Try Again', async () => {
    mockPost.mockRejectedValueOnce({
      response: { data: { error: 'Temporary failure' } },
    })

    render(
      <MemoryRouter>
        <PaymentForm {...defaultProps} />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Payment Initialization Error')).toBeInTheDocument()
    })

    mockPost.mockReturnValue(new Promise(() => {}))
    fireEvent.click(screen.getByText('Try Again'))
    expect(mockPost).toHaveBeenCalledTimes(2)
  })

  it('shows payment form when intent is created successfully', async () => {
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

  it('shows Payment Unavailable when paymentIntentData is null after loading', async () => {
    // Simulate the edge case where loading finishes but data is somehow null
    mockPost.mockResolvedValueOnce({ data: null })

    render(
      <MemoryRouter>
        <PaymentForm {...defaultProps} />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Payment Unavailable')).toBeInTheDocument()
    })
  })

  it('calls onCancel when Go Back button is clicked on unavailable state', async () => {
    mockPost.mockResolvedValueOnce({ data: null })

    render(
      <MemoryRouter>
        <PaymentForm {...defaultProps} />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Go Back')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Go Back'))
    expect(defaultProps.onCancel).toHaveBeenCalled()
  })

  it('shows booking summary with add-ons when addOnsPrice > 0', async () => {
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
      expect(screen.getByText('Add-ons')).toBeInTheDocument()
    })
  })

  it('hides add-ons line when addOnsPrice is 0', async () => {
    const propsNoAddOns = {
      ...defaultProps,
      pricing: { ...defaultProps.pricing, addOnsPrice: 0 },
    }
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
        <PaymentForm {...propsNoAddOns} />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Complete Your Payment')).toBeInTheDocument()
    })
    expect(screen.queryByText('Add-ons')).not.toBeInTheDocument()
  })

  it('shows verification session ID reference', async () => {
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
      expect(screen.getByText(/ver-1/)).toBeInTheDocument()
    })
  })

  it('handles form submit when stripe is not loaded', async () => {
    mockStripeValue = null
    mockElementsValue = null

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

    // The submit button should be disabled when stripe is null
    const payBtn = screen.getByRole('button', { name: /Pay/ })
    expect(payBtn).toBeDisabled()
  })

  it('handles form submit with stripe loaded and elements', async () => {
    const mockGetElement = vi.fn().mockReturnValue({})
    mockStripeValue = {
      confirmPayment: mockConfirmPayment.mockResolvedValueOnce({
        paymentIntent: { id: 'pi_123', status: 'succeeded', amount: 45000, currency: 'usd' },
      }),
      paymentRequest: mockPaymentRequest.mockReturnValue({
        canMakePayment: mockCanMakePayment.mockResolvedValue(null),
        on: mockOn,
        show: mockShow,
      }),
      confirmCardPayment: mockConfirmCardPayment,
    }
    mockElementsValue = {
      getElement: mockGetElement,
    }

    // First call for creating payment intent, second for completing booking
    mockPost
      .mockResolvedValueOnce({
        data: {
          clientSecret: 'pi_test_secret',
          paymentIntentId: 'pi_test',
          amount: 45000,
          currency: 'usd',
          publishableKey: 'pk_test_123',
        },
      })
      .mockResolvedValueOnce({ data: { bookingId: 'BK123' } })

    render(
      <MemoryRouter>
        <PaymentForm {...defaultProps} />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Complete Your Payment')).toBeInTheDocument()
    })

    const form = document.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Payment Successful!')).toBeInTheDocument()
    })
  })

  it('shows error when payment element is not found', async () => {
    const mockGetElement = vi.fn().mockReturnValue(null)
    mockStripeValue = {
      confirmPayment: mockConfirmPayment,
      paymentRequest: mockPaymentRequest.mockReturnValue({
        canMakePayment: mockCanMakePayment.mockResolvedValue(null),
        on: mockOn,
        show: mockShow,
      }),
      confirmCardPayment: mockConfirmCardPayment,
    }
    mockElementsValue = {
      getElement: mockGetElement,
    }

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

    const form = document.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Payment element not found')).toBeInTheDocument()
    })
  })

  it('handles confirmPayment error', async () => {
    const mockGetElement = vi.fn().mockReturnValue({})
    mockStripeValue = {
      confirmPayment: mockConfirmPayment.mockResolvedValueOnce({
        error: { message: 'Card declined' },
      }),
      paymentRequest: mockPaymentRequest.mockReturnValue({
        canMakePayment: mockCanMakePayment.mockResolvedValue(null),
        on: mockOn,
        show: mockShow,
      }),
      confirmCardPayment: mockConfirmCardPayment,
    }
    mockElementsValue = { getElement: mockGetElement }

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

    const form = document.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Card declined')).toBeInTheDocument()
    })
  })

  it('handles requires_action payment status', async () => {
    const mockGetElement = vi.fn().mockReturnValue({})
    mockStripeValue = {
      confirmPayment: mockConfirmPayment.mockResolvedValueOnce({
        paymentIntent: { id: 'pi_123', status: 'requires_action' },
      }),
      paymentRequest: mockPaymentRequest.mockReturnValue({
        canMakePayment: mockCanMakePayment.mockResolvedValue(null),
        on: mockOn,
        show: mockShow,
      }),
      confirmCardPayment: mockConfirmCardPayment,
    }
    mockElementsValue = { getElement: mockGetElement }

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

    const form = document.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Additional authentication is required. Please follow the prompts.')).toBeInTheDocument()
    })
  })

  it('handles unexpected payment status', async () => {
    const mockGetElement = vi.fn().mockReturnValue({})
    mockStripeValue = {
      confirmPayment: mockConfirmPayment.mockResolvedValueOnce({
        paymentIntent: { id: 'pi_123', status: 'processing' },
      }),
      paymentRequest: mockPaymentRequest.mockReturnValue({
        canMakePayment: mockCanMakePayment.mockResolvedValue(null),
        on: mockOn,
        show: mockShow,
      }),
      confirmCardPayment: mockConfirmCardPayment,
    }
    mockElementsValue = { getElement: mockGetElement }

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

    const form = document.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText(/Payment failed with status/)).toBeInTheDocument()
    })
  })

  it('handles cancel button click', async () => {
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
      expect(screen.getByText('Back to Verification')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Back to Verification'))
    expect(defaultProps.onCancel).toHaveBeenCalled()
  })

  it('toggles save card checkbox', async () => {
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
      expect(screen.getByText('Save this payment method for future bookings')).toBeInTheDocument()
    })

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()
  })

  it('selects card payment method button', async () => {
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
      expect(screen.getByText(/Credit\/Debit Card/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Credit\/Debit Card/))
    // Card is default, so payment form should be visible
    expect(screen.getByTestId('payment-element')).toBeInTheDocument()
  })

  it('shows requires_capture status as success', async () => {
    const mockGetElement = vi.fn().mockReturnValue({})
    mockStripeValue = {
      confirmPayment: mockConfirmPayment.mockResolvedValueOnce({
        paymentIntent: { id: 'pi_123', status: 'requires_capture', amount: 45000, currency: 'usd' },
      }),
      paymentRequest: mockPaymentRequest.mockReturnValue({
        canMakePayment: mockCanMakePayment.mockResolvedValue(null),
        on: mockOn,
        show: mockShow,
      }),
      confirmCardPayment: mockConfirmCardPayment,
    }
    mockElementsValue = { getElement: mockGetElement }

    mockPost
      .mockResolvedValueOnce({
        data: {
          clientSecret: 'pi_test_secret',
          paymentIntentId: 'pi_test',
          amount: 45000,
          currency: 'usd',
          publishableKey: 'pk_test_123',
        },
      })
      .mockResolvedValueOnce({ data: {} })

    render(
      <MemoryRouter>
        <PaymentForm {...defaultProps} />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Complete Your Payment')).toBeInTheDocument()
    })

    const form = document.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Payment Successful!')).toBeInTheDocument()
    })
  })

  it('shows processing state during payment', async () => {
    const mockGetElement = vi.fn().mockReturnValue({})
    let resolvePayment: any
    mockStripeValue = {
      confirmPayment: vi.fn().mockReturnValue(new Promise((r) => { resolvePayment = r })),
      paymentRequest: mockPaymentRequest.mockReturnValue({
        canMakePayment: mockCanMakePayment.mockResolvedValue(null),
        on: mockOn,
        show: mockShow,
      }),
      confirmCardPayment: mockConfirmCardPayment,
    }
    mockElementsValue = { getElement: mockGetElement }

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

    const form = document.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Processing Payment...')).toBeInTheDocument()
    })

    // Resolve to clean up
    resolvePayment({ paymentIntent: { id: 'pi_123', status: 'succeeded', amount: 45000, currency: 'usd' } })
  })

  it('checks apple/google pay availability when stripe loads', async () => {
    mockStripeValue = {
      confirmPayment: mockConfirmPayment,
      paymentRequest: mockPaymentRequest.mockReturnValue({
        canMakePayment: mockCanMakePayment.mockResolvedValue({ applePay: true, googlePay: false }),
        on: mockOn,
        show: mockShow,
      }),
      confirmCardPayment: mockConfirmCardPayment,
    }
    mockElementsValue = { getElement: vi.fn().mockReturnValue({}) }

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
      expect(screen.getByText(/Apple Pay/)).toBeInTheDocument()
    })
    // Google Pay should not be shown
    expect(screen.queryByText(/Google Pay/)).not.toBeInTheDocument()
  })

  it('shows car image fallback when no images array', async () => {
    const propsNoImages = {
      ...defaultProps,
      car: { id: 'car-1', make: 'Tesla', model: 'Model 3', images: [] },
    }
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
        <PaymentForm {...propsNoImages} />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Complete Your Payment')).toBeInTheDocument()
    })

    const img = document.querySelector('img')
    expect(img?.getAttribute('src')).toBe('/placeholder-car.jpg')
  })
})
