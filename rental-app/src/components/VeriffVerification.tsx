import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface VeriffVerificationProps {
  onVerificationComplete: (success: boolean, sessionId?: string, verificationData?: any) => void;
  onCancel: () => void;
  userEmail: string;
  carId: string;
  bookingData: any;
}

interface VerificationSession {
  sessionId: string;
  url: string;
  status: 'created' | 'started' | 'submitted' | 'approved' | 'declined' | 'resubmission_requested';
  creditCheckInitiated?: boolean;
  creditCheckId?: string;
}

interface PersonalInfo {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  ssn: string;
  dateOfBirth: string;
}

interface VerificationReport {
  sessionId: string;
  verification: {
    veriff: {
      status: string;
      calculatedScore: number;
    };
    experian: {
      creditScore: number;
      riskLevel: string;
      identityVerified: boolean;
      addressVerified: boolean;
      calculatedScore: number;
    };
  };
  scoring: {
    finalScore: number;
    riskLevel: string;
    recommendation: string;
    weights: {
      veriff: number;
      experian: number;
    };
  };
  riskFactors: string[];
}

const VeriffVerification: React.FC<VeriffVerificationProps> = ({
  onVerificationComplete,
  onCancel,
  userEmail,
  carId,
  bookingData
}) => {
  const [session, setSession] = useState<VerificationSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string>('collect_info');
  const [retryCount, setRetryCount] = useState(0);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    ssn: '',
    dateOfBirth: ''
  });
  const [verificationReport, setVerificationReport] = useState<VerificationReport | null>(null);

  // Create enhanced verification session (Demo Mode)
  const createVerificationSession = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful session creation
      const sessionData: VerificationSession = {
        sessionId: `DEMO_SESSION_${Date.now()}`,
        url: 'https://demo.veriff.me/verify',
        status: 'created',
        creditCheckInitiated: true,
        creditCheckId: `CREDIT_${Date.now()}`
      };

      setSession(sessionData);
      setVerificationStatus('identity_verification');
      
      // Verification session created successfully - both identity and credit verification required
      
    } catch (err: any) {
      setError('Demo mode: Verification session created successfully');
      console.log('Demo mode: Verification session created');
    } finally {
      setLoading(false);
    }
  };

  // Start identity verification process
  const startIdentityVerification = async () => {
    if (!session) return;

    setLoading(true);
    setVerificationStatus('identity_in_progress');

    try {
      // Simulate identity verification delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simulate verification result (90% success rate for demo)
      const isSuccessful = Math.random() > 0.1;
      
      if (isSuccessful) {
        setVerificationStatus('credit_check');
      } else {
        setVerificationStatus('identity_declined');
        setError('Identity verification failed. Please ensure your documents are clear and try again.');
      }
      
    } catch (err: any) {
      setError('Identity verification process failed. Please try again.');
      setVerificationStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Perform enhanced verification with credit check (Demo Mode)
  const performEnhancedVerification = async () => {
    if (!session) return;

    setLoading(true);
    setVerificationStatus('processing');

    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock successful verification report
      const report: VerificationReport = {
        sessionId: session.sessionId,
        verification: {
          veriff: {
            status: 'approved',
            calculatedScore: 95
          },
          experian: {
            creditScore: 750,
            riskLevel: 'LOW',
            identityVerified: true,
            addressVerified: true,
            calculatedScore: 88
          }
        },
        scoring: {
          finalScore: 92,
          riskLevel: 'LOW',
          recommendation: 'APPROVE',
          weights: {
            veriff: 0.6,
            experian: 0.4
          }
        },
        riskFactors: []
      };

      setVerificationReport(report);
      
      // Determine final status based on recommendation
      switch (report.scoring.recommendation) {
        case 'APPROVE':
          setVerificationStatus('approved');
          setTimeout(() => {
            onVerificationComplete(true, session.sessionId, { report, recommendation: 'APPROVE' });
          }, 2000);
          break;
        case 'APPROVE_WITH_CONDITIONS':
          setVerificationStatus('approved_with_conditions');
          setTimeout(() => {
            onVerificationComplete(true, session.sessionId, { report, recommendation: 'APPROVE_WITH_CONDITIONS' });
          }, 2000);
          break;
        case 'MANUAL_REVIEW':
          setVerificationStatus('manual_review');
          break;
        case 'DECLINE':
          setVerificationStatus('declined');
          break;
        default:
          setVerificationStatus('error');
      }
      
    } catch (err: any) {
      setError('Demo mode: Enhanced verification completed successfully');
      setVerificationStatus('error');
      console.log('Demo mode: Enhanced verification completed');
    } finally {
      setLoading(false);
    }
  };

  // Handle personal info form submission
  const handlePersonalInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields - all fields are mandatory for comprehensive verification
    const requiredFields = ['firstName', 'lastName', 'address', 'city', 'state', 'zipCode', 'ssn', 'dateOfBirth'];
    const missingFields = requiredFields.filter(field => !personalInfo[field as keyof PersonalInfo]);
    
    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    createVerificationSession();
  };

  // Update personal info
  const updatePersonalInfo = (field: keyof PersonalInfo, value: string) => {
    setPersonalInfo(prev => ({
      ...prev,
      [field]: value
    }));
    if (error) setError(null);
  };

  // Retry verification
  const retryVerification = () => {
    if (retryCount >= 3) {
      setError('Maximum retry attempts reached. Please contact support.');
      return;
    }
    
    setRetryCount(prev => prev + 1);
    setError(null);
    setVerificationStatus('collect_info');
  };

  // Get risk level color
  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return '#10b981'; // green
      case 'MEDIUM': return '#f59e0b'; // amber
      case 'HIGH': return '#ef4444'; // red
      case 'VERY_HIGH': return '#dc2626'; // dark red
      default: return '#6b7280'; // gray
    }
  };

  // Get recommendation color and icon
  const getRecommendationDisplay = (recommendation: string) => {
    switch (recommendation) {
      case 'APPROVE':
        return { color: '#10b981', icon: '✅', text: 'Approved' };
      case 'APPROVE_WITH_CONDITIONS':
        return { color: '#f59e0b', icon: '⚠️', text: 'Approved with Conditions' };
      case 'MANUAL_REVIEW':
        return { color: '#3b82f6', icon: '👀', text: 'Manual Review Required' };
      case 'DECLINE':
        return { color: '#ef4444', icon: '❌', text: 'Declined' };
      default:
        return { color: '#6b7280', icon: '❓', text: 'Unknown' };
    }
  };

  const renderVerificationStatus = () => {
    switch (verificationStatus) {
      case 'collect_info':
        return (
          <div className="verification-status">
            <div className="status-icon ready">📋</div>
            <h3>Personal Information Required</h3>
            <p>To provide comprehensive verification, we need your information for both identity and credit verification. All fields are required.</p>
            
            <form onSubmit={handlePersonalInfoSubmit} className="personal-info-form">
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    value={personalInfo.firstName}
                    onChange={(e) => updatePersonalInfo('firstName', e.target.value)}
                    required
                    placeholder="John"
                  />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    value={personalInfo.lastName}
                    onChange={(e) => updatePersonalInfo('lastName', e.target.value)}
                    required
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Street Address *</label>
                <input
                  type="text"
                  value={personalInfo.address}
                  onChange={(e) => updatePersonalInfo('address', e.target.value)}
                  required
                  placeholder="123 Main Street"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>City *</label>
                  <input
                    type="text"
                    value={personalInfo.city}
                    onChange={(e) => updatePersonalInfo('city', e.target.value)}
                    required
                    placeholder="New York"
                  />
                </div>
                <div className="form-group">
                  <label>State *</label>
                  <input
                    type="text"
                    value={personalInfo.state}
                    onChange={(e) => updatePersonalInfo('state', e.target.value)}
                    required
                    placeholder="NY"
                    maxLength={2}
                  />
                </div>
                <div className="form-group">
                  <label>ZIP Code *</label>
                  <input
                    type="text"
                    value={personalInfo.zipCode}
                    onChange={(e) => updatePersonalInfo('zipCode', e.target.value)}
                    required
                    placeholder="10001"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Social Security Number (for credit check) *</label>
                  <input
                    type="text"
                    value={personalInfo.ssn}
                    onChange={(e) => updatePersonalInfo('ssn', e.target.value)}
                    required
                    placeholder="XXX-XX-XXXX"
                    maxLength={11}
                  />
                </div>
                <div className="form-group">
                  <label>Date of Birth *</label>
                  <input
                    type="date"
                    value={personalInfo.dateOfBirth}
                    onChange={(e) => updatePersonalInfo('dateOfBirth', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="verification-security">
                <p><strong>🔒 Your information is secure:</strong></p>
                <ul>
                  <li>• All data is encrypted and securely transmitted</li>
                  <li>• Credit check is a "soft pull" - won't affect your credit score</li>
                  <li>• Used only for verification and fraud prevention</li>
                  <li>• Compliant with FCRA and privacy regulations</li>
                </ul>
              </div>

              <button 
                type="submit"
                className="btn btn-primary verification-start-btn"
                disabled={loading}
              >
                {loading ? 'Setting up...' : 'Start Verification Process'}
              </button>
            </form>
          </div>
        );

      case 'identity_verification':
        return (
          <div className="verification-status">
            <div className="status-icon ready">📋</div>
            <h3>Ready for Identity Verification</h3>
            <p>First, we'll verify your identity using document scanning and facial recognition.</p>
            <div className="verification-info">
              <h4>What you'll need:</h4>
              <ul>
                <li>📄 Valid driver's license or government-issued ID</li>
                <li>📱 Camera access for document photos</li>
                <li>🤳 Camera access for selfie verification</li>
                <li>⏱️ About 2-3 minutes to complete</li>
              </ul>
            </div>
            <button 
              className="btn btn-primary verification-start-btn"
              onClick={startIdentityVerification}
              disabled={loading}
            >
              Start Identity Verification
            </button>
          </div>
        );

      case 'identity_in_progress':
        return (
          <div className="verification-status">
            <div className="status-icon in-progress">🔄</div>
            <h3>Identity Verification in Progress</h3>
            <p>Please follow the instructions to scan your document and take a selfie.</p>
            <div className="progress-steps">
              <div className="step completed">✅ Personal Info</div>
              <div className="step active">🔄 Identity Verification</div>
              <div className="step">📊 Credit Check</div>
              <div className="step">✅ Complete</div>
            </div>
          </div>
        );

      case 'credit_check':
        return (
          <div className="verification-status">
            <div className="status-icon success">✅</div>
            <h3>Identity Verified Successfully!</h3>
            <p>Now performing credit check and comprehensive risk assessment...</p>
            <div className="progress-steps">
              <div className="step completed">✅ Personal Info</div>
              <div className="step completed">✅ Identity Verification</div>
              <div className="step active">🔄 Credit Check</div>
              <div className="step">✅ Complete</div>
            </div>
            <button 
              className="btn btn-primary"
              onClick={performEnhancedVerification}
              disabled={loading}
            >
              Continue to Credit Check
            </button>
          </div>
        );

      case 'processing':
        return (
          <div className="verification-status">
            <div className="status-icon in-progress">🔄</div>
            <h3>Processing Comprehensive Verification</h3>
            <p>Analyzing identity verification and credit check results...</p>
            <div className="progress-steps">
              <div className="step completed">✅ Personal Info</div>
              <div className="step completed">✅ Identity Verification</div>
              <div className="step completed">✅ Credit Check</div>
              <div className="step active">🔄 Processing Results</div>
            </div>
          </div>
        );

      case 'approved':
      case 'approved_with_conditions':
        const display = getRecommendationDisplay(verificationReport?.scoring.recommendation || 'APPROVE');
        return (
          <div className="verification-status success">
            <div className="status-icon success" style={{ color: display.color }}>
              {display.icon}
            </div>
            <h3>Verification Complete - {display.text}!</h3>
            
            {verificationReport && (
              <div className="verification-results">
                <div className="score-summary">
                  <div className="final-score">
                    <span className="score-value">{verificationReport.scoring.finalScore}</span>
                    <span className="score-label">Final Score</span>
                  </div>
                  <div className="risk-level" style={{ color: getRiskLevelColor(verificationReport.scoring.riskLevel) }}>
                    Risk Level: {verificationReport.scoring.riskLevel}
                  </div>
                </div>

                <div className="score-breakdown">
                  <div className="score-component">
                    <div className="component-header">
                      <span className="component-title">📋 Identity Verification</span>
                      <span className="component-score">{verificationReport.verification.veriff.calculatedScore}/100</span>
                    </div>
                    <div className="component-details">
                      Status: {verificationReport.verification.veriff.status}
                    </div>
                  </div>

                  {
                    <div className="score-component">
                      <div className="component-header">
                        <span className="component-title">💳 Credit Check</span>
                        <span className="component-score">{verificationReport.verification.experian.calculatedScore}/100</span>
                      </div>
                      <div className="component-details">
                        Credit Score: {verificationReport.verification.experian.creditScore} | 
                        Risk: {verificationReport.verification.experian.riskLevel}
                      </div>
                    </div>
                  }
                </div>

                {verificationReport.riskFactors.length > 0 && (
                  <div className="risk-factors">
                    <h4>Risk Factors Identified:</h4>
                    <ul>
                      {verificationReport.riskFactors.map((factor, index) => (
                        <li key={index}>{factor.replace(/_/g, ' ').toLowerCase()}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            <p>Proceeding to payment processing...</p>
          </div>
        );

      case 'manual_review':
        return (
          <div className="verification-status warning">
            <div className="status-icon warning">👀</div>
            <h3>Manual Review Required</h3>
            <p>Your verification requires additional review by our team.</p>
            
            {verificationReport && (
              <div className="verification-results">
                <div className="score-summary">
                  <div className="final-score">
                    <span className="score-value">{verificationReport.scoring.finalScore}</span>
                    <span className="score-label">Final Score</span>
                  </div>
                </div>
                
                <div className="review-info">
                  <p>We'll review your application within 24 hours and contact you with the results.</p>
                  <p>You can continue with your booking, but final approval is pending.</p>
                </div>
              </div>
            )}
          </div>
        );

      case 'identity_declined':
      case 'declined':
        return (
          <div className="verification-status error">
            <div className="status-icon error">❌</div>
            <h3>Verification Failed</h3>
            <p>We were unable to complete the verification process.</p>
            
            {verificationReport && verificationReport.riskFactors.length > 0 && (
              <div className="decline-reasons">
                <h4>Issues identified:</h4>
                <ul>
                  {verificationReport.riskFactors.map((factor, index) => (
                    <li key={index}>{factor.replace(/_/g, ' ').toLowerCase()}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <p>Please ensure all information is accurate and documents are clear.</p>
            
            {retryCount < 3 && (
              <button 
                className="btn btn-secondary"
                onClick={retryVerification}
                disabled={loading}
              >
                Try Again ({3 - retryCount} attempts remaining)
              </button>
            )}
          </div>
        );

      case 'error':
        return (
          <div className="verification-status error">
            <div className="status-icon error">⚠️</div>
            <h3>Technical Error</h3>
            <p>A technical error occurred during verification.</p>
            <button 
              className="btn btn-secondary"
              onClick={retryVerification}
              disabled={loading || retryCount >= 3}
            >
              {retryCount >= 3 ? 'Maximum retries reached' : 'Retry Verification'}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="veriff-verification">
      <div className="verification-container">
        <div className="verification-header">
          <h2>Enhanced Identity & Credit Verification</h2>
          <p>Secure your car rental with comprehensive verification</p>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {renderVerificationStatus()}

        <div className="verification-actions">
          <button 
            className="btn btn-outline-secondary"
            onClick={onCancel}
            disabled={loading || verificationStatus === 'identity_in_progress' || verificationStatus === 'processing'}
          >
            Cancel Booking
          </button>
          
          {session && (
            <div className="session-info">
              <small>Session ID: {session.sessionId}</small>
              {session.creditCheckInitiated && (
                <small>Credit Check ID: {session.creditCheckId}</small>
              )}
            </div>
          )}
        </div>

        <div className="verification-footer">
          <p>
            <small>
              Powered by <strong>Veriff</strong> + <strong>Experian</strong>
              <br />
              Comprehensive verification for your security and ours
            </small>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VeriffVerification;