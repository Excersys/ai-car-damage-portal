import React, { useState } from 'react'

interface Reservation {
  id: string
  bookingRef: string
  customer: {
    name: string
    email: string
    phone: string
  }
  vehicle: {
    make: string
    model: string
    year: number
    licensePlate: string
  }
  dates: {
    pickup: string
    return: string
    duration: number
  }
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'
  pricing: {
    daily: number
    total: number
    paid: number
  }
  location: {
    pickup: string
    return: string
  }
  createdAt: string
}

const AdminReservationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all')
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  // Mock reservations data
  const mockReservations: Reservation[] = [
    {
      id: '1',
      bookingRef: 'BK1722814756432',
      customer: {
        name: 'John Doe',
        email: 'john.doe@email.com',
        phone: '+1-555-0123'
      },
      vehicle: {
        make: 'Tesla',
        model: 'Model 3',
        year: 2023,
        licensePlate: 'ABC-1234'
      },
      dates: {
        pickup: '2025-08-06',
        return: '2025-08-10',
        duration: 4
      },
      status: 'confirmed',
      pricing: {
        daily: 89,
        total: 445,
        paid: 445
      },
      location: {
        pickup: 'Downtown Office',
        return: 'Downtown Office'
      },
      createdAt: '2025-08-04T10:30:00'
    },
    {
      id: '2',
      bookingRef: 'BK1722814987321',
      customer: {
        name: 'Jane Smith',
        email: 'jane.smith@email.com',
        phone: '+1-555-0456'
      },
      vehicle: {
        make: 'BMW',
        model: 'X5',
        year: 2023,
        licensePlate: 'XYZ-5678'
      },
      dates: {
        pickup: '2025-08-05',
        return: '2025-08-08',
        duration: 3
      },
      status: 'active',
      pricing: {
        daily: 125,
        total: 475,
        paid: 475
      },
      location: {
        pickup: 'Airport',
        return: 'Downtown Office'
      },
      createdAt: '2025-08-03T14:15:00'
    },
    {
      id: '3',
      bookingRef: 'BK1722813876543',
      customer: {
        name: 'Mike Johnson',
        email: 'mike.j@email.com',
        phone: '+1-555-0789'
      },
      vehicle: {
        make: 'Toyota',
        model: 'Camry',
        year: 2023,
        licensePlate: 'CAM-9876'
      },
      dates: {
        pickup: '2025-08-01',
        return: '2025-08-04',
        duration: 3
      },
      status: 'completed',
      pricing: {
        daily: 65,
        total: 245,
        paid: 245
      },
      location: {
        pickup: 'Downtown Office',
        return: 'Airport'
      },
      createdAt: '2025-07-30T09:45:00'
    },
    {
      id: '4',
      bookingRef: 'BK1722815123456',
      customer: {
        name: 'Sarah Wilson',
        email: 'sarah.w@email.com',
        phone: '+1-555-0321'
      },
      vehicle: {
        make: 'Tesla',
        model: 'Model 3',
        year: 2023,
        licensePlate: 'TES-2468'
      },
      dates: {
        pickup: '2025-08-07',
        return: '2025-08-12',
        duration: 5
      },
      status: 'pending',
      pricing: {
        daily: 89,
        total: 556,
        paid: 0
      },
      location: {
        pickup: 'Downtown Office',
        return: 'Downtown Office'
      },
      createdAt: '2025-08-04T16:20:00'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#4caf50'
      case 'active': return '#2196f3'
      case 'pending': return '#ff9800'
      case 'completed': return '#9e9e9e'
      case 'cancelled': return '#f44336'
      default: return '#666'
    }
  }

  const getStatusBadge = (status: string) => {
    const color = getStatusColor(status)
    return (
      <span 
        className="status-badge" 
        style={{ backgroundColor: color }}
      >
        {status.toUpperCase()}
      </span>
    )
  }

  const filterReservations = () => {
    if (activeTab === 'all') return mockReservations
    return mockReservations.filter(reservation => reservation.status === activeTab)
  }

  const handleStatusChange = (reservationId: string, newStatus: string) => {
    // In real app, this would make API call
    // Update reservation status
    alert(`Reservation status updated to: ${newStatus}`)
  }

  const handleViewDetails = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setShowDetails(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="admin-reservations">
      <div className="admin-container">
        <div className="page-header">
          <h1>Reservations Management</h1>
          <div className="header-actions">
            <button className="btn btn-secondary">
              📤 Export Data
            </button>
            <button className="btn btn-primary">
              ➕ New Reservation
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="reservations-tabs">
          <button 
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All ({mockReservations.length})
          </button>
          <button 
            className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending ({mockReservations.filter(r => r.status === 'pending').length})
          </button>
          <button 
            className={`tab ${activeTab === 'confirmed' ? 'active' : ''}`}
            onClick={() => setActiveTab('confirmed')}
          >
            Confirmed ({mockReservations.filter(r => r.status === 'confirmed').length})
          </button>
          <button 
            className={`tab ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Active ({mockReservations.filter(r => r.status === 'active').length})
          </button>
          <button 
            className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed ({mockReservations.filter(r => r.status === 'completed').length})
          </button>
        </div>

        {/* Reservations Table */}
        <div className="reservations-table-container">
          <table className="reservations-table">
            <thead>
              <tr>
                <th>Booking Ref</th>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Pickup Date</th>
                <th>Return Date</th>
                <th>Duration</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filterReservations().map(reservation => (
                <tr key={reservation.id}>
                  <td className="booking-ref">
                    <strong>{reservation.bookingRef}</strong>
                    <br />
                    <small>{formatDateTime(reservation.createdAt)}</small>
                  </td>
                  <td className="customer-info">
                    <div className="customer-name">{reservation.customer.name}</div>
                    <div className="customer-email">{reservation.customer.email}</div>
                  </td>
                  <td className="vehicle-info">
                    <div className="vehicle-name">
                      {reservation.vehicle.make} {reservation.vehicle.model}
                    </div>
                    <div className="license-plate">{reservation.vehicle.licensePlate}</div>
                  </td>
                  <td>{formatDate(reservation.dates.pickup)}</td>
                  <td>{formatDate(reservation.dates.return)}</td>
                  <td>{reservation.dates.duration} days</td>
                  <td className="pricing">
                    <div className="total-amount">${reservation.pricing.total}</div>
                    <div className="daily-rate">(${reservation.pricing.daily}/day)</div>
                  </td>
                  <td>{getStatusBadge(reservation.status)}</td>
                  <td className="actions">
                    <button 
                      className="btn-small btn-outline"
                      onClick={() => handleViewDetails(reservation)}
                    >
                      View
                    </button>
                    <div className="dropdown">
                      <button className="btn-small btn-secondary dropdown-toggle">
                        Update
                      </button>
                      <div className="dropdown-menu">
                        <button onClick={() => handleStatusChange(reservation.id, 'confirmed')}>
                          Confirm
                        </button>
                        <button onClick={() => handleStatusChange(reservation.id, 'active')}>
                          Start Rental
                        </button>
                        <button onClick={() => handleStatusChange(reservation.id, 'completed')}>
                          Complete
                        </button>
                        <button onClick={() => handleStatusChange(reservation.id, 'cancelled')}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Reservation Details Modal */}
        {showDetails && selectedReservation && (
          <div className="modal-overlay" onClick={() => setShowDetails(false)}>
            <div className="modal-content reservation-details-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Reservation Details</h2>
                <button 
                  className="modal-close"
                  onClick={() => setShowDetails(false)}
                >
                  ✕
                </button>
              </div>
              
              <div className="modal-body">
                <div className="details-grid">
                  <div className="detail-section">
                    <h3>Booking Information</h3>
                    <div className="detail-item">
                      <span className="label">Booking Reference:</span>
                      <span className="value">{selectedReservation.bookingRef}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Status:</span>
                      <span className="value">{getStatusBadge(selectedReservation.status)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Created:</span>
                      <span className="value">{formatDateTime(selectedReservation.createdAt)}</span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Customer Details</h3>
                    <div className="detail-item">
                      <span className="label">Name:</span>
                      <span className="value">{selectedReservation.customer.name}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Email:</span>
                      <span className="value">{selectedReservation.customer.email}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Phone:</span>
                      <span className="value">{selectedReservation.customer.phone}</span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Vehicle Information</h3>
                    <div className="detail-item">
                      <span className="label">Vehicle:</span>
                      <span className="value">
                        {selectedReservation.vehicle.year} {selectedReservation.vehicle.make} {selectedReservation.vehicle.model}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="label">License Plate:</span>
                      <span className="value">{selectedReservation.vehicle.licensePlate}</span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Rental Period</h3>
                    <div className="detail-item">
                      <span className="label">Pickup Date:</span>
                      <span className="value">{formatDate(selectedReservation.dates.pickup)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Return Date:</span>
                      <span className="value">{formatDate(selectedReservation.dates.return)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Duration:</span>
                      <span className="value">{selectedReservation.dates.duration} days</span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Locations</h3>
                    <div className="detail-item">
                      <span className="label">Pickup Location:</span>
                      <span className="value">{selectedReservation.location.pickup}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Return Location:</span>
                      <span className="value">{selectedReservation.location.return}</span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Pricing</h3>
                    <div className="detail-item">
                      <span className="label">Daily Rate:</span>
                      <span className="value">${selectedReservation.pricing.daily}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Total Amount:</span>
                      <span className="value">${selectedReservation.pricing.total}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Amount Paid:</span>
                      <span className="value">${selectedReservation.pricing.paid}</span>
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="btn btn-secondary">Send Email</button>
                  <button className="btn btn-secondary">Print Receipt</button>
                  <button className="btn btn-primary">Edit Reservation</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminReservationsPage