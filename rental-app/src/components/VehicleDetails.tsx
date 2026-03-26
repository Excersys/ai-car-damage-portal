import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './VehicleDetails.css';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  type: string;
  category: string;
  pricePerDay: number;
  pricePerWeek: number;
  pricePerMonth: number;
  location: string;
  locationDetails: {
    address: string;
    coordinates: { lat: number; lng: number };
    pickupInstructions: string;
  };
  features: string[];
  images: string[];
  rating: number;
  reviewCount: number;
  available: boolean;
  transmission: string;
  passengers: number;
  luggage: number;
  fuelType: string;
  range?: number;
  mpg?: number;
  chargeTime?: string;
  specifications: {
    acceleration: string;
    topSpeed: string;
    safety: string;
    technology: string;
  };
  policies: {
    minimumAge: number;
    insurance: string;
    cancellation: string;
    mileage: string;
  };
  reviews: Array<{
    id: string;
    rating: number;
    comment: string;
    author: string;
    date: string;
    verified: boolean;
  }>;
}

interface AvailabilityCheck {
  available: boolean;
  vehicleId: string;
  startDate: string;
  endDate: string;
  duration: string;
  pricing: {
    pricePerDay: number;
    duration: number;
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
  };
  conflictReason?: string;
  alternativeDates?: Array<{
    startDate: string;
    endDate: string;
  }>;
}

interface VehicleDetailsProps {
  vehicleId: string;
  onReserve?: (reservationData: any) => void;
  onBack?: () => void;
  initialDates?: {
    startDate: string;
    endDate: string;
  };
}

