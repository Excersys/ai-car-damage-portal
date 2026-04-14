import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminHeader from './AdminHeader'

describe('AdminHeader', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminHeader />
      </MemoryRouter>
    )
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('shows the admin logo', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminHeader />
      </MemoryRouter>
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('EZ Car Rental Admin')
  })

  it('has admin navigation links', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminHeader />
      </MemoryRouter>
    )
    expect(screen.getByText(/Dashboard/)).toBeInTheDocument()
    expect(screen.getByText(/Reservations/)).toBeInTheDocument()
    expect(screen.getByText(/Damage Detection/)).toBeInTheDocument()
    expect(screen.getByText(/Fleet Management/)).toBeInTheDocument()
    expect(screen.getByText(/Inspection Stations/)).toBeInTheDocument()
    expect(screen.getByText(/Customers/)).toBeInTheDocument()
    expect(screen.getByText(/Reports/)).toBeInTheDocument()
  })

  it('shows Admin User name', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminHeader />
      </MemoryRouter>
    )
    expect(screen.getByText('Admin User')).toBeInTheDocument()
  })

  it('has a Customer Portal link back to /', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminHeader />
      </MemoryRouter>
    )
    const link = screen.getByText(/Customer Portal/)
    expect(link.closest('a')).toHaveAttribute('href', '/')
  })
})
