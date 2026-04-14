import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Header from './Header'

describe('Header', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    )
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('shows the logo text', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('EZ Car Rental')
  })

  it('has navigation links', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    )
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Browse Cars')).toBeInTheDocument()
    expect(screen.getByText('My Bookings')).toBeInTheDocument()
    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.getByText('Admin Portal')).toBeInTheDocument()
  })

  it('links point to correct routes', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    )
    expect(screen.getByText('Home').closest('a')).toHaveAttribute('href', '/')
    expect(screen.getByText('Browse Cars').closest('a')).toHaveAttribute('href', '/cars')
    expect(screen.getByText('My Bookings').closest('a')).toHaveAttribute('href', '/bookings')
    expect(screen.getByText('Login').closest('a')).toHaveAttribute('href', '/login')
    expect(screen.getByText('Admin Portal').closest('a')).toHaveAttribute('href', '/admin')
  })
})
