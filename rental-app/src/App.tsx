import React, { lazy } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import BookPage from './pages/BookPage'
import CarsPage from './pages/CarsPage'
import ConfirmedPage from './pages/ConfirmedPage'
import AppPage from './pages/AppPage'
import BusinessPage from './pages/BusinessPage'
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
import LegacyShell from './components/LegacyShell'
import EzpzLayout from './ezpz/EzpzLayout'

// checkout pulls in Stripe, so it only loads when someone gets there
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))

function App() {
  return (
    <Router>
      <Routes>
        {/* Admin Routes (unchanged) */}
        <Route path="/admin/*" element={
          <LegacyShell>
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
          </LegacyShell>
        } />

        {/* Customer pages already on the EZPZ design */}
        <Route element={<EzpzLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/book" element={<BookPage />} />
          <Route path="/cars" element={<CarsPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/confirmed" element={<ConfirmedPage />} />
          <Route path="/app" element={<AppPage />} />
          <Route path="/business" element={<BusinessPage />} />
        </Route>

        {/* Customer pages still on the previous design (moved over page by page) */}
        <Route path="/*" element={
          <LegacyShell>
            <div className="customer-layout">
              <Header />
              <main className="main-content">
                <Routes>
                  <Route path="/cars/:carId" element={<CarDetailsPage />} />
                  <Route path="/book/:carId" element={<BookingFormPage />} />
                  <Route path="/booking-confirmation/:bookingId" element={<BookingConfirmationPage />} />
                  <Route path="/bookings" element={<BookingsPage />} />
                  <Route path="/login" element={<LoginPage />} />
                </Routes>
              </main>
            </div>
          </LegacyShell>
        } />
      </Routes>
    </Router>
  )
}

export default App
