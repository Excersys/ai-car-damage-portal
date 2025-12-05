"use client";

import { Car, ScanEvent } from "@/types";
import { useRouter } from "next/navigation";
import { Check, X, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { updateQCStatus } from "@/lib/actions";

interface QCReviewClientProps {
    scan: ScanEvent;
    car: Car;
}

export default function QCReviewClient({ scan, car }: QCReviewClientProps) {
  const router = useRouter();
  const [showOverlay, setShowOverlay] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    if (confirm("Confirm Damage? This will generate a report.")) {
        setIsSubmitting(true);
        await updateQCStatus(scan.id, 'Approved', 'current-user-id'); // In real app, get user ID from session
        alert("Damage Confirmed! Report generated.");
        router.push("/qc");
    }
  };

  const handleReject = async () => {
    if (confirm("Reject Flag? This will mark as clean.")) {
        setIsSubmitting(true);
        await updateQCStatus(scan.id, 'Rejected', 'current-user-id');
        router.push("/qc");
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
        <div className="flex items-center gap-4">
          <Link href="/qc" className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Review: {car.make} {car.model}</h1>
            <p className="text-sm text-gray-500">Scan ID: {scan.id} • Confidence: {(scan.detectedDamage?.[0]?.confidence ?? 0 * 100).toFixed(0)}%</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={() => setShowOverlay(!showOverlay)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
                {showOverlay ? 'Hide AI Overlay' : 'Show AI Overlay'}
            </button>
        </div>
      </div>

      {/* Comparison View */}
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        {/* Reference (Pre-Rental) */}
        <div className="flex flex-col bg-gray-50 rounded-lg p-2 overflow-hidden">
            <div className="flex justify-between items-center mb-2 px-2">
                <span className="text-sm font-bold text-gray-500">REFERENCE (CHECK-OUT)</span>
                <span className="text-xs text-gray-400">Previous State</span>
            </div>
            <div className="flex-1 relative rounded overflow-hidden border border-gray-200 bg-black">
                <img 
                    src={car.imageUrl} 
                    alt="Reference" 
                    className="absolute inset-0 w-full h-full object-contain" 
                />
            </div>
        </div>

        {/* Current (Check-In) */}
        <div className="flex flex-col bg-gray-50 rounded-lg p-2 overflow-hidden border-2 border-indigo-100">
             <div className="flex justify-between items-center mb-2 px-2">
                <span className="text-sm font-bold text-indigo-600">CURRENT (CHECK-IN)</span>
                <span className="text-xs text-gray-400">{new Date(scan.timestamp).toLocaleString()}</span>
            </div>
            <div className="flex-1 relative rounded overflow-hidden border border-gray-200 bg-black">
                <img 
                    src={scan.imageUrls.front} 
                    alt="Current" 
                    className="absolute inset-0 w-full h-full object-contain" 
                />
                {/* AI Overlay */}
                {showOverlay && scan.detectedDamage?.map((box, i) => (
                    <div
                        key={i}
                        className="absolute border-2 border-red-500 bg-red-500/20 cursor-pointer hover:bg-red-500/40 transition-colors"
                        style={{
                            left: `${(box.x / 800) * 100}%`, // Mock scaling assuming 800px base
                            top: `${(box.y / 600) * 100}%`,
                            width: `${(box.width / 800) * 100}%`,
                            height: `${(box.height / 600) * 100}%`,
                        }}
                        title={`${box.label} (${(box.confidence * 100).toFixed(0)}%)`}
                    >
                        <span className="absolute -top-6 left-0 bg-red-500 text-white text-xs px-1 py-0.5 rounded">
                            {box.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-center gap-4">
        <button
            onClick={handleReject}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-colors disabled:opacity-50"
        >
            <X className="w-5 h-5" />
            Reject (Dirt/False)
        </button>
        <button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:scale-100"
        >
            <Check className="w-5 h-5" />
            Confirm Damage
        </button>
      </div>
    </div>
  );
}

