/** Shape returned by `GET /vehicles/search` for each vehicle (see rental-app API Lambda). */
export interface VehicleSearchResult {
  id: string
  make: string
  model: string
  year: number
  type: string
  category: string
  pricePerDay: number
  location: string
  features: string[]
  images: string[]
  rating: number
  reviewCount: number
  available: boolean
  transmission: string
  passengers: number
  luggage: number
  fuelType: string
  range?: number
  mpg?: number
}

export interface VehicleSearchResponse {
  vehicles: VehicleSearchResult[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
