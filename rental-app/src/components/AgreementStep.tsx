import React, { useState } from 'react'

export interface AgreementData {
  renterName: string
  pickupDate: string
  dropoffDate: string
  vehicleMake: string
  vehicleModel: string
  vehicleYear: number
  insuranceSelection: string
  dailyRate: number
  totalDays: number
}

export interface SignatureData {
  agreed: boolean
  typedSignature: string
  signedAt: string
}

interface AgreementStepProps {
  agreementData: AgreementData
  onComplete: (signatureData: SignatureData) => void
}

const AgreementStep: React.FC<AgreementStepProps> = ({ agreementData, onComplete }) => {
  const [agreed, setAgreed] = useState(false)
  const [typedSignature, setTypedSignature] = useState('')

  const {
    renterName,
    pickupDate,
    dropoffDate,
    vehicleMake,
    vehicleModel,
    vehicleYear,
    insuranceSelection,
    dailyRate,
    totalDays,
  } = agreementData

  const canProceed = agreed && typedSignature.trim().length > 0

  const handleContinue = () => {
    if (!canProceed) return
    onComplete({
      agreed: true,
      typedSignature: typedSignature.trim(),
      signedAt: new Date().toISOString(),
    })
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return dateString
    }
  }

  const handleDownloadAgreement = () => {
    const html = `<!DOCTYPE html>
<html><head><title>Rental Agreement</title>
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6}
h1{text-align:center;border-bottom:2px solid #333;padding-bottom:10px}
h2{margin-top:30px;color:#333}
.section{margin:20px 0;padding:15px;background:#f9f9f9;border-radius:4px}
.signature-block{margin-top:40px;border-top:1px solid #999;padding-top:20px}
</style></head><body>
<h1>Vehicle Rental Agreement</h1>
<div class="section">
<h2>Rental Details</h2>
<p><strong>Renter:</strong> ${renterName}</p>
<p><strong>Vehicle:</strong> ${vehicleYear} ${vehicleMake} ${vehicleModel}</p>
<p><strong>Pickup Date:</strong> ${formatDate(pickupDate)}</p>
<p><strong>Return Date:</strong> ${formatDate(dropoffDate)}</p>
<p><strong>Duration:</strong> ${totalDays} day${totalDays !== 1 ? 's' : ''}</p>
<p><strong>Daily Rate:</strong> $${dailyRate}/day</p>
<p><strong>Insurance:</strong> ${insuranceSelection || 'None selected'}</p>
</div>
<h2>Terms and Conditions</h2>
<h3>1. Cancellation Policy</h3>
<p>Free cancellation up to 48 hours before pickup. Cancellations within 48 hours incur a fee equal to one day's rental.</p>
<h3>2. Damage Responsibility</h3>
<p>The renter is responsible for any damage to the vehicle during the rental period not covered by the selected insurance plan.</p>
<h3>3. Fuel Policy</h3>
<p>The vehicle will be provided with a full tank of fuel. The renter must return the vehicle with a full tank or pay a refueling fee of $5.99/gallon.</p>
<h3>4. Mileage</h3>
<p>Unlimited mileage is included. Off-road driving is prohibited.</p>
<h3>5. Late Return</h3>
<p>Late returns will be charged at 1.5x the daily rate for each additional day or partial day.</p>
<div class="signature-block">
<p><strong>Signed by:</strong> ${typedSignature || '___________________'}</p>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
</div>
</body></html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'rental-agreement.html'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="step-content">
      <h2>Rental Agreement</h2>
      <p className="step-description">
        Please review the rental agreement below and sign to proceed.
      </p>

      <div className="agreement-document" style={{
        background: '#fafafa',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '24px',
        maxHeight: '400px',
        overflowY: 'auto',
        marginBottom: '24px',
        lineHeight: '1.7',
      }}>
        <h3 style={{ textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: '8px' }}>
          Vehicle Rental Agreement
        </h3>

        <div style={{ margin: '16px 0' }}>
          <h4>Rental Details</h4>
          <p><strong>Renter:</strong> {renterName}</p>
          <p data-testid="vehicle-details">
            <strong>Vehicle:</strong> {vehicleYear} {vehicleMake} {vehicleModel}
          </p>
          <p><strong>Pickup Date:</strong> {formatDate(pickupDate)}</p>
          <p><strong>Return Date:</strong> {formatDate(dropoffDate)}</p>
          <p><strong>Duration:</strong> {totalDays} day{totalDays !== 1 ? 's' : ''}</p>
          <p><strong>Daily Rate:</strong> ${dailyRate}/day</p>
          <p><strong>Insurance:</strong> {insuranceSelection || 'None selected'}</p>
        </div>

        <div style={{ margin: '16px 0' }}>
          <h4>1. Cancellation Policy</h4>
          <p>
            Free cancellation up to 48 hours before the scheduled pickup time.
            Cancellations made within 48 hours of pickup will incur a cancellation
            fee equal to one day's rental charge.
          </p>
        </div>

        <div style={{ margin: '16px 0' }}>
          <h4>2. Damage Responsibility</h4>
          <p>
            The renter is responsible for any damage to the vehicle during the
            rental period that is not covered by the selected insurance plan.
            A pre-rental inspection will be conducted at pickup. Any new damage
            found upon return will be assessed and charged accordingly.
          </p>
        </div>

        <div style={{ margin: '16px 0' }}>
          <h4>3. Fuel Policy</h4>
          <p>
            The vehicle will be provided with a full tank of fuel. The renter
            agrees to return the vehicle with a full tank. If the vehicle is
            returned with less than a full tank, a refueling surcharge of
            $5.99 per gallon will apply.
          </p>
        </div>

        <div style={{ margin: '16px 0' }}>
          <h4>4. Mileage Policy</h4>
          <p>
            Unlimited mileage is included with this rental. Off-road driving
            is strictly prohibited and any damage resulting from off-road use
            will not be covered by insurance.
          </p>
        </div>

        <div style={{ margin: '16px 0' }}>
          <h4>5. Late Return Policy</h4>
          <p>
            Late returns will be charged at 1.5 times the standard daily rate
            for each additional day or partial day beyond the agreed return date.
          </p>
        </div>
      </div>

      <div className="agreement-actions" style={{ marginBottom: '24px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleDownloadAgreement}
        >
          Download Agreement
        </button>
      </div>

      <div className="agreement-consent" style={{
        background: '#f0f7ff',
        border: '1px solid #c8ddf5',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <label className="checkbox-label" style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          cursor: 'pointer',
          marginBottom: '16px',
        }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ marginTop: '4px' }}
            data-testid="agree-checkbox"
          />
          <span>I have read and agree to the rental terms and conditions outlined above.</span>
        </label>

        <div className="signature-input" style={{ marginTop: '16px' }}>
          <label htmlFor="typed-signature" style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>
            Type your full name as signature
          </label>
          <input
            id="typed-signature"
            type="text"
            placeholder="Type your full name"
            value={typedSignature}
            onChange={(e) => setTypedSignature(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '18px',
              fontFamily: "'Brush Script MT', 'Segoe Script', cursive",
              borderBottom: '2px solid #333',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              background: 'transparent',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            data-testid="signature-input"
          />
        </div>
      </div>

      <div className="step-navigation">
        <button
          className="btn btn-primary"
          onClick={handleContinue}
          disabled={!canProceed}
          data-testid="agreement-continue"
        >
          Continue to Payment
        </button>
      </div>
    </div>
  )
}

export default AgreementStep
