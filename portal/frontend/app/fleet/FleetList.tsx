"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Filter } from "lucide-react";
import { Car } from "@/types";

export default function FleetList({ initialCars }: { initialCars: Car[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filteredCars = initialCars.filter((car) => {
    const matchesSearch =
      car.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.vin.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "All" || car.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Fleet Registry</h1>
        <Link href="/fleet/add" className="mt-4 sm:mt-0 inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto">
          Add Vehicle
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg shadow">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            placeholder="Search by Make, Model, Plate, or VIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
                className="block rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
            >
                <option value="All">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Rented">Rented</option>
                <option value="Maintenance">Maintenance</option>
            </select>
        </div>
      </div>

      {/* Car List */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <ul role="list" className="divide-y divide-gray-200">
          {filteredCars.map((car) => (
            <li key={car.id}>
                <Link href={`/fleet/${car.id}`} className="block hover:bg-gray-50">
                  <div className="flex items-center px-4 py-4 sm:px-6">
                    <div className="min-w-0 flex-1 flex items-center">
                        <div className="flex-shrink-0">
                            <img className="h-12 w-12 rounded-full object-cover" src={car.imageUrl} alt={`${car.make} ${car.model}`} />
                        </div>
                        <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                            <div>
                                <p className="truncate text-sm font-medium text-indigo-600">{car.make} {car.model} ({car.year})</p>
                                <p className="mt-2 flex items-center text-sm text-gray-500">
                                    <span className="truncate">{car.licensePlate}</span>
                                    <span className="mx-2">•</span>
                                    <span className="truncate">VIN: {car.vin}</span>
                                </p>
                            </div>
                            <div className="hidden md:block">
                                <div>
                                    <p className="text-sm text-gray-900">
                                        Mileage: {car.mileage.toLocaleString()} mi
                                    </p>
                                    <p className="mt-2 flex items-center text-sm text-gray-500">
                                        Last Inspection: {car.lastInspectionDate}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                          ${car.status === 'Available' ? 'bg-green-100 text-green-800' : 
                            car.status === 'Maintenance' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                          {car.status}
                        </span>
                        <svg className="ml-5 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.16 8 7.23 4.29a.75.75 0 011.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                        </svg>
                    </div>
                  </div>
                </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

