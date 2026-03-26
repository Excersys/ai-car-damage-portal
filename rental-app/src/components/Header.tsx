import React from 'react'
import { Link } from 'react-router-dom'

const Header: React.FC = () => {
  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="logo">
          <h1>🚗 EZ Car Rental</h1>
        </Link>
        <nav className="nav">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/cars" className="nav-link">Browse Cars</Link>
          <Link to="/bookings" className="nav-link">My Bookings</Link>
          <Link to="/login" className="nav-link login-btn">Login</Link>
          <Link to="/admin" className="nav-link admin-link">Admin Portal</Link>
        </nav>
      </div>
    </header>
  )
}

export default Header