const VehicleDetails: React.FC<VehicleDetailsProps> = ({
  vehicleId,
  onReserve,
  onBack,
  initialDates = { startDate: '', endDate: '' }
}) => {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);
  
  // Availability checking
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState<AvailabilityCheck | null>(null);
  const [reserving, setReserving] = useState(false);
  
  // Form state
  const [startDate, setStartDate] = useState(initialDates.startDate);
  const [endDate, setEndDate] = useState(initialDates.endDate);
  const [customerInfo, setCustomerInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    fetchVehicleDetails();
  }, [vehicleId]);

  useEffect(() => {
    if (startDate && endDate && startDate !== endDate) {
      checkAvailability();
    }
  }, [startDate, endDate]);

  const fetchVehicleDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/vehicles/${vehicleId}`);
      setVehicle(response.data.vehicle);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load vehicle details');
      console.error('Error fetching vehicle details:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkAvailability = async () => {
    if (!startDate || !endDate) return;
    
    setCheckingAvailability(true);
    
    try {
      const response = await axios.post('/api/vehicles/availability', {
        vehicleId,
        startDate,
        endDate
      });
      
      setAvailabilityResult(response.data);
    } catch (err: any) {
      console.error('Error checking availability:', err);
      setAvailabilityResult(null);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleReserve = async () => {
    if (!availabilityResult || !availabilityResult.available) return;
    
    setReserving(true);
    
    try {
      const response = await axios.post('/api/vehicles/reserve', {
        vehicleId,
        startDate,
        endDate,
        customerInfo
      });
      
      onReserve?.(response.data);
    } catch (err: any) {
      console.error('Error creating reservation:', err);
      setError(err.response?.data?.error || 'Failed to create reservation');
    } finally {
      setReserving(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFeatureIcon = (feature: string) => {
    const icons: { [key: string]: string } = {
      'autopilot': '🤖',
      'navigation': '🗺️',
      'bluetooth': '📱',
      'wifi': '📶',
      'premium-audio': '🎵',
      'leather-seats': '🪑',
      'sunroof': '☀️',
      'heated-seats': '🔥',
      'backup-camera': '📹',
      'performance-package': '⚡'
    };
    return icons[feature] || '✨';
  };

  if (loading) {
    return (
      <div className="vehicle-details loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading vehicle details...</p>
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="vehicle-details error">
        <div className="error-message">
          <span>⚠️</span>
          <h3>Error Loading Vehicle</h3>
          <p>{error || 'Vehicle not found'}</p>
          <button onClick={onBack}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="vehicle-details">
      {/* Header */}
      <div className="vehicle-header">
        <button className="back-button" onClick={onBack}>
          ← Back to Search
        </button>
        <div className="vehicle-title">
          <h1>{vehicle.make} {vehicle.model}</h1>
          <div className="vehicle-meta">
            <span className="year">{vehicle.year}</span>
            <span className="category">{vehicle.category}</span>
            <span className="location">📍 {vehicle.location.replace('-', ' ')}</span>
          </div>
        </div>
      </div>

      <div className="vehicle-content">
        {/* Image Gallery */}
        <div className="image-gallery">
          <div className="main-image">
            <img 
              src={vehicle.images[selectedImageIndex] || '/placeholder-car.jpg'}
              alt={`${vehicle.make} ${vehicle.model}`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-car.jpg';
              }}
            />
          </div>
          {vehicle.images.length > 1 && (
            <div className="image-thumbnails">
              {vehicle.images.map((image, index) => (
                <button
                  key={index}
                  className={`thumbnail ${index === selectedImageIndex ? 'active' : ''}`}
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <img 
                    src={image} 
                    alt={`${vehicle.make} ${vehicle.model} view ${index + 1}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-car.jpg';
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Vehicle Info */}
        <div className="vehicle-info">
          {/* Quick Stats */}
          <div className="quick-stats">
            <div className="stat">
              <span className="icon">👥</span>
              <span className="value">{vehicle.passengers}</span>
              <span className="label">Passengers</span>
            </div>
            <div className="stat">
              <span className="icon">🧳</span>
              <span className="value">{vehicle.luggage}</span>
              <span className="label">Bags</span>
            </div>
            <div className="stat">
              <span className="icon">⚙️</span>
              <span className="value">{vehicle.transmission}</span>
              <span className="label">Transmission</span>
            </div>
            <div className="stat">
              <span className="icon">{vehicle.fuelType === 'electric' ? '🔋' : '⛽'}</span>
              <span className="value">
                {vehicle.fuelType === 'electric' ? `${vehicle.range} mi` : `${vehicle.mpg} MPG`}
              </span>
              <span className="label">{vehicle.fuelType === 'electric' ? 'Range' : 'Fuel Economy'}</span>
            </div>
          </div>

          {/* Rating */}
          <div className="rating-section">
            <div className="rating">
              <div className="stars">
                {'★'.repeat(Math.floor(vehicle.rating))}
                {'☆'.repeat(5 - Math.floor(vehicle.rating))}
              </div>
              <span className="rating-text">
                {vehicle.rating} ({vehicle.reviewCount} reviews)
              </span>
            </div>
          </div>

          {/* Features */}
          <div className="features-section">
            <h3>Features & Amenities</h3>
            <div className="features-grid">
              {vehicle.features.map(feature => (
                <div key={feature} className="feature-item">
                  <span className="feature-icon">{getFeatureIcon(feature)}</span>
                  <span className="feature-name">
                    {feature.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Specifications */}
          <div className="specifications-section">
            <h3>Specifications</h3>
            <div className="specs-grid">
              <div className="spec-item">
                <span className="spec-label">Acceleration</span>
                <span className="spec-value">{vehicle.specifications.acceleration}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Top Speed</span>
                <span className="spec-value">{vehicle.specifications.topSpeed}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Safety Rating</span>
                <span className="spec-value">{vehicle.specifications.safety}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Technology</span>
                <span className="spec-value">{vehicle.specifications.technology}</span>
              </div>
              {vehicle.chargeTime && (
                <div className="spec-item">
                  <span className="spec-label">Charge Time</span>
                  <span className="spec-value">{vehicle.chargeTime}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Booking Panel */}
        <div className="booking-panel">
          <div className="pricing-info">
            <div className="price-display">
              <span className="price">{formatPrice(vehicle.pricePerDay)}</span>
              <span className="period">per day</span>
            </div>
            <div className="pricing-options">
              <div className="price-option">
                <span>Weekly: {formatPrice(vehicle.pricePerWeek)}</span>
              </div>
              <div className="price-option">
                <span>Monthly: {formatPrice(vehicle.pricePerMonth)}</span>
              </div>
            </div>
          </div>

          {/* Date Selection */}
          <div className="date-selection">
            <h4>Select Rental Dates</h4>
            <div className="date-inputs">
              <div className="date-input">
                <label>Pick-up Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="date-input">
                <label>Return Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </div>

          {/* Availability Result */}
          {checkingAvailability && (
            <div className="availability-checking">
              <div className="spinner small"></div>
              <span>Checking availability...</span>
            </div>
          )}

          {availabilityResult && (
            <div className={`availability-result ${availabilityResult.available ? 'available' : 'unavailable'}`}>
              {availabilityResult.available ? (
                <>
                  <div className="availability-header">
                    <span className="status-icon">✅</span>
                    <span>Available for {availabilityResult.duration}</span>
                  </div>
                  <div className="pricing-breakdown">
                    <div className="price-line">
                      <span>{formatPrice(availabilityResult.pricing.pricePerDay)} × {availabilityResult.pricing.duration} days</span>
                      <span>{formatPrice(availabilityResult.pricing.subtotal)}</span>
                    </div>
                    <div className="price-line">
                      <span>Taxes & fees</span>
                      <span>{formatPrice(availabilityResult.pricing.tax)}</span>
                    </div>
                    <div className="price-line total">
                      <span>Total</span>
                      <span>{formatPrice(availabilityResult.pricing.total)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="availability-header">
                    <span className="status-icon">❌</span>
                    <span>Not Available</span>
                  </div>
                  {availabilityResult.conflictReason && (
                    <p className="conflict-reason">{availabilityResult.conflictReason}</p>
                  )}
                  {availabilityResult.alternativeDates && (
                    <div className="alternative-dates">
                      <h5>Available Alternative Dates:</h5>
                      {availabilityResult.alternativeDates.map((dates, index) => (
                        <button
                          key={index}
                          className="alt-date-btn"
                          onClick={() => {
                            setStartDate(dates.startDate);
                            setEndDate(dates.endDate);
                          }}
                        >
                          {formatDate(dates.startDate)} - {formatDate(dates.endDate)}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Customer Info Form */}
          {availabilityResult?.available && (
            <div className="customer-info">
              <h4>Contact Information</h4>
              <div className="info-inputs">
                <div className="input-row">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={customerInfo.firstName}
                    onChange={(e) => setCustomerInfo({...customerInfo, firstName: e.target.value})}
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={customerInfo.lastName}
                    onChange={(e) => setCustomerInfo({...customerInfo, lastName: e.target.value})}
                  />
                </div>
                <input
                  type="email"
                  placeholder="Email Address"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                />
              </div>
            </div>
          )}

          {/* Reserve Button */}
          {availabilityResult?.available && (
            <button 
              className="reserve-btn"
              onClick={handleReserve}
              disabled={reserving || !customerInfo.firstName || !customerInfo.lastName || !customerInfo.email}
            >
              {reserving ? (
                <>
                  <div className="spinner small"></div>
                  Creating Reservation...
                </>
              ) : (
                'Reserve Now'
              )}
            </button>
          )}

          {/* Pickup Info */}
          <div className="pickup-info">
            <h4>Pickup Location</h4>
            <div className="location-details">
              <p className="address">{vehicle.locationDetails.address}</p>
              <p className="instructions">{vehicle.locationDetails.pickupInstructions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="reviews-section">
        <div className="reviews-header">
          <h3>Customer Reviews ({vehicle.reviewCount})</h3>
          <div className="overall-rating">
            <div className="stars">
              {'★'.repeat(Math.floor(vehicle.rating))}
              {'☆'.repeat(5 - Math.floor(vehicle.rating))}
            </div>
            <span>{vehicle.rating} out of 5</span>
          </div>
        </div>

        <div className="reviews-list">
          {vehicle.reviews.slice(0, showAllReviews ? undefined : 3).map(review => (
            <div key={review.id} className="review-item">
              <div className="review-header">
                <div className="reviewer-info">
                  <span className="reviewer-name">{review.author}</span>
                  {review.verified && <span className="verified-badge">✓ Verified</span>}
                </div>
                <div className="review-meta">
                  <div className="review-stars">
                    {'★'.repeat(review.rating)}
                    {'☆'.repeat(5 - review.rating)}
                  </div>
                  <span className="review-date">{formatDate(review.date)}</span>
                </div>
              </div>
              <p className="review-comment">{review.comment}</p>
            </div>
          ))}
        </div>

        {vehicle.reviews.length > 3 && (
          <button 
            className="show-more-reviews"
            onClick={() => setShowAllReviews(!showAllReviews)}
          >
            {showAllReviews ? 'Show Less' : `Show All ${vehicle.reviewCount} Reviews`}
          </button>
        )}
      </div>

      {/* Policies Section */}
      <div className="policies-section">
        <h3>Rental Policies</h3>
        <div className="policies-grid">
          <div className="policy-item">
            <h4>Age Requirement</h4>
            <p>Minimum age: {vehicle.policies.minimumAge} years</p>
          </div>
          <div className="policy-item">
            <h4>Insurance</h4>
            <p>{vehicle.policies.insurance}</p>
          </div>
          <div className="policy-item">
            <h4>Cancellation</h4>
            <p>{vehicle.policies.cancellation}</p>
          </div>
          <div className="policy-item">
            <h4>Mileage</h4>
            <p>{vehicle.policies.mileage}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleDetails;