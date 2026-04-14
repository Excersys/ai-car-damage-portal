import { getScans } from "@/lib/actions";
import { getTunnelScans } from "@/lib/actions/tunnel";
import { TUNNEL_PREFIX } from "@/lib/tunnelHelpers";
import Link from "next/link";
import { ShieldCheck, AlertTriangle, Eye, Radio } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InspectionsListPage() {
  const [dbScans, tunnelScans] = await Promise.all([
    getScans(),
    getTunnelScans(),
  ]);

  const allScans = [...dbScans, ...tunnelScans].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const reviewed = allScans.filter((s) => s.qcStatus !== "Pending");
  const pending = allScans.filter((s) => s.qcStatus === "Pending");

  const damageCount = reviewed.filter(
    (s) => s.qcStatus === "Approved"
  ).length;
  const clearCount = reviewed.filter(
    (s) => s.qcStatus === "Rejected" || s.aiStatus === "Clean"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Inspections</h1>
        <div className="flex items-center gap-3">
          {tunnelScans.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-700/10">
              <Radio className="h-3 w-3" />
              {tunnelScans.length} Tunnel
            </span>
          )}
          {pending.length > 0 && (
            <Link
              href="/qc"
              className="inline-flex items-center rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 hover:bg-indigo-100 transition-colors"
            >
              {pending.length} Pending QC &rarr;
            </Link>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-white rounded-lg shadow px-5 py-4">
          <p className="text-sm font-medium text-gray-500">Total Inspections</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {allScans.length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow px-5 py-4">
          <p className="text-sm font-medium text-gray-500">Damage Confirmed</p>
          <p className="mt-1 text-2xl font-semibold text-red-600">
            {damageCount}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow px-5 py-4">
          <p className="text-sm font-medium text-gray-500">Cleared</p>
          <p className="mt-1 text-2xl font-semibold text-green-600">
            {clearCount}
          </p>
        </div>
      </div>

      {/* Inspections table */}
      <div className="overflow-hidden bg-white shadow sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID / Vehicle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                AI Result
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                QC Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reviewed By
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {allScans.map((scan) => {
              const isTunnel = scan.id.startsWith(TUNNEL_PREFIX);
              const href =
                scan.qcStatus === "Pending"
                  ? `/qc/${scan.id}`
                  : isTunnel
                  ? `/qc/${scan.id}`
                  : `/inspections/${scan.id}`;

              return (
                <tr key={scan.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {scan.imageUrls.front ? (
                        <img
                          src={scan.imageUrls.front}
                          alt=""
                          className="h-10 w-14 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-14 rounded bg-gray-200 flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-indigo-600">
                          {scan.carId.toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-400">{scan.type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isTunnel ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        <Radio className="h-3 w-3" />
                        Tunnel
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        Database
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(scan.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        scan.aiStatus === "Damage Detected"
                          ? "bg-red-100 text-red-800"
                          : scan.aiStatus === "Clean"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {scan.aiStatus === "Damage Detected" ? (
                        <AlertTriangle className="h-3 w-3" />
                      ) : (
                        <ShieldCheck className="h-3 w-3" />
                      )}
                      {scan.aiStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        scan.qcStatus === "Approved"
                          ? "bg-green-100 text-green-800"
                          : scan.qcStatus === "Rejected"
                          ? "bg-gray-100 text-gray-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {scan.qcStatus ?? "Pending"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {scan.qcBy || "\u2014"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Link
                      href={href}
                      className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
            {allScans.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-gray-400"
                >
                  No inspections found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
