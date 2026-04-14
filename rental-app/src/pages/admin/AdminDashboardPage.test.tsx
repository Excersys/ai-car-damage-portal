import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../lib/adminApi', () => ({
  fetchAdminDashboard: vi.fn().mockResolvedValue(null),
}))

vi.mock('../../lib/tunnelReviewApi', () => ({
  isTunnelReviewConfigured: vi.fn().mockReturnValue(false),
  fetchTunnelEvents: vi.fn().mockResolvedValue({ events: [], count: 0 }),
}))

import AdminDashboardPage from './AdminDashboardPage'

describe('AdminDashboardPage', () => {
  it('renders without crashing', async () => {
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(document.body.textContent!.length).toBeGreaterThan(0)
    })
  })

  it('exports a valid React component', () => {
    expect(typeof AdminDashboardPage).toBe('function')
  })
})
