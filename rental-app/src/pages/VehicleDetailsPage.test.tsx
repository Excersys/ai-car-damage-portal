import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import VehicleDetailsPage from './VehicleDetailsPage'

// Mock axios which VehicleDetails uses directly
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

describe('VehicleDetailsPage', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter initialEntries={['/vehicles/1']}>
        <Routes>
          <Route path="/vehicles/:vehicleId" element={<VehicleDetailsPage />} />
        </Routes>
      </MemoryRouter>
    )
    // Page will be in a loading state or show the vehicle details component
    expect(document.body.textContent).toBeTruthy()
  })

  it('exports a valid React component', () => {
    expect(typeof VehicleDetailsPage).toBe('function')
  })
})
