import { NextRequest, NextResponse } from "next/server";
import { isTunnelScanId, toRawTunnelId } from "@/lib/tunnelHelpers";
import {
  isTunnelConfigured,
  submitTunnelEventQc,
} from "@/lib/tunnelApi";
import type { TunnelQcPostBody } from "@/lib/tunnelApi";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { portalId, status, reviewerId, notes } = body ?? {};

  if (!portalId || !isTunnelScanId(portalId)) {
    return NextResponse.json({ error: "Invalid portalId" }, { status: 400 });
  }
  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json(
      { error: "status must be approved or rejected" },
      { status: 400 }
    );
  }
  if (!isTunnelConfigured()) {
    return NextResponse.json(
      { error: "Tunnel API not configured" },
      { status: 502 }
    );
  }

  const rawId = toRawTunnelId(portalId);
  const qcBody: TunnelQcPostBody = {
    status,
    reviewer_id: reviewerId || "portal-user",
  };
  if (notes) qcBody.notes = notes;

  try {
    await submitTunnelEventQc(rawId, qcBody);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
