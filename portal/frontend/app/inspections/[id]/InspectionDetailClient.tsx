"use client";

import { ScanEvent } from "@/types";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface InspectionDetailClientProps {
    scan: ScanEvent;
    carId: string;
}

export default function InspectionDetailClient({ scan, carId }: InspectionDetailClientProps) {
  const [showOverlay, setShowOverlay] = useState(true);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
        <div className="flex items-center gap-4">
          <Link href={`/fleet/${carId}`} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inspection Record #{scan.id}</h1>
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{new Date(scan.timestamp).toLocaleString()}</span>
                <span>•</span>
                <span className={`font-medium ${scan.qcStatus === 'Approved' ? 'text-red-600' : 'text-green-600'}`}>
                    {scan.qcStatus === 'Approved' ? 'Damage Confirmed' : 'Cleared'}
                </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <button className="p-2 text-gray-500 hover:text-gray-900">
                <Download className="h-5 w-5" />
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-900">
                <Share2 className="h-5 w-5" />
            </button>
            <button 
                onClick={() => setShowOverlay(!showOverlay)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
                {showOverlay ? 'Hide Overlay' : 'Show Overlay'}
            </button>
        </div>
      </div>

      {/* Viewer */}
      <div className="flex-1 bg-black rounded-lg overflow-hidden relative flex items-center justify-center">
           <img 
                src={scan.imageUrls.front} 
                alt="Inspection" 
                className="max-w-full max-h-full object-contain" 
            />
            
            {/* Overlay */}
            {showOverlay && scan.detectedDamage?.map((box, i) => (
                <div
                    key={i}
                    className="absolute border-2 border-red-500 bg-red-500/10"
                    style={{
                        left: `${(box.x / 800) * 100}%`, // Mock scaling
                        top: `${(box.y / 600) * 100}%`,
                        width: `${(box.width / 800) * 100}%`,
                        height: `${(box.height / 600) * 100}%`,
                    }}
                >
                    <div className="absolute -top-8 left-0 bg-white p-2 rounded shadow text-xs whitespace-nowrap z-10">
                        <p className="font-bold text-red-600">{box.label}</p>
                        <p className="text-gray-500">Conf: {(box.confidence * 100).toFixed(0)}%</p>
                    </div>
                </div>
            ))}
      </div>

      {/* Footer / Metadata */}
      <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded shadow">
              <h4 className="text-xs font-bold text-gray-500 uppercase">QC Decision</h4>
              <p className="mt-1 text-sm font-medium">{scan.qcStatus}</p>
              <p className="text-xs text-gray-500">By: {scan.qcBy || 'System'}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
              <h4 className="text-xs font-bold text-gray-500 uppercase">Reservation</h4>
              <p className="mt-1 text-sm font-medium">{scan.reservationId || 'N/A'}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
              <h4 className="text-xs font-bold text-gray-500 uppercase">AI Analysis</h4>
              <p className="mt-1 text-sm font-medium">{scan.aiStatus}</p>
              <p className="text-xs text-gray-500">{scan.detectedDamage?.length || 0} Objects Detected</p>
          </div>
      </div>
    </div>
  );
}

