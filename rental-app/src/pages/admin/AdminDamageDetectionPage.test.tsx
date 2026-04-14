import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { mockIsTunnelConfigured, mockFetchTunnelEvents, mockFetchDetail, mockSubmitQc } = vi.hoisted(() => ({
  mockIsTunnelConfigured: vi.fn(),
  mockFetchTunnelEvents: vi.fn(),
  mockFetchDetail: vi.fn(),
  mockSubmitQc: vi.fn(),
}))

vi.mock('../../lib/tunnelReviewApi', () => ({
  isTunnelReviewConfigured: mockIsTunnelConfigured,
  fetchTunnelEvents: mockFetchTunnelEvents,
  fetchTunnelEventDetail: mockFetchDetail,
  submitTunnelEventQc: mockSubmitQc,
}))

import AdminDamageDetectionPage from './AdminDamageDetectionPage'

describe('AdminDamageDetectionPage', () => {
  beforeEach(() => {
    mockIsTunnelConfigured.mockReturnValue(false)
    mockFetchTunnelEvents.mockResolvedValue({ events: [], count: 0 })
    mockFetchDetail.mockResolvedValue(null)
    mockSubmitQc.mockResolvedValue(null)
  })

  it('renders without crashing when tunnel not configured', async () => {
    render(
      <MemoryRouter>
        <AdminDamageDetectionPage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(document.body.textContent!.length).toBeGreaterThan(0)
    })
  })

  it('renders with tunnel configured and events', async () => {
    mockIsTunnelConfigured.mockReturnValue(true)
    mockFetchTunnelEvents.mockResolvedValueOnce({
      events: [
        {
          event_id: 'e1',
          license_plate: 'ABC123',
          camera_count: 4,
          any_damage: true,
          last_timestamp: '2026-01-01T00:00:00Z',
          qc_status: 'pending',
        },
        {
          event_id: 'e2',
          license_plate: 'DEF456',
          camera_count: 4,
          any_damage: false,
          last_timestamp: '2026-01-02T00:00:00Z',
          qc_status: 'approved',
        },
      ],
      count: 2,
    })

    render(
      <MemoryRouter>
        <AdminDamageDetectionPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mockFetchTunnelEvents).toHaveBeenCalled()
    })
  })

  it('exports a valid React component', () => {
    expect(typeof AdminDamageDetectionPage).toBe('function')
  })
})
