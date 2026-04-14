import React, { useState, useRef, useEffect, useCallback, type CSSProperties } from 'react'
import {
  isTunnelReviewConfigured,
  fetchTunnelEvents,
  fetchTunnelEventDetail,
  submitTunnelEventQc,
  type TunnelEventSummary,
  type TunnelEventDetailResponse,
} from '../../lib/tunnelReviewApi'

/** Scale bbox coords (pixel or normalized 0–1) to rendered image pixels. */
function bboxOverlayStyle(
  box: Record<string, number>,
  naturalW: number,
  naturalH: number,
  displayW: number,
  displayH: number,
): CSSProperties {
  const x = box.x ?? box.left ?? 0
  const y = box.y ?? box.top ?? 0
  const w = box.w ?? box.width ?? 0
  const h = box.h ?? box.height ?? 0
  const nums = [x, y, w, h].filter((n) => typeof n === 'number')
  const normalized = nums.length > 0 && Math.max(...nums) <= 1.0001
  let left: number
  let top: number
  let bw: number
  let bh: number
  if (normalized) {
    left = x * displayW
    top = y * displayH
    bw = w * displayW
    bh = h * displayH
  } else {
    const sx = displayW / Math.max(naturalW, 1)
    const sy = displayH / Math.max(naturalH, 1)
    left = x * sx
    top = y * sy
    bw = w * sx
    bh = h * sy
  }
  return {
    position: 'absolute',
    left,
    top,
    width: Math.max(bw, 1),
    height: Math.max(bh, 1),
    border: '2px solid #ffeb3b',
    boxSizing: 'border-box',
    pointerEvents: 'none',
  }
}

const TunnelImageWithBoxes: React.FC<{
  imageUrl: string
  alt: string
  boxes: Array<Record<string, number>>
}> = ({ imageUrl, alt, boxes }) => {
  const [dims, setDims] = useState({ nw: 0, nh: 0, dw: 0, dh: 0 })
  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setDims({
      nw: img.naturalWidth,
      nh: img.naturalHeight,
      dw: img.offsetWidth,
      dh: img.offsetHeight,
    })
  }
  return (
    <div style={{ position: 'relative', width: '100%', lineHeight: 0 }}>
      <img
        src={imageUrl}
        alt={alt}
        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8, marginBottom: 8 }}
        onLoad={onImgLoad}
      />
      {dims.dw > 0 &&
        boxes.map((box, i) => (
          <div key={i} style={bboxOverlayStyle(box, dims.nw, dims.nh, dims.dw, dims.dh)} />
        ))}
    </div>
  )
}

interface DamageReport {
  id: string
  reservationId: string
  customer: string
  vehicle: string
  reportType: 'pre-rental' | 'post-rental' | 'incident'
  status: 'pending' | 'reviewed' | 'approved' | 'disputed'
  createdAt: string
  images: string[]
  aiResults?: {
    overallCondition: string
    confidenceScore: number
    damageDetected: Array<{
      type: string
      location: string
      severity: string
      confidence: number
      estimatedCost: number
    }>
    totalEstimatedCost: number
  }
  manualNotes?: string
}

const AdminDamageDetectionPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tunnel-scans' | 'new-inspection' | 'pending-reports' | 'history'>(
    isTunnelReviewConfigured() ? 'tunnel-scans' : 'new-inspection',
  )
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [, setIsAnalyzing] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<any>(null)
  const [currentStep, setCurrentStep] = useState<'upload' | 'analyzing' | 'results'>('upload')
  const [selectedVehicle, setSelectedVehicle] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [inspectionType, setInspectionType] = useState<'pre-rental' | 'post-rental' | 'incident'>('pre-rental')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Tunnel scans (live Review API) ──────────────────────────────
  const [tunnelEvents, setTunnelEvents] = useState<TunnelEventSummary[]>([])
  const [tunnelLoading, setTunnelLoading] = useState(false)
  const [tunnelError, setTunnelError] = useState('')
  const [tunnelDetail, setTunnelDetail] = useState<TunnelEventDetailResponse | null>(null)
  const [tunnelDetailLoading, setTunnelDetailLoading] = useState(false)
  const [qcNotes, setQcNotes] = useState('')
  const [qcReviewer, setQcReviewer] = useState('')
  const [qcSubmitting, setQcSubmitting] = useState(false)
  const [qcError, setQcError] = useState('')

  const loadTunnelEvents = useCallback(async () => {
    setTunnelLoading(true)
    setTunnelError('')
    try {
      const data = await fetchTunnelEvents()
      setTunnelEvents(data.events)
    } catch (err: unknown) {
      setTunnelError(err instanceof Error ? err.message : 'Failed to load tunnel events')
    } finally {
      setTunnelLoading(false)
    }
  }, [])

  const loadTunnelDetail = useCallback(async (eventId: string) => {
    setTunnelDetailLoading(true)
    setTunnelDetail(null)
    setQcError('')
    try {
      const data = await fetchTunnelEventDetail(eventId)
      setTunnelDetail(data)
      setQcNotes(data.qc?.notes ?? '')
      setQcReviewer(data.qc?.reviewer_id ?? '')
    } catch (err: unknown) {
      setTunnelError(err instanceof Error ? err.message : 'Failed to load event detail')
    } finally {
      setTunnelDetailLoading(false)
    }
  }, [])

  const submitQc = async (status: 'approved' | 'rejected') => {
    if (!tunnelDetail) return
    setQcSubmitting(true)
    setQcError('')
    try {
      await submitTunnelEventQc(tunnelDetail.event_id, {
        status,
        notes: qcNotes,
        reviewer_id: qcReviewer || undefined,
      })
      await loadTunnelDetail(tunnelDetail.event_id)
      await loadTunnelEvents()
    } catch (e: unknown) {
      setQcError(e instanceof Error ? e.message : 'QC submit failed')
    } finally {
      setQcSubmitting(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'tunnel-scans' && isTunnelReviewConfigured()) {
      loadTunnelEvents()
    }
  }, [activeTab, loadTunnelEvents])

  // Mock data
  const mockReports: DamageReport[] = [
    {
      id: 'DR001',
      reservationId: 'BK1722814756432',
      customer: 'John Doe',
      vehicle: 'Tesla Model 3 (ABC-1234)',
      reportType: 'post-rental',
      status: 'pending',
      createdAt: '2025-08-04T14:30:00',
      images: ['img1.jpg', 'img2.jpg'],
      aiResults: {
        overallCondition: 'Fair',
        confidenceScore: 87,
        damageDetected: [
          {
            type: 'Minor Scratch',
            location: 'Front Bumper',
            severity: 'Low',
            confidence: 85,
            estimatedCost: 150
          }
        ],
        totalEstimatedCost: 150
      }
    },
    {
      id: 'DR002',
      reservationId: 'BK1722814987321',
      customer: 'Jane Smith',
      vehicle: 'BMW X5 (XYZ-5678)',
      reportType: 'incident',
      status: 'reviewed',
      createdAt: '2025-08-03T16:45:00',
      images: ['img3.jpg', 'img4.jpg', 'img5.jpg'],
      aiResults: {
        overallCondition: 'Poor',
        confidenceScore: 92,
        damageDetected: [
          {
            type: 'Large Dent',
            location: 'Driver Door',
            severity: 'High',
            confidence: 95,
            estimatedCost: 800
          },
          {
            type: 'Paint Damage',
            location: 'Driver Door',
            severity: 'Medium',
            confidence: 88,
            estimatedCost: 400
          }
        ],
        totalEstimatedCost: 1200
      },
      manualNotes: 'Customer reported collision with shopping cart. Damage consistent with incident report.'
    }
  ]

  const vehicles = [
    { id: 'tesla-1', name: 'Tesla Model 3 (ABC-1234)', status: 'available' },
    { id: 'bmw-1', name: 'BMW X5 (XYZ-5678)', status: 'rented' },
    { id: 'toyota-1', name: 'Toyota Camry (CAM-9876)', status: 'available' }
  ]

  const customers = [
    { id: '1', name: 'John Doe', currentRental: 'Tesla Model 3' },
    { id: '2', name: 'Jane Smith', currentRental: 'BMW X5' },
    { id: '3', name: 'Mike Johnson', currentRental: null }
  ]

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setSelectedImages(files)
  }

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const startAnalysis = async () => {
    if (selectedImages.length === 0 || !selectedVehicle) return
    
    setCurrentStep('analyzing')
    setIsAnalyzing(true)
    
    // Simulate AI analysis with more detailed results
    setTimeout(() => {
      const mockResults = {
        overallCondition: 'Good',
        confidenceScore: 94,
        damageDetected: [
          {
            type: 'Minor Scratch',
            location: 'Front Bumper',
            severity: 'Low',
            confidence: 85,
            estimatedCost: 150,
            coordinates: { x: 45, y: 30, width: 15, height: 8 }
          },
          {
            type: 'Small Dent',
            location: 'Rear Door',
            severity: 'Medium',
            confidence: 78,
            estimatedCost: 300,
            coordinates: { x: 70, y: 55, width: 12, height: 10 }
          }
        ],
        totalEstimatedCost: 450,
        recommendedAction: 'Document damage and assess repair priority',
        comparisonNotes: 'New damage detected since last inspection'
      }
      
      setAnalysisResults(mockResults)
      setCurrentStep('results')
      setIsAnalyzing(false)
    }, 4000)
  }

  const resetInspection = () => {
    setSelectedImages([])
    setAnalysisResults(null)
    setCurrentStep('upload')
    setIsAnalyzing(false)
    setSelectedVehicle('')
    setSelectedCustomer('')
  }

  const saveReport = () => {
    // In real app, this would save to database
    alert('Damage report saved successfully!')
    resetInspection()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#ff9800'
      case 'reviewed': return '#2196f3'
      case 'approved': return '#4caf50'
      case 'disputed': return '#f44336'
      default: return '#666'
    }
  }

  return (
    <div className="admin-damage-detection">
      <div className="admin-container">
        <div className="page-header">
          <h1>🤖 AI Damage Detection</h1>
          <p>Automated vehicle condition assessment and damage reporting</p>
        </div>

        {/* Navigation Tabs */}
        <div className="damage-tabs">
          {isTunnelReviewConfigured() && (
            <button
              className={`tab ${activeTab === 'tunnel-scans' ? 'active' : ''}`}
              onClick={() => setActiveTab('tunnel-scans')}
            >
              Tunnel Scans
            </button>
          )}
          <button 
            className={`tab ${activeTab === 'new-inspection' ? 'active' : ''}`}
            onClick={() => setActiveTab('new-inspection')}
          >
            New Inspection
          </button>
          <button 
            className={`tab ${activeTab === 'pending-reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending-reports')}
          >
            ⏳ Pending Reports ({mockReports.filter(r => r.status === 'pending').length})
          </button>
          <button 
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📋 Inspection History
          </button>
        </div>

        {/* Tunnel Scans Tab */}
        {activeTab === 'tunnel-scans' && (
          <div className="tunnel-scans-section">
            {tunnelError && <p className="error-text" style={{color:'#f44336',marginBottom:12}}>{tunnelError}</p>}

            {tunnelDetail ? (
              <div className="tunnel-detail">
                <button className="btn btn-secondary" style={{marginBottom:16}} onClick={() => setTunnelDetail(null)}>
                  Back to list
                </button>
                <h2>Event {tunnelDetail.event_id}</h2>
                <p>{tunnelDetail.total_cameras} camera(s) &middot; {tunnelDetail.any_damage ? 'Damage detected' : 'No damage'}</p>

                <div
                  className="tunnel-qc-panel"
                  style={{
                    marginTop: 16,
                    padding: 16,
                    background: '#f9f9f9',
                    borderRadius: 8,
                    border: '1px solid #eee',
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>QC review</h3>
                  <p style={{ fontSize: 14, color: '#666' }}>
                    Status:{' '}
                    <strong>
                      {tunnelDetail.qc?.status ?? 'pending'}
                    </strong>
                    {tunnelDetail.qc?.updated_at && (
                      <span style={{ marginLeft: 8, fontSize: 13 }}>
                        ({new Date(tunnelDetail.qc.updated_at).toLocaleString()})
                      </span>
                    )}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                    <label style={{ flex: '1 1 200px' }}>
                      Notes
                      <textarea
                        value={qcNotes}
                        onChange={(e) => setQcNotes(e.target.value)}
                        rows={2}
                        style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
                      />
                    </label>
                    <label style={{ flex: '1 1 160px' }}>
                      Reviewer ID
                      <input
                        value={qcReviewer}
                        onChange={(e) => setQcReviewer(e.target.value)}
                        placeholder="optional"
                        style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
                      />
                    </label>
                  </div>
                  {qcError && (
                    <p style={{ color: '#c62828', fontSize: 14 }} role="alert">
                      {qcError}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn-small btn-primary"
                      disabled={qcSubmitting}
                      onClick={() => submitQc('approved')}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn-small btn-outline"
                      style={{ color: '#c62828', borderColor: '#c62828' }}
                      disabled={qcSubmitting}
                      onClick={() => submitQc('rejected')}
                    >
                      Reject
                    </button>
                  </div>
                </div>

                <div className="tunnel-cameras-grid" style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16,marginTop:16}}>
                  {tunnelDetail.cameras.map((cam) => (
                    <div key={cam.camera_frame} className="report-card" style={{padding:16}}>
                      {cam.image_url && (
                        <TunnelImageWithBoxes imageUrl={cam.image_url} alt={cam.camera_id} boxes={cam.bounding_boxes} />
                      )}
                      <h4>{cam.camera_id} / {cam.frame}</h4>
                      <p style={{margin:'4px 0'}}>
                        <span className={`status-badge`} style={{backgroundColor: cam.damage_detected ? '#f44336' : '#4caf50', color:'#fff', padding:'2px 8px', borderRadius:4, fontSize:12}}>
                          {cam.damage_detected ? `Damage: ${cam.damage_type}` : 'Clean'}
                        </span>
                      </p>
                      <p style={{fontSize:13,color:'#888'}}>Confidence: {(cam.confidence_score * 100).toFixed(1)}%</p>
                      {cam.bounding_boxes.length > 0 && (
                        <p style={{fontSize:12,color:'#aaa'}}>{cam.bounding_boxes.length} bounding box(es)</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : tunnelLoading ? (
              <p>Loading tunnel events...</p>
            ) : tunnelEvents.length === 0 ? (
              <p>No tunnel scan events found.</p>
            ) : (
              <div className="tunnel-events-list">
                <h2>Recent Tunnel Scans</h2>
                <table style={{width:'100%',borderCollapse:'collapse',marginTop:12}}>
                  <thead>
                    <tr>
                      <th style={{textAlign:'left',padding:'8px 12px',borderBottom:'1px solid #ddd'}}>Event</th>
                      <th style={{textAlign:'left',padding:'8px 12px',borderBottom:'1px solid #ddd'}}>Plate</th>
                      <th style={{textAlign:'center',padding:'8px 12px',borderBottom:'1px solid #ddd'}}>Cameras</th>
                      <th style={{textAlign:'center',padding:'8px 12px',borderBottom:'1px solid #ddd'}}>Damage</th>
                      <th style={{textAlign:'left',padding:'8px 12px',borderBottom:'1px solid #ddd'}}>Timestamp</th>
                      <th style={{textAlign:'center',padding:'8px 12px',borderBottom:'1px solid #ddd'}}>QC</th>
                      <th style={{padding:'8px 12px',borderBottom:'1px solid #ddd'}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tunnelEvents.map((ev) => (
                      <tr key={ev.event_id}>
                        <td style={{padding:'8px 12px',borderBottom:'1px solid #eee',fontFamily:'monospace',fontSize:13}}>{ev.event_id}</td>
                        <td style={{padding:'8px 12px',borderBottom:'1px solid #eee'}}>{ev.license_plate || '—'}</td>
                        <td style={{padding:'8px 12px',borderBottom:'1px solid #eee',textAlign:'center'}}>{ev.camera_count}</td>
                        <td style={{padding:'8px 12px',borderBottom:'1px solid #eee',textAlign:'center'}}>
                          <span style={{color: ev.any_damage ? '#f44336' : '#4caf50', fontWeight:600}}>
                            {ev.any_damage ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td style={{padding:'8px 12px',borderBottom:'1px solid #eee',fontSize:13}}>{ev.last_timestamp ? new Date(ev.last_timestamp).toLocaleString() : '—'}</td>
                        <td style={{padding:'8px 12px',borderBottom:'1px solid #eee',textAlign:'center',fontSize:13}}>
                          {ev.qc_status || 'pending'}
                        </td>
                        <td style={{padding:'8px 12px',borderBottom:'1px solid #eee'}}>
                          <button
                            className="btn-small btn-outline"
                            disabled={tunnelDetailLoading}
                            onClick={() => loadTunnelDetail(ev.event_id)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* New Inspection Tab */}
        {activeTab === 'new-inspection' && (
          <div className="inspection-section">
            {currentStep === 'upload' && (
              <div className="upload-section">
                <div className="inspection-setup">
                  <h2>Vehicle Inspection Setup</h2>
                  <div className="setup-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Inspection Type *</label>
                        <select
                          value={inspectionType}
                          onChange={(e) => setInspectionType(e.target.value as any)}
                        >
                          <option value="pre-rental">Pre-Rental Inspection</option>
                          <option value="post-rental">Post-Rental Inspection</option>
                          <option value="incident">Incident Report</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Vehicle *</label>
                        <select
                          value={selectedVehicle}
                          onChange={(e) => setSelectedVehicle(e.target.value)}
                        >
                          <option value="">Select Vehicle</option>
                          {vehicles.map(vehicle => (
                            <option key={vehicle.id} value={vehicle.id}>
                              {vehicle.name} - {vehicle.status}
                            </option>
                          ))}
                        </select>
                      </div>
                      {inspectionType !== 'pre-rental' && (
                        <div className="form-group">
                          <label>Customer</label>
                          <select
                            value={selectedCustomer}
                            onChange={(e) => setSelectedCustomer(e.target.value)}
                          >
                            <option value="">Select Customer</option>
                            {customers.map(customer => (
                              <option key={customer.id} value={customer.id}>
                                {customer.name} {customer.currentRental ? `(${customer.currentRental})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="upload-instructions">
                  <h3>Photo Guidelines for AI Analysis</h3>
                  <div className="guidelines-grid">
                    <div className="guideline-item">
                      <span className="guideline-icon">📸</span>
                      <h4>Required Views</h4>
                      <ul>
                        <li>Front view (bumper, headlights)</li>
                        <li>Rear view (bumper, taillights)</li>
                        <li>Both side profiles</li>
                        <li>Interior dashboard</li>
                      </ul>
                    </div>
                    <div className="guideline-item">
                      <span className="guideline-icon">💡</span>
                      <h4>Lighting & Quality</h4>
                      <ul>
                        <li>Use natural daylight when possible</li>
                        <li>Avoid shadows and glare</li>
                        <li>Keep camera steady and focused</li>
                        <li>Take multiple angles of damage</li>
                      </ul>
                    </div>
                    <div className="guideline-item">
                      <span className="guideline-icon">🎯</span>
                      <h4>Best Practices</h4>
                      <ul>
                        <li>Clean the vehicle if dirty</li>
                        <li>Include reference objects for scale</li>
                        <li>Capture license plate clearly</li>
                        <li>Document existing damage separately</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="upload-area">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    multiple
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  
                  <div 
                    className="upload-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="upload-icon">📷</div>
                    <h3>Upload Vehicle Photos</h3>
                    <p>Click to select or drag and drop images</p>
                    <p className="upload-hint">Supports JPG, PNG, HEIC • Maximum 10 images</p>
                  </div>
                </div>

                {selectedImages.length > 0 && (
                  <div className="image-preview-section">
                    <h3>Uploaded Images ({selectedImages.length})</h3>
                    <div className="image-preview-grid">
                      {selectedImages.map((file, index) => (
                        <div key={index} className="image-preview-item">
                          <img 
                            src={URL.createObjectURL(file)} 
                            alt={`Preview ${index + 1}`}
                          />
                          <button 
                            className="remove-image-btn"
                            onClick={() => removeImage(index)}
                          >
                            ✕
                          </button>
                          <div className="image-name">{file.name}</div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="analysis-actions">
                      <button 
                        className="btn btn-primary btn-large"
                        onClick={startAnalysis}
                        disabled={selectedImages.length === 0 || !selectedVehicle}
                      >
                        🤖 Start AI Analysis
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 'analyzing' && (
              <div className="analyzing-section">
                <div className="analysis-spinner">
                  <div className="spinner"></div>
                </div>
                <h3>AI is analyzing vehicle condition...</h3>
                <p>Our advanced AI is examining {selectedImages.length} photos for damage detection</p>
                <div className="analysis-progress">
                  <div className="progress-steps">
                    <div className="progress-step completed">
                      <span className="step-icon">✓</span>
                      <span>Images Processed</span>
                    </div>
                    <div className="progress-step active">
                      <span className="step-icon">🔍</span>
                      <span>Damage Detection</span>
                    </div>
                    <div className="progress-step">
                      <span className="step-icon">💰</span>
                      <span>Cost Estimation</span>
                    </div>
                    <div className="progress-step">
                      <span className="step-icon">📊</span>
                      <span>Generate Report</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 'results' && analysisResults && (
              <div className="results-section">
                <div className="results-header">
                  <h3>🎯 AI Analysis Complete</h3>
                  <div className="analysis-meta">
                    <span>Vehicle: {vehicles.find(v => v.id === selectedVehicle)?.name}</span>
                    <span>Inspection Type: {inspectionType.replace('-', ' ')}</span>
                    <span>Analysis Time: 3.2 seconds</span>
                  </div>
                </div>

                <div className="results-summary">
                  <div className="summary-card overall-condition">
                    <h4>Overall Condition</h4>
                    <div className="condition-score">
                      <span className={`condition-grade ${analysisResults.overallCondition.toLowerCase()}`}>
                        {analysisResults.overallCondition}
                      </span>
                      <span className="confidence-score">{analysisResults.confidenceScore}% confidence</span>
                    </div>
                  </div>
                  
                  <div className="summary-card damage-count">
                    <h4>Issues Detected</h4>
                    <div className="damage-stats">
                      <span className="damage-number">{analysisResults.damageDetected.length}</span>
                      <span className="damage-label">damage points</span>
                    </div>
                  </div>
                  
                  <div className="summary-card cost-estimate">
                    <h4>Estimated Repair Cost</h4>
                    <div className="cost-amount">
                      <span className="cost-currency">$</span>
                      <span className="cost-number">{analysisResults.totalEstimatedCost}</span>
                    </div>
                  </div>
                </div>

                {analysisResults.damageDetected.length > 0 && (
                  <div className="damage-details">
                    <h4>Damage Analysis</h4>
                    <div className="damage-list">
                      {analysisResults.damageDetected.map((damage: any, index: number) => (
                        <div key={index} className="damage-item">
                          <div className="damage-info">
                            <div className="damage-header">
                              <h5>{damage.type}</h5>
                              <span className={`severity-badge ${damage.severity.toLowerCase()}`}>
                                {damage.severity}
                              </span>
                            </div>
                            <p className="damage-location">📍 {damage.location}</p>
                            <div className="damage-meta">
                              <span className="confidence">🎯 {damage.confidence}% confidence</span>
                              <span className="cost-estimate">💰 ${damage.estimatedCost} estimated repair</span>
                            </div>
                          </div>
                          <div className="damage-actions">
                            <button className="btn-small btn-outline">View on Image</button>
                            <button className="btn-small btn-secondary">Add Note</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="manual-review">
                  <h4>Manual Review & Notes</h4>
                  <textarea
                    placeholder="Add any additional observations, corrections to AI analysis, or special instructions..."
                    rows={4}
                    className="review-notes"
                  ></textarea>
                </div>

                <div className="results-actions">
                  <button className="btn btn-secondary" onClick={resetInspection}>
                    🔄 New Inspection
                  </button>
                  <button className="btn btn-outline">
                    📧 Email Report
                  </button>
                  <button className="btn btn-primary" onClick={saveReport}>
                    💾 Save Report
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pending Reports Tab */}
        {activeTab === 'pending-reports' && (
          <div className="pending-reports">
            <h2>Reports Awaiting Review</h2>
            <div className="reports-list">
              {mockReports.filter(report => report.status === 'pending').map(report => (
                <div key={report.id} className="report-card">
                  <div className="report-header">
                    <div className="report-meta">
                      <h4>{report.customer}</h4>
                      <p>{report.vehicle}</p>
                      <span className="report-type">{report.reportType.replace('-', ' ')}</span>
                    </div>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(report.status) }}
                    >
                      {report.status.toUpperCase()}
                    </span>
                  </div>
                  
                  {report.aiResults && (
                    <div className="report-summary">
                      <div className="summary-item">
                        <span className="label">Condition:</span>
                        <span className="value">{report.aiResults.overallCondition}</span>
                      </div>
                      <div className="summary-item">
                        <span className="label">Issues:</span>
                        <span className="value">{report.aiResults.damageDetected.length}</span>
                      </div>
                      <div className="summary-item">
                        <span className="label">Est. Cost:</span>
                        <span className="value">${report.aiResults.totalEstimatedCost}</span>
                      </div>
                      <div className="summary-item">
                        <span className="label">Confidence:</span>
                        <span className="value">{report.aiResults.confidenceScore}%</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="report-actions">
                    <button className="btn-small btn-outline">👀 Review</button>
                    <button className="btn-small btn-primary">✅ Approve</button>
                    <button className="btn-small btn-secondary">❌ Dispute</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="inspection-history">
            <h2>Inspection History</h2>
            <div className="history-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Type</th>
                    <th>Condition</th>
                    <th>Issues</th>
                    <th>Cost</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockReports.map(report => (
                    <tr key={report.id}>
                      <td>{new Date(report.createdAt).toLocaleDateString()}</td>
                      <td>{report.customer}</td>
                      <td>{report.vehicle}</td>
                      <td>{report.reportType}</td>
                      <td>{report.aiResults?.overallCondition || 'N/A'}</td>
                      <td>{report.aiResults?.damageDetected.length || 0}</td>
                      <td>${report.aiResults?.totalEstimatedCost || 0}</td>
                      <td>
                        <span 
                          className="status-badge"
                          style={{ backgroundColor: getStatusColor(report.status) }}
                        >
                          {report.status}
                        </span>
                      </td>
                      <td>
                        <button className="btn-small btn-outline">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDamageDetectionPage