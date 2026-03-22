import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { apiClient, createApiUrl } from '../config/api';

interface PaymentFormProps {
  bookingData: any;
  car: any;
  pricing: any;
  totalDays: number;
  verificationSessionId: string;
  onPaymentComplete: (paymentData: any) => void;
  onCancel: () => void;
}

interface PaymentIntentData {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  publishableKey: string;
}

// Stripe Elements theme
const stripeElementsOptions = {
  appearance: {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#3b82f6',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#dc2626',
      fontFamily: 'Inter, system-ui, sans-serif',
      spacingUnit: '6px',
      borderRadius: '8px',
    },
    rules: {
      '.Input': {
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        padding: '12px',
        fontSize: '16px',
      },
      '.Input:focus': {
        border: '2px solid #3b82f6',
        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
      },
      '.Label': {
        fontWeight: '500',
        marginBottom: '8px',
      },
    },
  },
  paymentMethodOrder: ['card', 'apple_pay', 'google_pay'],
};

// Initialize Stripe - this would come from environment variable in production
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

const PaymentFormContent: React.FC<PaymentFormProps & { paymentIntentData: PaymentIntentData }> = ({
  bookingData,
  car,
  pricing,
  totalDays,
  verificationSessionId,
  onPaymentComplete,
  onCancel,
  paymentIntentData
}) => {
  const stripe = useStripe();
  const elements = useElements();
  
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple_pay' | 'google_pay'>('card');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saveCard, setSaveCard] = useState(false);

  // Check for digital wallet availability
  const [canMakePayment, setCanMakePayment] = useState({
    applePay: false,
    googlePay: false
  });

  useEffect(() => {
    if (stripe) {
      // Check Apple Pay availability
      const paymentRequest = stripe.paymentRequest({
        country: 'US',
        currency: 'usd',
        total: {
          label: `Car Rental - ${car.make} ${car.model}`,
          amount: Math.round(pricing.total * 100),
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });

      paymentRequest.canMakePayment().then((result) => {
        if (result) {
          setCanMakePayment({
            applePay: result.applePay || false,
            googlePay: result.googlePay || false
          });
        }
      });
    }
  }, [stripe, pricing.total, car]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setError('Stripe has not loaded yet. Please try again.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Get the payment element
      const paymentElement = elements.getElement(PaymentElement);
      
      if (!paymentElement) {
        throw new Error('Payment element not found');
      }

      // Confirm the payment
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/return`,
          payment_method_data: {
            billing_details: {
              name: `${bookingData.firstName || ''} ${bookingData.lastName || ''}`.trim(),
              email: bookingData.email || '',
            },
          },
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (paymentIntent) {
        // Payment succeeded
        if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture') {
          setSuccess(true);
          
          // Call backend to complete the booking
          const completionResult = await completeBooking(paymentIntent);
          
          onPaymentComplete({
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            receipt_url: paymentIntent.charges?.data[0]?.receipt_url,
            booking: completionResult,
            timestamp: new Date().toISOString()
          });
        } else if (paymentIntent.status === 'requires_action') {
          // Additional authentication required (3D Secure)
          setError('Additional authentication is required. Please follow the prompts.');
        } else {
          throw new Error(`Payment failed with status: ${paymentIntent.status}`);
        }
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'An error occurred while processing your payment.');
    } finally {
      setProcessing(false);
    }
  };

  const completeBooking = async (paymentIntent: any) => {
    try {
      // In production, this would call your booking completion API
      const response = await apiClient.post('/bookings/complete', {
        paymentIntentId: paymentIntent.id,
        reservationId: bookingData.reservationId,
        verificationSessionId,
        bookingDetails: {
          ...bookingData,
          car,
          pricing,
          totalDays
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error completing booking:', error);
      throw error;
    }
  };

  const handleDigitalWalletPayment = async (type: 'apple_pay' | 'google_pay') => {
    if (!stripe) return;

    const paymentRequest = stripe.paymentRequest({
      country: 'US',
      currency: 'usd',
      total: {
        label: `Car Rental - ${car.make} ${car.model}`,
        amount: Math.round(pricing.total * 100),
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    paymentRequest.on('paymentmethod', async (ev) => {
      setProcessing(true);

      try {
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
          paymentIntentData.clientSecret,
          { payment_method: ev.paymentMethod.id },
          { handleActions: false }
        );

        if (confirmError) {
          ev.complete('fail');
          throw new Error(confirmError.message);
        }

        ev.complete('success');

        if (paymentIntent && paymentIntent.status === 'succeeded') {
          const completionResult = await completeBooking(paymentIntent);
          onPaymentComplete({
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            paymentMethod: type,
            booking: completionResult,
            timestamp: new Date().toISOString()
          });
        }
      } catch (err: any) {
        ev.complete('fail');
        setError(err.message);
      } finally {
        setProcessing(false);
      }
    });

    paymentRequest.show();
  };

  if (success) {
    return (
      <div className="payment-success">
        <div className="success-animation">✅</div>
        <h2>Payment Successful!</h2>
        <p>Your booking has been confirmed and you'll receive a confirmation email shortly.</p>
      </div>
    );
  }

  return (
    <div className="payment-form">
      <div className="payment-container">
        <div className="payment-header">
          <h2>Complete Your Payment</h2>
          <p>Secure payment powered by Stripe</p>
        </div>

        {/* Booking Summary */}
        <div className="booking-summary">
          <h3>Booking Summary</h3>
          <div className="summary-content">
            <div className="car-info">
              <img src={car.images?.[0] || '/placeholder-car.jpg'} alt={`${car.make} ${car.model}`} />
              <div>
                <h4>{car.make} {car.model}</h4>
                <p>{totalDays} days rental</p>
                <p>📍 {bookingData.pickupLocation}</p>
                <p>📅 {bookingData.pickupDate} to {bookingData.returnDate}</p>
              </div>
            </div>

            <div className="pricing-breakdown">
              <div className="price-line">
                <span>Car rental ({totalDays} days)</span>
                <span>${pricing.basePrice?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="price-line">
                <span>Insurance</span>
                <span>${pricing.insurancePrice?.toFixed(2) || '0.00'}</span>
              </div>
              {pricing.addOnsPrice > 0 && (
                <div className="price-line">
                  <span>Add-ons</span>
                  <span>${pricing.addOnsPrice.toFixed(2)}</span>
                </div>
              )}
              <div className="price-line">
                <span>Taxes & Fees</span>
                <span>${pricing.taxes?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="price-line total">
                <span>Total</span>
                <span>${pricing.total?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="payment-method-selection">
          <h3>Payment Method</h3>
          <div className="payment-methods">
            <button
              className={`payment-method ${paymentMethod === 'card' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('card')}
            >
              💳 Credit/Debit Card
            </button>
            
            {canMakePayment.applePay && (
              <button
                className={`payment-method ${paymentMethod === 'apple_pay' ? 'active' : ''}`}
                onClick={() => handleDigitalWalletPayment('apple_pay')}
                disabled={processing}
              >
                🍎 Apple Pay
              </button>
            )}
            
            {canMakePayment.googlePay && (
              <button
                className={`payment-method ${paymentMethod === 'google_pay' ? 'active' : ''}`}
                onClick={() => handleDigitalWalletPayment('google_pay')}
                disabled={processing}
              >
                🎯 Google Pay
              </button>
            )}
          </div>
        </div>

        {/* Stripe Payment Form */}
        {paymentMethod === 'card' && (
          <form onSubmit={handleSubmit} className="stripe-payment-form">
            <div className="payment-element-container">
              <PaymentElement
                options={{
                  layout: 'tabs',
                  paymentMethodOrder: ['card'],
                }}
              />
            </div>

            {/* Save Card Option */}
            <div className="save-card-option">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={saveCard}
                  onChange={(e) => setSaveCard(e.target.checked)}
                />
                <span>Save this payment method for future bookings</span>
              </label>
            </div>

            {/* Error Display */}
            {error && (
              <div className="payment-error">
                <span>⚠️</span>
                <p>{error}</p>
              </div>
            )}

            {/* Security Notice */}
            <div className="security-notice">
              <h4>🔒 Your payment is secure</h4>
              <p>
                Your payment information is encrypted and processed securely by Stripe. 
                We never store your card details on our servers.
              </p>
              <div className="security-badges">
                <span>🛡️ SSL Encrypted</span>
                <span>🏛️ PCI Compliant</span>
                <span>🔐 256-bit Security</span>
              </div>
            </div>

            {/* Payment Actions */}
            <div className="payment-actions">
              <button 
                type="button"
                className="btn btn-outline-secondary"
                onClick={onCancel}
                disabled={processing}
              >
                Back to Verification
              </button>
              
              <button 
                type="submit"
                className="btn btn-primary payment-submit-btn"
                disabled={processing || !stripe}
              >
                {processing ? (
                  <>
                    <div className="spinner"></div>
                    Processing Payment...
                  </>
                ) : (
                  `Pay $${pricing.total?.toFixed(2) || '0.00'}`
                )}
              </button>
            </div>
          </form>
        )}

        <div className="verification-reference">
          <small>Identity verification completed - Session: {verificationSessionId}</small>
        </div>
      </div>
    </div>
  );
};

const PaymentForm: React.FC<PaymentFormProps> = (props) => {
  const [paymentIntentData, setPaymentIntentData] = useState<PaymentIntentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createPaymentIntent();
  }, []);

  const createPaymentIntent = async () => {
    try {
      setLoading(true);
      setError(null);

      // For development: Use mock payment intent data
      // In production, this would call your backend API
      if (import.meta.env.DEV) {
        // Mock response for development
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
        
        // Use a more realistic mock client secret format that Stripe will accept for testing
        const mockPaymentIntentData = {
          clientSecret: `pi_1234567890abcdef1234567890abcdef_secret_1234567890abcdef1234567890abcdef`,
          paymentIntentId: 'pi_mock_' + Date.now(),
          amount: Math.round(props.pricing.total * 100), // Stripe amounts are in cents
          currency: 'usd',
          publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_mock_key'
        };
        
        setPaymentIntentData(mockPaymentIntentData);
      } else {
        // Production API call
        const response = await apiClient.post('/payments/create-intent', {
          amount: props.pricing.total,
          currency: 'usd',
          reservationId: props.bookingData.reservationId || 'temp_reservation',
          customerId: props.bookingData.customerId || null,
          metadata: {
            carId: props.car.id,
            verificationSessionId: props.verificationSessionId,
            pickupDate: props.bookingData.pickupDate,
            returnDate: props.bookingData.returnDate,
            totalDays: props.totalDays.toString()
          }
        });

        setPaymentIntentData(response.data);
      }
    } catch (err: any) {
      console.error('Error creating payment intent:', err);
      setError(err.response?.data?.error || 'Failed to initialize payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="payment-loading">
        <div className="spinner"></div>
        <p>Initializing secure payment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payment-error-container">
        <span>⚠️</span>
        <h3>Payment Initialization Error</h3>
        <p>{error}</p>
        <button onClick={createPaymentIntent} className="btn btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  if (!paymentIntentData) {
    return (
      <div className="payment-error-container">
        <span>⚠️</span>
        <h3>Payment Unavailable</h3>
        <p>Unable to initialize payment. Please try again later.</p>
        <button onClick={props.onCancel} className="btn btn-secondary">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <Elements 
      stripe={stripePromise} 
      options={{
        clientSecret: paymentIntentData.clientSecret,
        ...stripeElementsOptions
      }}
    >
      <PaymentFormContent {...props} paymentIntentData={paymentIntentData} />
    </Elements>
  );
};

export default PaymentForm;