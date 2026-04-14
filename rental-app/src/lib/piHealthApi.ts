/**
 * Client for the Raspberry Pi trigger_server health and queue endpoints.
 * Set VITE_PI_HEALTH_URL to the Pi address (e.g. http://192.168.1.50:8080).
 */

export interface PiHealthResponse {
  status: string
  cameras_discovered: number
  s3_connectivity: boolean
  queue_pending: number
  queue_max_pending: number
  queue_at_capacity: boolean
}

export interface PiQueueStatus {
  pending: number
  uploading: number
  uploaded: number
  failed: number
  total: number
  max_pending: number
  at_capacity: boolean
}

function getBaseUrl(): string | undefined {
  const u = import.meta.env.VITE_PI_HEALTH_URL as string | undefined
  return u?.replace(/\/$/, '')
}

export function isPiHealthConfigured(): boolean {
  return Boolean(getBaseUrl())
}

async function piFetch<T>(path: string): Promise<T> {
  const base = getBaseUrl()
  if (!base) {
    throw new Error('Pi health URL not configured (set VITE_PI_HEALTH_URL).')
  }
  const res = await fetch(`${base}${path}`, { method: 'GET' })
  if (!res.ok) {
    throw new Error(`Pi ${res.status}: ${(await res.text()).slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

export async function fetchPiHealth(): Promise<PiHealthResponse> {
  return piFetch<PiHealthResponse>('/health')
}

export async function fetchPiQueueStatus(): Promise<PiQueueStatus> {
  return piFetch<PiQueueStatus>('/queue/status')
}
