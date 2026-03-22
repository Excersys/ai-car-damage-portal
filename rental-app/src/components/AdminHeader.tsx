import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const AdminHeader: React.FC = () => {
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname.startsWith(path)
  }

  return (
    <header className="admin-header">
      <div className="admin-container">
        <Link to="/admin" className="admin-logo">
          <h1>🏢 EZ Car Rental Admin</h1>
        </Link>
        <nav className="admin-nav">
          <Link 
            to="/admin" 
            className={`admin-nav-link ${isActive('/admin') && location.pathname === '/admin' ? 'active' : ''}`}
          >
            📊 Dashboard
          </Link>
          <Link 
            to="/admin/reservations" 
            className={`admin-nav-link ${isActive('/admin/reservations') ? 'active' : ''}`}
          >
            📅 Reservations
          </Link>
          <Link 
            to="/admin/damage-detection" 
            className={`admin-nav-link ${isActive('/admin/damage-detection') ? 'active' : ''}`}
          >
            🤖 Damage Detection
          </Link>
          <Link 
            to="/admin/fleet" 
            className={`admin-nav-link ${isActive('/admin/fleet') ? 'active' : ''}`}
          >
            🚗 Fleet Management
          </Link>
          <Link 
            to="/admin/inspection-stations" 
            className={`admin-nav-link ${isActive('/admin/inspection-stations') ? 'active' : ''}`}
          >
            🎥 Inspection Stations
          </Link>
          <Link 
            to="/admin/customers" 
            className={`admin-nav-link ${isActive('/admin/customers') ? 'active' : ''}`}
          >
            👥 Customers
          </Link>
          <Link 
            to="/admin/reports" 
            className={`admin-nav-link ${isActive('/admin/reports') ? 'active' : ''}`}
          >
            📈 Reports
          </Link>
          <div className="admin-user-menu">
            <span className="admin-user-name">Admin User</span>
            <Link to="/" className="admin-nav-link customer-portal-link">
              🔄 Customer Portal
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
}

export default AdminHeader