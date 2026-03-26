import React from 'react'

const BookingsPage: React.FC = () => {
  const mockBookings = [
    {
      id: 1,
      car: 'Tesla Model 3',
      startDate: '2025-08-10',
      endDate: '2025-08-15',
      status: 'Confirmed',
      total: 445
    },
    {
      id: 2,
      car: 'BMW X5',
      startDate: '2025-07-20',
      endDate: '2025-07-25',
      status: 'Completed',
      total: 625
    }
  ]

  return (
    <div className="bookings-page">
      <div className="container">
        <div className="page-header">
          <h1>My Bookings</h1>
          <p>Manage your car rental reservations</p>
        </div>

        <div className="bookings-list">
          {mockBookings.map(booking => (
            <div key={booking.id} className="booking-card">
              <div className="booking-info">
                <h3>{booking.car}</h3>
                <p className="booking-dates">
                  {booking.startDate} to {booking.endDate}
                </p>
                <span className={`status ${booking.status.toLowerCase()}`}>
                  {booking.status}
                </span>
              </div>
              <div className="booking-actions">
                <span className="total">${booking.total}</span>
                <button className="btn btn-outline">View Details</button>
              </div>
            </div>
          ))}
        </div>

        {mockBookings.length === 0 && (
          <div className="empty-state">
            <h3>No bookings yet</h3>
            <p>Start browsing our cars to make your first reservation!</p>
            <button className="btn btn-primary">Browse Cars</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default BookingsPage