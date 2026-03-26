"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { Search as SearchIcon, Car, User, FileText, ArrowRight } from "lucide-react";
import { searchGlobal } from "@/lib/actions";
import { Car as CarType, Reservation, ScanEvent } from "@/types";

type SearchCategory = 'all' | 'cars' | 'reservations' | 'scans';

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || "";
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<SearchCategory>('all');
  const [results, setResults] = useState<{ cars: CarType[], reservations: Reservation[], scans: ScanEvent[] }>({ cars: [], reservations: [], scans: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const performSearch = async () => {
        if (query.length > 1) {
            setLoading(true);
            try {
                const data = await searchGlobal(query);
                setResults(data as any);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        } else {
            setResults({ cars: [], reservations: [], scans: [] });
        }
    };

    const debounce = setTimeout(performSearch, 500);
    return () => clearTimeout(debounce);
  }, [query]);

  const filteredCars = results.cars;
  const filteredReservations = results.reservations;
  const filteredScans = results.scans;

  return (
    <div className="space-y-6">
       <h1 className="text-3xl font-bold text-gray-900">Global Search</h1>
       
       <div className="bg-white shadow rounded-lg p-6">
            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <SearchIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    className="block w-full rounded-md border-0 py-3 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-lg sm:leading-6"
                    placeholder="Search everything (e.g., 'Toyota', 'John Doe', 'scan-502')..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                />
            </div>
            
            <div className="mt-4 flex gap-2">
                {(['all', 'cars', 'reservations', 'scans'] as const).map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors
                        ${category === cat 
                            ? 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-500/20' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
       </div>

       {loading && <div className="text-center py-12 text-gray-500">Searching...</div>}

       {!loading && query.length > 1 && (
           <div className="space-y-8">
                {/* Cars Results */}
                {(category === 'all' || category === 'cars') && filteredCars.length > 0 && (
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Car className="h-5 w-5" /> Vehicles ({filteredCars.length})
                        </h2>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredCars.map(car => (
                                <Link key={car.id} href={`/fleet/${car.id}`} className="block bg-white shadow rounded-lg p-4 hover:ring-2 hover:ring-indigo-500 transition-all">
                                    <div className="flex items-center gap-4">
                                        <img src={car.imageUrl} className="h-12 w-12 rounded-full object-cover bg-gray-100" alt="" />
                                        <div>
                                            <p className="font-medium text-gray-900">{car.make} {car.model}</p>
                                            <p className="text-sm text-gray-500">{car.licensePlate}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* Reservations Results */}
                {(category === 'all' || category === 'reservations') && filteredReservations.length > 0 && (
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <User className="h-5 w-5" /> Reservations ({filteredReservations.length})
                        </h2>
                        <div className="bg-white shadow rounded-lg overflow-hidden">
                            <ul className="divide-y divide-gray-200">
                                {filteredReservations.map(res => (
                                    <li key={res.id}>
                                        <Link href={`/fleet/${res.carId}`} className="block hover:bg-gray-50 p-4">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-medium text-indigo-600">{res.userName}</p>
                                                    <p className="text-sm text-gray-500">Ref: {res.id}</p>
                                                </div>
                                                <ArrowRight className="h-4 w-4 text-gray-400" />
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </section>
                )}

                {/* Scans Results */}
                {(category === 'all' || category === 'scans') && filteredScans.length > 0 && (
                    <section>
                         <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <FileText className="h-5 w-5" /> Inspection Records ({filteredScans.length})
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                            {filteredScans.map(scan => (
                                <Link key={scan.id} href={`/inspections/${scan.id}`} className="block bg-white shadow rounded-lg p-4 hover:bg-gray-50">
                                    <div className="flex justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900">Scan #{scan.id}</p>
                                            <p className="text-sm text-gray-500">{new Date(scan.timestamp).toLocaleString()}</p>
                                        </div>
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                                          ${scan.aiStatus === 'Damage Detected' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                          {scan.aiStatus}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
                
                {/* Empty State */}
                {filteredCars.length === 0 && filteredReservations.length === 0 && filteredScans.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500">No results found for "{query}"</p>
                    </div>
                )}
           </div>
       )}
    </div>
  );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="p-6">Loading search...</div>}>
            <SearchContent />
        </Suspense>
    );
}
