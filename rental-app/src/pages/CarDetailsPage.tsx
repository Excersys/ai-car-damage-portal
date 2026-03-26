import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

// Import car images
import teslaModel3 from '../images/SFAR.rendition.vlarge.png'
import bmwX5 from '../images/IFAR.rendition.vlarge.png'
import toyotaCamry from '../images/CCAR.rendition.vlarge.png'
import fordExplorer from '../images/FRAR.rendition.vlarge.png'
import jeepWrangler from '../images/IJAR.rendition.vlarge.png'

const CarDetailsPage: React.FC = () => {
  const { carId } = useParams()
  const navigate = useNavigate()
  
  // Mock car data - in real app, this would come from API
  const mockCars: { [key: string]: any } = {
    '1': {
      id: 1,
      make: 'Tesla',
      model: 'Model 3',
      year: 2023,
      price: 89,
      image: teslaModel3,
      gallery: [
        teslaModel3,
        teslaModel3,
        teslaModel3,
        teslaModel3
      ],
      features: ['Electric', 'Autopilot', 'Premium Interior', 'Supercharging'],
      specs: {
        engine: 'Electric Motor',
        transmission: 'Single Speed',
        fuelType: 'Electric',
        seats: 5,
        doors: 4,
        luggage: '15 cu ft',
        range: '358 miles'
      },
      description: 'Experience the future of driving with Tesla Model 3. This premium electric vehicle offers exceptional performance, cutting-edge technology, and zero emissions.',
      location: 'San Francisco, CA',
      rating: 4.8,
      reviews: 156
    },
    '2': {
      id: 2,
      make: 'BMW',
      model: 'X5',
      year: 2023,
      price: 125,
      image: bmwX5,
      gallery: [
        bmwX5,
        bmwX5,
        bmwX5,
        bmwX5
      ],
      features: ['Luxury', 'AWD', 'Panoramic Roof', 'Premium Sound'],
      specs: {
        engine: '3.0L Turbo I6',
        transmission: '8-Speed Automatic',
        fuelType: 'Gasoline',
        seats: 7,
        doors: 5,
        luggage: '33.9 cu ft',
        mpg: '23 city / 29 hwy'
      },
      description: 'The BMW X5 combines luxury, performance, and versatility in one impressive package. Perfect for family adventures or business travel.',
      location: 'Los Angeles, CA',
      rating: 4.7,
      reviews: 203
    },
    '3': {
      id: 3,
      make: 'Toyota',
      model: 'Camry',
      year: 2023,
      price: 65,
      image: toyotaCamry,
      gallery: [
        toyotaCamry,
        toyotaCamry,
        toyotaCamry,
        toyotaCamry
      ],
      features: ['Hybrid', 'Fuel Efficient', 'Safety Sense', 'Apple CarPlay'],
      specs: {
        engine: '2.5L Hybrid I4',
        transmission: 'CVT',
        fuelType: 'Hybrid',
        seats: 5,
        doors: 4,
        luggage: '15.1 cu ft',
        mpg: '51 city / 53 hwy'
      },
      description: 'The Toyota Camry Hybrid offers exceptional fuel economy without compromising on comfort or reliability. Perfect for daily commuting and long road trips.',
      location: 'Seattle, WA',
      rating: 4.6,
      reviews: 89
    },
    '4': {
      id: 4,
      make: 'Ford',
      model: 'Explorer',
      year: 2023,
      price: 95,
      image: fordExplorer,
      gallery: [
        fordExplorer,
        fordExplorer,
        fordExplorer,
        fordExplorer
      ],
      features: ['3rd Row', 'Towing Package', 'Co-Pilot360', 'AWD'],
      specs: {
        engine: '2.3L EcoBoost I4',
        transmission: '10-Speed Automatic',
        fuelType: 'Gasoline',
        seats: 7,
        doors: 4,
        luggage: '18.2 cu ft',
        mpg: '21 city / 28 hwy'
      },
      description: 'The Ford Explorer offers spacious seating for seven and impressive towing capacity. Perfect for family road trips and adventures.',
      location: 'Denver, CO',
      rating: 4.5,
      reviews: 134
    },
    '5': {
      id: 5,
      make: 'Chevrolet',
      model: 'Malibu',
      year: 2023,
      price: 55,
      image: toyotaCamry,
      gallery: [
        toyotaCamry,
        toyotaCamry,
        toyotaCamry,
        toyotaCamry
      ],
      features: ['Fuel Efficient', 'Apple CarPlay', 'OnStar', 'WiFi Hotspot'],
      specs: {
        engine: '1.5L Turbo I4',
        transmission: 'CVT',
        fuelType: 'Gasoline',
        seats: 5,
        doors: 4,
        luggage: '15.8 cu ft',
        mpg: '29 city / 36 hwy'
      },
      description: 'The Chevrolet Malibu delivers impressive fuel economy and modern technology in a comfortable, well-designed package.',
      location: 'Chicago, IL',
      rating: 4.3,
      reviews: 78
    },
    '6': {
      id: 6,
      make: 'Jeep',
      model: 'Wrangler',
      year: 2023,
      price: 85,
      image: jeepWrangler,
      gallery: [
        jeepWrangler,
        jeepWrangler,
        jeepWrangler,
        jeepWrangler
      ],
      features: ['4x4', 'Removable Top', 'Trail Rated', 'Rock Rails'],
      specs: {
        engine: '3.6L V6',
        transmission: '8-Speed Automatic',
        fuelType: 'Gasoline',
        seats: 4,
        doors: 2,
        luggage: '12.9 cu ft',
        mpg: '18 city / 23 hwy'
      },
      description: 'The Jeep Wrangler is built for adventure with unmatched off-road capability and iconic design that stands out anywhere.',
      location: 'Phoenix, AZ',
      rating: 4.7,
      reviews: 145
    },
    '7': {
      id: 7,
      make: 'Nissan',
      model: 'Leaf',
      year: 2023,
      price: 75,
      image: teslaModel3,
      gallery: [
        teslaModel3,
        teslaModel3,
        teslaModel3,
        teslaModel3
      ],
      features: ['Electric', '150 Mile Range', 'ProPILOT', 'e-Pedal'],
      specs: {
        engine: 'Electric Motor',
        transmission: 'Single Speed',
        fuelType: 'Electric',
        seats: 5,
        doors: 4,
        luggage: '23.6 cu ft',
        range: '150 miles'
      },
      description: 'The Nissan Leaf makes electric driving accessible and enjoyable with advanced technology and eco-friendly performance.',
      location: 'Portland, OR',
      rating: 4.4,
      reviews: 92
    },
    '8': {
      id: 8,
      make: 'Mercedes',
      model: 'E-Class',
      year: 2023,
      price: 145,
      image: bmwX5,
      gallery: [
        bmwX5,
        bmwX5,
        bmwX5,
        bmwX5
      ],
      features: ['Luxury', 'MBUX', 'Driver Assist', 'Premium Sound'],
      specs: {
        engine: '2.0L Turbo I4',
        transmission: '9-Speed Automatic',
        fuelType: 'Gasoline',
        seats: 5,
        doors: 4,
        luggage: '13.1 cu ft',
        mpg: '23 city / 32 hwy'
      },
      description: 'The Mercedes E-Class represents the pinnacle of luxury sedans with cutting-edge technology and refined performance.',
      location: 'Miami, FL',
      rating: 4.9,
      reviews: 167
    }
  }

  const car = mockCars[carId || '1']
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedOptions, setSelectedOptions] = useState<{[key: string]: boolean}>({})
  
  // Available rental options
  const rentalOptions = [
    { id: 'gps', name: 'GPS Navigation', price: 8, description: 'Built-in GPS with real-time traffic updates' },
    { id: 'childSeat', name: 'Child Car Seat', price: 12, description: 'Safety-certified child seat (specify age when booking)' },
    { id: 'boosterSeat', name: 'Booster Seat', price: 8, description: 'For children 4-8 years old' },
    { id: 'extraDriver', name: 'Additional Driver', price: 15, description: 'Add a second authorized driver' },
    { id: 'insurance', name: 'Full Coverage Insurance', price: 25, description: 'Zero deductible comprehensive coverage' },
    { id: 'roadside', name: '24/7 Roadside Assistance', price: 6, description: 'Emergency towing and support' },
    { id: 'wifi', name: 'Mobile WiFi Hotspot', price: 10, description: 'High-speed internet for up to 5 devices' },
    { id: 'skiRack', name: 'Ski/Snowboard Rack', price: 15, description: 'Roof-mounted equipment carrier' },
    { id: 'bikeRack', name: 'Bike Rack', price: 12, description: 'Rear-mounted bike carrier (up to 2 bikes)' }
  ]

  if (!car) {
    return <div>Car not found</div>
  }

  const handleOptionToggle = (optionId: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionId]: !prev[optionId]
    }))
  }

  const calculateOptionsTotal = () => {
    return rentalOptions.reduce((total, option) => {
      return total + (selectedOptions[option.id] ? option.price : 0)
    }, 0)
  }

  const getTotalPrice = () => {
    return car.price + calculateOptionsTotal()
  }

  const handleBookNow = () => {
    const selectedOptionsList = rentalOptions.filter(option => selectedOptions[option.id])
    navigate(`/book/${car.id}`, { 
      state: { 
        car, 
        selectedOptions: selectedOptionsList,
        totalPrice: getTotalPrice()
      }
    })
  }

  return (
    <div className="car-details-page">
      <div className="container">
        <div className="car-details-grid">
          {/* Image Gallery */}
          <div className="car-gallery">
            <div className="main-image">
              <img src={car.gallery[selectedImageIndex]} alt={`${car.make} ${car.model}`} />
            </div>
            <div className="thumbnail-grid">
              {car.gallery.map((image: string, index: number) => (
                <img
                  key={index}
                  src={image}
                  alt={`${car.make} ${car.model} view ${index + 1}`}
                  className={selectedImageIndex === index ? 'active' : ''}
                  onClick={() => setSelectedImageIndex(index)}
                />
              ))}
            </div>
          </div>

          {/* Car Information */}
          <div className="car-info-section">
            <div className="car-header">
              <h1>{car.make} {car.model}</h1>
              <div className="car-meta">
                <span className="year">{car.year}</span>
                <span className="location">📍 {car.location}</span>
                <div className="rating">
                  <span className="stars">⭐ {car.rating}</span>
                  <span className="reviews">({car.reviews} reviews)</span>
                </div>
              </div>
            </div>

            <div className="car-description">
              <p>{car.description}</p>
            </div>

            <div className="car-features">
              <h3>Features</h3>
              <div className="features-grid">
                {car.features.map((feature: string) => (
                  <span key={feature} className="feature-tag">{feature}</span>
                ))}
              </div>
            </div>

            <div className="car-specs">
              <h3>Specifications</h3>
              <div className="specs-grid">
                <div className="spec-item">
                  <span className="spec-label">Engine</span>
                  <span className="spec-value">{car.specs.engine}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Transmission</span>
                  <span className="spec-value">{car.specs.transmission}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Fuel Type</span>
                  <span className="spec-value">{car.specs.fuelType}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Seats</span>
                  <span className="spec-value">{car.specs.seats}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Doors</span>
                  <span className="spec-value">{car.specs.doors}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Luggage</span>
                  <span className="spec-value">{car.specs.luggage}</span>
                </div>
                {car.specs.mpg && (
                  <div className="spec-item">
                    <span className="spec-label">MPG</span>
                    <span className="spec-value">{car.specs.mpg}</span>
                  </div>
                )}
                {car.specs.range && (
                  <div className="spec-item">
                    <span className="spec-label">Range</span>
                    <span className="spec-value">{car.specs.range}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Rental Options */}
            <div className="rental-options">
              <h3>Add-on Options</h3>
              <div className="options-grid">
                {rentalOptions.map(option => (
                  <div key={option.id} className="option-item">
                    <label className="option-label">
                      <input
                        type="checkbox"
                        checked={selectedOptions[option.id] || false}
                        onChange={() => handleOptionToggle(option.id)}
                        className="option-checkbox"
                      />
                      <div className="option-content">
                        <div className="option-header">
                          <span className="option-name">{option.name}</span>
                          <span className="option-price">+${option.price}/day</span>
                        </div>
                        <span className="option-description">{option.description}</span>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              {calculateOptionsTotal() > 0 && (
                <div className="options-summary">
                  <div className="options-total">
                    <span>Add-ons Total: <strong>+${calculateOptionsTotal()}/day</strong></span>
                  </div>
                </div>
              )}
            </div>

            {/* Booking Card */}
            <div className="booking-card">
              <div className="pricing">
                {calculateOptionsTotal() > 0 ? (
                  <div className="price-breakdown">
                    <div className="base-price">
                      <span className="price">${car.price}</span>
                      <span className="price-unit">base rate</span>
                    </div>
                    <div className="total-price">
                      <span className="price">${getTotalPrice()}</span>
                      <span className="price-unit">total per day</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="price">${car.price}</span>
                    <span className="price-unit">per day</span>
                  </>
                )}
              </div>
              <button className="btn btn-primary btn-large btn-full" onClick={handleBookNow}>
                Book Now
              </button>
              <div className="booking-features">
                <div className="booking-feature">
                  <span className="feature-icon">🚗</span>
                  <span>Free cancellation</span>
                </div>
                <div className="booking-feature">
                  <span className="feature-icon">🛡️</span>
                  <span>Full insurance included</span>
                </div>
                <div className="booking-feature">
                  <span className="feature-icon">📱</span>
                  <span>24/7 support</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CarDetailsPage