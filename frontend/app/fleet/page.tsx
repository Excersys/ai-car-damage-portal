import { getCars } from "@/lib/actions";
import FleetList from "./FleetList";

export const dynamic = "force-dynamic";

export default async function FleetPage() {
  const cars = await getCars();
  return <FleetList initialCars={cars} />;
}
