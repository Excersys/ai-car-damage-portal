import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { mockIsTunnelConfigured, mockFetchTunnelEvents, mockFetchDetail, mockSubmitQc } = vi.hoisted(() => ({
  mockIsTunnelConfigured: vi.fn(),
  mockFetchTunnelEvents: vi.fn(),
  mockFetchDetail: vi.fn(),
  mockSubmitQc: vi.fn(),
}))

vi.mock('../../lib/tunnelReviewApi', () => ({
  isTunnelReviewConfigured: mockIsTunnelConfigured,
  fetchTunnelEvents: mockFetchTunnelEvents,
  fetchTunnelEventDetail: mockFetchDetail,
  submitTunnelEventQc: mockSubmitQc,
}))

import AdminDamageDetectionPage from './AdminDamageDetectionPage'

describe('AdminDamageDetectionPage', () => {
  beforeEach(() => {
    mockIsTunnelConfigured.mockReturnValue(false)
    mockFetchTunnelEvents.mockResolvedValue({ events: [], count: 0 })
    mockFetchDetail.mockResolvedValue(null)
    mockSubmitQc.mockResolvedValue(null)
    global.URL.createObjectURL = vi.fn(() => 'blob:mock')
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const renderPage = () =>
    render(
      <MemoryRouter>
        <AdminDamageDetectionPage />
      </MemoryRouter>
    )

  it('renders with new-inspection tab by default when tunnel not configured', () => {
    renderPage()
    expect(screen.getByText('Vehicle Inspection Setup')).toBeInTheDocument()
  })

  it('shows tunnel-scans tab when tunnel is configured', async () => {
    mockIsTunnelConfigured.mockReturnValue(true)
    mockFetchTunnelEvents.mockResolvedValueOnce({ events: [], count: 0 })

    await act(async () => {
      renderPage()
    })

    expect(screen.getByText('Tunnel Scans')).toBeInTheDocument()
    expect(screen.getByText('No tunnel scan events found.')).toBeInTheDocument()
  })

  it('shows tunnel events in table', async () => {
    mockIsTunnelConfigured.mockReturnValue(true)
    mockFetchTunnelEvents.mockResolvedValueOnce({
      events: [
        {
          event_id: 'e1',
          license_plate: 'ABC123',
          camera_count: 4,
          any_damage: true,
          last_timestamp: '2026-01-01T00:00:00Z',
          qc_status: 'pending',
        },
        {
          event_id: 'e2',
          license_plate: '',
          camera_count: 2,
          any_damage: false,
          last_timestamp: '',
          qc_status: 'approved',
        },
      ],
      count: 2,
    })

    await act(async () => {
      renderPage()
    })

    await waitFor(() => {
      expect(screen.getByText('Recent Tunnel Scans')).toBeInTheDocument()
      expect(screen.getByText('ABC123')).toBeInTheDocument()
      expect(screen.getByText('e2')).toBeInTheDocument()
    })
  })

  it('loads tunnel event detail when clicking View', async () => {
    mockIsTunnelConfigured.mockReturnValue(true)
    mockFetchTunnelEvents.mockResolvedValueOnce({
      events: [
        {
          event_id: 'e1',
          license_plate: 'ABC123',
          camera_count: 4,
          any_damage: true,
          last_timestamp: '2026-01-01T00:00:00Z',
          qc_status: 'pending',
        },
      ],
      count: 1,
    })

    mockFetchDetail.mockResolvedValueOnce({
      event_id: 'e1',
      total_cameras: 4,
      any_damage: true,
      qc: { status: 'pending', notes: '', reviewer_id: '' },
      cameras: [
        {
          camera_frame: 'cam1_001',
          camera_id: 'cam1',
          frame: '001',
          damage_detected: true,
          damage_type: 'scratch',
          confidence_score: 0.85,
          image_url: 'https://example.com/img.jpg',
          bounding_boxes: [{ x: 0.1, y: 0.2, w: 0.3, h: 0.4 }],
        },
      ],
    })

    await act(async () => {
      renderPage()
    })

    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument()
    })

    const viewBtns = screen.getAllByText('View')
    await act(async () => {
      fireEvent.click(viewBtns[0])
    })

    await waitFor(() => {
      expect(screen.getByText('Event e1')).toBeInTheDocument()
      expect(screen.getByText('QC review')).toBeInTheDocument()
      expect(screen.getByText('Back to list')).toBeInTheDocument()
    })
  })

  it('handles QC approve submission', async () => {
    mockIsTunnelConfigured.mockReturnValue(true)
    mockFetchTunnelEvents.mockResolvedValue({ events: [{ event_id: 'e1', license_plate: 'X', camera_count: 1, any_damage: false, last_timestamp: '2026-01-01T00:00:00Z', qc_status: 'pending' }], count: 1 })
    mockFetchDetail.mockResolvedValue({
      event_id: 'e1',
      total_cameras: 1,
      any_damage: false,
      qc: { status: 'pending', notes: '', reviewer_id: '' },
      cameras: [],
    })

    await act(async () => {
      renderPage()
    })

    await waitFor(() => screen.getByText('X'))
    await act(async () => {
      fireEvent.click(screen.getAllByText('View')[0])
    })

    await waitFor(() => screen.getByText('Approve'))

    await act(async () => {
      fireEvent.click(screen.getByText('Approve'))
    })

    await waitFor(() => {
      expect(mockSubmitQc).toHaveBeenCalledWith('e1', expect.objectContaining({ status: 'approved' }))
    })
  })

  it('handles QC reject submission', async () => {
    mockIsTunnelConfigured.mockReturnValue(true)
    mockFetchTunnelEvents.mockResolvedValue({ events: [{ event_id: 'e1', license_plate: 'X', camera_count: 1, any_damage: false, last_timestamp: '2026-01-01T00:00:00Z', qc_status: 'pending' }], count: 1 })
    mockFetchDetail.mockResolvedValue({
      event_id: 'e1',
      total_cameras: 1,
      any_damage: false,
      qc: { status: 'pending', notes: '', reviewer_id: '' },
      cameras: [],
    })

    await act(async () => {
      renderPage()
    })

    await waitFor(() => screen.getByText('X'))
    await act(async () => {
      fireEvent.click(screen.getAllByText('View')[0])
    })
    await waitFor(() => screen.getByText('Reject'))
    await act(async () => {
      fireEvent.click(screen.getByText('Reject'))
    })

    await waitFor(() => {
      expect(mockSubmitQc).toHaveBeenCalledWith('e1', expect.objectContaining({ status: 'rejected' }))
    })
  })

  it('handles QC submit failure', async () => {
    mockIsTunnelConfigured.mockReturnValue(true)
    mockFetchTunnelEvents.mockResolvedValue({ events: [{ event_id: 'e1', license_plate: 'X', camera_count: 1, any_damage: false, last_timestamp: '2026-01-01T00:00:00Z', qc_status: 'pending' }], count: 1 })
    mockFetchDetail.mockResolvedValue({
      event_id: 'e1',
      total_cameras: 1,
      any_damage: false,
      qc: { status: 'pending' },
      cameras: [],
    })
    mockSubmitQc.mockRejectedValueOnce(new Error('QC failed'))

    await act(async () => {
      renderPage()
    })

    await waitFor(() => screen.getByText('X'))
    await act(async () => {
      fireEvent.click(screen.getAllByText('View')[0])
    })
    await waitFor(() => screen.getByText('Approve'))
    await act(async () => {
      fireEvent.click(screen.getByText('Approve'))
    })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('QC failed')
    })
  })

  it('navigates back from detail to list', async () => {
    mockIsTunnelConfigured.mockReturnValue(true)
    mockFetchTunnelEvents.mockResolvedValue({ events: [{ event_id: 'e1', license_plate: 'X', camera_count: 1, any_damage: false, last_timestamp: '2026-01-01T00:00:00Z', qc_status: 'pending' }], count: 1 })
    mockFetchDetail.mockResolvedValue({
      event_id: 'e1',
      total_cameras: 1,
      any_damage: false,
      qc: { status: 'pending' },
      cameras: [],
    })

    await act(async () => {
      renderPage()
    })
    await waitFor(() => screen.getByText('X'))
    await act(async () => {
      fireEvent.click(screen.getAllByText('View')[0])
    })
    await waitFor(() => screen.getByText('Back to list'))
    fireEvent.click(screen.getByText('Back to list'))
    await waitFor(() => {
      expect(screen.getByText('Recent Tunnel Scans')).toBeInTheDocument()
    })
  })

  it('handles tunnel events loading failure', async () => {
    mockIsTunnelConfigured.mockReturnValue(true)
    mockFetchTunnelEvents.mockRejectedValueOnce(new Error('Network error'))

    await act(async () => {
      renderPage()
    })

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('switches to new inspection tab', () => {
    renderPage()
    fireEvent.click(screen.getByText('New Inspection'))
    expect(screen.getByText('Vehicle Inspection Setup')).toBeInTheDocument()
  })

  it('switches to pending reports tab', () => {
    renderPage()
    fireEvent.click(screen.getByText(/Pending Reports/))
    expect(screen.getByText('Reports Awaiting Review')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('switches to history tab', () => {
    renderPage()
    fireEvent.click(screen.getByText(/Inspection History/))
    expect(screen.getByText('Inspection History')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
  })

  it('shows inspection type and vehicle selects', () => {
    renderPage()
    expect(screen.getByText('Inspection Type *')).toBeInTheDocument()
    expect(screen.getByText('Vehicle *')).toBeInTheDocument()
  })

  it('shows customer select for post-rental inspection', () => {
    renderPage()
    const inspectionTypeSelect = screen.getByDisplayValue('Pre-Rental Inspection')
    fireEvent.change(inspectionTypeSelect, { target: { value: 'post-rental' } })
    expect(screen.getByText('Customer')).toBeInTheDocument()
  })

  it('handles image upload in new inspection', () => {
    renderPage()
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })
    expect(screen.getByText(/Uploaded Images/)).toBeInTheDocument()
    expect(screen.getByText('photo.jpg')).toBeInTheDocument()
  })

  it('removes uploaded image', () => {
    renderPage()
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })
    expect(screen.getByText('photo.jpg')).toBeInTheDocument()

    fireEvent.click(screen.getByText('✕'))
    expect(screen.queryByText('photo.jpg')).not.toBeInTheDocument()
  })

  it('starts analysis with vehicle and images selected', async () => {
    vi.useFakeTimers()
    renderPage()
    // Select vehicle
    const vehicleSelect = screen.getByDisplayValue('Select Vehicle')
    fireEvent.change(vehicleSelect, { target: { value: 'tesla-1' } })

    // Upload image
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    // Click analyze
    fireEvent.click(screen.getByText(/Start AI Analysis/))

    expect(screen.getByText(/AI is analyzing vehicle condition/)).toBeInTheDocument()
  })

  it('shows results after analysis completes', async () => {
    vi.useFakeTimers()
    renderPage()
    const vehicleSelect = screen.getByDisplayValue('Select Vehicle')
    fireEvent.change(vehicleSelect, { target: { value: 'tesla-1' } })

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [new File(['t'], 'p.jpg', { type: 'image/jpeg' })] } })
    fireEvent.click(screen.getByText(/Start AI Analysis/))

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(screen.getByText(/AI Analysis Complete/)).toBeInTheDocument()
    expect(screen.getByText('Overall Condition')).toBeInTheDocument()
    expect(screen.getByText('Issues Detected')).toBeInTheDocument()
    expect(screen.getByText('Estimated Repair Cost')).toBeInTheDocument()
  })

  it('saves report and resets', async () => {
    vi.useFakeTimers()
    renderPage()
    const vehicleSelect = screen.getByDisplayValue('Select Vehicle')
    fireEvent.change(vehicleSelect, { target: { value: 'tesla-1' } })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [new File(['t'], 'p.jpg', { type: 'image/jpeg' })] } })
    fireEvent.click(screen.getByText(/Start AI Analysis/))

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    fireEvent.click(screen.getByText(/Save Report/))
    expect(window.alert).toHaveBeenCalledWith('Damage report saved successfully!')
  })

  it('resets inspection from results', async () => {
    vi.useFakeTimers()
    renderPage()
    const vehicleSelect = screen.getByDisplayValue('Select Vehicle')
    fireEvent.change(vehicleSelect, { target: { value: 'tesla-1' } })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [new File(['t'], 'p.jpg', { type: 'image/jpeg' })] } })
    fireEvent.click(screen.getByText(/Start AI Analysis/))

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    fireEvent.click(screen.getByText(/🔄 New Inspection/))
    expect(screen.getByText('Vehicle Inspection Setup')).toBeInTheDocument()
  })

  it('updates QC notes textarea in detail view', async () => {
    mockIsTunnelConfigured.mockReturnValue(true)
    mockFetchTunnelEvents.mockResolvedValue({ events: [{ event_id: 'e1', license_plate: 'X', camera_count: 1, any_damage: false, last_timestamp: '2026-01-01T00:00:00Z', qc_status: 'pending' }], count: 1 })
    mockFetchDetail.mockResolvedValue({
      event_id: 'e1',
      total_cameras: 1,
      any_damage: false,
      qc: { status: 'pending', notes: 'initial', reviewer_id: 'rev1' },
      cameras: [],
    })

    await act(async () => {
      renderPage()
    })
    await waitFor(() => screen.getByText('X'))
    await act(async () => {
      fireEvent.click(screen.getAllByText('View')[0])
    })
    await waitFor(() => screen.getByText('QC review'))

    const textarea = screen.getByDisplayValue('initial')
    fireEvent.change(textarea, { target: { value: 'updated notes' } })
    expect((textarea as HTMLTextAreaElement).value).toBe('updated notes')
  })

  it('shows loading state for tunnel events', async () => {
    mockIsTunnelConfigured.mockReturnValue(true)
    let resolveEvents!: Function
    mockFetchTunnelEvents.mockReturnValueOnce(new Promise(res => { resolveEvents = res }))

    await act(async () => {
      renderPage()
    })

    expect(screen.getByText('Loading tunnel events...')).toBeInTheDocument()

    await act(async () => {
      resolveEvents!({ events: [], count: 0 })
    })
  })

  it('handles tunnel detail loading failure', async () => {
    mockIsTunnelConfigured.mockReturnValue(true)
    mockFetchTunnelEvents.mockResolvedValue({ events: [{ event_id: 'e1', license_plate: 'X', camera_count: 1, any_damage: false, last_timestamp: '2026-01-01T00:00:00Z', qc_status: 'pending' }], count: 1 })
    mockFetchDetail.mockRejectedValueOnce(new Error('Detail load failed'))

    await act(async () => {
      renderPage()
    })
    await waitFor(() => screen.getByText('X'))
    await act(async () => {
      fireEvent.click(screen.getAllByText('View')[0])
    })
    await waitFor(() => {
      expect(screen.getByText('Detail load failed')).toBeInTheDocument()
    })
  })
})
