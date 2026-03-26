import React, { useState, useRef } from 'react'

const DamageDetectionPage: React.FC = () => {
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<any>(null)
  const [currentStep, setCurrentStep] = useState<'upload' | 'analyzing' | 'results'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setSelectedImages(files)
  }

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const startAnalysis = async () => {
    if (selectedImages.length === 0) return
    
    setCurrentStep('analyzing')
    setIsAnalyzing(true)
    
    // Simulate AI analysis
    setTimeout(() => {
      const mockResults = {
        overallCondition: 'Good',
        confidenceScore: 92,
        damageDetected: [
          {
            type: 'Minor Scratch',
            location: 'Front Bumper',
            severity: 'Low',
            confidence: 85,
            estimatedCost: 150
          },
          {
            type: 'Small Dent',
            location: 'Rear Door',
            severity: 'Medium',
            confidence: 78,
            estimatedCost: 300
          }
        ],
        totalEstimatedCost: 450,
        recommendedAction: 'Document and proceed with rental'
      }
      
      setAnalysisResults(mockResults)
      setCurrentStep('results')
      setIsAnalyzing(false)
    }, 3000)
  }

  const resetAnalysis = () => {
    setSelectedImages([])
    setAnalysisResults(null)
    setCurrentStep('upload')
    setIsAnalyzing(false)
  }

  return (
    <div className="damage-detection-page">
      <div className="container">
        <div className="page-header">
          <h1>🤖 AI Damage Detection</h1>
          <p>Upload vehicle photos for intelligent damage assessment</p>
        </div>

        {currentStep === 'upload' && (
          <div className="upload-section">
            <div className="upload-instructions">
              <h3>Photo Requirements</h3>
              <ul>
                <li>Take clear, well-lit photos</li>
                <li>Capture all 4 sides of the vehicle</li>
                <li>Include close-ups of any visible damage</li>
                <li>Ensure photos are in focus</li>
              </ul>
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
                <div className="upload-icon">📸</div>
                <h3>Click to upload photos</h3>
                <p>Or drag and drop images here</p>
                <p className="upload-hint">Supports JPG, PNG, HEIC</p>
              </div>
            </div>

            {selectedImages.length > 0 && (
              <div className="image-preview-section">
                <h3>Selected Images ({selectedImages.length})</h3>
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
                    disabled={selectedImages.length === 0}
                  >
                    Start AI Analysis
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
            <h3>Analyzing Vehicle Condition...</h3>
            <p>Our AI is examining your photos for damage detection</p>
            <div className="analysis-progress">
              <div className="progress-steps">
                <div className="progress-step completed">
                  <span className="step-icon">✓</span>
                  <span>Images Uploaded</span>
                </div>
                <div className="progress-step active">
                  <span className="step-icon">🔍</span>
                  <span>AI Analysis</span>
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
              <h3>AI Analysis Complete</h3>
              <div className="overall-score">
                <div className="score-circle">
                  <span className="score-number">{analysisResults.confidenceScore}%</span>
                  <span className="score-label">Confidence</span>
                </div>
                <div className="condition-status">
                  <span className={`status ${analysisResults.overallCondition.toLowerCase()}`}>
                    {analysisResults.overallCondition}
                  </span>
                </div>
              </div>
            </div>

            <div className="results-grid">
              <div className="damage-summary">
                <h4>Damage Summary</h4>
                {analysisResults.damageDetected.length > 0 ? (
                  <div className="damage-list">
                    {analysisResults.damageDetected.map((damage: any, index: number) => (
                      <div key={index} className="damage-item">
                        <div className="damage-info">
                          <h5>{damage.type}</h5>
                          <p>Location: {damage.location}</p>
                          <div className="damage-details">
                            <span className={`severity ${damage.severity.toLowerCase()}`}>
                              {damage.severity} Severity
                            </span>
                            <span className="confidence">
                              {damage.confidence}% confidence
                            </span>
                          </div>
                        </div>
                        <div className="damage-cost">
                          ${damage.estimatedCost}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-damage">
                    <span className="no-damage-icon">✅</span>
                    <p>No damage detected</p>
                  </div>
                )}
              </div>

              <div className="cost-breakdown">
                <h4>Cost Estimate</h4>
                <div className="cost-details">
                  {analysisResults.damageDetected.map((damage: any, index: number) => (
                    <div key={index} className="cost-item">
                      <span>{damage.type}</span>
                      <span>${damage.estimatedCost}</span>
                    </div>
                  ))}
                  <div className="cost-total">
                    <span>Total Estimated Cost</span>
                    <span>${analysisResults.totalEstimatedCost}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="recommendation">
              <h4>Recommendation</h4>
              <p>{analysisResults.recommendedAction}</p>
            </div>

            <div className="results-actions">
              <button className="btn btn-secondary" onClick={resetAnalysis}>
                New Analysis
              </button>
              <button className="btn btn-primary">
                Save Report
              </button>
              <button className="btn btn-primary">
                Continue to Booking
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DamageDetectionPage