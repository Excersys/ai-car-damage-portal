import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../lib/adminApi', () => ({
  fetchAdminFinancialAnalytics: vi.fn().mockResolvedValue(null),
}))

import AdminReportsPage from './AdminReportsPage'

describe('AdminReportsPage', () => {
  it('renders without crashing', async () => {
    render(
      <MemoryRouter>
        <AdminReportsPage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(document.body.textContent!.length).toBeGreaterThan(0)
    })
  })

  it('shows demo metrics as fallback', async () => {
    render(
      <MemoryRouter>
        <AdminReportsPage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByText('$45,280')).toBeInTheDocument()
    })
  })

  it('exports a valid React component', () => {
    expect(typeof AdminReportsPage).toBe('function')
  })
})
