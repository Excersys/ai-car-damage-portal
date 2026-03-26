"use client";

import { Car, ScanEvent } from "@/types";
import { AlertTriangle, MessageSquare, CreditCard } from "lucide-react";
import { useState } from "react";

interface CustomerReportClientProps {
    scan: ScanEvent;
    car: Car;
}

export default function CustomerReportClient({ scan, car }: CustomerReportClientProps) {
  const [activeTab, setActiveTab] = useState<'evidence' | 'cost'>('evidence');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Public Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                    AI
                </div>
                <span className="font-bold text-gray-900">CarGuard Report</span>
            </div>
            <span className="text-sm text-gray-500">Ref: {scan.id}</span>
        </div>
      </div>

      <main className="flex-1 max-w-3xl mx-auto w-full p-4 space-y-6">
        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500">
            <div className="flex items-start gap-4">
                <div className="p-2 bg-red-100 rounded-full text-red-600">
                    <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Damage Detected</h1>
                    <p className="text-gray-600 mt-1">
                        We identified potential damage during the return of your vehicle ({car.make} {car.model}) on {new Date(scan.timestamp).toLocaleDateString()}.
                    </p>
                </div>
            </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 flex">
                <button 
                    onClick={() => setActiveTab('evidence')}
                    className={`flex-1 py-4 text-center font-medium text-sm border-b-2 transition-colors
                    ${activeTab === 'evidence' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Evidence Photos
                </button>
                <button 
                    onClick={() => setActiveTab('cost')}
                    className={`flex-1 py-4 text-center font-medium text-sm border-b-2 transition-colors
                    ${activeTab === 'cost' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Cost Estimation
                </button>
            </div>
            
            <div className="p-6">
                {activeTab === 'evidence' ? (
                    <div className="space-y-6">
                        <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                            <img src={scan.imageUrls.front} className="w-full h-full object-contain" alt="Damage Evidence" />
                            {/* Highlight Damage */}
                            {scan.detectedDamage?.map((box, i) => (
                                <div
                                    key={i}
                                    className="absolute border-2 border-red-500 animate-pulse"
                                    style={{
                                        left: `${(box.x / 800) * 100}%`,
                                        top: `${(box.y / 600) * 100}%`,
                                        width: `${(box.width / 800) * 100}%`,
                                        height: `${(box.height / 600) * 100}%`,
                                    }}
                                />
                            ))}
                        </div>
                        <div className="bg-gray-50 p-4 rounded-md">
                            <h3 className="font-medium text-gray-900 mb-2">AI Analysis</h3>
                            <ul className="space-y-2">
                                {scan.detectedDamage?.map((damage, i) => (
                                    <li key={i} className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-red-500 rounded-full" />
                                            {damage.label} on Front Bumper
                                        </span>
                                        <span className="text-gray-500">Confidence: {(damage.confidence * 100).toFixed(0)}%</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 space-y-4">
                        <CreditCard className="h-12 w-12 text-gray-400 mx-auto" />
                        <h3 className="text-lg font-medium text-gray-900">Estimated Repair Cost</h3>
                        <p className="text-3xl font-bold text-gray-900">$450.00</p>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto">
                            This includes parts, labor, and administrative fees. A detailed invoice will be sent to your email.
                        </p>
                    </div>
                )}
            </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
            <button className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                Acknowledge & Pay
            </button>
            <button className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Dispute Claim
            </button>
        </div>
      </main>
    </div>
  );
}

