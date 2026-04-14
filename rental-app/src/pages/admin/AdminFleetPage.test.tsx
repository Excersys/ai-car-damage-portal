import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { mockFetchAdminVehicles } = vi.hoisted(() => ({
  mockFetchAdminVehicles: vi.fn(),
}))

vi.mock('../../lib/adminApi', () => ({
  fetchAdminVehicles: mockFetchAdminVehicles,
}))

import AdminFleetPage from './AdminFleetPage'

describe('AdminFleetPage', () => {
  beforeEach(() => {
    mockFetchAdminVehicles.mockReset()
    mockFetchAdminVehicles.mockResolvedValue(null)
  })

  it('renders without crashing', async () => {
    render(
      <MemoryRouter>
        <AdminFleetPage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByText(/Fleet Management/)).toBeInTheDocument()
    })
  })

  it('has fleet overview tab', async () => {
    render(
      <MemoryRouter>
        <AdminFleetPage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByText(/Fleet Report/)).toBeInTheDocument()
    })
  })

  it('calls fetchAdminVehicles on mount', async () => {
    render(
      <MemoryRouter>
        <AdminFleetPage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(mockFetchAdminVehicles).toHaveBeenCalled()
    })
  })

  it('exports a valid React component', () => {
    expect(typeof AdminFleetPage).toBe('function')
  })
})
