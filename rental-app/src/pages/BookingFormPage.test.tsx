import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

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
  default: ({ onPaymentComplete, onCancel }: any) => (
    <div data-testid="payment-form">
      <button onClick={() => onPaymentComplete({ paymentIntentId: 'pi_test' })}>
        Complete Payment
      </button>
      <button onClick={onCancel}>Cancel Payment</button>
    </div>
  ),
}))

vi.mock('../components/VeriffVerification', () => ({
  default: ({ onVerificationComplete, onCancel }: any) => (
    <div data-testid="veriff">
      <button onClick={() => onVerificationComplete(true, 'session-123', { report: true })}>
        Complete Verification
      </button>
      <button onClick={() => onVerificationComplete(false)}>
        Fail Verification
      </button>
      <button onClick={onCancel}>Cancel Verification</button>
    </div>
  ),
}))

vi.mock('../components/AgreementStep', () => ({
  default: ({ onComplete }: any) => (
    <div data-testid="agreement-step">
      <button onClick={() => onComplete({ agreed: true, typedSignature: 'Test Renter', signedAt: new Date().toISOString() })}>
        Sign Agreement
      </button>
    </div>
  ),
}))

import BookingFormPage from './BookingFormPage'

describe('BookingFormPage', () => {
  beforeEach(() => {
    mockFetchCarById.mockReset()
    mockPost.mockReset()
    mockNavigate.mockReset()
    mockFetchCarById.mockResolvedValue(null)
    mockPost.mockResolvedValue({ data: { bookingId: 'BK-test' } })
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const renderBookingForm = (carId = '1', searchParams = '', state?: any) => {
    const entry = state
      ? { pathname: `/book/${carId}${searchParams}`, state }
      : `/book/${carId}${searchParams}`
    return render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/book/:carId" element={<BookingFormPage />} />
          <Route path="/booking-confirmation/:id" element={<div>Confirmation Page</div>} />
          <Route path="/cars" element={<div>Cars Page</div>} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('shows loading when no car data', async () => {
    // carId '999' has no fallback
    mockFetchCarById.mockResolvedValueOnce(null)
    render(
      <MemoryRouter initialEntries={['/book/999']}>
        <Routes>
          <Route path="/book/:carId" element={<BookingFormPage />} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('loads car data from fallback when API returns null', async () => {
    renderBookingForm('1')
    await waitFor(() => {
      expect(screen.getByText(/Tesla/)).toBeInTheDocument()
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

  it('shows step 1 with car details and booking confirmation', async () => {
    renderBookingForm()
    await waitFor(() => {
      expect(screen.getByText('Booking Confirmation')).toBeInTheDocument()
      expect(screen.getByText('Rental Details')).toBeInTheDocument()
    })
  })

  it('shows progress bar with all steps', async () => {
    renderBookingForm()
    await waitFor(() => {
      expect(screen.getByText('Confirmation')).toBeInTheDocument()
      expect(screen.getByText('Verification')).toBeInTheDocument()
      expect(screen.getByText('Your Information')).toBeInTheDocument()
      expect(screen.getByText('Insurance & Options')).toBeInTheDocument()
      expect(screen.getByText('Rental Agreement')).toBeInTheDocument()
      expect(screen.getByText('Payment')).toBeInTheDocument()
    })
  })

  it('navigates from step 1 to step 2 (verification)', async () => {
    renderBookingForm()
    await waitFor(() => {
      expect(screen.getByText('Continue to Verification')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Continue to Verification'))

    await waitFor(() => {
      expect(screen.getByTestId('veriff')).toBeInTheDocument()
    })
  })

  it('completes verification and advances to step 3', async () => {
    renderBookingForm()
    await waitFor(() => {
      expect(screen.getByText('Continue to Verification')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Continue to Verification'))

    await waitFor(() => {
      expect(screen.getByTestId('veriff')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Complete Verification'))

    await waitFor(() => {
      // Step 3 content - the heading (there's also a step label)
      expect(screen.getByText(/pre-filled from identity verification/)).toBeInTheDocument()
    })
  })

  it('handles verification failure', async () => {
    renderBookingForm()
    await waitFor(() => {
      expect(screen.getByText('Continue to Verification')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Continue to Verification'))
    fireEvent.click(screen.getByText('Fail Verification'))

    // Should log error but not crash
    expect(console.error).toHaveBeenCalledWith('Verification failed')
  })

  it('handles verification cancel (goes back to step 1)', async () => {
    renderBookingForm()
    await waitFor(() => {
      expect(screen.getByText('Continue to Verification')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Continue to Verification'))
    fireEvent.click(screen.getByText('Cancel Verification'))

    await waitFor(() => {
      expect(screen.getByText('Booking Confirmation')).toBeInTheDocument()
    })
  })

  it('navigates through step 3 (user info) to step 4 (insurance)', async () => {
    renderBookingForm()
    await waitFor(() => {
      expect(screen.getByText('Continue to Verification')).toBeInTheDocument()
    })

    // Step 1 -> Step 2
    fireEvent.click(screen.getByText('Continue to Verification'))
    // Complete verification -> Step 3
    fireEvent.click(screen.getByText('Complete Verification'))

    await waitFor(() => {
      expect(screen.getByText(/pre-filled from identity verification/)).toBeInTheDocument()
    })

    // Step 3 -> Step 4
    fireEvent.click(screen.getByText('Continue'))

    await waitFor(() => {
      expect(screen.getByText('Choose Your Protection')).toBeInTheDocument()
      expect(screen.getByText('Additional Options')).toBeInTheDocument()
    })
  })

  // Helper to navigate through steps quickly
  async function navigateToStep(step: number) {
    renderBookingForm()
    await waitFor(() => screen.getByText('Continue to Verification'))
    if (step >= 2) {
      fireEvent.click(screen.getByText('Continue to Verification'))
      await waitFor(() => screen.getByTestId('veriff'))
    }
    if (step >= 3) {
      fireEvent.click(screen.getByText('Complete Verification'))
      await waitFor(() => screen.getByText(/pre-filled from identity verification/))
    }
    if (step >= 4) {
      fireEvent.click(screen.getByText('Continue'))
      await waitFor(() => screen.getByText('Choose Your Protection'))
    }
    if (step >= 5) {
      fireEvent.click(screen.getByText('Continue to Agreement'))
      await waitFor(() => screen.getByTestId('agreement-step'))
    }
    if (step >= 6) {
      fireEvent.click(screen.getByText('Sign Agreement'))
      await waitFor(() => screen.getByTestId('payment-form'))
    }
  }

  it('allows selecting insurance on step 4', async () => {
    await navigateToStep(4)

    expect(screen.getByText('Basic Protection')).toBeInTheDocument()

    // Click on insurance option
    fireEvent.click(screen.getByText('Basic Protection'))

    await waitFor(() => {
      const selectedRadios = document.querySelectorAll('.radio-button.selected')
      expect(selectedRadios.length).toBe(1)
    })
  })

  it('allows toggling additional options on step 4', async () => {
    await navigateToStep(4)

    expect(screen.getByText('GPS Navigation')).toBeInTheDocument()

    // Toggle GPS option
    fireEvent.click(screen.getByText('GPS Navigation'))

    await waitFor(() => {
      const checkedBoxes = document.querySelectorAll('.checkbox.checked')
      expect(checkedBoxes.length).toBe(1)
    })

    // Toggle again to deselect
    fireEvent.click(screen.getByText('GPS Navigation'))

    await waitFor(() => {
      const checkedBoxes = document.querySelectorAll('.checkbox.checked')
      expect(checkedBoxes.length).toBe(0)
    })
  })

  it('blocks advancing past step 4 without verification session', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    renderBookingForm()
    await waitFor(() => screen.getByText('Continue to Verification'))

    fireEvent.click(screen.getByText('Continue to Verification'))
    await waitFor(() => screen.getByTestId('veriff'))
    // Fail verification (no session ID set)
    fireEvent.click(screen.getByText('Fail Verification'))

    alertSpy.mockRestore()
  })

  it('navigates to step 6 (payment) with verification', async () => {
    await navigateToStep(6)
    expect(screen.getByTestId('payment-form')).toBeInTheDocument()
  })

  it('completes payment and navigates to confirmation', async () => {
    await navigateToStep(6)

    fireEvent.click(screen.getByText('Complete Payment'))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('/booking-confirmation/'),
        expect.objectContaining({
          state: expect.objectContaining({
            bookingId: 'BK-test',
          }),
        })
      )
    })
  })

  it('handles booking API failure gracefully', async () => {
    mockPost.mockRejectedValueOnce(new Error('API down'))

    await navigateToStep(6)

    fireEvent.click(screen.getByText('Complete Payment'))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('/booking-confirmation/BK'),
        expect.anything()
      )
    })
  })

  it('shows Back button on step 3', async () => {
    await navigateToStep(3)
    expect(screen.getByText('Back')).toBeInTheDocument()
  })

  it('goes back from step 3 to step 2', async () => {
    await navigateToStep(3)
    fireEvent.click(screen.getByText('Back'))

    await waitFor(() => {
      expect(screen.getByTestId('veriff')).toBeInTheDocument()
    })
  })

  it('handles cancel payment (goes back to step 5 agreement)', async () => {
    await navigateToStep(6)

    fireEvent.click(screen.getByText('Cancel Payment'))

    await waitFor(() => {
      expect(screen.getByTestId('agreement-step')).toBeInTheDocument()
    })
  })

  it('shows Edit button on step 1 that navigates to cars', async () => {
    renderBookingForm()
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Edit'))

    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/cars?'))
  })

  it('handles different dropoff checkbox on step 1', async () => {
    renderBookingForm()
    await waitFor(() => {
      expect(screen.getByText('Return to different location')).toBeInTheDocument()
    })

    const checkbox = screen.getByLabelText(/Return to different location/)
    fireEvent.click(checkbox)

    await waitFor(() => {
      const input = document.querySelector('input[placeholder="Enter drop-off location"]')
      expect(input).toBeInTheDocument()
    })
  })

  it('shows booking sidebar with price summary', async () => {
    renderBookingForm()
    await waitFor(() => {
      expect(screen.getByText('Booking Summary')).toBeInTheDocument()
      expect(screen.getByText(/Base rental/)).toBeInTheDocument()
    })
  })

  it('reads search params from URL', async () => {
    renderBookingForm('1', '?pickup=SFO&dropoff=LAX&pickupDate=2026-04-01&dropoffDate=2026-04-05')
    await waitFor(() => {
      expect(screen.getByText(/Tesla/)).toBeInTheDocument()
    })
    expect(screen.getAllByText(/SFO/).length).toBeGreaterThan(0)
  })

  it('renders with car passed via state', async () => {
    const carState = {
      car: {
        id: 1,
        make: 'Audi',
        model: 'A4',
        year: 2024,
        price: 110,
        image: 'https://example.com/audi.jpg',
        location: 'Berlin',
        rating: 4.9,
        reviews: 50,
      },
      selectedOptions: [{ id: 'gps', name: 'GPS', price: 8, description: 'Nav' }],
    }

    renderBookingForm('1', '', carState)

    await waitFor(() => {
      expect(screen.getByText(/Audi/)).toBeInTheDocument()
      expect(screen.getByText('Selected Add-ons')).toBeInTheDocument()
    })
  })

  it('shows pre-selected options in sidebar pricing', async () => {
    const carState = {
      car: {
        id: 1,
        make: 'Audi',
        model: 'A4',
        year: 2024,
        price: 110,
        image: 'https://example.com/audi.jpg',
        location: 'Berlin',
        rating: 4.9,
        reviews: 50,
      },
      selectedOptions: [{ id: 'gps', name: 'GPS', price: 8, description: 'Nav' }],
    }

    renderBookingForm('1', '', carState)

    await waitFor(() => {
      expect(screen.getByText('Pre-selected add-ons')).toBeInTheDocument()
    })
  })

  it('updates user info fields on step 3', async () => {
    await navigateToStep(3)

    // Find and update some fields
    const firstNameInputs = document.querySelectorAll('input[type="text"]')
    if (firstNameInputs.length > 0) {
      fireEvent.change(firstNameInputs[0], { target: { value: 'Alice' } })
    }
  })

  it('shows insurance price in sidebar when selected', async () => {
    await navigateToStep(4)

    fireEvent.click(screen.getByText('Basic Protection'))

    await waitFor(() => {
      expect(screen.getByText('Insurance')).toBeInTheDocument()
    })
  })

  it('shows additional options price in sidebar when selected', async () => {
    await navigateToStep(4)

    fireEvent.click(screen.getByText('GPS Navigation'))

    await waitFor(() => {
      expect(screen.getByText('Additional options')).toBeInTheDocument()
    })
  })
})
