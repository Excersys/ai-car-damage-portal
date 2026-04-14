import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import VehicleSearchPage from './VehicleSearchPage'

import userEvent from '@testing-library/user-event'

let capturedOnSelect: any = null
vi.mock('../components/VehicleSearch', () => ({
  default: ({ onVehicleSelect }: any) => {
    capturedOnSelect = onVehicleSelect
    return <div data-testid="vehicle-search">VehicleSearch Mock <button onClick={() => onVehicleSelect({ id: '42' })}>Select</button></div>
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

describe('VehicleSearchPage', () => {
  it('renders VehicleSearch component', () => {
    render(
      <MemoryRouter>
        <VehicleSearchPage />
      </MemoryRouter>
    )
    expect(screen.getByTestId('vehicle-search')).toBeInTheDocument()
  })

  it('navigates to vehicle detail when onVehicleSelect fires', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <VehicleSearchPage />
      </MemoryRouter>
    )
    await user.click(screen.getByText('Select'))
    expect(mockNavigate).toHaveBeenCalledWith('/vehicles/42')
  })
})
