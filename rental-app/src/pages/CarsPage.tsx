import React, { useState, useMemo } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'

// Import car images
import teslaModel3 from '../images/SFAR.rendition.vlarge.png'
import bmwX5 from '../images/IFAR.rendition.vlarge.png'
import toyotaCamry from '../images/CCAR.rendition.vlarge.png'
import fordExplorer from '../images/FRAR.rendition.vlarge.png'
import jeepWrangler from '../images/IJAR.rendition.vlarge.png'

interface Car {
  id: number
  make: string
  model: string
  year: number
  price: number
  type: string
  category: string
  image: string
  features: string[]
  specs: {
    transmission: string
    fuel: string
    seats: number
    doors: number
  }
}

const CarsPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [selectedCarType, setSelectedCarType] = useState('All Types')
  const [selectedPriceRange, setSelectedPriceRange] = useState('All Prices')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    pickup: '',
    dropoff: '',
    pickupDate: '',
    dropoffDate: ''
  })

  const mockCars: Car[] = [
    {
      id: 1,
      make: 'Tesla',
      model: 'Model 3',
      year: 2023,
      price: 89,
      type: 'Electric',
      category: 'Luxury Sedan',
      image: teslaModel3,
      features: ['Electric', 'Autopilot', 'Premium Interior'],
      specs: { transmission: 'Automatic', fuel: 'Electric', seats: 5, doors: 4 }
    },
    {
      id: 2,
      make: 'BMW',
      model: 'X5',
      year: 2023,
      price: 125,
      type: 'SUV',
      category: 'Luxury SUV',
      image: bmwX5,
      features: ['Luxury', 'AWD', 'Panoramic Roof'],
      specs: { transmission: 'Automatic', fuel: 'Gasoline', seats: 7, doors: 4 }
    },
    {
      id: 3,
      make: 'Toyota',
      model: 'Camry',
      year: 2023,
      price: 65,
      type: 'Sedan',
      category: 'Mid-size Sedan',
      image: toyotaCamry,
      features: ['Hybrid', 'Fuel Efficient', 'Safety Sense'],
      specs: { transmission: 'Automatic', fuel: 'Hybrid', seats: 5, doors: 4 }
    },
    {
      id: 4,
      make: 'Ford',
      model: 'Explorer',
      year: 2023,
      price: 95,
      type: 'SUV',
      category: 'Full-size SUV',
      image: fordExplorer,
      features: ['3rd Row', 'Towing Package', 'Co-Pilot360'],
      specs: { transmission: 'Automatic', fuel: 'Gasoline', seats: 7, doors: 4 }
    },
    {
      id: 5,
      make: 'Chevrolet',
      model: 'Malibu',
      year: 2023,
      price: 55,
      type: 'Sedan',
      category: 'Compact Sedan',
      image: toyotaCamry,
      features: ['Fuel Efficient', 'Apple CarPlay', 'OnStar'],
      specs: { transmission: 'Automatic', fuel: 'Gasoline', seats: 5, doors: 4 }
    },
    {
      id: 6,
      make: 'Jeep',
      model: 'Wrangler',
      year: 2023,
      price: 85,
      type: 'SUV',
      category: 'Off-road SUV',
      image: jeepWrangler,
      features: ['4x4', 'Removable Top', 'Trail Rated'],
      specs: { transmission: 'Manual', fuel: 'Gasoline', seats: 4, doors: 2 }
    },
    {
      id: 7,
      make: 'Nissan',
      model: 'Leaf',
      year: 2023,
      price: 75,
      type: 'Electric',
      category: 'Electric Compact',
      image: teslaModel3,
      features: ['Electric', '150 Mile Range', 'ProPILOT'],
      specs: { transmission: 'Automatic', fuel: 'Electric', seats: 5, doors: 4 }
    },
    {
      id: 8,
      make: 'Mercedes',
      model: 'E-Class',
      year: 2023,
      price: 145,
      type: 'Sedan',
      category: 'Luxury Sedan',
      image: bmwX5,
      features: ['Luxury', 'MBUX', 'Driver Assist'],
      specs: { transmission: 'Automatic', fuel: 'Gasoline', seats: 5, doors: 4 }
    }
  ]

  const filteredCars = useMemo(() => {
    const result = mockCars.filter(car => {
      const matchesCarType = selectedCarType === 'All Types' || car.type === selectedCarType
      
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
    return result
  }, [selectedCarType, selectedPriceRange, mockCars])

  // Extract pickup/dropoff info from URL params
  const pickupLocation = searchParams.get('pickup') || 'LAX'
  const dropoffLocation = searchParams.get('dropoff') || 'LAX'
  const pickupDate = searchParams.get('pickupDate') || '2026-02-04'
  const dropoffDate = searchParams.get('dropoffDate') || '2026-03-26'

  // Format dates safely
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
      dropoffDate: dropoffDate
    })
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditForm({
      pickup: '',
      dropoff: '',
      pickupDate: '',
      dropoffDate: ''
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

  const handleCarCardClick = (carId: number) => {
    navigate(`/cars/${carId}`)
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
                    <span><strong>Pickup:</strong> {pickupLocation}</span>
                    <span><strong>Drop-off:</strong> {dropoffLocation}</span>
                    <span><strong>Dates:</strong> {formatDate(pickupDate)} - {formatDate(dropoffDate)}</span>
                  </div>
                  <div className="summary-actions">
                    <div className="results-count">
                      {filteredCars.length} cars available
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
                        onChange={(e) => setEditForm({...editForm, pickup: e.target.value})}
                        placeholder="Enter pickup location"
                      />
                    </div>
                    <div className="form-group">
                      <label>Drop-off Location</label>
                      <input
                        type="text"
                        value={editForm.dropoff}
                        onChange={(e) => setEditForm({...editForm, dropoff: e.target.value})}
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
                        onChange={(e) => setEditForm({...editForm, pickupDate: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Drop-off Date</label>
                      <input
                        type="date"
                        value={editForm.dropoffDate}
                        onChange={(e) => setEditForm({...editForm, dropoffDate: e.target.value})}
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
            <select 
              value={selectedPriceRange} 
              onChange={(e) => setSelectedPriceRange(e.target.value)}
            >
              <option>All Prices</option>
              <option>$0 - $75</option>
              <option>$75 - $150</option>
              <option>$150+</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Car Type</label>
            <select 
              value={selectedCarType} 
              onChange={(e) => setSelectedCarType(e.target.value)}
            >
              <option>All Types</option>
              <option>Sedan</option>
              <option>SUV</option>
              <option>Electric</option>
            </select>
          </div>
        </div>

        <div className="cars-grid">
          {filteredCars.map(car => (
            <div key={car.id} className="car-card clickable" onClick={() => handleCarCardClick(car.id)}>
              <div className="car-image-container">
                <img src={car.image} alt={`${car.make} ${car.model}`} />
                <div className="car-category">{car.category}</div>
              </div>
              <div className="car-info">
                <div className="car-header">
                  <h3>{car.make} {car.model}</h3>
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
                  {car.features.map(feature => (
                    <span key={feature} className="feature-tag">{feature}</span>
                  ))}
                </div>
                
                <div className="car-pricing">
                  <div className="price-info">
                    <span className="price">${car.price}</span>
                    <span className="price-period">/day</span>
                  </div>
                  <div className="car-select-btn">
                    View Details
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredCars.length === 0 && (
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