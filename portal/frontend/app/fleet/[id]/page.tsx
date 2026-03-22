"use client";

import { getCarById, getReservationsByCarId, getScansByCarId } from "@/lib/actions";
import { Reservation, ScanEvent } from "@/types";
import Link from "next/link";
import { ArrowLeft, Calendar, ShieldCheck, AlertTriangle, History } from "lucide-react";
import { use } from "react";

type TimelineEvent = 
  | { type: 'reservation'; date: string; data: Reservation; id: string }
  | { type: 'scan'; date: string; data: ScanEvent; id: string };

export default async function CarDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const car = await getCarById(id);
  
  if (!car) return <div className="p-8">Car not found</div>;

  const carReservations = await getReservationsByCarId(car.id);
  const carScans = await getScansByCarId(car.id);

  // Merge events for timeline
  const timelineEvents: TimelineEvent[] = [
    ...carReservations.map(r => ({ type: 'reservation' as const, date: r.startDate, data: r, id: r.id })),
    ...carScans.map(s => ({ type: 'scan' as const, date: s.timestamp, data: s, id: s.id }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
       {/* Back Link */}
       <div className="flex items-center gap-4">
          <Link href="/fleet" className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{car.make} {car.model} ({car.year})</h1>
        </div>

      {/* Car Info Card */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-start">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Vehicle Details</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">VIN: {car.vin}</p>
          </div>
           <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium
              ${car.status === 'Available' ? 'bg-green-100 text-green-800' : 
                car.status === 'Maintenance' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
              {car.status}
            </span>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <img src={car.imageUrl} alt="Car" className="w-full h-full object-cover" />
             </div>
             <div className="col-span-2 grid grid-cols-2 gap-4">
                 <div>
                     <dt className="text-sm font-medium text-gray-500">License Plate</dt>
                     <dd className="mt-1 text-sm text-gray-900">{car.licensePlate}</dd>
                 </div>
                 <div>
                     <dt className="text-sm font-medium text-gray-500">Color</dt>
                     <dd className="mt-1 text-sm text-gray-900">{car.color}</dd>
                 </div>
                 <div>
                     <dt className="text-sm font-medium text-gray-500">Mileage</dt>
                     <dd className="mt-1 text-sm text-gray-900">{car.mileage.toLocaleString()} mi</dd>
                 </div>
                 <div>
                     <dt className="text-sm font-medium text-gray-500">Last Inspection</dt>
                     <dd className="mt-1 text-sm text-gray-900">{car.lastInspectionDate}</dd>
                 </div>
             </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
         <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                <History className="h-5 w-5 text-gray-500" />
                History Timeline
            </h3>
        </div>
        <ul className="divide-y divide-gray-200">
            {timelineEvents.map((event) => (
                <li key={event.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                    {event.type === 'reservation' ? (
                        // Reservation Card
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 mt-1">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Calendar className="h-4 w-4 text-blue-600" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-blue-600">Reservation #{event.data.id}</p>
                                    <span className="text-xs text-gray-500">{new Date(event.date).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm text-gray-900 mt-1">Renter: {event.data.userName}</p>
                                <p className="text-xs text-gray-500">
                                    {new Date(event.data.startDate).toLocaleDateString()} - {new Date(event.data.endDate).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    ) : (
                        // Scan Card
                        <Link href={event.data.qcStatus === 'Pending' ? `/qc/${event.id}` : `/inspections/${event.id}`} className="block group">
                             <div className="flex items-start gap-4">
                             <div className="flex-shrink-0 mt-1">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center
                                    ${event.data.aiStatus === 'Damage Detected' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                    {event.data.aiStatus === 'Damage Detected' ? <AlertTriangle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                                        Scan: {event.data.type}
                                    </p>
                                    <span className="text-xs text-gray-500">{new Date(event.date).toLocaleString()}</span>
                                </div>
                                <p className={`text-sm mt-1 ${event.data.aiStatus === 'Damage Detected' ? 'text-red-600 font-medium' : 'text-green-600'}`}>
                                    AI Result: {event.data.aiStatus}
                                </p>
                                {event.data.aiStatus === 'Damage Detected' && (
                                    <p className="text-xs text-red-500 mt-0.5">
                                        {event.data.detectedDamage?.length} Issues Flagged
                                    </p>
                                )}
                            </div>
                            </div>
                        </Link>
                    )}
                </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
