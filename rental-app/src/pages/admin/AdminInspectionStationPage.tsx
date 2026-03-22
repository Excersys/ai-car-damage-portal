import React, { useState, useEffect, useRef } from 'react'

interface InspectionStation {
  id: string
  name: string
  location: string
  status: 'idle' | 'occupied' | 'inspecting' | 'maintenance'
  cameras: {
    front: { active: boolean; lastCapture?: string }
    rear: { active: boolean; lastCapture?: string }
    leftSide: { active: boolean; lastCapture?: string }
    rightSide: { active: boolean; lastCapture?: string }
    interior: { active: boolean; lastCapture?: string }
  }
  currentInspection?: {
    reservationId: string
    licensePlate: string
    customer: string
    type: 'pickup' | 'return'
    startTime: string
    progress: number
  }
}

interface InspectionResult {
  id: string
  reservationId: string
  stationId: string
  type: 'pickup' | 'return'
  timestamp: string
  images: {
    front: string
    rear: string
    leftSide: string
    rightSide: string
    interior: string
  }
  aiAnalysis?: {
    overallCondition: string
    damageDetected: Array<{
      type: string
      location: string
      severity: string
      confidence: number
    }>
    comparisonWithPrevious?: {
      newDamage: Array<{
        type: string
        location: string
        severity: string
        estimatedCost: number
      }>
      totalNewDamageCost: number
    }
  }
}

