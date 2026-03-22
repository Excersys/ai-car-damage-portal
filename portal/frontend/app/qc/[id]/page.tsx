import { getScanById, getCarById } from "@/lib/actions";
import QCReviewClient from "./QCReviewClient";
import { use } from "react";

export default async function QCReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const scan = await getScanById(id);
  
  if (!scan) return <div className="p-8">Scan not found</div>;

  const car = await getCarById(scan.carId);

  if (!car) return <div className="p-8">Car not found</div>;

  return <QCReviewClient scan={scan} car={car} />;
}
