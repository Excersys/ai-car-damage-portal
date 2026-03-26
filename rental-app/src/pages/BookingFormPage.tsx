import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import PaymentForm from '../components/PaymentForm'
import VeriffVerification from '../components/VeriffVerification'

interface Car {
  id: number
  make: string
  model: string
  year: number
  price: number
  image: string
  location: string
  rating: number
  reviews: number
}

interface SelectedOption {
  id: string
  name: string
  price: number
  description: string
}

interface UserInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  dateOfBirth: string
  licenseNumber: string
}

const BookingFormPage: React.FC = () => {
  const { carId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  
  // Get car details and selected options from navigation state or defaults
  const stateData = location.state
  const [car, setCar] = useState<Car | null>(stateData?.car || null)
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>(stateData?.selectedOptions || [])
  const [currentStep, setCurrentStep] = useState(1)
  
  // Verification state
  const [verificationCompleted, setVerificationCompleted] = useState(false)
  const [verificationSessionId, setVerificationSessionId] = useState<string>('')
  const [verificationData, setVerificationData] = useState<any>(null)
  
  // Booking details from URL params or state
  const [bookingDetails, setBookingDetails] = useState({
    pickupLocation: searchParams.get('pickup') || stateData?.pickupLocation || 'LAX',
    dropoffLocation: searchParams.get('dropoff') || stateData?.dropoffLocation || 'LAX',
    pickupDate: searchParams.get('pickupDate') || stateData?.pickupDate || '2026-02-04',
    dropoffDate: searchParams.get('dropoffDate') || stateData?.dropoffDate || '2026-03-06',
    pickupTime: searchParams.get('pickupTime') || '10:30',
    dropoffTime: searchParams.get('dropoffTime') || '10:30',
    allowDifferentDropoff: false
  })
  
  // User information (will be pre-filled from Veriff)
  const [userInfo, setUserInfo] = useState<UserInfo>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    dateOfBirth: '',
    licenseNumber: ''
  })
  
  // Insurance and additional options
  const [selectedInsurance, setSelectedInsurance] = useState<string>('')
  const [additionalOptions, setAdditionalOptions] = useState<string[]>([])
  
  // Mock car data if not provided via state
  const mockCars: { [key: string]: Car } = {
    '1': {
      id: 1,
      make: 'Tesla',
      model: 'Model 3',
      year: 2023,
      price: 89,
      image: 'https://via.placeholder.com/300x200?text=Tesla+Model+3',
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
      image: 'https://via.placeholder.com/300x200?text=BMW+X5',
      location: 'Los Angeles, CA',
      rating: 4.7,
      reviews: 203
    }
  }

  // Insurance options
  const insuranceOptions = [
    { id: 'basic', name: 'Basic Protection', price: 15, description: 'Collision Damage Waiver with $3,000 deductible' },
    { id: 'standard', name: 'Standard Protection', price: 25, description: 'CDW with $1,000 deductible + Theft Protection' },
    { id: 'premium', name: 'Premium Protection', price: 35, description: 'Zero deductible + Personal Accident Insurance' }
  ]

  // Additional rental options
  const rentalOptions = [
    { id: 'gps', name: 'GPS Navigation', price: 8, description: 'Built-in GPS with real-time traffic updates' },
    { id: 'childSeat', name: 'Child Car Seat', price: 12, description: 'Safety-certified child seat (specify age when booking)' },
    { id: 'boosterSeat', name: 'Booster Seat', price: 8, description: 'For children 4-8 years old' },
    { id: 'extraDriver', name: 'Additional Driver', price: 15, description: 'Add a second authorized driver' },
    { id: 'roadside', name: '24/7 Roadside Assistance', price: 6, description: 'Emergency towing and support' },
    { id: 'wifi', name: 'Mobile WiFi Hotspot', price: 10, description: 'High-speed internet for up to 5 devices' }
  ]

  // Load car data if not provided
  useEffect(() => {
    if (!car && carId) {
      const foundCar = mockCars[carId]
      if (foundCar) {
        setCar(foundCar)
      }
    }
  }, [carId, car])

  // Mock data for development (now handled by verification step)
  useEffect(() => {
    if (currentStep === 3 && !verificationCompleted) {
      // Only pre-fill if verification wasn't completed (fallback for development)
      setTimeout(() => {
        setUserInfo({
          firstName: 'John',
          lastName: 'Doe', 
          email: 'john.doe@example.com',
          phone: '+1 (555) 123-4567',
          address: '123 Main Street',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          dateOfBirth: '1990-05-15',
          licenseNumber: 'CA12345678'
        })
      }, 1000) // Simulate API delay
    }
  }, [currentStep, verificationCompleted])

  const handleNextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleEditBookingDetails = () => {
    // Navigate back to cars page with current search params
    const params = new URLSearchParams({
      pickup: bookingDetails.pickupLocation,
      dropoff: bookingDetails.dropoffLocation,
      pickupDate: bookingDetails.pickupDate,
      dropoffDate: bookingDetails.dropoffDate,
      pickupTime: bookingDetails.pickupTime,
      dropoffTime: bookingDetails.dropoffTime
    })
    navigate(`/cars?${params.toString()}`)
  }

  const handleInsuranceChange = (insuranceId: string) => {
    setSelectedInsurance(insuranceId)
  }

  const handleOptionToggle = (optionId: string) => {
    setAdditionalOptions(prev => 
      prev.includes(optionId)
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    )
  }

  // Handle verification completion
  const handleVerificationComplete = (success: boolean, sessionId?: string, verificationData?: any) => {
    if (success && sessionId) {
      setVerificationCompleted(true)
      setVerificationSessionId(sessionId)
      setVerificationData(verificationData)
      
      // Pre-fill user information from verification data if available
      if (verificationData?.report) {
        // Extract user info from verification data
        setUserInfo({
          firstName: 'John', // Would come from verification
          lastName: 'Doe',
          email: userInfo.email || 'john.doe@example.com',
          phone: '+1 (555) 123-4567',
          address: '123 Main Street',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          dateOfBirth: '1990-05-15',
          licenseNumber: 'CA12345678'
        })
      }
      
      // Automatically advance to next step
      setCurrentStep(3)
    } else {
      // Handle verification failure - could show error or retry options
      console.error('Verification failed')
    }
  }

  // Handle verification cancellation
  const handleVerificationCancel = () => {
    // Go back to confirmation step
    setCurrentStep(1)
  }

  const calculateDays = () => {
    const pickup = new Date(bookingDetails.pickupDate)
    const dropoff = new Date(bookingDetails.dropoffDate)
    const diffTime = Math.abs(dropoff.getTime() - pickup.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const calculateTotalPrice = () => {
    if (!car) return 0
    
    const days = calculateDays()
    const basePrice = car.price * days
    
    // Add pre-selected options from car details page
    const preSelectedOptionsPrice = selectedOptions.reduce((total, option) => 
      total + (option.price * days), 0
    )
    
    // Add insurance
    const insurance = insuranceOptions.find(opt => opt.id === selectedInsurance)
    const insurancePrice = insurance ? insurance.price * days : 0
    
    // Add additional options
    const additionalPrice = additionalOptions.reduce((total, optionId) => {
      const option = rentalOptions.find(opt => opt.id === optionId)
      return total + (option ? option.price * days : 0)
    }, 0)
    
    return basePrice + preSelectedOptionsPrice + insurancePrice + additionalPrice
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const handleCompleteBooking = (paymentData: any) => {
    const bookingId = 'BK' + Date.now()
    navigate(`/booking-confirmation/${bookingId}`, {
      state: {
        bookingId,
        car,
        bookingDetails,
        userInfo,
        selectedInsurance,
        additionalOptions,
        selectedOptions,
        totalPrice: calculateTotalPrice(),
        paymentData
      }
    })
  }

  if (!car) {
    return <div className="booking-form-page">Loading...</div>
  }

  return (
    <div className="booking-form-page">
      <div className="container">
        {/* Progress bar */}
        <div className="booking-header">
          <h1>Complete Your Booking</h1>
          <div className="progress-bar">
            <div className={`progress-step ${currentStep > 1 ? 'completed' : currentStep === 1 ? 'active' : ''}`}>
              <span className="step-number">{currentStep > 1 ? '✓' : '1'}</span>
              <span className="step-label">Confirmation</span>
            </div>
            <div className={`progress-step ${currentStep > 2 ? 'completed' : currentStep === 2 ? 'active' : ''}`}>
              <span className="step-number">{currentStep > 2 ? '✓' : '2'}</span>
              <span className="step-label">Verification</span>
            </div>
            <div className={`progress-step ${currentStep > 3 ? 'completed' : currentStep === 3 ? 'active' : ''}`}>
              <span className="step-number">{currentStep > 3 ? '✓' : '3'}</span>
              <span className="step-label">Your Information</span>
            </div>
            <div className={`progress-step ${currentStep > 4 ? 'completed' : currentStep === 4 ? 'active' : ''}`}>
              <span className="step-number">{currentStep > 4 ? '✓' : '4'}</span>
              <span className="step-label">Insurance & Options</span>
            </div>
            <div className={`progress-step ${currentStep === 5 ? 'active' : ''}`}>
              <span className="step-number">5</span>
              <span className="step-label">Payment</span>
            </div>
          </div>
        </div>

        <div className="booking-content">
          <div className="booking-form">
            
            {/* Step 1: Car Confirmation & Pickup Details */}
            {currentStep === 1 && (
              <div className="step-content">
                <h2>Booking Confirmation</h2>
                
                <div className="booking-confirmation">
                  <div className="selected-car">
                    <div className="car-image">
                      <img src={car.image} alt={`${car.make} ${car.model}`} />
                    </div>
                    <div className="car-info">
                      <h3>{car.make} {car.model}</h3>
                      <p>{car.year} • {car.location}</p>
                      <div className="car-rating">
                        <span>⭐ {car.rating}</span>
                        <span>({car.reviews} reviews)</span>
                      </div>
                      <div className="car-price">
                        <span className="price">${car.price}</span>
                        <span className="period">/day</span>
                      </div>
                    </div>
                  </div>

                  <div className="booking-details-summary">
                    <h4>Rental Details</h4>
                    <div className="detail-item">
                      <div className="detail-header">
                        <span><strong>Pickup</strong></span>
                        <button className="edit-btn" onClick={handleEditBookingDetails}>
                          Edit
                        </button>
                      </div>
                      <p>{bookingDetails.pickupLocation}</p>
                      <p>{formatDate(bookingDetails.pickupDate)} at {bookingDetails.pickupTime}</p>
                    </div>
                    
                    <div className="detail-item">
                      <div className="detail-header">
                        <span><strong>Drop-off</strong></span>
                      </div>
                      <div className="dropoff-option">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={bookingDetails.allowDifferentDropoff}
                            onChange={(e) => setBookingDetails(prev => ({
                              ...prev,
                              allowDifferentDropoff: e.target.checked,
                              dropoffLocation: e.target.checked ? prev.dropoffLocation : prev.pickupLocation
                            }))}
                          />
                          Return to different location
                        </label>
                      </div>
                      {bookingDetails.allowDifferentDropoff ? (
                        <div className="location-input">
                          <input
                            type="text"
                            value={bookingDetails.dropoffLocation}
                            onChange={(e) => setBookingDetails(prev => ({
                              ...prev,
                              dropoffLocation: e.target.value
                            }))}
                            placeholder="Enter drop-off location"
                          />
                        </div>
                      ) : (
                        <p>{bookingDetails.pickupLocation}</p>
                      )}
                      <p>{formatDate(bookingDetails.dropoffDate)} at {bookingDetails.dropoffTime}</p>
                    </div>

                    <div className="rental-duration">
                      <strong>Duration: {calculateDays()} day{calculateDays() !== 1 ? 's' : ''}</strong>
                    </div>
                  </div>

                  {selectedOptions.length > 0 && (
                    <div className="pre-selected-options">
                      <h4>Selected Add-ons</h4>
                      {selectedOptions.map(option => (
                        <div key={option.id} className="selected-option">
                          <span>{option.name}</span>
                          <span>+${option.price}/day</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Verification */}
            {currentStep === 2 && (
              <div className="step-content">
                <VeriffVerification
                  onVerificationComplete={handleVerificationComplete}
                  onCancel={handleVerificationCancel}
                  userEmail={userInfo.email || 'user@example.com'}
                  carId={carId || '1'}
                  bookingData={{
                    car,
                    pickupDate: bookingDetails.pickupDate,
                    returnDate: bookingDetails.dropoffDate,
                    ...bookingDetails
                  }}
                />
              </div>
            )}

            {/* Step 3: User Information */}
            {currentStep === 3 && (
              <div className="step-content">
                <h2>Your Information</h2>
                <p className="step-description">
                  Your information has been pre-filled from identity verification. Please review and update if needed.
                </p>
                
                <div className="user-info-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>First Name *</label>
                      <input
                        type="text"
                        value={userInfo.firstName}
                        onChange={(e) => setUserInfo(prev => ({...prev, firstName: e.target.value}))}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Last Name *</label>
                      <input
                        type="text"
                        value={userInfo.lastName}
                        onChange={(e) => setUserInfo(prev => ({...prev, lastName: e.target.value}))}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Email Address *</label>
                      <input
                        type="email"
                        value={userInfo.email}
                        onChange={(e) => setUserInfo(prev => ({...prev, email: e.target.value}))}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Phone Number *</label>
                      <input
                        type="tel"
                        value={userInfo.phone}
                        onChange={(e) => setUserInfo(prev => ({...prev, phone: e.target.value}))}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Address *</label>
                    <input
                      type="text"
                      value={userInfo.address}
                      onChange={(e) => setUserInfo(prev => ({...prev, address: e.target.value}))}
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>City *</label>
                      <input
                        type="text"
                        value={userInfo.city}
                        onChange={(e) => setUserInfo(prev => ({...prev, city: e.target.value}))}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>State *</label>
                      <input
                        type="text"
                        value={userInfo.state}
                        onChange={(e) => setUserInfo(prev => ({...prev, state: e.target.value}))}
                        maxLength={2}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>ZIP Code *</label>
                      <input
                        type="text"
                        value={userInfo.zipCode}
                        onChange={(e) => setUserInfo(prev => ({...prev, zipCode: e.target.value}))}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Date of Birth *</label>
                      <input
                        type="date"
                        value={userInfo.dateOfBirth}
                        onChange={(e) => setUserInfo(prev => ({...prev, dateOfBirth: e.target.value}))}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Driver's License Number *</label>
                      <input
                        type="text"
                        value={userInfo.licenseNumber}
                        onChange={(e) => setUserInfo(prev => ({...prev, licenseNumber: e.target.value}))}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Insurance & Additional Options */}
            {currentStep === 4 && (
              <div className="step-content">
                <h2>Insurance & Additional Options</h2>
                
                <div className="insurance-section">
                  <h3>Choose Your Protection</h3>
                  <div className="insurance-options">
                    {insuranceOptions.map(option => (
                      <div 
                        key={option.id}
                        className={`insurance-option ${selectedInsurance === option.id ? 'selected' : ''}`}
                        onClick={() => handleInsuranceChange(option.id)}
                      >
                        <div className="option-header">
                          <h4>{option.name}</h4>
                          <span className="option-price">${option.price}/day</span>
                        </div>
                        <p className="option-description">{option.description}</p>
                        <div className="option-selector">
                          <div className={`radio-button ${selectedInsurance === option.id ? 'selected' : ''}`}>
                            {selectedInsurance === option.id ? '●' : '○'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="additional-options-section">
                  <h3>Additional Options</h3>
                  <div className="rental-options">
                    {rentalOptions.map(option => (
                      <div 
                        key={option.id}
                        className={`rental-option ${additionalOptions.includes(option.id) ? 'selected' : ''}`}
                        onClick={() => handleOptionToggle(option.id)}
                      >
                        <div className="option-content">
                          <div className="option-header">
                            <h4>{option.name}</h4>
                            <span className="option-price">+${option.price}/day</span>
                          </div>
                          <p className="option-description">{option.description}</p>
                        </div>
                        <div className="option-checkbox">
                          <div className={`checkbox ${additionalOptions.includes(option.id) ? 'checked' : ''}`}>
                            {additionalOptions.includes(option.id) ? '✓' : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Payment */}
            {currentStep === 5 && (
              <PaymentForm
                bookingData={{
                  car,
                  bookingDetails,
                  userInfo,
                  selectedInsurance,
                  additionalOptions,
                  selectedOptions,
                  totalPrice: calculateTotalPrice(),
                  days: calculateDays()
                }}
                car={car}
                pricing={{ total: calculateTotalPrice() }}
                totalDays={calculateDays()}
                verificationSessionId="mock-session-id"
                onPaymentComplete={handleCompleteBooking}
                onCancel={handlePreviousStep}
              />
            )}

            {/* Navigation */}
            {currentStep < 5 && currentStep !== 2 && (
              <div className="step-navigation">
                {currentStep > 1 && (
                  <button className="btn btn-secondary" onClick={handlePreviousStep}>
                    Back
                  </button>
                )}
                <button className="btn btn-primary" onClick={handleNextStep}>
                  {currentStep === 1 ? 'Continue to Verification' : 
                   currentStep === 3 ? 'Continue' : 
                   currentStep === 4 ? 'Continue to Payment' : 'Continue'}
                </button>
              </div>
            )}
          </div>

          {/* Sidebar with price breakdown */}
          {currentStep < 5 && (
            <div className="booking-sidebar">
              <div className="price-summary">
                <h3>Booking Summary</h3>
                <div className="price-item">
                  <span>Base rental ({calculateDays()} days)</span>
                  <span>${car.price * calculateDays()}</span>
                </div>
                
                {selectedOptions.length > 0 && (
                  <div className="price-item">
                    <span>Pre-selected add-ons</span>
                    <span>+${selectedOptions.reduce((total, opt) => total + (opt.price * calculateDays()), 0)}</span>
                  </div>
                )}
                
                {selectedInsurance && (
                  <div className="price-item">
                    <span>Insurance</span>
                    <span>+${insuranceOptions.find(opt => opt.id === selectedInsurance)?.price! * calculateDays()}</span>
                  </div>
                )}
                
                {additionalOptions.length > 0 && (
                  <div className="price-item">
                    <span>Additional options</span>
                    <span>+${additionalOptions.reduce((total, optionId) => {
                      const option = rentalOptions.find(opt => opt.id === optionId)
                      return total + (option ? option.price * calculateDays() : 0)
                    }, 0)}</span>
                  </div>
                )}
                
                <div className="price-total">
                  <span>Total</span>
                  <span>${calculateTotalPrice()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BookingFormPage