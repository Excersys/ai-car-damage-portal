/**
 * Tunnel Review API (API Gateway) — lists and loads tunnel scan events from DynamoDB via Lambda.
 * Set VITE_TUNNEL_REVIEW_API_BASE_URL and VITE_TUNNEL_REVIEW_API_KEY after deploying camera-system ApiStack.
 *
 * Types here mirror the contract defined in camera-system/lambdas/review_api/contracts.py.
 */

// ── List endpoint ──────────────────────────────────────────────────

export interface TunnelEventSummary {
  event_id: string
  last_timestamp: string
  license_plate: string
  any_damage: boolean
  camera_count: number
  preview_image_url: string
  /** pending | approved | rejected — from optional ``__qc__`` DynamoDB row */
  qc_status: string
}

export interface TunnelEventsListResponse {
  events: TunnelEventSummary[]
  count: number
}

// ── Detail endpoint ────────────────────────────────────────────────

export interface TunnelCameraResult {
  camera_id: string
  camera_frame: string
  frame: string
  image_url: string
  damage_detected: boolean
  damage_type: string
  confidence_score: number
  bounding_boxes: Array<Record<string, number>>
  timestamp: string
}

export interface TunnelEventQc {
  status: string
  notes: string
  reviewer_id: string
  updated_at: string
}

export interface TunnelEventDetailResponse {
  event_id: string
  cameras: TunnelCameraResult[]
  total_cameras: number
  any_damage: boolean
  qc: TunnelEventQc | null
}

export interface TunnelQcPostBody {
  status: 'approved' | 'rejected' | 'pending'
  notes?: string
  reviewer_id?: string
}

// ── Helpers ────────────────────────────────────────────────────────

function getBaseUrl(): string | undefined {
  const u = import.meta.env.VITE_TUNNEL_REVIEW_API_BASE_URL as string | undefined
  return u?.replace(/\/$/, '')
}

function getApiKey(): string | undefined {
  return import.meta.env.VITE_TUNNEL_REVIEW_API_KEY as string | undefined
}

export function isTunnelReviewConfigured(): boolean {
  return Boolean(getBaseUrl() && getApiKey())
}

async function tunnelFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getBaseUrl()
  const key = getApiKey()
  if (!base || !key) {
    throw new Error(
      'Tunnel Review API is not configured (set VITE_TUNNEL_REVIEW_API_BASE_URL and VITE_TUNNEL_REVIEW_API_KEY).',
    )
  }
  const method = init?.method ?? 'GET'
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': key,
      ...init?.headers,
    },
    body: init?.body,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Tunnel Review API ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

// ── Public API ─────────────────────────────────────────────────────

export async function fetchTunnelEvents(): Promise<TunnelEventsListResponse> {
  return tunnelFetch<TunnelEventsListResponse>('/tunnel/events')
}

export async function fetchTunnelEventDetail(eventId: string): Promise<TunnelEventDetailResponse> {
  return tunnelFetch<TunnelEventDetailResponse>(`/tunnel/events/${encodeURIComponent(eventId)}`)
}

/** POST QC decision for a tunnel event (persists ``__qc__`` row in DynamoDB). */
export async function submitTunnelEventQc(
  eventId: string,
  body: TunnelQcPostBody,
): Promise<{ event_id: string; qc: TunnelEventQc }> {
  return tunnelFetch<{ event_id: string; qc: TunnelEventQc }>(
    `/tunnel/events/${encodeURIComponent(eventId)}/qc`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )
}
