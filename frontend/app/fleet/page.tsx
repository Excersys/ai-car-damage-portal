import { getCars } from "@/lib/actions";
import FleetList from "./FleetList";

export default async function FleetPage() {
  const cars = await getCars();
  return <FleetList initialCars={cars} />;
}
