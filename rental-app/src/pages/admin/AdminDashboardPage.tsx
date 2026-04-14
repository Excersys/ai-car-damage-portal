import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchTunnelEvents,
  isTunnelReviewConfigured,
  type TunnelEventSummary,
} from '../../lib/tunnelReviewApi'
import { fetchAdminDashboard, type AdminDashboardPayload } from '../../lib/adminApi'

function formatRelativeTime(iso: string): string {
  try {
    const d = new Date(iso)
    const diff = Date.now() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins} min ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} hr ago`
    return d.toLocaleDateString()
  } catch {
    return iso
  }
}

/** Map API activity types to icon bucket used by the dashboard UI. */
function mapApiActivityType(apiType: string): string {
  const t = apiType.toLowerCase()
  if (t.includes('verification') || t.includes('risk')) return 'damage'
  if (t.includes('payment') || t.includes('return')) return 'return'
  return 'booking'
}

function mapSeverityToPriority(severity: string): 'high' | 'medium' | 'low' {
  const s = severity.toLowerCase()
  if (s === 'warning' || s === 'critical' || s === 'high') return 'high'
  if (s === 'info' || s === 'low') return 'low'
  return 'medium'
}

function mapDashboardFromApi(live: AdminDashboardPayload) {
  const recentActivity = (live.recentActivity ?? []).map((a) => ({
    id: a.id,
    type: mapApiActivityType(a.type),
    customer: a.user,
    car: a.vehicle ?? '—',
    time: formatRelativeTime(a.timestamp),
    status: (a.status ?? 'confirmed') as string,
  }))

  const alerts = (live.alerts ?? []).map((a) => ({
    id: a.id,
    type: a.type,
    message: a.message,
    priority: mapSeverityToPriority(a.severity),
  }))

  return { recentActivity, alerts }
}

const AdminDashboardPage: React.FC = () => {
  const [tunnelEvents, setTunnelEvents] = useState<TunnelEventSummary[]>([])
  const [tunnelLoading, setTunnelLoading] = useState(false)
  const [tunnelError, setTunnelError] = useState<string | null>(null)

  useEffect(() => {
    if (!isTunnelReviewConfigured()) {
      setTunnelError(null)
      return
    }
    let cancelled = false
    ;(async () => {
      setTunnelLoading(true)
      setTunnelError(null)
      try {
        const data = await fetchTunnelEvents()
        if (!cancelled) {
          setTunnelEvents(data.events ?? [])
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setTunnelError(e instanceof Error ? e.message : 'Failed to load tunnel events')
        }
      } finally {
        if (!cancelled) setTunnelLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const [dashboardData, setDashboardData] = useState({
    metrics: {
      totalRevenue: 45280,
      activeReservations: 23,
      availableVehicles: 8,
      totalCustomers: 156,
      damageReports: 3,
      maintenanceAlerts: 2
    },
    recentActivity: [
      { id: '1', type: 'booking', customer: 'John Doe', car: 'Tesla Model 3', time: '10 minutes ago', status: 'confirmed' },
      { id: '2', type: 'damage', customer: 'Jane Smith', car: 'BMW X5', time: '2 hours ago', status: 'pending' },
      { id: '3', type: 'return', customer: 'Mike Johnson', car: 'Toyota Camry', time: '4 hours ago', status: 'completed' },
      { id: '4', type: 'booking', customer: 'Sarah Wilson', car: 'Tesla Model 3', time: '6 hours ago', status: 'confirmed' },
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
      { id: '1', type: 'maintenance', message: 'BMW X5 - Oil change due in 2 days', priority: 'medium' },
      { id: '2', type: 'damage', message: 'Tesla Model 3 - New damage report pending review', priority: 'high' },
      { id: '3', type: 'booking', message: '5 new reservations require identity verification', priority: 'medium' },
    ] as Array<{ id: string; type: string; message: string; priority: 'high' | 'medium' | 'low' }>
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const live = await fetchAdminDashboard()
      if (cancelled || !live) return
      const { recentActivity, alerts } = mapDashboardFromApi(live)
      setDashboardData((prev) => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          totalRevenue: Math.round(live.overview.totalRevenue),
          activeReservations: live.overview.activeBookings,
          availableVehicles: live.overview.availableVehicles,
        },
        recentActivity,
        alerts,
      }))
    })()
    return () => {
      cancelled = true
    }
  }, [])

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
          <p>Welcome back! Here&apos;s what&apos;s happening with your rental business.</p>
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

        <div className="dashboard-section full-width tunnel-inspection-feed">
          <div className="section-header">
            <h2>Tunnel inspection feed</h2>
            <Link to="/admin/damage-detection" className="section-link">Damage detection</Link>
          </div>
          {!isTunnelReviewConfigured() && (
            <p className="tunnel-feed-hint">
              Connect live tunnel data by setting <code>VITE_TUNNEL_REVIEW_API_BASE_URL</code> and{' '}
              <code>VITE_TUNNEL_REVIEW_API_KEY</code> (from the camera-system Tunnel API deployment).
            </p>
          )}
          {isTunnelReviewConfigured() && tunnelLoading && (
            <p className="tunnel-feed-status">Loading tunnel events…</p>
          )}
          {isTunnelReviewConfigured() && tunnelError && (
            <p className="tunnel-feed-error" role="alert">
              {tunnelError}
            </p>
          )}
          {isTunnelReviewConfigured() && !tunnelLoading && !tunnelError && tunnelEvents.length === 0 && (
            <p className="tunnel-feed-status">No tunnel scan events in DynamoDB yet.</p>
          )}
          {tunnelEvents.length > 0 && (
            <div className="tunnel-feed-grid">
              {tunnelEvents.map((ev) => (
                <div key={ev.event_id} className="tunnel-feed-card">
                  <div className="tunnel-feed-thumb">
                    {ev.preview_image_url ? (
                      <img src={ev.preview_image_url} alt="" loading="lazy" />
                    ) : (
                      <span className="tunnel-feed-no-image">No preview</span>
                    )}
                  </div>
                  <div className="tunnel-feed-meta">
                    <code className="tunnel-feed-id">{ev.event_id}</code>
                    <p className="tunnel-feed-plate">
                      Plate: {ev.license_plate || '—'}
                    </p>
                    <p className="tunnel-feed-time">
                      {ev.last_timestamp
                        ? new Date(ev.last_timestamp).toLocaleString()
                        : '—'}
                    </p>
                    <p className="tunnel-feed-cams">{ev.camera_count} camera(s)</p>
                    <p className="tunnel-feed-cams" style={{ fontSize: 12 }}>
                      QC: {ev.qc_status || 'pending'}
                    </p>
                    {ev.any_damage && (
                      <span className="tunnel-feed-damage">Damage flagged</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
              <h2>Today&apos;s Pickups</h2>
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