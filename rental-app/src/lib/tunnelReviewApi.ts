/**
 * Tunnel Review API client for the rental-app.
 * Talks to the camera-system ApiStack (API Gateway -> ReviewAPI Lambda -> DynamoDB).
 * Gracefully returns empty data when VITE_TUNNEL_REVIEW_API_BASE_URL is not set.
 */

import axios from 'axios'

function baseUrl(): string {
  return (import.meta.env.VITE_TUNNEL_REVIEW_API_BASE_URL ?? '').replace(/\/$/, '')
}

function apiKey(): string {
  return import.meta.env.VITE_TUNNEL_REVIEW_API_KEY ?? ''
}

export function isTunnelReviewConfigured(): boolean {
  return Boolean(baseUrl())
}

// ── Types ─────────────────────────────────────────────────────────────

export interface TunnelEventSummary {
  event_id: string
  license_plate: string
  camera_count: number
  any_damage: boolean
  last_timestamp: string
  preview_image_url?: string
  qc_status: string
}

export interface TunnelEventsListResponse {
  events: TunnelEventSummary[]
  count: number
}

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

// ── API functions ─────────────────────────────────────────────────────

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  const key = apiKey()
  if (key) h['x-api-key'] = key
  return h
}

export async function fetchTunnelEvents(): Promise<TunnelEventsListResponse> {
  const url = baseUrl()
  if (!url) return { events: [], count: 0 }
  const res = await axios.get<TunnelEventsListResponse>(`${url}/tunnel/events`, { headers: headers() })
  return res.data
}

export async function fetchTunnelEventDetail(eventId: string): Promise<TunnelEventDetailResponse> {
  const url = baseUrl()
  if (!url) throw new Error('Tunnel Review API not configured')
  const res = await axios.get<TunnelEventDetailResponse>(
    `${url}/tunnel/events/${encodeURIComponent(eventId)}`,
    { headers: headers() },
  )
  return res.data
}

export async function submitTunnelEventQc(
  eventId: string,
  body: TunnelQcPostBody,
): Promise<{ event_id: string; qc: TunnelEventQc }> {
  const url = baseUrl()
  if (!url) throw new Error('Tunnel Review API not configured')
  const res = await axios.post<{ event_id: string; qc: TunnelEventQc }>(
    `${url}/tunnel/events/${encodeURIComponent(eventId)}/qc`,
    body,
    { headers: headers() },
  )
  return res.data
}
