/**
 * Vehicle + Booking API client — fetches from the rental-app API Gateway Lambda.
 * Falls back to null when VITE_API_BASE_URL is not set or on request failure,
 * so callers can use local mock data as a fallback.
 */

import { apiClient } from '../config/api'

function isApiConfigured(): boolean {
  return Boolean(import.meta.env.VITE_API_BASE_URL)
}

// ── Cars ──────────────────────────────────────────────────────────────

export interface ApiCar {
  id: string
  make: string
  model: string
  year: number
  type: string
  pricePerDay: number
  available: boolean
  features: string[]
  imageUrl?: string
  description?: string
  location?: string
  rating?: number
  reviews?: number
  specs?: Record<string, string | number>
}

export async function fetchCars(): Promise<ApiCar[] | null> {
  if (!isApiConfigured()) return null
  try {
    const res = await apiClient.get('/cars')
    const data = res.data
    return Array.isArray(data) ? data : data?.cars ?? null
  } catch {
    return null
  }
}

export async function fetchCarById(carId: string): Promise<ApiCar | null> {
  if (!isApiConfigured()) return null
  try {
    const res = await apiClient.get(`/cars/${carId}`)
    return res.data ?? null
  } catch {
    return null
  }
}

// ── Bookings ──────────────────────────────────────────────────────────

export interface ApiBooking {
  id: string
  carId?: string
  car?: string
  vehicleName?: string
  startDate: string
  endDate: string
  status: string
  total?: number
  totalAmount?: number
}

export async function fetchBookings(): Promise<ApiBooking[] | null> {
  if (!isApiConfigured()) return null
  try {
    const res = await apiClient.get('/bookings')
    const data = res.data
    return Array.isArray(data) ? data : data?.bookings ?? null
  } catch {
    return null
  }
}

export async function fetchBookingById(id: string): Promise<ApiBooking | null> {
  if (!isApiConfigured()) return null
  try {
    const res = await apiClient.get(`/bookings/${id}`)
    return res.data ?? null
  } catch {
    return null
  }
}
