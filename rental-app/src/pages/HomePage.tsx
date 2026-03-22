import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const [searchData, setSearchData] = useState({
    pickupLocation: '',
    dropoffLocation: 'Same as pickup',
    pickupDate: '',
    dropoffDate: '',
    pickupTime: '10:30',
    dropoffTime: '10:30'
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Navigate to cars page with search parameters
    const dropoffLocation = searchData.dropoffLocation === 'Same as pickup' 
      ? searchData.pickupLocation 
      : searchData.dropoffLocation
    
    const searchParams = new URLSearchParams({
      pickup: searchData.pickupLocation,
      dropoff: dropoffLocation,
      pickupDate: searchData.pickupDate,
      dropoffDate: searchData.dropoffDate,
      pickupTime: searchData.pickupTime,
      dropoffTime: searchData.dropoffTime
    })
    navigate(`/cars?${searchParams.toString()}`)
  }

  useEffect(() => {
    // Add animation classes after component mounts
    const heroElements = document.querySelectorAll('.animate-on-load')
    heroElements.forEach((el, index) => {
      setTimeout(() => {
        el.classList.add('animate-in')
      }, index * 150)
    })
  }, [])

  const handlePickupLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchData({...searchData, pickupLocation: e.target.value})
  }

  const handleDropoffLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchData({...searchData, dropoffLocation: e.target.value})
  }

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-new">
        <div className="hero-background"></div>
        <div className="container">
          <div className="hero-content-new">
            <div className="hero-text">
              <h1 className="hero-title animate-on-load">
                <span className="title-line-1">Reserve</span>
                <span className="title-connector"> & </span>
                <span className="title-line-2">Go</span>
              </h1>
              <p className="hero-subtitle animate-on-load">Premium car rental with AI-powered convenience</p>
              <p className="hero-tagline animate-on-load">No lines, no paperwork, no hassle</p>
              
              {/* 3-Step Process */}
              <div className="process-steps animate-on-load">
                <div className="step" data-step="1">
                  <div className="step-icon step-hover-effect">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                    </svg>
                  </div>
                  <span className="step-number">1</span>
                  <span className="step-text">Select your car</span>
                </div>
                <div className="step-arrow">→</div>
                <div className="step" data-step="2">
                  <div className="step-icon step-hover-effect">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                    </svg>
                  </div>
                  <span className="step-number">2</span>
                  <span className="step-text">Drive Off</span>
                </div>
              </div>
            </div>

            {/* Advanced Search Module */}
            <div className="search-module animate-on-load">
              <form onSubmit={handleSearch} className="search-form">
                <div className="search-row">
                  <div className="search-field">
                    <label htmlFor="pickup-location">Pick-up Location</label>
                    <input
                      id="pickup-location"
                      type="text"
                      placeholder="Enter city or airport"
                      value={searchData.pickupLocation}
                      onChange={handlePickupLocationChange}
                      required
                    />
                  </div>
                  
                  <div className="search-field">
                    <label htmlFor="dropoff-location">Drop-off Location</label>
                    <input
                      id="dropoff-location"
                      type="text"
                      placeholder="Enter city or airport"
                      value={searchData.dropoffLocation}
                      onChange={handleDropoffLocationChange}
                      required
                    />
                  </div>
                  
                  <div className="search-field date-field">
                    <label htmlFor="pickup-date">Pick-up Date</label>
                    <input
                      id="pickup-date"
                      type="date"
                      value={searchData.pickupDate}
                      onChange={(e) => setSearchData({...searchData, pickupDate: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="search-field date-field">
                    <label htmlFor="dropoff-date">Drop-off Date</label>
                    <input
                      id="dropoff-date"
                      type="date"
                      value={searchData.dropoffDate}
                      onChange={(e) => setSearchData({...searchData, dropoffDate: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="search-field time-field">
                    <label htmlFor="pickup-time">Pick-up Time</label>
                    <select
                      id="pickup-time"
                      value={searchData.pickupTime}
                      onChange={(e) => setSearchData({...searchData, pickupTime: e.target.value})}
                    >
                      <option value="09:00">9:00am</option>
                      <option value="09:30">9:30am</option>
                      <option value="10:00">10:00am</option>
                      <option value="10:30">10:30am</option>
                      <option value="11:00">11:00am</option>
                      <option value="11:30">11:30am</option>
                      <option value="12:00">12:00pm</option>
                      <option value="12:30">12:30pm</option>
                      <option value="13:00">1:00pm</option>
                      <option value="13:30">1:30pm</option>
                      <option value="14:00">2:00pm</option>
                      <option value="14:30">2:30pm</option>
                      <option value="15:00">3:00pm</option>
                      <option value="15:30">3:30pm</option>
                      <option value="16:00">4:00pm</option>
                      <option value="16:30">4:30pm</option>
                      <option value="17:00">5:00pm</option>
                      <option value="17:30">5:30pm</option>
                      <option value="18:00">6:00pm</option>
                    </select>
                  </div>
                  
                  <div className="search-field time-field">
                    <label htmlFor="dropoff-time">Drop-off Time</label>
                    <select
                      id="dropoff-time"
                      value={searchData.dropoffTime}
                      onChange={(e) => setSearchData({...searchData, dropoffTime: e.target.value})}
                    >
                      <option value="09:00">9:00am</option>
                      <option value="09:30">9:30am</option>
                      <option value="10:00">10:00am</option>
                      <option value="10:30">10:30am</option>
                      <option value="11:00">11:00am</option>
                      <option value="11:30">11:30am</option>
                      <option value="12:00">12:00pm</option>
                      <option value="12:30">12:30pm</option>
                      <option value="13:00">1:00pm</option>
                      <option value="13:30">1:30pm</option>
                      <option value="14:00">2:00pm</option>
                      <option value="14:30">2:30pm</option>
                      <option value="15:00">3:00pm</option>
                      <option value="15:30">3:30pm</option>
                      <option value="16:00">4:00pm</option>
                      <option value="16:30">4:30pm</option>
                      <option value="17:00">5:00pm</option>
                      <option value="17:30">5:30pm</option>
                      <option value="18:00">6:00pm</option>
                    </select>
                  </div>
                  
                  <button type="submit" className="search-btn search-btn-premium">
                    <span className="btn-text">Find Cars</span>
                    <span className="btn-icon">→</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="trust-section">
        <div className="container">
          <div className="trust-intro">
            <h3>Trusted by thousands worldwide</h3>
          </div>
          <div className="trust-stats">
            <div className="stat stat-animated" data-number="50000">
              <div className="stat-number">50,000+</div>
              <div className="stat-label">Premium Members</div>
              <div className="stat-icon">👥</div>
            </div>
            <div className="stat stat-animated" data-number="99">
              <div className="stat-number">99.2%</div>
              <div className="stat-label">Satisfaction Rate</div>
              <div className="stat-icon">⭐</div>
            </div>
            <div className="stat stat-animated">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Concierge Support</div>
              <div className="stat-icon">🛎️</div>
            </div>
            <div className="stat stat-animated" data-number="500">
              <div className="stat-number">500+</div>
              <div className="stat-label">Premium Locations</div>
              <div className="stat-icon">📍</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-new">
        <div className="container">
          <div className="features-header">
            <h2>The Premium Difference</h2>
            <p>Experience luxury car rental reimagined with cutting-edge technology</p>
          </div>
          <div className="features-grid-new">
            <div className="feature-card-new feature-hover-lift">
              <div className="feature-icon-new gradient-icon">🔬</div>
              <h3>AI-Powered Inspections</h3>
              <p>Revolutionary AI technology provides instant, accurate vehicle condition assessments with complete transparency and digital documentation</p>
              <div className="feature-badge">Industry Leading</div>
            </div>
            <div className="feature-card-new feature-hover-lift">
              <div className="feature-icon-new gradient-icon">⚡</div>
              <h3>60-Second Booking</h3>
              <p>Reserve premium vehicles instantly through our award-winning platform - zero paperwork, maximum convenience</p>
              <div className="feature-badge">Lightning Fast</div>
            </div>
            <div className="feature-card-new feature-hover-lift">
              <div className="feature-icon-new gradient-icon">🛡️</div>
              <h3>Bank-Level Security</h3>
              <p>Military-grade encryption and biometric verification ensure your personal data and transactions are completely secure</p>
              <div className="feature-badge">Ultra Secure</div>
            </div>
            <div className="feature-card-new feature-hover-lift">
              <div className="feature-icon-new gradient-icon">💎</div>
              <h3>Concierge Experience</h3>
              <p>White-glove service meets cutting-edge technology - from booking to return, every detail is perfected</p>
              <div className="feature-badge">Premium Service</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage