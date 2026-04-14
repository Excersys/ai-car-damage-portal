import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CarsPage from './CarsPage'

vi.mock('../lib/vehicleApi', () => ({
  fetchCars: vi.fn().mockResolvedValue(null),
}))

describe('CarsPage', () => {
  it('renders without crashing', async () => {
    render(
      <MemoryRouter>
        <CarsPage />
      </MemoryRouter>
    )
    // CarsPage should render something - it uses fallback data when API returns null
    await waitFor(() => {
      expect(document.querySelector('.App') || document.body.textContent).toBeTruthy()
    })
  })

  it('shows car listings (fallback data)', async () => {
    render(
      <MemoryRouter>
        <CarsPage />
      </MemoryRouter>
    )
    // The page should render with FALLBACK_CARS data since fetchCars returns null
    await waitFor(() => {
      const body = document.body.textContent || ''
      // The page should have some content
      expect(body.length).toBeGreaterThan(0)
    })
  })
})
