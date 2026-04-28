import { getScanById, getCarById } from "@/lib/actions";
import { getTunnelScanDetail } from "@/lib/actions/tunnel";
import { isTunnelScanId } from "@/lib/tunnelHelpers";
import InspectionDetailClient from "./InspectionDetailClient";
import { use } from "react";

export default async function InspectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  if (isTunnelScanId(id)) {
    const detail = await getTunnelScanDetail(id);
    if (!detail) return <div className="p-8 text-center">Tunnel record not found</div>;
    return <InspectionDetailClient scan={detail.scan} carId="tunnel" />;
  }

  const scan = await getScanById(id);
  if (!scan) return <div className="p-8 text-center">Record not found</div>;

  const car = await getCarById(scan.carId);
  if (!car) return <div className="p-8 text-center">Car not found</div>;

  return <InspectionDetailClient scan={scan} carId={car.id} />;
}
