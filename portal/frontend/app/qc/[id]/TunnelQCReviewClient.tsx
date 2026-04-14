"use client";

import type { ScanEvent } from "@/types";
import type {
  TunnelCameraResult,
  TunnelEventQc,
} from "@/lib/tunnelApi";
import { useRouter } from "next/navigation";
import { Check, X, ArrowLeft, Camera, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useCallback, useEffect } from "react";

interface Props {
  portalId: string;
  scan: ScanEvent;
  cameras: TunnelCameraResult[];
  qc: TunnelEventQc | null;
}

function bboxOverlayStyle(
  bb: Record<string, number>,
  imgW: number,
  imgH: number
): React.CSSProperties {
  const x = bb.x ?? 0;
  const y = bb.y ?? 0;
  const w = bb.w ?? bb.width ?? 0;
  const h = bb.h ?? bb.height ?? 0;

  const isNormalized = x <= 1 && y <= 1 && w <= 1 && h <= 1;
  const pctL = isNormalized ? x * 100 : (x / imgW) * 100;
  const pctT = isNormalized ? y * 100 : (y / imgH) * 100;
  const pctW = isNormalized ? w * 100 : (w / imgW) * 100;
  const pctH = isNormalized ? h * 100 : (h / imgH) * 100;

  return {
    position: "absolute",
    left: `${pctL}%`,
    top: `${pctT}%`,
    width: `${pctW}%`,
    height: `${pctH}%`,
  };
}

export default function TunnelQCReviewClient({
  portalId,
  scan,
  cameras,
  qc,
}: Props) {
  const router = useRouter();
  const [showOverlay, setShowOverlay] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState(qc?.notes ?? "");
  const [activeIdx, setActiveIdx] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgDims, setImgDims] = useState({ w: 800, h: 600 });

  const activeCam = cameras[activeIdx];

  const onImgLoad = useCallback(() => {
    if (imgRef.current) {
      setImgDims({
        w: imgRef.current.naturalWidth || 800,
        h: imgRef.current.naturalHeight || 600,
      });
    }
  }, []);

  useEffect(() => {
    setImgDims({ w: 800, h: 600 });
  }, [activeIdx]);

  const handleSubmit = async (status: "approved" | "rejected") => {
    const verb = status === "approved" ? "Confirm Damage" : "Reject Flag";
    if (!confirm(`${verb}? This action will be recorded.`)) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/tunnel-qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portalId,
          status,
          reviewerId: "portal-user",
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Submission failed");
      }
      router.push("/qc");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsSubmitting(false);
    }
  };

  const alreadyReviewed = qc && qc.status !== "pending";

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
        <div className="flex items-center gap-4">
          <Link href="/qc" className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Tunnel Review: {scan.carId.toUpperCase()}
            </h1>
            <p className="text-sm text-gray-500">
              Event: {portalId} &bull; {cameras.length} camera
              {cameras.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowOverlay(!showOverlay)}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {showOverlay ? "Hide AI Overlay" : "Show AI Overlay"}
          </button>
        </div>
      </div>

      {/* Camera Carousel */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Camera tabs */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
          <button
            disabled={activeIdx === 0}
            onClick={() => setActiveIdx((i) => i - 1)}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {cameras.map((cam, idx) => (
            <button
              key={cam.camera_frame}
              onClick={() => setActiveIdx(idx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                idx === activeIdx
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Camera className="h-3 w-3" />
              {cam.camera_id || `Camera ${idx + 1}`}
              {cam.damage_detected && (
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400" />
              )}
            </button>
          ))}
          <button
            disabled={activeIdx === cameras.length - 1}
            onClick={() => setActiveIdx((i) => i + 1)}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Image viewer */}
        <div className="flex-1 relative rounded-lg overflow-hidden border border-gray-200 bg-black flex items-center justify-center">
          {activeCam?.image_url ? (
            <>
              <img
                ref={imgRef}
                src={activeCam.image_url}
                alt={`Camera ${activeCam.camera_id}`}
                className="max-w-full max-h-full object-contain"
                onLoad={onImgLoad}
              />
              {showOverlay &&
                activeCam.bounding_boxes.map((bb, i) => (
                  <div
                    key={i}
                    className="border-2 border-red-500 bg-red-500/20 hover:bg-red-500/40 transition-colors"
                    style={bboxOverlayStyle(bb, imgDims.w, imgDims.h)}
                  >
                    <span className="absolute -top-6 left-0 bg-red-500 text-white text-xs px-1 py-0.5 rounded whitespace-nowrap">
                      {activeCam.damage_type} (
                      {(activeCam.confidence_score * 100).toFixed(0)}%)
                    </span>
                  </div>
                ))}
            </>
          ) : (
            <div className="text-gray-400 text-sm">No image available</div>
          )}
        </div>

        {/* Camera metadata */}
        <div className="mt-3 grid grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase">
              Damage
            </p>
            <p
              className={`mt-1 text-sm font-semibold ${
                activeCam?.damage_detected ? "text-red-600" : "text-green-600"
              }`}
            >
              {activeCam?.damage_detected ? "Detected" : "Clean"}
            </p>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase">Type</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {activeCam?.damage_type || "N/A"}
            </p>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase">
              Confidence
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {activeCam
                ? `${(activeCam.confidence_score * 100).toFixed(1)}%`
                : "N/A"}
            </p>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase">
              Timestamp
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {activeCam
                ? new Date(activeCam.timestamp).toLocaleString()
                : "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* QC Action Bar */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        {alreadyReviewed ? (
          <div className="text-center">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium ${
                qc!.status === "approved"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {qc!.status === "approved" ? (
                <Check className="h-4 w-4" />
              ) : (
                <X className="h-4 w-4" />
              )}
              {qc!.status.charAt(0).toUpperCase() + qc!.status.slice(1)} by{" "}
              {qc!.reviewer_id || "system"}
            </span>
            {qc!.notes && (
              <p className="mt-2 text-sm text-gray-500">
                Notes: {qc!.notes}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            />
            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}
            <div className="flex justify-center gap-4">
              <button
                onClick={() => handleSubmit("rejected")}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
                Reject (Dirt/False)
              </button>
              <button
                onClick={() => handleSubmit("approved")}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:scale-100"
              >
                <Check className="w-5 h-5" />
                Confirm Damage
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
