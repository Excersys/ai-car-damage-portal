import { describe, it, expect, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../lib/piHealthApi', () => ({
  isPiHealthConfigured: vi.fn().mockReturnValue(false),
  fetchPiHealth: vi.fn().mockResolvedValue(null),
  fetchPiQueueStatus: vi.fn().mockResolvedValue(null),
}))

import AdminInspectionStationPage from './AdminInspectionStationPage'

describe('AdminInspectionStationPage', () => {
  it('renders without crashing', async () => {
    render(
      <MemoryRouter>
        <AdminInspectionStationPage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(document.body.textContent!.length).toBeGreaterThan(0)
    })
  })

  it('exports a valid React component', () => {
    expect(typeof AdminInspectionStationPage).toBe('function')
  })
})
