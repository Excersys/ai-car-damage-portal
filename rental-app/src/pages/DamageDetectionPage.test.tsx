import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const { mockIsTunnelConfigured, mockFetchTunnelEvents } = vi.hoisted(() => ({
  mockIsTunnelConfigured: vi.fn(),
  mockFetchTunnelEvents: vi.fn(),
}))

vi.mock('../lib/tunnelReviewApi', () => ({
  isTunnelReviewConfigured: mockIsTunnelConfigured,
  fetchTunnelEvents: mockFetchTunnelEvents,
  fetchTunnelEventDetail: vi.fn().mockResolvedValue(null),
  submitTunnelEventQc: vi.fn().mockResolvedValue(null),
}))

import DamageDetectionPage from './DamageDetectionPage'

// Helper to create a mock File
function createMockFile(name: string): File {
  return new File(['test-content'], name, { type: 'image/jpeg' })
}

describe('DamageDetectionPage', () => {
  beforeEach(() => {
    mockIsTunnelConfigured.mockReturnValue(false)
    mockFetchTunnelEvents.mockResolvedValue({ events: [], count: 0 })
    mockNavigate.mockReset()
    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-url')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const renderPage = () =>
    render(
      <MemoryRouter>
        <DamageDetectionPage />
      </MemoryRouter>
    )

  it('renders upload UI with instructions', () => {
    renderPage()
    expect(screen.getByText('AI Damage Detection')).toBeInTheDocument()
    expect(screen.getByText('Photo Requirements')).toBeInTheDocument()
    expect(screen.getByText('Click to upload photos')).toBeInTheDocument()
  })

  it('fetches tunnel events when configured', async () => {
    mockIsTunnelConfigured.mockReturnValue(true)
    mockFetchTunnelEvents.mockResolvedValueOnce({
      events: [
        {
          event_id: 'e1',
          license_plate: 'ABC123',
          camera_count: 4,
          any_damage: false,
          last_timestamp: '2026-01-01T00:00:00Z',
          qc_status: 'pending',
        },
      ],
      count: 1,
    })

    await act(async () => {
      renderPage()
    })

    await waitFor(() => {
      expect(mockFetchTunnelEvents).toHaveBeenCalled()
    })
  })

  it('displays tunnel events when available', async () => {
    mockIsTunnelConfigured.mockReturnValue(true)
    mockFetchTunnelEvents.mockResolvedValueOnce({
      events: [
        {
          event_id: 'e1',
          license_plate: 'ABC123',
          camera_count: 4,
          any_damage: true,
          last_timestamp: '2026-01-01T00:00:00Z',
          qc_status: 'approved',
        },
      ],
      count: 1,
    })

    await act(async () => {
      renderPage()
    })

    await waitFor(() => {
      expect(screen.getByText('Recent Tunnel Scans')).toBeInTheDocument()
      expect(screen.getByText('ABC123')).toBeInTheDocument()
      expect(screen.getByText('Damage detected')).toBeInTheDocument()
    })
  })

  it('displays clean status for non-damaged events', async () => {
    mockIsTunnelConfigured.mockReturnValue(true)
    mockFetchTunnelEvents.mockResolvedValueOnce({
      events: [
        {
          event_id: 'e2',
          license_plate: 'DEF456',
          camera_count: 2,
          any_damage: false,
          last_timestamp: '2026-01-02T00:00:00Z',
          qc_status: 'pending',
        },
      ],
      count: 1,
    })

    await act(async () => {
      renderPage()
    })

    await waitFor(() => {
      expect(screen.getByText('Clean')).toBeInTheDocument()
    })
  })

  it('handles file upload and shows previews', async () => {
    renderPage()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const files = [createMockFile('photo1.jpg'), createMockFile('photo2.jpg')]

    await act(async () => {
      fireEvent.change(fileInput, { target: { files } })
    })

    await waitFor(() => {
      expect(screen.getByText(/Selected Images \(2\)/)).toBeInTheDocument()
      expect(screen.getByText('photo1.jpg')).toBeInTheDocument()
      expect(screen.getByText('photo2.jpg')).toBeInTheDocument()
    })
  })

  it('removes an image from preview', async () => {
    renderPage()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const files = [createMockFile('photo1.jpg'), createMockFile('photo2.jpg')]

    await act(async () => {
      fireEvent.change(fileInput, { target: { files } })
    })

    await waitFor(() => {
      expect(screen.getByText('photo1.jpg')).toBeInTheDocument()
    })

    const removeButtons = screen.getAllByText('✕')
    await act(async () => {
      fireEvent.click(removeButtons[0])
    })

    await waitFor(() => {
      expect(screen.queryByText('photo1.jpg')).not.toBeInTheDocument()
      expect(screen.getByText('photo2.jpg')).toBeInTheDocument()
    })
  })

  it('starts analysis and shows analyzing state', async () => {
    vi.useFakeTimers()
    renderPage()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const files = [createMockFile('photo1.jpg')]

    await act(async () => {
      fireEvent.change(fileInput, { target: { files } })
    })

    const analyzeBtn = screen.getByText('Start AI Analysis')
    await act(async () => {
      fireEvent.click(analyzeBtn)
    })

    expect(screen.getByText('Analyzing Vehicle Condition...')).toBeInTheDocument()
    expect(screen.getByText('Images Uploaded')).toBeInTheDocument()
    expect(screen.getByText('AI Analysis')).toBeInTheDocument()
  })

  it('shows results after analysis completes', async () => {
    vi.useFakeTimers()
    renderPage()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const files = [createMockFile('photo1.jpg')]

    fireEvent.change(fileInput, { target: { files } })
    fireEvent.click(screen.getByText('Start AI Analysis'))

    // Fast-forward the setTimeout
    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.getByText('AI Analysis Complete')).toBeInTheDocument()
    expect(screen.getByText('92%')).toBeInTheDocument()
    expect(screen.getByText('Good')).toBeInTheDocument()
    expect(screen.getAllByText('Minor Scratch').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Small Dent').length).toBeGreaterThan(0)
    expect(screen.getByText('$450')).toBeInTheDocument()
    expect(screen.getByText('Document and proceed with rental')).toBeInTheDocument()
  })

  it('resets analysis when clicking New Analysis', async () => {
    vi.useFakeTimers()
    renderPage()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const files = [createMockFile('photo1.jpg')]

    fireEvent.change(fileInput, { target: { files } })
    fireEvent.click(screen.getByText('Start AI Analysis'))

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.getByText('AI Analysis Complete')).toBeInTheDocument()

    fireEvent.click(screen.getByText('New Analysis'))

    expect(screen.getByText('Click to upload photos')).toBeInTheDocument()
  })

  it('saves report when clicking Save Report', async () => {
    vi.useFakeTimers()
    renderPage()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const files = [createMockFile('photo1.jpg')]

    fireEvent.change(fileInput, { target: { files } })
    fireEvent.click(screen.getByText('Start AI Analysis'))

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.getByText('Save Report')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Save Report'))

    expect(screen.getByText('Report Saved')).toBeInTheDocument()
    expect(screen.getByText('Report Saved')).toBeDisabled()
  })

  it('navigates to /cars when clicking Continue to Booking', async () => {
    vi.useFakeTimers()
    renderPage()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const files = [createMockFile('photo1.jpg')]

    fireEvent.change(fileInput, { target: { files } })
    fireEvent.click(screen.getByText('Start AI Analysis'))

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.getByText('Continue to Booking')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Continue to Booking'))

    expect(mockNavigate).toHaveBeenCalledWith('/cars')
  })

  it('does not start analysis with no images', async () => {
    renderPage()
    // startAnalysis returns early if no images; no analyzing state should appear
    // Since the button only shows when images are selected, this just verifies the guard
    expect(screen.queryByText('Analyzing Vehicle Condition...')).not.toBeInTheDocument()
  })

  it('shows damage cost breakdown in results', async () => {
    vi.useFakeTimers()
    renderPage()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [createMockFile('p.jpg')] } })
    fireEvent.click(screen.getByText('Start AI Analysis'))

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.getAllByText('$150').length).toBeGreaterThan(0)
    expect(screen.getAllByText('$300').length).toBeGreaterThan(0)
    expect(screen.getByText('Total Estimated Cost')).toBeInTheDocument()
  })

  it('handles tunnel events fetch failure silently', async () => {
    mockIsTunnelConfigured.mockReturnValue(true)
    mockFetchTunnelEvents.mockRejectedValueOnce(new Error('network error'))

    await act(async () => {
      renderPage()
    })

    // Should not crash
    expect(screen.getByText('AI Damage Detection')).toBeInTheDocument()
  })

  it('shows event_id when license_plate is missing', async () => {
    mockIsTunnelConfigured.mockReturnValue(true)
    mockFetchTunnelEvents.mockResolvedValueOnce({
      events: [
        {
          event_id: 'ev-no-plate',
          license_plate: '',
          camera_count: 3,
          any_damage: false,
          last_timestamp: '2026-01-01T00:00:00Z',
          qc_status: 'pending',
        },
      ],
      count: 1,
    })

    await act(async () => {
      renderPage()
    })

    await waitFor(() => {
      expect(screen.getByText('ev-no-plate')).toBeInTheDocument()
    })
  })
})
