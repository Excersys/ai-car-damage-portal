import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import CarsPage from './pages/CarsPage'
import CarDetailsPage from './pages/CarDetailsPage'
import BookingFormPage from './pages/BookingFormPage'
import BookingConfirmationPage from './pages/BookingConfirmationPage'
import BookingsPage from './pages/BookingsPage'
import LoginPage from './pages/LoginPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminReservationsPage from './pages/admin/AdminReservationsPage'
import AdminDamageDetectionPage from './pages/admin/AdminDamageDetectionPage'
import AdminFleetPage from './pages/admin/AdminFleetPage'
import AdminInspectionStationPage from './pages/admin/AdminInspectionStationPage'
import Header from './components/Header'
import AdminHeader from './components/AdminHeader'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Admin Routes */}
          <Route path="/admin/*" element={
            <div className="admin-layout">
              <AdminHeader />
              <main className="admin-main-content">
                <Routes>
                  <Route path="/" element={<AdminDashboardPage />} />
                  <Route path="/reservations" element={<AdminReservationsPage />} />
                  <Route path="/damage-detection" element={<AdminDamageDetectionPage />} />
                  <Route path="/fleet" element={<AdminFleetPage />} />
                  <Route path="/inspection-stations" element={<AdminInspectionStationPage />} />
                </Routes>
              </main>
            </div>
          } />
          
          {/* Customer Routes */}
          <Route path="/*" element={
            <div className="customer-layout">
              <Header />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/cars" element={<CarsPage />} />
                  <Route path="/cars/:carId" element={<CarDetailsPage />} />
                  <Route path="/book/:carId" element={<BookingFormPage />} />
                  <Route path="/booking-confirmation/:bookingId" element={<BookingConfirmationPage />} />
                  <Route path="/bookings" element={<BookingsPage />} />
                  <Route path="/login" element={<LoginPage />} />
                </Routes>
              </main>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  )
}

export default App