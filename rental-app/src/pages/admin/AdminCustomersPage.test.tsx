import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../lib/adminApi', () => ({
  fetchAdminUsers: vi.fn().mockResolvedValue(null),
}))

import AdminCustomersPage from './AdminCustomersPage'

describe('AdminCustomersPage', () => {
  it('renders without crashing', async () => {
    render(
      <MemoryRouter>
        <AdminCustomersPage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(document.body.textContent!.length).toBeGreaterThan(0)
    })
  })

  it('shows mock customers as fallback', async () => {
    render(
      <MemoryRouter>
        <AdminCustomersPage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })

  it('exports a valid React component', () => {
    expect(typeof AdminCustomersPage).toBe('function')
  })
})
