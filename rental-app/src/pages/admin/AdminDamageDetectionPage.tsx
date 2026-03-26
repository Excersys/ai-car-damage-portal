import React, { useState, useRef } from 'react'

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
  const [activeTab, setActiveTab] = useState<'new-inspection' | 'pending-reports' | 'history'>('new-inspection')
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<any>(null)
  const [currentStep, setCurrentStep] = useState<'upload' | 'analyzing' | 'results'>('upload')
  const [selectedVehicle, setSelectedVehicle] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [inspectionType, setInspectionType] = useState<'pre-rental' | 'post-rental' | 'incident'>('pre-rental')
  const fileInputRef = useRef<HTMLInputElement>(null)

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
          <button 
            className={`tab ${activeTab === 'new-inspection' ? 'active' : ''}`}
            onClick={() => setActiveTab('new-inspection')}
          >
            🔍 New Inspection
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