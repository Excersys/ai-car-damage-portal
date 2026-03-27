import React from 'react'
import { useLocation, useParams, Link } from 'react-router-dom'

function humanizeAddonId(id: string): string {
  return id
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()
}

const BookingConfirmationPage: React.FC = () => {
  const location = useLocation()
  const { bookingId: bookingIdParam } = useParams()

  const { booking, car, pricing, totalDays, bookingId: confirmationId } = location.state || {}

  if (!booking || !car || !pricing || totalDays == null) {
    return (
      <div className="booking-confirmation-page">
        <div className="container">
          <div className="error-message">
            <h2>Booking not found</h2>
            <p>We couldn't find your booking details.</p>
            <Link to="/cars" className="btn btn-primary">Browse Cars</Link>
          </div>
        </div>
      </div>
    )
  }

  const locations = [
    { id: 'main-office', name: 'Main Office - Downtown', address: '123 Main St, San Francisco, CA' },
    { id: 'airport', name: 'San Francisco Airport (SFO)', address: 'San Francisco International Airport' },
    { id: 'hotel-pickup', name: 'Hotel Pickup Service', address: 'We\'ll pick up from your hotel' }
  ]

  const insuranceOptions = [
    { id: 'basic', name: 'Basic Protection', price: 15, description: 'Collision Damage Waiver with deductible' },
    { id: 'standard', name: 'Standard Protection', price: 25, description: 'CDW + theft protection' },
    { id: 'premium', name: 'Premium Protection', price: 35, description: 'Zero deductible + personal accident coverage' },
  ]

  const addOnOptions = [
    { id: 'gps', name: 'GPS Navigation', price: 8, description: 'Turn-by-turn navigation system' },
    { id: 'wifi', name: 'Mobile WiFi', price: 12, description: 'Stay connected on the road' },
    { id: 'mobile-wifi', name: 'Mobile WiFi Hotspot', price: 10, description: 'High-speed internet for multiple devices' },
    { id: 'child-seat', name: 'Child Safety Seat', price: 15, description: 'For children 2-8 years old' },
    { id: 'childSeat', name: 'Child Car Seat', price: 12, description: 'Safety-certified child seat' },
    { id: 'boosterSeat', name: 'Booster Seat', price: 8, description: 'For children 4-8 years old' },
    { id: 'additional-driver', name: 'Additional Driver', price: 20, description: 'Add a second authorized driver' },
    { id: 'extraDriver', name: 'Additional Driver', price: 15, description: 'Add a second authorized driver' },
    { id: 'roadside', name: '24/7 Roadside Assistance', price: 6, description: 'Emergency towing and support' },
  ]

  const addOnIds = booking.addOns ?? []
  const bookingReference = bookingIdParam || confirmationId || '—'

  const pickupPlace = locations.find(l => l.id === booking.pickupLocation)
  const returnPlace = locations.find(l => l.id === booking.returnLocation)
  const pickupName = pickupPlace?.name ?? String(booking.pickupLocation)
  const pickupAddress = pickupPlace?.address ?? ''
  const returnName = returnPlace?.name ?? String(booking.returnLocation)
  const returnAddress = returnPlace?.address ?? ''

  const insuranceMeta = insuranceOptions.find(opt => opt.id === booking.insuranceType)

  const handleDownloadReceipt = () => {
    // In real app, this would generate a PDF
    alert('Receipt download feature would be implemented here')
  }

  const handleAddToCalendar = () => {
    // In real app, this would create calendar events
    alert('Add to calendar feature would be implemented here')
  }

  return (
    <div className="booking-confirmation-page">
      <div className="container">
        <div className="confirmation-header">
          <div className="success-icon">✅</div>
          <h1>Booking Confirmed!</h1>
          <p>Your reservation has been successfully created</p>
          <div className="booking-reference">
            <span>Booking Reference: <strong>{bookingReference}</strong></span>
          </div>
        </div>

        <div className="confirmation-content">
          <div className="confirmation-details">
            {/* Car Information */}
            <div className="detail-section">
              <h2>Vehicle Details</h2>
              <div className="car-info-card">
                <img src={car.image} alt={`${car.make} ${car.model}`} />
                <div className="car-details">
                  <h3>{car.make} {car.model}</h3>
                  <p>Premium vehicle with modern features</p>
                  <div className="car-features">
                    <span className="feature">🚗 Automatic</span>
                    <span className="feature">❄️ AC</span>
                    <span className="feature">🔒 Keyless Entry</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rental Details */}
            <div className="detail-section">
              <h2>Rental Information</h2>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Pickup Date & Time</span>
                  <span className="info-value">
                    {new Date(booking.pickupDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })} at {booking.pickupTime}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Return Date & Time</span>
                  <span className="info-value">
                    {new Date(booking.returnDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })} at {booking.returnTime}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Rental Duration</span>
                  <span className="info-value">{totalDays} day{totalDays !== 1 ? 's' : ''}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Driver Age</span>
                  <span className="info-value">{booking.driverAge} years</span>
                </div>
              </div>
            </div>

            {/* Location Details */}
            <div className="detail-section">
              <h2>Pickup & Return Locations</h2>
              <div className="location-details">
                <div className="location-card">
                  <h4>📍 Pickup Location</h4>
                  <p className="location-name">{pickupName}</p>
                  {pickupAddress ? <p className="location-address">{pickupAddress}</p> : null}
                </div>
                <div className="location-card">
                  <h4>📍 Return Location</h4>
                  <p className="location-name">{returnName}</p>
                  {returnAddress ? <p className="location-address">{returnAddress}</p> : null}
                </div>
              </div>
            </div>

            {/* Insurance & Add-ons */}
            <div className="detail-section">
              <h2>Coverage & Additional Services</h2>
              <div className="services-list">
                <div className="service-item">
                  <h4>🛡️ Insurance Coverage</h4>
                  <p>{insuranceMeta?.name ?? humanizeAddonId(String(booking.insuranceType || ''))}</p>
                  <span className="service-description">
                    {insuranceMeta?.description ?? ''}
                  </span>
                </div>
                {addOnIds.length > 0 && (
                  <div className="service-item">
                    <h4>➕ Additional Services</h4>
                    <ul className="addon-list">
                      {addOnIds.map((addOnId: string) => {
                        const addOn = addOnOptions.find(opt => opt.id === addOnId)
                        return (
                          <li key={addOnId}>
                            <span className="addon-name">
                              {addOn ? addOn.name : humanizeAddonId(addOnId)}
                            </span>
                            <span className="addon-description">
                              {addOn?.description ?? ''}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Important Information */}
            <div className="detail-section">
              <h2>Important Information</h2>
              <div className="important-info">
                <div className="info-card">
                  <h4>📋 What to Bring</h4>
                  <ul>
                    <li>Valid driver's license</li>
                    <li>Credit card for security deposit</li>
                    <li>Booking confirmation (this page)</li>
                    <li>Additional driver's license (if applicable)</li>
                  </ul>
                </div>
                <div className="info-card">
                  <h4>🕒 Pickup Instructions</h4>
                  <ul>
                    <li>Arrive 15 minutes before pickup time</li>
                    <li>Complete vehicle inspection</li>
                    <li>Take photos of any existing damage</li>
                    <li>Familiarize yourself with vehicle controls</li>
                  </ul>
                </div>
                <div className="info-card">
                  <h4>📞 Contact Information</h4>
                  <ul>
                    <li>Customer Service: 1-800-EZ-RENTAL</li>
                    <li>24/7 Emergency: 1-800-HELP-NOW</li>
                    <li>Email: support@ezcarrental.com</li>
                    <li>Live Chat: Available on our website</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Price Summary Sidebar */}
          <div className="confirmation-sidebar">
            <div className="price-summary">
              <h3>Booking Summary</h3>
              <div className="price-breakdown">
                <div className="price-item">
                  <span>Car rental ({totalDays} days)</span>
                  <span>${pricing.basePrice.toFixed(2)}</span>
                </div>
                <div className="price-item">
                  <span>Insurance</span>
                  <span>${pricing.insurancePrice.toFixed(2)}</span>
                </div>
                {pricing.addOnsPrice > 0 && (
                  <div className="price-item">
                    <span>Add-ons</span>
                    <span>${pricing.addOnsPrice.toFixed(2)}</span>
                  </div>
                )}
                <div className="price-item">
                  <span>Taxes & Fees</span>
                  <span>${pricing.taxes.toFixed(2)}</span>
                </div>
                <div className="price-total">
                  <span>Total Paid</span>
                  <span>${pricing.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="action-buttons">
              <button className="btn btn-secondary btn-full" onClick={handleDownloadReceipt}>
                📄 Download Receipt
              </button>
              <button className="btn btn-secondary btn-full" onClick={handleAddToCalendar}>
                📅 Add to Calendar
              </button>
              <Link to="/bookings" className="btn btn-outline btn-full">
                View All Bookings
              </Link>
            </div>

            <div className="support-card">
              <h4>Need Help?</h4>
              <p>Our customer support team is here to assist you 24/7.</p>
              <button className="btn btn-primary btn-full">
                💬 Live Chat
              </button>
            </div>
          </div>
        </div>

        <div className="next-steps">
          <h2>What's Next?</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h4>Confirmation Email</h4>
              <p>Check your email for booking confirmation and receipt</p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h4>Prepare Documents</h4>
              <p>Gather your driver's license and credit card</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h4>Vehicle Pickup</h4>
              <p>Arrive at pickup location 15 minutes early</p>
            </div>
            <div className="step-card">
              <div className="step-number">4</div>
              <h4>Enjoy Your Trip!</h4>
              <p>Drive safely and have a wonderful experience</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookingConfirmationPage