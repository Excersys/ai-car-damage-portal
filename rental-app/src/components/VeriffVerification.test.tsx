import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { mockPost, mockGetApi } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockGetApi: vi.fn(),
}))

vi.mock('@veriff/incontext-sdk', () => ({
  createVeriffFrame: vi.fn(),
  MESSAGES: { FINISHED: 'FINISHED', CANCELED: 'CANCELED' },
}))

vi.mock('../config/api', () => ({
  apiClient: {
    post: mockPost,
    get: mockGetApi,
  },
}))

import VeriffVerification from './VeriffVerification'

const defaultProps = {
  onVerificationComplete: vi.fn(),
  onCancel: vi.fn(),
  userEmail: 'test@test.com',
  carId: 'car-1',
  bookingData: { reservationId: 'res-1' },
}

describe('VeriffVerification', () => {
  beforeEach(() => {
    mockPost.mockReset()
    mockGetApi.mockReset()
    defaultProps.onVerificationComplete.mockReset()
    defaultProps.onCancel.mockReset()
  })

  it('exports a default component', () => {
    expect(VeriffVerification).toBeDefined()
    expect(typeof VeriffVerification).toBe('function')
  })

  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <VeriffVerification {...defaultProps} />
      </MemoryRouter>
    )
    expect(screen.getByText(/Enhanced Identity & Credit Verification/)).toBeInTheDocument()
  })

  it('shows personal info form initially (collect_info state)', () => {
    render(
      <MemoryRouter>
        <VeriffVerification {...defaultProps} />
      </MemoryRouter>
    )
    expect(screen.getByText(/Personal Information Required/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('John')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Doe')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('123 Main Street')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('New York')).toBeInTheDocument()
  })

  it('has a cancel button', () => {
    render(
      <MemoryRouter>
        <VeriffVerification {...defaultProps} />
      </MemoryRouter>
    )
    expect(screen.getByText('Cancel Booking')).toBeInTheDocument()
  })

  it('calls onCancel when cancel button clicked', () => {
    render(
      <MemoryRouter>
        <VeriffVerification {...defaultProps} />
      </MemoryRouter>
    )
    fireEvent.click(screen.getByText('Cancel Booking'))
    expect(defaultProps.onCancel).toHaveBeenCalled()
  })

  it('shows security notice', () => {
    render(
      <MemoryRouter>
        <VeriffVerification {...defaultProps} />
      </MemoryRouter>
    )
    expect(screen.getByText(/Your information is secure/)).toBeInTheDocument()
  })

  it('shows verification footer', () => {
    render(
      <MemoryRouter>
        <VeriffVerification {...defaultProps} />
      </MemoryRouter>
    )
    expect(screen.getByText(/Veriff/)).toBeInTheDocument()
    expect(screen.getByText(/Experian/)).toBeInTheDocument()
  })

  it('has the start verification button', () => {
    render(
      <MemoryRouter>
        <VeriffVerification {...defaultProps} />
      </MemoryRouter>
    )
    expect(screen.getByText('Start Verification Process')).toBeInTheDocument()
  })

  it('updates personal info fields', () => {
    render(
      <MemoryRouter>
        <VeriffVerification {...defaultProps} />
      </MemoryRouter>
    )
    const firstNameInput = screen.getByPlaceholderText('John')
    fireEvent.change(firstNameInput, { target: { value: 'Test' } })
    expect((firstNameInput as HTMLInputElement).value).toBe('Test')
  })

  it('creates verification session when form is complete', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        sessionId: 'session-123',
        url: 'https://veriff.com/session/123',
      },
    })

    render(
      <MemoryRouter>
        <VeriffVerification {...defaultProps} />
      </MemoryRouter>
    )

    // Fill in all required fields
    fireEvent.change(screen.getByPlaceholderText('John'), { target: { value: 'John' } })
    fireEvent.change(screen.getByPlaceholderText('Doe'), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByPlaceholderText('123 Main Street'), { target: { value: '123 Main St' } })
    fireEvent.change(screen.getByPlaceholderText('New York'), { target: { value: 'NYC' } })
    fireEvent.change(screen.getByPlaceholderText('NY'), { target: { value: 'NY' } })
    fireEvent.change(screen.getByPlaceholderText('10001'), { target: { value: '10001' } })
    fireEvent.change(screen.getByPlaceholderText('XXX-XX-XXXX'), { target: { value: '123-45-6789' } })

    // Set date of birth
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '1990-01-01' } })

    fireEvent.click(screen.getByText('Start Verification Process'))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/verification/create-session',
        expect.objectContaining({
          userEmail: 'test@test.com',
          carId: 'car-1',
        })
      )
    })
  })

  it('shows identity verification step after session creation', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        sessionId: 'session-123',
        url: 'https://veriff.com/session/123',
      },
    })

    render(
      <MemoryRouter>
        <VeriffVerification {...defaultProps} />
      </MemoryRouter>
    )

    // Fill in all required fields
    fireEvent.change(screen.getByPlaceholderText('John'), { target: { value: 'John' } })
    fireEvent.change(screen.getByPlaceholderText('Doe'), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByPlaceholderText('123 Main Street'), { target: { value: '123 Main St' } })
    fireEvent.change(screen.getByPlaceholderText('New York'), { target: { value: 'NYC' } })
    fireEvent.change(screen.getByPlaceholderText('NY'), { target: { value: 'NY' } })
    fireEvent.change(screen.getByPlaceholderText('10001'), { target: { value: '10001' } })
    fireEvent.change(screen.getByPlaceholderText('XXX-XX-XXXX'), { target: { value: '123-45-6789' } })
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '1990-01-01' } })

    fireEvent.click(screen.getByText('Start Verification Process'))

    await waitFor(() => {
      expect(screen.getByText('Ready for Identity Verification')).toBeInTheDocument()
      expect(screen.getByText('Start Identity Verification')).toBeInTheDocument()
    })
  })

  it('shows session ID after creation', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        sessionId: 'session-xyz',
        url: 'https://veriff.com/session/xyz',
      },
    })

    render(
      <MemoryRouter>
        <VeriffVerification {...defaultProps} />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByPlaceholderText('John'), { target: { value: 'John' } })
    fireEvent.change(screen.getByPlaceholderText('Doe'), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByPlaceholderText('123 Main Street'), { target: { value: '123 Main St' } })
    fireEvent.change(screen.getByPlaceholderText('New York'), { target: { value: 'NYC' } })
    fireEvent.change(screen.getByPlaceholderText('NY'), { target: { value: 'NY' } })
    fireEvent.change(screen.getByPlaceholderText('10001'), { target: { value: '10001' } })
    fireEvent.change(screen.getByPlaceholderText('XXX-XX-XXXX'), { target: { value: '123-45-6789' } })
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '1990-01-01' } })

    fireEvent.click(screen.getByText('Start Verification Process'))

    await waitFor(() => {
      expect(screen.getByText(/session-xyz/)).toBeInTheDocument()
    })
  })

  it('shows error when session creation fails', async () => {
    mockPost.mockRejectedValueOnce({
      response: { data: { error: 'Session creation failed' } },
    })

    render(
      <MemoryRouter>
        <VeriffVerification {...defaultProps} />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByPlaceholderText('John'), { target: { value: 'John' } })
    fireEvent.change(screen.getByPlaceholderText('Doe'), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByPlaceholderText('123 Main Street'), { target: { value: '123 Main St' } })
    fireEvent.change(screen.getByPlaceholderText('New York'), { target: { value: 'NYC' } })
    fireEvent.change(screen.getByPlaceholderText('NY'), { target: { value: 'NY' } })
    fireEvent.change(screen.getByPlaceholderText('10001'), { target: { value: '10001' } })
    fireEvent.change(screen.getByPlaceholderText('XXX-XX-XXXX'), { target: { value: '123-45-6789' } })
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '1990-01-01' } })

    fireEvent.click(screen.getByText('Start Verification Process'))

    await waitFor(() => {
      expect(document.body.textContent).toContain('Session creation failed')
    })
  })
})
