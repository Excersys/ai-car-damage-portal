/**
 * Server-side client for the Tunnel Review API (API Gateway + Lambda + DynamoDB).
 *
 * Environment variables (set in .env.local):
 *   TUNNEL_REVIEW_API_BASE_URL — e.g. https://abc123.execute-api.us-east-1.amazonaws.com/prod
 *   TUNNEL_REVIEW_API_KEY      — API-Gateway x-api-key
 *
 * Types here mirror the contract in camera-system/lambdas/review_api/contracts.py.
 */

// ── Types ─────────────────────────────────────────────────────────────

export interface TunnelEventSummary {
  event_id: string;
  last_timestamp: string;
  license_plate: string;
  any_damage: boolean;
  camera_count: number;
  preview_image_url: string;
  qc_status: string;
}

export interface TunnelEventsListResponse {
  events: TunnelEventSummary[];
  count: number;
}

export interface TunnelCameraResult {
  camera_id: string;
  camera_frame: string;
  frame: string;
  image_url: string;
  damage_detected: boolean;
  damage_type: string;
  confidence_score: number;
  bounding_boxes: Array<Record<string, number>>;
  timestamp: string;
}

export interface TunnelEventQc {
  status: string;
  notes: string;
  reviewer_id: string;
  updated_at: string;
}

export interface TunnelEventDetailResponse {
  event_id: string;
  cameras: TunnelCameraResult[];
  total_cameras: number;
  any_damage: boolean;
  qc: TunnelEventQc | null;
}

export interface TunnelQcPostBody {
  status: "approved" | "rejected" | "pending";
  notes?: string;
  reviewer_id?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────

function getBaseUrl(): string | undefined {
  return process.env.TUNNEL_REVIEW_API_BASE_URL?.replace(/\/$/, "");
}

function getApiKey(): string | undefined {
  return process.env.TUNNEL_REVIEW_API_KEY;
}

export function isTunnelConfigured(): boolean {
  return Boolean(getBaseUrl() && getApiKey());
}

async function tunnelFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getBaseUrl();
  const key = getApiKey();
  if (!base || !key) {
    throw new Error(
      "Tunnel Review API not configured (set TUNNEL_REVIEW_API_BASE_URL and TUNNEL_REVIEW_API_KEY)."
    );
  }
  const res = await fetch(`${base}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": key,
      ...init?.headers,
    },
    body: init?.body,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tunnel Review API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

// ── Public API ────────────────────────────────────────────────────────

export async function fetchTunnelEvents(): Promise<TunnelEventsListResponse> {
  return tunnelFetch<TunnelEventsListResponse>("/tunnel/events");
}

export async function fetchTunnelEventDetail(
  eventId: string
): Promise<TunnelEventDetailResponse> {
  return tunnelFetch<TunnelEventDetailResponse>(
    `/tunnel/events/${encodeURIComponent(eventId)}`
  );
}

export async function submitTunnelEventQc(
  eventId: string,
  body: TunnelQcPostBody
): Promise<{ event_id: string; qc: TunnelEventQc }> {
  return tunnelFetch<{ event_id: string; qc: TunnelEventQc }>(
    `/tunnel/events/${encodeURIComponent(eventId)}/qc`,
    { method: "POST", body: JSON.stringify(body) }
  );
}
