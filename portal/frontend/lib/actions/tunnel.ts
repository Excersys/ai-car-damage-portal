"use server";

import {
  isTunnelConfigured as checkTunnelConfigured,
  fetchTunnelEvents,
  fetchTunnelEventDetail,
  submitTunnelEventQc as apiSubmitQc,
  type TunnelEventDetailResponse,
  type TunnelEventSummary,
  type TunnelQcPostBody,
  type TunnelEventQc,
} from "@/lib/tunnelApi";
import { TUNNEL_PREFIX, toRawTunnelId } from "@/lib/tunnelHelpers";
import type { ScanEvent, BoundingBox } from "@/types";

function summaryToScanEvent(ev: TunnelEventSummary): ScanEvent {
  const qcMap: Record<string, ScanEvent["qcStatus"]> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
  };
  return {
    id: `${TUNNEL_PREFIX}${ev.event_id}`,
    carId: ev.license_plate || "unknown",
    timestamp: ev.last_timestamp,
    type: "Check-In",
    aiStatus: ev.any_damage ? "Damage Detected" : "Clean",
    imageUrls: {
      front: ev.preview_image_url || "",
      rear: "",
      left: "",
      right: "",
    },
    detectedDamage: ev.any_damage
      ? [{ x: 0, y: 0, width: 0, height: 0, label: "AI Flag", confidence: 0.9 }]
      : [],
    qcStatus: qcMap[ev.qc_status] ?? "Pending",
  };
}

/** Fetch tunnel events as portal-compatible ScanEvent[]. Returns [] if tunnel is not configured. */
export async function getTunnelScans(): Promise<ScanEvent[]> {
  if (!checkTunnelConfigured()) return [];
  try {
    const resp = await fetchTunnelEvents();
    return resp.events.map(summaryToScanEvent);
  } catch (err) {
    console.error("[tunnel] Failed to fetch tunnel events:", err);
    return [];
  }
}

/** Fetch a single tunnel event detail with camera results and QC data. */
export async function getTunnelScanDetail(portalId: string): Promise<{
  scan: ScanEvent;
  cameras: TunnelEventDetailResponse["cameras"];
  qc: TunnelEventQc | null;
} | null> {
  if (!checkTunnelConfigured()) return null;
  const rawId = toRawTunnelId(portalId);
  try {
    const detail = await fetchTunnelEventDetail(rawId);
    const boxes: BoundingBox[] = detail.cameras.flatMap((cam) =>
      cam.bounding_boxes.map((bb) => ({
        x: bb.x ?? 0,
        y: bb.y ?? 0,
        width: bb.w ?? bb.width ?? 0,
        height: bb.h ?? bb.height ?? 0,
        label: cam.damage_type || "Damage",
        confidence: cam.confidence_score,
      }))
    );

    const qcMap: Record<string, ScanEvent["qcStatus"]> = {
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
    };

    const scan: ScanEvent = {
      id: portalId,
      carId: "tunnel",
      timestamp: detail.cameras[0]?.timestamp ?? new Date().toISOString(),
      type: "Check-In",
      aiStatus: detail.any_damage ? "Damage Detected" : "Clean",
      imageUrls: {
        front: detail.cameras[0]?.image_url ?? "",
        rear: detail.cameras[1]?.image_url ?? "",
        left: detail.cameras[2]?.image_url ?? "",
        right: detail.cameras[3]?.image_url ?? "",
      },
      detectedDamage: boxes,
      qcStatus: qcMap[detail.qc?.status ?? "pending"] ?? "Pending",
      qcBy: detail.qc?.reviewer_id,
      qcNotes: detail.qc?.notes,
    };

    return { scan, cameras: detail.cameras, qc: detail.qc };
  } catch (err) {
    console.error("[tunnel] Failed to fetch tunnel event detail:", err);
    return null;
  }
}

/** Submit a QC decision to the tunnel Review API. */
export async function submitTunnelQc(
  portalId: string,
  status: "approved" | "rejected",
  reviewerId: string,
  notes?: string
): Promise<boolean> {
  if (!checkTunnelConfigured()) return false;
  const rawId = toRawTunnelId(portalId);
  const body: TunnelQcPostBody = { status, reviewer_id: reviewerId };
  if (notes) body.notes = notes;
  try {
    await apiSubmitQc(rawId, body);
    return true;
  } catch (err) {
    console.error("[tunnel] QC submission failed:", err);
    return false;
  }
}
