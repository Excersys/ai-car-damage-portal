import { getScanById, getCarById } from "@/lib/actions";
import { getTunnelScanDetail } from "@/lib/actions/tunnel";
import { isTunnelScanId } from "@/lib/tunnelHelpers";
import QCReviewClient from "./QCReviewClient";
import TunnelQCReviewClient from "./TunnelQCReviewClient";
import { use } from "react";

export const dynamic = "force-dynamic";

export default async function QCReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  if (isTunnelScanId(id)) {
    const detail = await getTunnelScanDetail(id);
    if (!detail) return <div className="p-8">Tunnel event not found</div>;
    return (
      <TunnelQCReviewClient
        portalId={id}
        scan={detail.scan}
        cameras={detail.cameras}
        qc={detail.qc}
      />
    );
  }

  const scan = await getScanById(id);
  if (!scan) return <div className="p-8">Scan not found</div>;

  const car = await getCarById(scan.carId);
  if (!car) return <div className="p-8">Car not found</div>;

  return <QCReviewClient scan={scan} car={car} />;
}
