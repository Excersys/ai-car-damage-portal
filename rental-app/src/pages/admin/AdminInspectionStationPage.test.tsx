import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { mockIsPiConfigured, mockFetchPiHealth, mockFetchPiQueue } = vi.hoisted(() => ({
  mockIsPiConfigured: vi.fn(),
  mockFetchPiHealth: vi.fn(),
  mockFetchPiQueue: vi.fn(),
}))

vi.mock('../../lib/piHealthApi', () => ({
  isPiHealthConfigured: mockIsPiConfigured,
  fetchPiHealth: mockFetchPiHealth,
  fetchPiQueueStatus: mockFetchPiQueue,
}))

import AdminInspectionStationPage from './AdminInspectionStationPage'

describe('AdminInspectionStationPage', () => {
  beforeEach(() => {
    mockIsPiConfigured.mockReturnValue(false)
    mockFetchPiHealth.mockResolvedValue(null)
    mockFetchPiQueue.mockResolvedValue(null)
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const renderPage = () =>
    render(
      <MemoryRouter>
        <AdminInspectionStationPage />
      </MemoryRouter>
    )

  it('renders inspection stations page', async () => {
    await act(async () => {
      renderPage()
    })
    expect(screen.getByText(/Inspection Stations/)).toBeInTheDocument()
    expect(screen.getByText('Station Status Overview')).toBeInTheDocument()
  })

  it('shows all mock stations', async () => {
    await act(async () => {
      renderPage()
    })
    await waitFor(() => {
      expect(screen.getByText('Inspection Bay A')).toBeInTheDocument()
      expect(screen.getByText('Inspection Bay B')).toBeInTheDocument()
      expect(screen.getByText('Inspection Bay C')).toBeInTheDocument()
      expect(screen.getByText('Inspection Bay D')).toBeInTheDocument()
    })
  })

  it('shows station statuses', async () => {
    await act(async () => {
      renderPage()
    })
    await waitFor(() => {
      expect(screen.getAllByText('IDLE').length).toBe(2)
      expect(screen.getByText('OCCUPIED')).toBeInTheDocument()
      expect(screen.getByText('MAINTENANCE')).toBeInTheDocument()
    })
  })

  it('shows current inspection details for occupied station', async () => {
    await act(async () => {
      renderPage()
    })
    await waitFor(() => {
      expect(screen.getByText('Current Inspection')).toBeInTheDocument()
      expect(screen.getByText(/BK1722814756432/)).toBeInTheDocument()
      expect(screen.getByText(/John Doe/)).toBeInTheDocument()
      expect(screen.getByText(/60% Complete/)).toBeInTheDocument()
    })
  })

  it('shows camera status indicators', async () => {
    await act(async () => {
      renderPage()
    })
    await waitFor(() => {
      // Each station has 5 cameras
      const greenDots = screen.getAllByText('🟢')
      const redDots = screen.getAllByText('🔴')
      expect(greenDots.length).toBeGreaterThan(0)
      expect(redDots.length).toBeGreaterThan(0)
    })
  })

  it('shows inspection type select and reservation input for idle stations', async () => {
    await act(async () => {
      renderPage()
    })
    await waitFor(() => {
      const selects = screen.getAllByDisplayValue('Pickup Inspection')
      expect(selects.length).toBeGreaterThan(0)
      const inputs = screen.getAllByPlaceholderText('Reservation ID')
      expect(inputs.length).toBeGreaterThan(0)
    })
  })

  it('changes inspection type', async () => {
    await act(async () => {
      renderPage()
    })
    await waitFor(() => {
      const selects = screen.getAllByDisplayValue('Pickup Inspection')
      fireEvent.change(selects[0], { target: { value: 'return' } })
    })
  })

  it('updates reservation ID input', async () => {
    await act(async () => {
      renderPage()
    })
    await waitFor(() => {
      const inputs = screen.getAllByPlaceholderText('Reservation ID')
      fireEvent.change(inputs[0], { target: { value: 'BK-999' } })
      expect((inputs[0] as HTMLInputElement).value).toBe('BK-999')
    })
  })

  it('shows alert when starting inspection without reservation ID', async () => {
    await act(async () => {
      renderPage()
    })
    await waitFor(() => {
      const startBtns = screen.getAllByText(/Start Inspection/)
      fireEvent.click(startBtns[0])
    })
    expect(window.alert).toHaveBeenCalledWith('Please enter a reservation ID')
  })

  it('shows maintenance button for maintenance station', async () => {
    await act(async () => {
      renderPage()
    })
    await waitFor(() => {
      expect(screen.getByText(/View Maintenance/)).toBeInTheDocument()
    })
  })

  it('shows monitor button for occupied station', async () => {
    await act(async () => {
      renderPage()
    })
    await waitFor(() => {
      expect(screen.getByText(/Monitor Progress/)).toBeInTheDocument()
    })
  })

  it('shows instructions panel', async () => {
    await act(async () => {
      renderPage()
    })
    expect(screen.getByText(/Inspection Station Instructions/)).toBeInTheDocument()
    expect(screen.getByText('Vehicle Positioning')).toBeInTheDocument()
    expect(screen.getByText('Camera System')).toBeInTheDocument()
    expect(screen.getByText('AI Analysis')).toBeInTheDocument()
  })

  it('shows Pi health when configured', async () => {
    mockIsPiConfigured.mockReturnValue(true)
    mockFetchPiHealth.mockResolvedValue({
      s3_connectivity: true,
      cameras_discovered: 8,
      queue_pending: 3,
      queue_max_pending: 50,
      queue_at_capacity: false,
    })
    mockFetchPiQueue.mockResolvedValue({
      uploaded: 100,
      failed: 2,
      pending: 3,
    })

    await act(async () => {
      renderPage()
    })

    await waitFor(() => {
      expect(screen.getByText('Pi Edge Status')).toBeInTheDocument()
      expect(screen.getByText('Online')).toBeInTheDocument()
      expect(screen.getByText('S3 Connectivity')).toBeInTheDocument()
      expect(screen.getByText('8')).toBeInTheDocument()
      expect(screen.getByText('Cameras Discovered')).toBeInTheDocument()
      expect(screen.getByText('3 / 50')).toBeInTheDocument()
      expect(screen.getByText('Upload Queue')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
    })
  })

  it('shows Pi offline status', async () => {
    mockIsPiConfigured.mockReturnValue(true)
    mockFetchPiHealth.mockResolvedValue({
      s3_connectivity: false,
      cameras_discovered: 0,
      queue_pending: 0,
      queue_max_pending: 50,
      queue_at_capacity: false,
    })
    mockFetchPiQueue.mockResolvedValue(null)

    await act(async () => {
      renderPage()
    })

    await waitFor(() => {
      expect(screen.getByText('Offline')).toBeInTheDocument()
    })
  })

  it('shows Pi at capacity warning', async () => {
    mockIsPiConfigured.mockReturnValue(true)
    mockFetchPiHealth.mockResolvedValue({
      s3_connectivity: true,
      cameras_discovered: 4,
      queue_pending: 50,
      queue_max_pending: 50,
      queue_at_capacity: true,
    })
    mockFetchPiQueue.mockResolvedValue(null)

    await act(async () => {
      renderPage()
    })

    await waitFor(() => {
      expect(screen.getByText('AT CAPACITY')).toBeInTheDocument()
    })
  })

  it('shows Pi error state', async () => {
    mockIsPiConfigured.mockReturnValue(true)
    mockFetchPiHealth.mockRejectedValue(new Error('Pi unreachable'))

    await act(async () => {
      renderPage()
    })

    await waitFor(() => {
      expect(screen.getByText('Pi unreachable')).toBeInTheDocument()
    })
  })

  it('shows loading state for Pi health', async () => {
    mockIsPiConfigured.mockReturnValue(true)
    let resolveHealth: Function
    mockFetchPiHealth.mockReturnValue(new Promise(res => { resolveHealth = res }))
    mockFetchPiQueue.mockReturnValue(new Promise(() => {}))

    await act(async () => {
      renderPage()
    })

    expect(screen.getByText('Loading Pi health...')).toBeInTheDocument()

    await act(async () => {
      resolveHealth!(null)
    })
  })

  it('has refresh button for Pi health', async () => {
    mockIsPiConfigured.mockReturnValue(true)
    mockFetchPiHealth.mockResolvedValue({
      s3_connectivity: true,
      cameras_discovered: 4,
      queue_pending: 0,
      queue_max_pending: 50,
      queue_at_capacity: false,
    })
    mockFetchPiQueue.mockResolvedValue(null)

    await act(async () => {
      renderPage()
    })

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument()
    })

    mockFetchPiHealth.mockResolvedValueOnce({
      s3_connectivity: true,
      cameras_discovered: 10,
      queue_pending: 0,
      queue_max_pending: 50,
      queue_at_capacity: false,
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Refresh'))
    })

    expect(mockFetchPiHealth).toHaveBeenCalled()
  })

  it('shows header action buttons', async () => {
    await act(async () => {
      renderPage()
    })
    expect(screen.getByText(/Station Reports/)).toBeInTheDocument()
    expect(screen.getByText(/Configure Stations/)).toBeInTheDocument()
  })

  it('shows camera last capture time', async () => {
    await act(async () => {
      renderPage()
    })
    await waitFor(() => {
      // Station D has cameras without lastCapture
      const neverTexts = screen.getAllByText('Never')
      expect(neverTexts.length).toBeGreaterThan(0)
    })
  })
})
