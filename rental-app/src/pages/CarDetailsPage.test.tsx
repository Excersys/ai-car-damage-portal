import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../lib/vehicleApi', () => ({
  fetchCarById: vi.fn().mockResolvedValue(null),
}))

// Mock image imports
vi.mock('../images/SFAR.rendition.vlarge.png', () => ({ default: 'tesla.png' }))
vi.mock('../images/IFAR.rendition.vlarge.png', () => ({ default: 'bmw.png' }))
vi.mock('../images/CCAR.rendition.vlarge.png', () => ({ default: 'toyota.png' }))
vi.mock('../images/FRAR.rendition.vlarge.png', () => ({ default: 'ford.png' }))
vi.mock('../images/IJAR.rendition.vlarge.png', () => ({ default: 'jeep.png' }))

import CarDetailsPage from './CarDetailsPage'

describe('CarDetailsPage', () => {
  it('renders car details for car 1', async () => {
    render(
      <MemoryRouter initialEntries={['/cars/1']}>
        <Routes>
          <Route path="/cars/:carId" element={<CarDetailsPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Tesla Model 3')).toBeInTheDocument()
    })
  })

  it('shows car specs', async () => {
    render(
      <MemoryRouter initialEntries={['/cars/1']}>
        <Routes>
          <Route path="/cars/:carId" element={<CarDetailsPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Electric Motor')).toBeInTheDocument()
      expect(screen.getByText('Single Speed')).toBeInTheDocument()
    })
  })

  it('shows rental options', async () => {
    render(
      <MemoryRouter initialEntries={['/cars/1']}>
        <Routes>
          <Route path="/cars/:carId" element={<CarDetailsPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Add-on Options')).toBeInTheDocument()
      expect(screen.getByText('GPS Navigation')).toBeInTheDocument()
      expect(screen.getByText('Full Coverage Insurance')).toBeInTheDocument()
    })
  })

  it('can toggle rental options', async () => {
    render(
      <MemoryRouter initialEntries={['/cars/1']}>
        <Routes>
          <Route path="/cars/:carId" element={<CarDetailsPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('GPS Navigation')).toBeInTheDocument()
    })

    // Find and click a checkbox
    const checkboxes = document.querySelectorAll('.option-checkbox')
    fireEvent.click(checkboxes[0]) // Toggle GPS

    // Should show options total
    expect(screen.getByText(/Add-ons Total/)).toBeInTheDocument()
  })

  it('has a Book Now button', async () => {
    render(
      <MemoryRouter initialEntries={['/cars/1']}>
        <Routes>
          <Route path="/cars/:carId" element={<CarDetailsPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Book Now')).toBeInTheDocument()
    })
  })

  it('shows car not found for invalid car id', async () => {
    render(
      <MemoryRouter initialEntries={['/cars/999']}>
        <Routes>
          <Route path="/cars/:carId" element={<CarDetailsPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Car not found')).toBeInTheDocument()
    })
  })

  it('renders car with different fallback data (car 2)', async () => {
    render(
      <MemoryRouter initialEntries={['/cars/2']}>
        <Routes>
          <Route path="/cars/:carId" element={<CarDetailsPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('BMW X5')).toBeInTheDocument()
    })
  })
})
