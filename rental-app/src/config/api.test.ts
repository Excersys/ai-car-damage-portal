import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('api config', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('with env vars set', () => {
    beforeEach(() => {
      vi.resetModules()
      vi.stubEnv('VITE_API_BASE_URL', 'http://test-api.example.com')
      vi.stubEnv('VITE_USER_POOL_ID', 'us-east-1_TestPool')
      vi.stubEnv('VITE_USER_POOL_CLIENT_ID', 'testclientid123')
      vi.stubEnv('VITE_AWS_REGION', 'us-west-2')
      vi.stubEnv('VITE_APP_ENV', 'staging')
    })

    it('API_CONFIG uses VITE_API_BASE_URL from env', async () => {
      const { API_CONFIG } = await import('./api')
      expect(API_CONFIG.BASE_URL).toBe('http://test-api.example.com')
    })

    it('API_CONFIG has a timeout of 10000ms', async () => {
      const { API_CONFIG } = await import('./api')
      expect(API_CONFIG.TIMEOUT).toBe(10000)
    })

    it('API_CONFIG has Content-Type header', async () => {
      const { API_CONFIG } = await import('./api')
      expect(API_CONFIG.HEADERS['Content-Type']).toBe('application/json')
    })

    it('COGNITO_CONFIG reads user pool id from env', async () => {
      const { COGNITO_CONFIG } = await import('./api')
      expect(COGNITO_CONFIG.USER_POOL_ID).toBe('us-east-1_TestPool')
    })

    it('COGNITO_CONFIG reads user pool client id from env', async () => {
      const { COGNITO_CONFIG } = await import('./api')
      expect(COGNITO_CONFIG.USER_POOL_CLIENT_ID).toBe('testclientid123')
    })

    it('COGNITO_CONFIG reads region from env', async () => {
      const { COGNITO_CONFIG } = await import('./api')
      expect(COGNITO_CONFIG.REGION).toBe('us-west-2')
    })

    it('ENV reads app env from env variable', async () => {
      const { ENV } = await import('./api')
      expect(ENV).toBe('staging')
    })

    it('createApiUrl creates full URL from endpoint', async () => {
      const { createApiUrl } = await import('./api')
      expect(createApiUrl('/cars')).toBe('http://test-api.example.com/cars')
    })

    it('createApiUrl handles endpoint without leading slash', async () => {
      const { createApiUrl } = await import('./api')
      expect(createApiUrl('cars')).toBe('http://test-api.example.com/cars')
    })

    it('apiClient is configured with correct baseURL', async () => {
      const { apiClient } = await import('./api')
      expect(apiClient.defaults.baseURL).toBe('http://test-api.example.com')
    })

    it('apiClient has the correct timeout', async () => {
      const { apiClient } = await import('./api')
      expect(apiClient.defaults.timeout).toBe(10000)
    })

    it('apiClient has Content-Type header', async () => {
      const { apiClient } = await import('./api')
      expect(apiClient.defaults.headers['Content-Type']).toBe('application/json')
    })
  })

  describe('with default env (no vars)', () => {
    beforeEach(() => {
      vi.resetModules()
      vi.stubEnv('VITE_API_BASE_URL', '')
      vi.stubEnv('VITE_USER_POOL_ID', '')
      vi.stubEnv('VITE_USER_POOL_CLIENT_ID', '')
      vi.stubEnv('VITE_AWS_REGION', '')
      vi.stubEnv('VITE_APP_ENV', '')
    })

    it('API_CONFIG falls back to localhost', async () => {
      const { API_CONFIG } = await import('./api')
      expect(API_CONFIG.BASE_URL).toBe('http://localhost:3001')
    })

    it('COGNITO_CONFIG region falls back to us-east-1', async () => {
      const { COGNITO_CONFIG } = await import('./api')
      expect(COGNITO_CONFIG.REGION).toBe('us-east-1')
    })

    it('ENV falls back to development', async () => {
      const { ENV } = await import('./api')
      expect(ENV).toBe('development')
    })
  })

  describe('request interceptor', () => {
    it('adds Authorization header when authToken exists', async () => {
      vi.resetModules()
      const { apiClient } = await import('./api')
      localStorage.setItem('authToken', 'test-jwt-token')

      const config = {
        headers: {} as Record<string, string>,
      }

      const interceptors = (apiClient.interceptors.request as any).handlers
      const handler = interceptors[0]
      const result = await handler.fulfilled(config)

      expect(result.headers.Authorization).toBe('Bearer test-jwt-token')
    })

    it('does not add Authorization header when no token', async () => {
      vi.resetModules()
      const { apiClient } = await import('./api')

      const config = {
        headers: {} as Record<string, string>,
      }

      const interceptors = (apiClient.interceptors.request as any).handlers
      const handler = interceptors[0]
      const result = await handler.fulfilled(config)

      expect(result.headers.Authorization).toBeUndefined()
    })

    it('rejects on request error', async () => {
      vi.resetModules()
      const { apiClient } = await import('./api')

      const interceptors = (apiClient.interceptors.request as any).handlers
      const handler = interceptors[0]
      const error = new Error('request failed')

      await expect(handler.rejected(error)).rejects.toThrow('request failed')
    })
  })

  describe('response interceptor', () => {
    it('removes authToken on 401 response', async () => {
      vi.resetModules()
      const { apiClient } = await import('./api')
      localStorage.setItem('authToken', 'some-token')

      const interceptors = (apiClient.interceptors.response as any).handlers
      const handler = interceptors[0]

      const error = { response: { status: 401 } }

      await expect(handler.rejected(error)).rejects.toBe(error)
      expect(localStorage.getItem('authToken')).toBeNull()
    })

    it('does not remove authToken on non-401 errors', async () => {
      vi.resetModules()
      const { apiClient } = await import('./api')
      localStorage.setItem('authToken', 'some-token')

      const interceptors = (apiClient.interceptors.response as any).handlers
      const handler = interceptors[0]

      const error = { response: { status: 500 } }

      await expect(handler.rejected(error)).rejects.toBe(error)
      expect(localStorage.getItem('authToken')).toBe('some-token')
    })

    it('passes through successful responses', async () => {
      vi.resetModules()
      const { apiClient } = await import('./api')

      const interceptors = (apiClient.interceptors.response as any).handlers
      const handler = interceptors[0]

      const response = { status: 200, data: { ok: true } }
      const result = handler.fulfilled(response)
      expect(result).toBe(response)
    })
  })
})
