import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomePage from './HomePage'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

describe('HomePage', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )
    expect(screen.getByText('Reserve')).toBeInTheDocument()
  })

  it('shows hero section', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )
    expect(screen.getByText('Premium car rental with AI-powered convenience')).toBeInTheDocument()
    expect(screen.getByText('No lines, no paperwork, no hassle')).toBeInTheDocument()
  })

  it('has a search form', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )
    expect(screen.getByLabelText('Pick-up Location')).toBeInTheDocument()
    expect(screen.getByLabelText('Drop-off Location')).toBeInTheDocument()
    expect(screen.getByLabelText('Pick-up Date')).toBeInTheDocument()
    expect(screen.getByLabelText('Drop-off Date')).toBeInTheDocument()
  })

  it('can fill in search fields', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )
    const pickupInput = screen.getByLabelText('Pick-up Location')
    fireEvent.change(pickupInput, { target: { value: 'San Francisco' } })
    expect((pickupInput as HTMLInputElement).value).toBe('San Francisco')
  })

  it('navigates on form submit', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )
    fireEvent.change(screen.getByLabelText('Pick-up Location'), { target: { value: 'SFO' } })
    fireEvent.change(screen.getByLabelText('Pick-up Date'), { target: { value: '2026-05-01' } })
    fireEvent.change(screen.getByLabelText('Drop-off Date'), { target: { value: '2026-05-05' } })

    const submitBtn = screen.getByText('Find Cars')
    fireEvent.click(submitBtn)

    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/cars?'))
  })

  it('shows trust section', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )
    expect(screen.getByText('Trusted by thousands worldwide')).toBeInTheDocument()
    expect(screen.getByText('50,000+')).toBeInTheDocument()
  })

  it('shows features section', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )
    expect(screen.getByText('The Premium Difference')).toBeInTheDocument()
    expect(screen.getByText('AI-Powered Inspections')).toBeInTheDocument()
    expect(screen.getByText('60-Second Booking')).toBeInTheDocument()
    expect(screen.getByText('Bank-Level Security')).toBeInTheDocument()
    expect(screen.getByText('Concierge Experience')).toBeInTheDocument()
  })

  it('handles dropoff location change', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )
    const dropoff = screen.getByLabelText('Drop-off Location')
    fireEvent.change(dropoff, { target: { value: 'LAX' } })
    expect((dropoff as HTMLInputElement).value).toBe('LAX')
  })

  it('uses pickup location as dropoff when "Same as pickup"', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )
    fireEvent.change(screen.getByLabelText('Pick-up Location'), { target: { value: 'SFO' } })
    fireEvent.change(screen.getByLabelText('Pick-up Date'), { target: { value: '2026-05-01' } })
    fireEvent.change(screen.getByLabelText('Drop-off Date'), { target: { value: '2026-05-05' } })

    // Dropoff location defaults to "Same as pickup"
    fireEvent.click(screen.getByText('Find Cars'))

    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('dropoff=SFO'))
  })
})
