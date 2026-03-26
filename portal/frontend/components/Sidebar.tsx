"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Car, ShieldCheck, Users, Search, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Fleet Registry", href: "/fleet", icon: Car },
  { name: "QC Station", href: "/qc", icon: ShieldCheck },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Search", href: "/search", icon: Search },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-slate-900 text-white">
      <div className="flex h-16 items-center justify-center border-b border-slate-800">
        <h1 className="text-xl font-bold tracking-wider">AI GUARD</h1>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center rounded-md px-2 py-2 text-sm font-medium",
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0",
                  isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 p-4">
        <Link href="/settings" className="flex items-center hover:opacity-80 transition-opacity">
          <div className="ml-3">
            <p className="text-sm font-medium text-white">Admin User</p>
            <p className="text-xs text-slate-400">View Profile</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

