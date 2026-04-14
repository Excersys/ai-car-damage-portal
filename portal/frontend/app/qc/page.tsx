import { getScans } from "@/lib/actions";
import { getTunnelScans } from "@/lib/actions/tunnel";
import { TUNNEL_PREFIX } from "@/lib/tunnelHelpers";
import Link from "next/link";
import { AlertTriangle, Radio } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function QCQueue() {
  const [dbScans, tunnelScans] = await Promise.all([
    getScans(),
    getTunnelScans(),
  ]);

  const allScans = [...dbScans, ...tunnelScans].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const pendingScans = allScans.filter((s) => s.qcStatus === "Pending");
  const completedScans = allScans.filter((s) => s.qcStatus !== "Pending");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">QC Station</h1>
        <div className="flex items-center gap-3">
          {tunnelScans.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-700/10">
              <Radio className="h-3 w-3" />
              {tunnelScans.length} Tunnel
            </span>
          )}
          <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
            {pendingScans.length} Pending Reviews
          </span>
        </div>
      </div>

      {/* Pending Queue */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-base font-semibold leading-6 text-gray-900">
            Pending Review Queue
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            AI has flagged these scans for potential damage.
          </p>
        </div>
        <ul role="list" className="divide-y divide-gray-200">
          {pendingScans.length === 0 ? (
            <li className="px-4 py-8 text-center text-gray-500">
              All caught up! No pending reviews.
            </li>
          ) : (
            pendingScans.map((scan) => {
              const isTunnel = scan.id.startsWith(TUNNEL_PREFIX);
              return (
                <li
                  key={scan.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <Link
                    href={`/qc/${scan.id}`}
                    className="block px-4 py-4 sm:px-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative h-16 w-24 flex-shrink-0">
                          {scan.imageUrls.front ? (
                            <img
                              src={scan.imageUrls.front}
                              alt="Scan preview"
                              className="h-full w-full rounded object-cover"
                            />
                          ) : (
                            <div className="h-full w-full rounded bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                              No image
                            </div>
                          )}
                          <div className="absolute bottom-0 right-0 bg-red-600 text-white text-[10px] px-1 rounded-tl font-bold">
                            {scan.detectedDamage?.length ?? 0} FLAGS
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-indigo-600">
                            {scan.carId.toUpperCase()}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(scan.timestamp).toLocaleString()} &bull;{" "}
                            {scan.type}
                          </p>
                          <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            AI Confidence:{" "}
                            {((scan.detectedDamage?.[0]?.confidence ?? 0) * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isTunnel && (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Tunnel
                          </span>
                        )}
                        <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-sm font-medium text-indigo-800">
                          Review &rarr;
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </div>

      {/* Recent History */}
      <div className="opacity-75">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Recent History
        </h3>
        <div className="bg-white shadow sm:rounded-lg">
          <ul role="list" className="divide-y divide-gray-200">
            {completedScans.slice(0, 10).map((scan) => {
              const isTunnel = scan.id.startsWith(TUNNEL_PREFIX);
              return (
                <li key={scan.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          scan.qcStatus === "Approved"
                            ? "bg-green-400"
                            : "bg-red-400"
                        }`}
                      />
                      <p className="text-sm text-gray-500">
                        {scan.carId} -{" "}
                        {new Date(scan.timestamp).toLocaleDateString()}
                      </p>
                      {isTunnel && (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                          Tunnel
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{scan.qcBy}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
