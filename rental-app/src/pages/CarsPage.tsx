import React, { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

import { apiClient } from '../config/api'
import type { VehicleSearchResult, VehicleSearchResponse } from '../types/vehicleSearch'
import placeholderCar from '../images/CCAR.rendition.vlarge.png'

interface CarsPageCar {
  id: string
  make: string
  model: string
  year: number
  price: number
  typeKey: string
  categoryLabel: string
  image: string
  features: string[]
  specs: {
    transmission: string
    fuel: string
    seats: number
    doors: number
  }
  searchVehicle: VehicleSearchResult
}

function formatFeatureSlug(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function mapApiVehicleToCard(v: VehicleSearchResult): CarsPageCar {
  const primaryImage = v.images?.[0]?.trim() ? v.images[0] : placeholderCar
  return {
    id: v.id,
    make: v.make,
    model: v.model,
    year: v.year,
    price: v.pricePerDay,
    typeKey: v.type,
    categoryLabel: v.category.charAt(0).toUpperCase() + v.category.slice(1),
    image: primaryImage,
    features: v.features.map(formatFeatureSlug),
    specs: {
      transmission: v.transmission.charAt(0).toUpperCase() + v.transmission.slice(1),
      fuel: v.fuelType.charAt(0).toUpperCase() + v.fuelType.slice(1),
      seats: v.passengers,
      doors: 4,
    },
    searchVehicle: v,
  }
}

const CarsPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [selectedCarType, setSelectedCarType] = useState('all')
  const [selectedPriceRange, setSelectedPriceRange] = useState('All Prices')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    pickup: '',
    dropoff: '',
    pickupDate: '',
    dropoffDate: '',
  })

  const [cars, setCars] = useState<CarsPageCar[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const pickupLocation = searchParams.get('pickup') || 'LAX'
  const dropoffLocation = searchParams.get('dropoff') || 'LAX'
  const pickupDate = searchParams.get('pickupDate') || '2026-02-04'
  const dropoffDate = searchParams.get('dropoffDate') || '2026-03-26'

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.get<VehicleSearchResponse>('/vehicles/search', {
          params: {
            location: 'all',
            vehicleType: 'all',
            minPrice: 0,
            maxPrice: 100000,
            sortBy: 'price',
            sortOrder: 'asc',
            page: 1,
            limit: 100,
            startDate: pickupDate,
            endDate: dropoffDate,
          },
        })
        if (cancelled) return
        setCars((data.vehicles || []).map(mapApiVehicleToCard))
      } catch (e: unknown) {
        if (cancelled) return
        const message =
          typeof e === 'object' &&
          e !== null &&
          'response' in e &&
          typeof (e as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
            ? (e as { response: { data: { error: string } } }).response.data.error
            : 'Failed to load vehicles'
        setError(message)
        setCars([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [pickupDate, dropoffDate])

  const filteredCars = useMemo(() => {
    return cars.filter((car) => {
      const matchesCarType = selectedCarType === 'all' || car.typeKey === selectedCarType

      let matchesPriceRange = true
      if (selectedPriceRange === '$0 - $75') {
        matchesPriceRange = car.price <= 75
      } else if (selectedPriceRange === '$75 - $150') {
        matchesPriceRange = car.price > 75 && car.price <= 150
      } else if (selectedPriceRange === '$150+') {
        matchesPriceRange = car.price > 150
      }

      return matchesCarType && matchesPriceRange
    })
  }, [selectedCarType, selectedPriceRange, cars])

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return dateString
    }
  }

  const handleEditClick = () => {
    setEditForm({
      pickup: pickupLocation,
      dropoff: dropoffLocation,
      pickupDate: pickupDate,
      dropoffDate: dropoffDate,
    })
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditForm({
      pickup: '',
      dropoff: '',
      pickupDate: '',
      dropoffDate: '',
    })
  }

  const handleSaveEdit = () => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('pickup', editForm.pickup)
    newParams.set('dropoff', editForm.dropoff)
    newParams.set('pickupDate', editForm.pickupDate)
    newParams.set('dropoffDate', editForm.dropoffDate)

    navigate(`/cars?${newParams.toString()}`, { replace: true })
    setIsEditing(false)
  }

  const handleCarCardClick = (car: CarsPageCar) => {
    navigate(`/cars/${encodeURIComponent(car.id)}`, { state: { searchVehicle: car.searchVehicle } })
  }

  return (
    <div className="cars-page">
      <div className="container">
        <div className="page-header">
          <h1>Available Cars</h1>
          <p>Choose from our premium fleet of vehicles</p>
          {pickupDate && dropoffDate && (
            <div className="search-summary">
              {!isEditing ? (
                <>
                  <div className="search-details">
                    <span>
                      <strong>Pickup:</strong> {pickupLocation}
                    </span>
                    <span>
                      <strong>Drop-off:</strong> {dropoffLocation}
                    </span>
                    <span>
                      <strong>Dates:</strong> {formatDate(pickupDate)} - {formatDate(dropoffDate)}
                    </span>
                  </div>
                  <div className="summary-actions">
                    <div className="results-count">
                      {!loading && !error && `${filteredCars.length} cars available`}
                      {loading && 'Loading…'}
                      {error && '—'}
                    </div>
                    <button className="edit-search-btn" onClick={handleEditClick}>
                      Edit Search
                    </button>
                  </div>
                </>
              ) : (
                <div className="edit-search-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Pickup Location</label>
                      <input
                        type="text"
                        value={editForm.pickup}
                        onChange={(e) => setEditForm({ ...editForm, pickup: e.target.value })}
                        placeholder="Enter pickup location"
                      />
                    </div>
                    <div className="form-group">
                      <label>Drop-off Location</label>
                      <input
                        type="text"
                        value={editForm.dropoff}
                        onChange={(e) => setEditForm({ ...editForm, dropoff: e.target.value })}
                        placeholder="Enter drop-off location"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Pickup Date</label>
                      <input
                        type="date"
                        value={editForm.pickupDate}
                        onChange={(e) => setEditForm({ ...editForm, pickupDate: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Drop-off Date</label>
                      <input
                        type="date"
                        value={editForm.dropoffDate}
                        onChange={(e) => setEditForm({ ...editForm, dropoffDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button className="btn-save" onClick={handleSaveEdit}>
                      Save Changes
                    </button>
                    <button className="btn-cancel" onClick={handleCancelEdit}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="filters">
          <div className="filter-group">
            <label>Price Range</label>
            <select value={selectedPriceRange} onChange={(e) => setSelectedPriceRange(e.target.value)}>
              <option>All Prices</option>
              <option>$0 - $75</option>
              <option>$75 - $150</option>
              <option>$150+</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Car Type</label>
            <select value={selectedCarType} onChange={(e) => setSelectedCarType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="sedan">Sedan</option>
              <option value="suv">SUV</option>
              <option value="electric">Electric</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="no-results" role="alert">
            <h3>Could not load vehicles</h3>
            <p>{error}</p>
            <p>
              Check that the API is running (see <code>VITE_API_BASE_URL</code>) and try again.
            </p>
          </div>
        )}

        {!loading && !error && (
          <div className="cars-grid">
            {filteredCars.map((car) => (
              <div
                key={car.id}
                className="car-card clickable"
                onClick={() => handleCarCardClick(car)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleCarCardClick(car)
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="car-image-container">
                  <img
                    src={car.image}
                    alt={`${car.make} ${car.model}`}
                    onError={(ev) => {
                      const el = ev.target as HTMLImageElement
                      el.src = placeholderCar
                    }}
                  />
                  <div className="car-category">{car.categoryLabel}</div>
                </div>
                <div className="car-info">
                  <div className="car-header">
                    <h3>
                      {car.make} {car.model}
                    </h3>
                    <span className="car-year">{car.year}</span>
                  </div>

                  <div className="car-specs">
                    <div className="spec-item">
                      <span className="spec-icon">👥</span>
                      <span>{car.specs.seats} seats</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-icon">🚪</span>
                      <span>{car.specs.doors} doors</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-icon">⚙️</span>
                      <span>{car.specs.transmission}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-icon">⛽</span>
                      <span>{car.specs.fuel}</span>
                    </div>
                  </div>

                  <div className="car-features">
                    {car.features.map((feature) => (
                      <span key={feature} className="feature-tag">
                        {feature}
                      </span>
                    ))}
                  </div>

                  <div className="car-pricing">
                    <div className="price-info">
                      <span className="price">${car.price}</span>
                      <span className="price-period">/day</span>
                    </div>
                    <div className="car-select-btn">View Details</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="no-results">
            <p>Loading vehicles…</p>
          </div>
        )}

        {!loading && !error && filteredCars.length === 0 && (
          <div className="no-results">
            <h3>No cars found</h3>
            <p>Try adjusting your filters to see more options.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default CarsPage
