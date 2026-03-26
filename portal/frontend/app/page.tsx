import { getScans } from "@/lib/actions";
import { Camera, Activity, Clock } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const recentScans = await getScans();
  
  const pendingReviews = recentScans.filter(s => s.qcStatus === 'Pending').length;
  const damageDetected = recentScans.filter(s => s.aiStatus === 'Damage Detected').length;
  const totalScans = recentScans.length;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Camera Status</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-green-600 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
            Online
          </dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Pending QC Reviews</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-orange-600">{pendingReviews}</dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Damage Events (24h)</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-red-600">{damageDetected}</dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Total Scans</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{totalScans}</dd>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Live Feed Mock */}
        <div className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-base font-semibold leading-6 text-gray-900 flex items-center gap-2">
              <Camera className="h-5 w-5 text-gray-500" />
              Live Camera Feed (Station A)
            </h3>
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              Live
            </span>
          </div>
          <div className="aspect-video w-full bg-slate-900 flex items-center justify-center relative">
            {/* Placeholder for video stream */}
            <div className="text-slate-500 flex flex-col items-center">
              <Camera className="h-16 w-16 mb-2 opacity-50" />
              <span>Waiting for vehicle...</span>
            </div>
            <div className="absolute bottom-4 left-4 text-white text-xs font-mono bg-black/50 px-2 py-1 rounded">
              CAM-01 | {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
            <h3 className="text-base font-semibold leading-6 text-gray-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-gray-500" />
              Recent Scans
            </h3>
          </div>
          <ul role="list" className="divide-y divide-gray-200 max-h-[400px] overflow-auto">
            {recentScans.map((scan) => (
              <li key={scan.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="truncate">
                    <div className="flex text-sm">
                      <p className="truncate font-medium text-indigo-600">{scan.carId.toUpperCase()}</p>
                      <p className="ml-1 flex-shrink-0 font-normal text-gray-500">
                        via {scan.type}
                      </p>
                    </div>
                    <div className="mt-2 flex">
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400" aria-hidden="true" />
                        <p>
                          {new Date(scan.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="ml-2 flex flex-shrink-0 flex-col items-end gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                      ${scan.aiStatus === 'Damage Detected' ? 'bg-red-100 text-red-800' : 
                        scan.aiStatus === 'Clean' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {scan.aiStatus}
                    </span>
                     {scan.qcStatus === 'Pending' && (
                        <Link href="/qc" className="text-xs text-indigo-600 hover:text-indigo-900 font-medium">
                          Review Now &rarr;
                        </Link>
                     )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
