"use client";

import { mockReservations } from "@/mocks/reservations";
import { Mail, Phone } from "lucide-react";
import Link from "next/link";

export default function CustomersList() {
  // De-duplicate users from reservations
  const uniqueUsers = Array.from(new Set(mockReservations.map(r => r.userId)))
    .map(id => {
      return mockReservations.find(r => r.userId === id);
    });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul role="list" className="divide-y divide-gray-200">
          {uniqueUsers.map((user) => (
            <li key={user?.userId} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-500 text-white font-medium">
                      {user?.userName.charAt(0)}
                    </span>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-indigo-600">{user?.userName}</div>
                    <div className="flex items-center text-sm text-gray-500 gap-3">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3"/> {user?.userId}@example.com</span>
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3"/> +1 (555) 000-0000</span>
                    </div>
                  </div>
                </div>
                <div>
                   <Link href={`/search?q=${user?.userId}`} className="text-sm text-indigo-600 hover:text-indigo-900">View History &rarr;</Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

