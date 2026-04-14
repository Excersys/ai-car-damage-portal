/**
 * Calls rental-app API Gateway admin routes (see infrastructure/lambda/api/index.js).
 * Uses the same axios instance as the rest of the app; falls back to embedded mocks on error.
 */

import { apiClient } from '../config/api'

function isApiConfigured(): boolean {
  return Boolean(import.meta.env.VITE_API_BASE_URL)
}

// ── Dashboard ─────────────────────────────────────────────────────

export interface AdminDashboardPayload {
  overview: {
    totalBookings: number
    activeBookings: number
    totalRevenue: number
    totalVehicles: number
    availableVehicles: number
    pendingVerifications: number
    flaggedUsers: number
    systemHealth: string
  }
  recentActivity: Array<{
    id: string
    type: string
    user: string
    vehicle?: string
    amount?: number
    status?: string
    score?: number
    method?: string
    timestamp: string
  }>
  alerts: Array<{
    id: string
    type: string
    message: string
    severity: string
    timestamp: string
  }>
}

export async function fetchAdminDashboard(): Promise<AdminDashboardPayload | null> {
  if (!isApiConfigured()) return null
  try {
    const { data } = await apiClient.get<AdminDashboardPayload>('/admin/dashboard')
    return data
  } catch {
    return null
  }
}

// ── Customers (super-admin) ──────────────────────────────────────

export interface AdminUserRow {
  id: string
  email: string
  firstName?: string
  lastName?: string
  status: string
  joinDate?: string
  totalBookings?: number
}

export async function fetchAdminUsers(): Promise<AdminUserRow[] | null> {
  if (!isApiConfigured()) return null
  try {
    const { data } = await apiClient.get<{ users: AdminUserRow[] }>('/admin/users')
    return data.users ?? []
  } catch {
    return null
  }
}

// ── Fleet ─────────────────────────────────────────────────────────

export interface AdminVehicleRow {
  id: string
  make: string
  model: string
  year: number
  licensePlate: string
  status: string
  mileage?: number
  location?: string
  dailyRate?: number
}

export async function fetchAdminVehicles(): Promise<AdminVehicleRow[] | null> {
  if (!isApiConfigured()) return null
  try {
    const { data } = await apiClient.get<{ vehicles: AdminVehicleRow[] }>('/admin/vehicles')
    return data.vehicles ?? []
  } catch {
    return null
  }
}

// ── Bookings ──────────────────────────────────────────────────────

export interface AdminBookingRow {
  id: string
  bookingReference?: string
  customer: { name: string; email: string; phone?: string }
  vehicle: { make: string; model: string; year: number; licensePlate: string }
  rental: { startDate: string; endDate: string; pickupLocation?: string; returnLocation?: string; totalDays?: number }
  pricing: { total: number; currency?: string }
  status: string
  createdAt?: string
}

export async function fetchAdminBookings(): Promise<AdminBookingRow[] | null> {
  if (!isApiConfigured()) return null
  try {
    const { data } = await apiClient.get<{ bookings: AdminBookingRow[] }>('/admin/bookings')
    return data.bookings ?? []
  } catch {
    return null
  }
}

// ── Financial analytics (reports) ─────────────────────────────────

export interface AdminFinancialSummary {
  totalRevenue: number
  totalBookings: number
  averageBookingValue: number
  revenueGrowth: number
  bookingGrowth: number
}

export async function fetchAdminFinancialAnalytics(): Promise<AdminFinancialSummary | null> {
  if (!isApiConfigured()) return null
  try {
    const { data } = await apiClient.get<{ summary: AdminFinancialSummary }>(
      '/admin/analytics/financial',
    )
    return data.summary ?? null
  } catch {
    return null
  }
}
