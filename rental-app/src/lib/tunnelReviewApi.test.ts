import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('tunnelReviewApi', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  describe('when not configured', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_TUNNEL_REVIEW_API_BASE_URL', '')
      vi.stubEnv('VITE_TUNNEL_REVIEW_API_KEY', '')
    })

    it('isTunnelReviewConfigured returns false', async () => {
      const mod = await import('./tunnelReviewApi')
      expect(mod.isTunnelReviewConfigured()).toBe(false)
    })

    it('fetchTunnelEvents returns empty result', async () => {
      const mod = await import('./tunnelReviewApi')
      const result = await mod.fetchTunnelEvents()
      expect(result).toEqual({ events: [], count: 0 })
    })

    it('fetchTunnelEventDetail throws', async () => {
      const mod = await import('./tunnelReviewApi')
      await expect(mod.fetchTunnelEventDetail('evt-1')).rejects.toThrow('not configured')
    })

    it('submitTunnelEventQc throws', async () => {
      const mod = await import('./tunnelReviewApi')
      await expect(
        mod.submitTunnelEventQc('evt-1', { status: 'approved' })
      ).rejects.toThrow('not configured')
    })
  })

  describe('when configured', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_TUNNEL_REVIEW_API_BASE_URL', 'http://tunnel-api.example.com')
      vi.stubEnv('VITE_TUNNEL_REVIEW_API_KEY', 'test-api-key')
    })

    it('isTunnelReviewConfigured returns true', async () => {
      const mod = await import('./tunnelReviewApi')
      expect(mod.isTunnelReviewConfigured()).toBe(true)
    })

    it('fetchTunnelEvents calls the correct endpoint', async () => {
      const eventsData = { events: [{ event_id: 'e1', license_plate: 'ABC123', camera_count: 4, any_damage: false, last_timestamp: '2026-01-01', qc_status: 'pending' }], count: 1 }

      const axios = await import('axios')
      vi.spyOn(axios.default, 'get').mockResolvedValueOnce({ data: eventsData })

      const mod = await import('./tunnelReviewApi')
      const result = await mod.fetchTunnelEvents()
      expect(result).toEqual(eventsData)
      expect(axios.default.get).toHaveBeenCalledWith(
        'http://tunnel-api.example.com/tunnel/events',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'test-api-key',
          }),
        })
      )
    })

    it('fetchTunnelEventDetail calls the correct endpoint', async () => {
      const detail = { event_id: 'e1', cameras: [], total_cameras: 0, any_damage: false, qc: null }

      const axios = await import('axios')
      vi.spyOn(axios.default, 'get').mockResolvedValueOnce({ data: detail })

      const mod = await import('./tunnelReviewApi')
      const result = await mod.fetchTunnelEventDetail('e1')
      expect(result).toEqual(detail)
      expect(axios.default.get).toHaveBeenCalledWith(
        'http://tunnel-api.example.com/tunnel/events/e1',
        expect.any(Object)
      )
    })

    it('submitTunnelEventQc posts to the correct endpoint', async () => {
      const qcResult = { event_id: 'e1', qc: { status: 'approved', notes: '', reviewer_id: 'r1', updated_at: '2026-01-01' } }

      const axios = await import('axios')
      vi.spyOn(axios.default, 'post').mockResolvedValueOnce({ data: qcResult })

      const mod = await import('./tunnelReviewApi')
      const result = await mod.submitTunnelEventQc('e1', { status: 'approved', notes: 'Looks good' })
      expect(result).toEqual(qcResult)
      expect(axios.default.post).toHaveBeenCalledWith(
        'http://tunnel-api.example.com/tunnel/events/e1/qc',
        { status: 'approved', notes: 'Looks good' },
        expect.any(Object)
      )
    })

    it('encodes special characters in event ID', async () => {
      const axios = await import('axios')
      vi.spyOn(axios.default, 'get').mockResolvedValueOnce({ data: { event_id: 'a/b', cameras: [], total_cameras: 0, any_damage: false, qc: null } })

      const mod = await import('./tunnelReviewApi')
      await mod.fetchTunnelEventDetail('a/b')
      expect(axios.default.get).toHaveBeenCalledWith(
        expect.stringContaining('a%2Fb'),
        expect.any(Object)
      )
    })
  })

  describe('when configured without api key', () => {
    it('omits x-api-key header when no key set', async () => {
      vi.stubEnv('VITE_TUNNEL_REVIEW_API_BASE_URL', 'http://tunnel-api.example.com')
      vi.stubEnv('VITE_TUNNEL_REVIEW_API_KEY', '')

      const axios = await import('axios')
      vi.spyOn(axios.default, 'get').mockResolvedValueOnce({ data: { events: [], count: 0 } })

      const mod = await import('./tunnelReviewApi')
      await mod.fetchTunnelEvents()

      const callHeaders = (axios.default.get as any).mock.calls[0][1]?.headers as Record<string, string>
      expect(callHeaders['x-api-key']).toBeUndefined()
    })
  })
})
