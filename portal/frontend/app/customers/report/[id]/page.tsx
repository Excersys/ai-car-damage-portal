import { getScanById, getCarById } from "@/lib/actions";
import CustomerReportClient from "./CustomerReportClient";
import { use } from "react";

export default async function CustomerReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const scan = await getScanById(id);
  
  if (!scan) return <div className="p-8 text-center">Report not found</div>;

  const car = await getCarById(scan.carId);

  if (!car) return <div className="p-8 text-center">Car not found</div>;

  return <CustomerReportClient scan={scan} car={car} />;
}