const AdminInspectionStationPage: React.FC = () => {
  const [stations, setStations] = useState<InspectionStation[]>([])
  const [selectedStation, setSelectedStation] = useState<InspectionStation | null>(null)
  const [showInspectionModal, setShowInspectionModal] = useState(false)
  const [inspectionType, setInspectionType] = useState<'pickup' | 'return'>('pickup')
  const [reservationId, setReservationId] = useState('')
  const [isInspecting, setIsInspecting] = useState(false)
  const [inspectionProgress, setInspectionProgress] = useState(0)
  const [capturedImages, setCapturedImages] = useState<Record<string, string>>({})
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Mock inspection stations data
  const mockStations: InspectionStation[] = [
    {
      id: 'station-1',
      name: 'Inspection Bay A',
      location: 'Downtown Office - Bay 1',
      status: 'idle',
      cameras: {
        front: { active: true, lastCapture: '2025-08-06T10:30:00' },
        rear: { active: true, lastCapture: '2025-08-06T10:30:00' },
        leftSide: { active: true, lastCapture: '2025-08-06T10:30:00' },
        rightSide: { active: true, lastCapture: '2025-08-06T10:30:00' },
        interior: { active: true, lastCapture: '2025-08-06T10:30:00' }
      }
    },
    {
      id: 'station-2',
      name: 'Inspection Bay B',
      location: 'Downtown Office - Bay 2',
      status: 'occupied',
      cameras: {
        front: { active: true },
        rear: { active: true },
        leftSide: { active: false },
        rightSide: { active: true },
        interior: { active: true }
      },
      currentInspection: {
        reservationId: 'BK1722814756432',
        licensePlate: 'ABC-1234',
        customer: 'John Doe',
        type: 'return',
        startTime: '2025-08-06T14:30:00',
        progress: 60
      }
    },
    {
      id: 'station-3',
      name: 'Inspection Bay C',
      location: 'Airport - Bay 1',
      status: 'idle',
      cameras: {
        front: { active: true },
        rear: { active: true },
        leftSide: { active: true },
        rightSide: { active: true },
        interior: { active: true }
      }
    },
    {
      id: 'station-4',
      name: 'Inspection Bay D',
      location: 'Airport - Bay 2',
      status: 'maintenance',
      cameras: {
        front: { active: false },
        rear: { active: true },
        leftSide: { active: true },
        rightSide: { active: false },
        interior: { active: true }
      }
    }
  ]

  useEffect(() => {
    setStations(mockStations)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return '#4caf50'
      case 'occupied': return '#2196f3'
      case 'inspecting': return '#ff9800'
      case 'maintenance': return '#f44336'
      default: return '#666'
    }
  }

  const getCameraStatusIcon = (active: boolean) => {
    return active ? '🟢' : '🔴'
  }

  const startInspection = async (station: InspectionStation) => {
    if (!reservationId.trim()) {
      alert('Please enter a reservation ID')
      return
    }

    setSelectedStation(station)
    setShowInspectionModal(true)
    setIsInspecting(true)
    setInspectionProgress(0)
    setCapturedImages({})

    // Start camera stream
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1920, height: 1080 } 
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Camera access denied:', error)
      alert('Camera access required for inspection. Please allow camera permissions.')
    }

    // Simulate automated inspection process
    const cameras = ['front', 'rear', 'leftSide', 'rightSide', 'interior']
    const totalSteps = cameras.length

    for (let i = 0; i < cameras.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay per camera
      
      const camera = cameras[i]
      const progress = ((i + 1) / totalSteps) * 100
      setInspectionProgress(progress)

      // Capture image from camera
      captureImage(camera)
      
      // Update station status
      setStations(prev => prev.map(s => 
        s.id === station.id 
          ? {
              ...s,
              status: 'inspecting',
              currentInspection: {
                reservationId,
                licensePlate: 'ABC-1234', // This would come from reservation lookup
                customer: 'John Doe', // This would come from reservation lookup
                type: inspectionType,
                startTime: new Date().toISOString(),
                progress
              }
            }
          : s
      ))
    }

    // Complete inspection
    setTimeout(() => {
      setIsInspecting(false)
      completeInspection(station)
    }, 1000)
  }

  const captureImage = (cameraPosition: string) => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext('2d')
      
      if (context) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0)
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8)
        setCapturedImages(prev => ({
          ...prev,
          [cameraPosition]: imageData
        }))
      }
    }
  }

  const completeInspection = (station: InspectionStation) => {
    // In real implementation, this would:
    // 1. Upload images to S3
    // 2. Trigger Lambda function for AI analysis
    // 3. Compare with previous inspection if return type
    // 4. Generate inspection report
    // 5. Update reservation status

    alert(`Inspection completed for ${inspectionType} at ${station.name}!`)
    
    // Reset station status
    setStations(prev => prev.map(s => 
      s.id === station.id 
        ? {
            ...s,
            status: 'idle',
            currentInspection: undefined,
            cameras: {
              ...s.cameras,
              front: { ...s.cameras.front, lastCapture: new Date().toISOString() },
              rear: { ...s.cameras.rear, lastCapture: new Date().toISOString() },
              leftSide: { ...s.cameras.leftSide, lastCapture: new Date().toISOString() },
              rightSide: { ...s.cameras.rightSide, lastCapture: new Date().toISOString() },
              interior: { ...s.cameras.interior, lastCapture: new Date().toISOString() }
            }
          }
        : s
    ))

    // Close modal and stop camera
    setShowInspectionModal(false)
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
    }
  }

  const formatLastCapture = (timestamp?: string) => {
    if (!timestamp) return 'Never'
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="admin-inspection-station">
      <div className="admin-container">
        <div className="page-header">
          <h1>🎥 Inspection Stations</h1>
          <div className="header-actions">
            <button className="btn btn-secondary">
              📊 Station Reports
            </button>
            <button className="btn btn-primary">
              ⚙️ Configure Stations
            </button>
          </div>
        </div>

        {/* Station Status Overview */}
        <div className="stations-overview">
          <h2>Station Status Overview</h2>
          <div className="stations-grid">
            {stations.map(station => (
              <div key={station.id} className="station-card">
                <div className="station-header">
                  <h3>{station.name}</h3>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(station.status) }}
                  >
                    {station.status.toUpperCase()}
                  </span>
                </div>

                <div className="station-info">
                  <p className="station-location">{station.location}</p>
                  
                  {station.currentInspection && (
                    <div className="current-inspection">
                      <h4>Current Inspection</h4>
                      <div className="inspection-details">
                        <p><strong>Reservation:</strong> {station.currentInspection.reservationId}</p>
                        <p><strong>Customer:</strong> {station.currentInspection.customer}</p>
                        <p><strong>License:</strong> {station.currentInspection.licensePlate}</p>
                        <p><strong>Type:</strong> {station.currentInspection.type}</p>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ width: `${station.currentInspection.progress}%` }}
                          ></div>
                        </div>
                        <p className="progress-text">{station.currentInspection.progress}% Complete</p>
                      </div>
                    </div>
                  )}

                  <div className="camera-status">
                    <h4>Camera Status</h4>
                    <div className="cameras-grid">
                      {Object.entries(station.cameras).map(([position, camera]) => (
                        <div key={position} className="camera-item">
                          <span className="camera-icon">
                            {getCameraStatusIcon(camera.active)}
                          </span>
                          <span className="camera-name">
                            {position.charAt(0).toUpperCase() + position.slice(1)}
                          </span>
                          <span className="camera-last-capture">
                            {formatLastCapture(camera.lastCapture)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="station-actions">
                  {station.status === 'idle' && (
                    <div className="inspection-setup">
                      <div className="setup-controls">
                        <select 
                          value={inspectionType} 
                          onChange={(e) => setInspectionType(e.target.value as 'pickup' | 'return')}
                          className="inspection-type-select"
                        >
                          <option value="pickup">Pickup Inspection</option>
                          <option value="return">Return Inspection</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Reservation ID"
                          value={reservationId}
                          onChange={(e) => setReservationId(e.target.value)}
                          className="reservation-input"
                        />
                        <button 
                          className="btn btn-primary"
                          onClick={() => startInspection(station)}
                        >
                          🎬 Start Inspection
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {station.status === 'maintenance' && (
                    <button className="btn btn-secondary">
                      🔧 View Maintenance
                    </button>
                  )}
                  
                  {station.status === 'occupied' && (
                    <button className="btn btn-outline">
                      👁️ Monitor Progress
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Inspection Modal */}
        {showInspectionModal && selectedStation && (
          <div className="modal-overlay">
            <div className="modal-content inspection-modal">
              <div className="modal-header">
                <h2>🎥 Live Inspection - {selectedStation.name}</h2>
                <div className="inspection-info">
                  <span>Reservation: {reservationId}</span>
                  <span>Type: {inspectionType}</span>
                </div>
              </div>

              <div className="modal-body">
                <div className="inspection-progress">
                  <div className="progress-header">
                    <h3>Automated Inspection Progress</h3>
                    <span className="progress-percentage">{Math.round(inspectionProgress)}%</span>
                  </div>
                  <div className="progress-bar-large">
                    <div 
                      className="progress-fill-large"
                      style={{ width: `${inspectionProgress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="camera-feed-section">
                  <div className="live-feed">
                    <h4>Live Camera Feed</h4>
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="camera-video"
                    ></video>
                    <canvas 
                      ref={canvasRef} 
                      style={{ display: 'none' }}
                    ></canvas>
                  </div>

                  <div className="captured-images">
                    <h4>Captured Images</h4>
                    <div className="images-grid">
                      {['front', 'rear', 'leftSide', 'rightSide', 'interior'].map(position => (
                        <div key={position} className="image-capture-slot">
                          <div className="image-label">{position}</div>
                          {capturedImages[position] ? (
                            <img 
                              src={capturedImages[position]} 
                              alt={`${position} view`}
                              className="captured-image"
                            />
                          ) : (
                            <div className="image-placeholder">
                              📷 Waiting...
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {!isInspecting && inspectionProgress === 100 && (
                  <div className="inspection-complete">
                    <h3>✅ Inspection Complete!</h3>
                    <p>All images captured successfully. AI analysis in progress...</p>
                    <div className="completion-actions">
                      <button 
                        className="btn btn-primary"
                        onClick={() => completeInspection(selectedStation)}
                      >
                        📄 Generate Report
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instructions Panel */}
        <div className="instructions-panel">
          <h3>📋 Inspection Station Instructions</h3>
          <div className="instructions-grid">
            <div className="instruction-item">
              <span className="instruction-icon">🚗</span>
              <h4>Vehicle Positioning</h4>
              <ul>
                <li>Drive vehicle into designated bay area</li>
                <li>Park centered between the lane markers</li>
                <li>Turn off engine and exit vehicle</li>
                <li>Ensure all doors and trunk are closed</li>
              </ul>
            </div>
            <div className="instruction-item">
              <span className="instruction-icon">🎥</span>
              <h4>Camera System</h4>
              <ul>
                <li>5 synchronized cameras capture all angles</li>
                <li>High-resolution 4K image quality</li>
                <li>Automatic lighting adjustment</li>
                <li>360-degree coverage including interior</li>
              </ul>
            </div>
            <div className="instruction-item">
              <span className="instruction-icon">🤖</span>
              <h4>AI Analysis</h4>
              <ul>
                <li>Instant damage detection and classification</li>
                <li>Comparison with previous inspection</li>
                <li>Automated damage cost estimation</li>
                <li>Report generation and customer notification</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminInspectionStationPage