import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

// Mock all page/component imports to avoid deep dependency chains
vi.mock('./pages/HomePage', () => ({ default: () => <div data-testid="home-page">Home</div> }))
vi.mock('./pages/CarsPage', () => ({ default: () => <div>Cars</div> }))
vi.mock('./pages/CarDetailsPage', () => ({ default: () => <div>CarDetails</div> }))
vi.mock('./pages/BookingFormPage', () => ({ default: () => <div>BookingForm</div> }))
vi.mock('./pages/BookingConfirmationPage', () => ({ default: () => <div>BookingConfirmation</div> }))
vi.mock('./pages/BookingsPage', () => ({ default: () => <div>Bookings</div> }))
vi.mock('./pages/LoginPage', () => ({ default: () => <div>Login</div> }))
vi.mock('./pages/DamageDetectionPage', () => ({ default: () => <div>DamageDetection</div> }))
vi.mock('./pages/VehicleSearchPage', () => ({ default: () => <div>VehicleSearch</div> }))
vi.mock('./pages/VehicleDetailsPage', () => ({ default: () => <div>VehicleDetails</div> }))
vi.mock('./pages/admin/AdminDashboardPage', () => ({ default: () => <div>AdminDashboard</div> }))
vi.mock('./pages/admin/AdminReservationsPage', () => ({ default: () => <div>AdminReservations</div> }))
vi.mock('./pages/admin/AdminDamageDetectionPage', () => ({ default: () => <div>AdminDamageDetection</div> }))
vi.mock('./pages/admin/AdminFleetPage', () => ({ default: () => <div>AdminFleet</div> }))
vi.mock('./pages/admin/AdminInspectionStationPage', () => ({ default: () => <div>AdminInspection</div> }))
vi.mock('./pages/admin/AdminCustomersPage', () => ({ default: () => <div>AdminCustomers</div> }))
vi.mock('./pages/admin/AdminReportsPage', () => ({ default: () => <div>AdminReports</div> }))

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(screen.getByTestId('home-page')).toBeInTheDocument()
  })

  it('has the App class on root div', () => {
    const { container } = render(<App />)
    expect(container.querySelector('.App')).toBeTruthy()
  })

  it('renders the Header component in the customer layout', () => {
    render(<App />)
    // Header renders nav links
    expect(screen.getByText('Browse Cars')).toBeInTheDocument()
  })
})
