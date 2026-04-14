import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import VehicleSearchPage from './VehicleSearchPage'

// Mock axios which VehicleSearch uses directly
vi.mock('axios', () => ({
  default: {
    get: vi.fn().mockRejectedValue(new Error('not configured')),
    post: vi.fn(),
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    })),
  },
}))

describe('VehicleSearchPage', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <VehicleSearchPage />
      </MemoryRouter>
    )
    expect(screen.getByText('Find Your Perfect Rental')).toBeInTheDocument()
  })

  it('renders the VehicleSearch component', () => {
    render(
      <MemoryRouter>
        <VehicleSearchPage />
      </MemoryRouter>
    )
    expect(screen.getByText(/Choose from our premium fleet/)).toBeInTheDocument()
  })
})
