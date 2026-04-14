import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('piHealthApi', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  describe('when not configured', () => {
    it('isPiHealthConfigured returns false', async () => {
      vi.stubEnv('VITE_PI_HEALTH_URL', '')
      const mod = await import('./piHealthApi')
      expect(mod.isPiHealthConfigured()).toBe(false)
    })

    it('fetchPiHealth throws when not configured', async () => {
      vi.stubEnv('VITE_PI_HEALTH_URL', '')
      const mod = await import('./piHealthApi')
      await expect(mod.fetchPiHealth()).rejects.toThrow('Pi health URL not configured')
    })

    it('fetchPiQueueStatus throws when not configured', async () => {
      vi.stubEnv('VITE_PI_HEALTH_URL', '')
      const mod = await import('./piHealthApi')
      await expect(mod.fetchPiQueueStatus()).rejects.toThrow('Pi health URL not configured')
    })
  })

  describe('when configured', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_PI_HEALTH_URL', 'http://192.168.1.50:8080')
    })

    it('isPiHealthConfigured returns true', async () => {
      const mod = await import('./piHealthApi')
      expect(mod.isPiHealthConfigured()).toBe(true)
    })

    it('fetchPiHealth calls /health endpoint', async () => {
      const healthData = {
        status: 'ok',
        cameras_discovered: 4,
        s3_connectivity: true,
        queue_pending: 2,
        queue_max_pending: 100,
        queue_at_capacity: false,
      }

      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(healthData),
      }))

      const mod = await import('./piHealthApi')
      const result = await mod.fetchPiHealth()
      expect(result).toEqual(healthData)
      expect(fetch).toHaveBeenCalledWith('http://192.168.1.50:8080/health', { method: 'GET' })
    })

    it('fetchPiQueueStatus calls /queue/status endpoint', async () => {
      const queueData = {
        pending: 5,
        uploading: 1,
        uploaded: 100,
        failed: 0,
        total: 106,
        max_pending: 200,
        at_capacity: false,
      }

      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(queueData),
      }))

      const mod = await import('./piHealthApi')
      const result = await mod.fetchPiQueueStatus()
      expect(result).toEqual(queueData)
      expect(fetch).toHaveBeenCalledWith('http://192.168.1.50:8080/queue/status', { method: 'GET' })
    })

    it('throws on non-ok response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      }))

      const mod = await import('./piHealthApi')
      await expect(mod.fetchPiHealth()).rejects.toThrow('Pi 500')
    })

    it('trims trailing slash from base URL', async () => {
      vi.stubEnv('VITE_PI_HEALTH_URL', 'http://192.168.1.50:8080/')

      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      }))

      const mod = await import('./piHealthApi')
      await mod.fetchPiHealth()
      expect(fetch).toHaveBeenCalledWith('http://192.168.1.50:8080/health', { method: 'GET' })
    })
  })
})
