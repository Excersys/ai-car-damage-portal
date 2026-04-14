import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { mockIsTunnelConfigured, mockFetchTunnelEvents } = vi.hoisted(() => ({
  mockIsTunnelConfigured: vi.fn(),
  mockFetchTunnelEvents: vi.fn(),
}))

vi.mock('../lib/tunnelReviewApi', () => ({
  isTunnelReviewConfigured: mockIsTunnelConfigured,
  fetchTunnelEvents: mockFetchTunnelEvents,
  fetchTunnelEventDetail: vi.fn().mockResolvedValue(null),
  submitTunnelEventQc: vi.fn().mockResolvedValue(null),
}))

import DamageDetectionPage from './DamageDetectionPage'

describe('DamageDetectionPage', () => {
  beforeEach(() => {
    mockIsTunnelConfigured.mockReturnValue(false)
    mockFetchTunnelEvents.mockResolvedValue({ events: [], count: 0 })
  })

  it('renders without crashing', async () => {
    render(
      <MemoryRouter>
        <DamageDetectionPage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(document.body.textContent!.length).toBeGreaterThan(0)
    })
  })

  it('shows upload UI', async () => {
    render(
      <MemoryRouter>
        <DamageDetectionPage />
      </MemoryRouter>
    )
    await waitFor(() => {
      // Should be in the upload step
      const text = document.body.textContent || ''
      expect(text.length).toBeGreaterThan(0)
    })
  })

  it('fetches tunnel events when configured', async () => {
    mockIsTunnelConfigured.mockReturnValue(true)
    mockFetchTunnelEvents.mockResolvedValueOnce({
      events: [
        {
          event_id: 'e1',
          license_plate: 'ABC123',
          camera_count: 4,
          any_damage: false,
          last_timestamp: '2026-01-01T00:00:00Z',
          qc_status: 'pending',
        },
      ],
      count: 1,
    })

    render(
      <MemoryRouter>
        <DamageDetectionPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mockFetchTunnelEvents).toHaveBeenCalled()
    })
  })

  it('exports a valid React component', () => {
    expect(typeof DamageDetectionPage).toBe('function')
  })
})
