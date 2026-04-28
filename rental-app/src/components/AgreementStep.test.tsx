import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AgreementStep, { type AgreementData } from './AgreementStep'

const defaultAgreementData: AgreementData = {
  renterName: 'John Doe',
  pickupDate: '2026-02-04',
  dropoffDate: '2026-02-10',
  vehicleMake: 'Tesla',
  vehicleModel: 'Model 3',
  vehicleYear: 2023,
  insuranceSelection: 'Premium Protection',
  dailyRate: 89,
  totalDays: 6,
}

describe('AgreementStep', () => {
  let onComplete: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onComplete = vi.fn()
  })

  it('renders agreement text with vehicle details', () => {
    render(
      <AgreementStep agreementData={defaultAgreementData} onComplete={onComplete} />
    )

    expect(screen.getByText('Vehicle Rental Agreement')).toBeInTheDocument()
    expect(screen.getByTestId('vehicle-details')).toHaveTextContent(
      '2023 Tesla Model 3'
    )
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Premium Protection')).toBeInTheDocument()
  })

  it('renders rental dates and duration', () => {
    render(
      <AgreementStep agreementData={defaultAgreementData} onComplete={onComplete} />
    )

    expect(screen.getByText(/6 days/)).toBeInTheDocument()
    expect(screen.getByText('$89/day')).toBeInTheDocument()
  })

  it('renders standard terms sections', () => {
    render(
      <AgreementStep agreementData={defaultAgreementData} onComplete={onComplete} />
    )

    expect(screen.getByText('1. Cancellation Policy')).toBeInTheDocument()
    expect(screen.getByText('2. Damage Responsibility')).toBeInTheDocument()
    expect(screen.getByText('3. Fuel Policy')).toBeInTheDocument()
    expect(screen.getByText('4. Mileage Policy')).toBeInTheDocument()
    expect(screen.getByText('5. Late Return Policy')).toBeInTheDocument()
  })

  it('has continue button disabled when checkbox is unchecked and signature is empty', () => {
    render(
      <AgreementStep agreementData={defaultAgreementData} onComplete={onComplete} />
    )

    const continueBtn = screen.getByTestId('agreement-continue')
    expect(continueBtn).toBeDisabled()
  })

  it('has continue button disabled when only checkbox is checked', () => {
    render(
      <AgreementStep agreementData={defaultAgreementData} onComplete={onComplete} />
    )

    fireEvent.click(screen.getByTestId('agree-checkbox'))

    const continueBtn = screen.getByTestId('agreement-continue')
    expect(continueBtn).toBeDisabled()
  })

  it('has continue button disabled when only signature is typed', () => {
    render(
      <AgreementStep agreementData={defaultAgreementData} onComplete={onComplete} />
    )

    fireEvent.change(screen.getByTestId('signature-input'), {
      target: { value: 'John Doe' },
    })

    const continueBtn = screen.getByTestId('agreement-continue')
    expect(continueBtn).toBeDisabled()
  })

  it('enables continue button when checkbox is checked and signature is typed', () => {
    render(
      <AgreementStep agreementData={defaultAgreementData} onComplete={onComplete} />
    )

    fireEvent.click(screen.getByTestId('agree-checkbox'))
    fireEvent.change(screen.getByTestId('signature-input'), {
      target: { value: 'John Doe' },
    })

    const continueBtn = screen.getByTestId('agreement-continue')
    expect(continueBtn).toBeEnabled()
  })

  it('calls onComplete with signature data when continue is clicked', () => {
    render(
      <AgreementStep agreementData={defaultAgreementData} onComplete={onComplete} />
    )

    fireEvent.click(screen.getByTestId('agree-checkbox'))
    fireEvent.change(screen.getByTestId('signature-input'), {
      target: { value: 'John Doe' },
    })
    fireEvent.click(screen.getByTestId('agreement-continue'))

    expect(onComplete).toHaveBeenCalledTimes(1)
    const signatureData = onComplete.mock.calls[0][0]
    expect(signatureData.agreed).toBe(true)
    expect(signatureData.typedSignature).toBe('John Doe')
    expect(signatureData.signedAt).toBeTruthy()
  })

  it('does not call onComplete when continue is clicked while disabled', () => {
    render(
      <AgreementStep agreementData={defaultAgreementData} onComplete={onComplete} />
    )

    fireEvent.click(screen.getByTestId('agreement-continue'))

    expect(onComplete).not.toHaveBeenCalled()
  })

  it('trims whitespace-only signature and keeps button disabled', () => {
    render(
      <AgreementStep agreementData={defaultAgreementData} onComplete={onComplete} />
    )

    fireEvent.click(screen.getByTestId('agree-checkbox'))
    fireEvent.change(screen.getByTestId('signature-input'), {
      target: { value: '   ' },
    })

    const continueBtn = screen.getByTestId('agreement-continue')
    expect(continueBtn).toBeDisabled()
  })

  it('renders the Download Agreement button', () => {
    render(
      <AgreementStep agreementData={defaultAgreementData} onComplete={onComplete} />
    )

    expect(screen.getByText('Download Agreement')).toBeInTheDocument()
  })

  it('shows "None selected" when no insurance is provided', () => {
    const noInsuranceData = { ...defaultAgreementData, insuranceSelection: '' }
    render(
      <AgreementStep agreementData={noInsuranceData} onComplete={onComplete} />
    )

    expect(screen.getByText('None selected')).toBeInTheDocument()
  })
})
