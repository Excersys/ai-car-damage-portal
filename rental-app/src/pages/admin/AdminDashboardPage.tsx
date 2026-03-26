import React, { useState } from 'react'
import { Link } from 'react-router-dom'

const AdminDashboardPage: React.FC = () => {
  // Mock data - in real app, this would come from API
  const [dashboardData] = useState({
    metrics: {
      totalRevenue: 45280,
      activeReservations: 23,
      availableVehicles: 8,
      totalCustomers: 156,
      damageReports: 3,
      maintenanceAlerts: 2
    },
    recentActivity: [
      { id: 1, type: 'booking', customer: 'John Doe', car: 'Tesla Model 3', time: '10 minutes ago', status: 'confirmed' },
      { id: 2, type: 'damage', customer: 'Jane Smith', car: 'BMW X5', time: '2 hours ago', status: 'pending' },
      { id: 3, type: 'return', customer: 'Mike Johnson', car: 'Toyota Camry', time: '4 hours ago', status: 'completed' },
      { id: 4, type: 'booking', customer: 'Sarah Wilson', car: 'Tesla Model 3', time: '6 hours ago', status: 'confirmed' },
    ],
    upcomingReservations: [
      { id: 1, customer: 'Alice Brown', car: 'BMW X5', pickupDate: '2025-08-06', pickupTime: '10:00', status: 'confirmed' },
      { id: 2, customer: 'David Lee', car: 'Tesla Model 3', pickupDate: '2025-08-06', pickupTime: '14:00', status: 'pending_verification' },
      { id: 3, customer: 'Emma Davis', car: 'Toyota Camry', pickupDate: '2025-08-07', pickupTime: '09:00', status: 'confirmed' },
    ],
    fleetStatus: [
      { id: 1, make: 'Tesla', model: 'Model 3', status: 'rented', location: 'Downtown', nextAvailable: '2025-08-08' },
      { id: 2, make: 'BMW', model: 'X5', status: 'available', location: 'Airport', nextAvailable: 'Now' },
      { id: 3, make: 'Toyota', model: 'Camry', status: 'maintenance', location: 'Service Center', nextAvailable: '2025-08-10' },
      { id: 4, make: 'Tesla', model: 'Model 3', status: 'available', location: 'Downtown', nextAvailable: 'Now' },
    ],
    alerts: [
      { id: 1, type: 'maintenance', message: 'BMW X5 - Oil change due in 2 days', priority: 'medium' },
      { id: 2, type: 'damage', message: 'Tesla Model 3 - New damage report pending review', priority: 'high' },
      { id: 3, type: 'booking', message: '5 new reservations require identity verification', priority: 'medium' },
    ]
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#4caf50'
      case 'rented': return '#2196f3'
      case 'maintenance': return '#ff9800'
      case 'confirmed': return '#4caf50'
      case 'pending': return '#ff9800'
      case 'pending_verification': return '#f44336'
      default: return '#666'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'booking': return '📅'
      case 'damage': return '⚠️'
      case 'return': return '✅'
      default: return '📝'
    }
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-container">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <p>Welcome back! Here's what's happening with your rental business.</p>
        </div>

        {/* Key Metrics */}
        <div className="metrics-grid">
          <div className="metric-card revenue">
            <div className="metric-icon">💰</div>
            <div className="metric-content">
              <h3>${dashboardData.metrics.totalRevenue.toLocaleString()}</h3>
              <p>Total Revenue</p>
              <span className="metric-change positive">+12% from last month</span>
            </div>
          </div>
          
          <div className="metric-card reservations">
            <div className="metric-icon">📅</div>
            <div className="metric-content">
              <h3>{dashboardData.metrics.activeReservations}</h3>
              <p>Active Reservations</p>
              <span className="metric-change positive">+3 new today</span>
            </div>
          </div>
          
          <div className="metric-card vehicles">
            <div className="metric-icon">🚗</div>
            <div className="metric-content">
              <h3>{dashboardData.metrics.availableVehicles}</h3>
              <p>Available Vehicles</p>
              <span className="metric-change neutral">67% utilization</span>
            </div>
          </div>
          
          <div className="metric-card customers">
            <div className="metric-icon">👥</div>
            <div className="metric-content">
              <h3>{dashboardData.metrics.totalCustomers}</h3>
              <p>Total Customers</p>
              <span className="metric-change positive">+8 this week</span>
            </div>
          </div>
        </div>

        {/* Alerts Section */}
        {dashboardData.alerts.length > 0 && (
          <div className="alerts-section">
            <h2>⚠️ Alerts & Notifications</h2>
            <div className="alerts-list">
              {dashboardData.alerts.map(alert => (
                <div key={alert.id} className={`alert-item ${alert.priority}`}>
                  <div className="alert-content">
                    <span className="alert-message">{alert.message}</span>
                    <span className="alert-time">Just now</span>
                  </div>
                  <button className="alert-action">Take Action</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="dashboard-content">
          {/* Recent Activity */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>Recent Activity</h2>
              <Link to="/admin/reservations" className="section-link">View All</Link>
            </div>
            <div className="activity-list">
              {dashboardData.recentActivity.map(activity => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-icon">{getActivityIcon(activity.type)}</div>
                  <div className="activity-content">
                    <p className="activity-description">
                      <strong>{activity.customer}</strong> {activity.type} {activity.car}
                    </p>
                    <span className="activity-time">{activity.time}</span>
                  </div>
                  <span 
                    className="activity-status" 
                    style={{ color: getStatusColor(activity.status) }}
                  >
                    {activity.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Reservations */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>Today's Pickups</h2>
              <Link to="/admin/reservations" className="section-link">Manage All</Link>
            </div>
            <div className="reservations-list">
              {dashboardData.upcomingReservations.map(reservation => (
                <div key={reservation.id} className="reservation-item">
                  <div className="reservation-time">
                    <span className="time">{reservation.pickupTime}</span>
                    <span className="date">{reservation.pickupDate}</span>
                  </div>
                  <div className="reservation-details">
                    <h4>{reservation.customer}</h4>
                    <p>{reservation.car}</p>
                  </div>
                  <span 
                    className="reservation-status"
                    style={{ color: getStatusColor(reservation.status) }}
                  >
                    {reservation.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fleet Status */}
        <div className="dashboard-section full-width">
          <div className="section-header">
            <h2>Fleet Overview</h2>
            <Link to="/admin/fleet" className="section-link">Manage Fleet</Link>
          </div>
          <div className="fleet-grid">
            {dashboardData.fleetStatus.map(vehicle => (
              <div key={vehicle.id} className="fleet-card">
                <div className="fleet-header">
                  <h4>{vehicle.make} {vehicle.model}</h4>
                  <span 
                    className="fleet-status"
                    style={{ backgroundColor: getStatusColor(vehicle.status) }}
                  >
                    {vehicle.status}
                  </span>
                </div>
                <div className="fleet-details">
                  <p><span className="fleet-label">Location:</span> {vehicle.location}</p>
                  <p><span className="fleet-label">Available:</span> {vehicle.nextAvailable}</p>
                </div>
                <div className="fleet-actions">
                  <button className="btn-small btn-outline">View Details</button>
                  {vehicle.status === 'available' && (
                    <button className="btn-small btn-primary">Book Now</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <Link to="/admin/reservations" className="action-card">
              <div className="action-icon">📅</div>
              <h3>New Reservation</h3>
              <p>Create a new booking</p>
            </Link>
            <Link to="/admin/damage-detection" className="action-card">
              <div className="action-icon">🤖</div>
              <h3>Damage Check</h3>
              <p>Assess vehicle condition</p>
            </Link>
            <Link to="/admin/fleet" className="action-card">
              <div className="action-icon">🚗</div>
              <h3>Add Vehicle</h3>
              <p>Add car to fleet</p>
            </Link>
            <Link to="/admin/reports" className="action-card">
              <div className="action-icon">📊</div>
              <h3>View Reports</h3>
              <p>Business analytics</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboardPage