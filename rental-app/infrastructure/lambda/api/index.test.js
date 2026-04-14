// Mocks must be declared before require.
// Modules that are not installed locally need { virtual: true }.
jest.mock('aws-sdk', () => ({
  SecretsManager: jest.fn(() => ({ getSecretValue: jest.fn() })),
  S3: jest.fn(() => ({})),
  CognitoIdentityServiceProvider: jest.fn(() => ({})),
}), { virtual: true });
jest.mock('pg', () => ({ Pool: jest.fn() }), { virtual: true });
const mockConstructEvent = jest.fn();
const mockPaymentIntentsRetrieve = jest.fn();
const mockPaymentIntentsCapture = jest.fn();
const mockPaymentIntentsCreate = jest.fn().mockResolvedValue({ id: 'pi_test', client_secret: 'cs_test' });

jest.mock('stripe', () => jest.fn(() => ({
  webhooks: { constructEvent: mockConstructEvent },
  paymentIntents: {
    retrieve: mockPaymentIntentsRetrieve,
    capture: mockPaymentIntentsCapture,
    create: mockPaymentIntentsCreate,
  },
})));
jest.mock('jsonwebtoken', () => ({
  decode: jest.fn(() => ({ header: { kid: 'test-kid' }, payload: { sub: 'user-123' } })),
  verify: jest.fn(() => ({ sub: 'user-123', email: 'test@example.com' })),
}), { virtual: true });
jest.mock('jwk-to-pem', () => jest.fn(() => 'fake-pem'), { virtual: true });
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: { keys: [{ kid: 'test-kid', kty: 'RSA' }] } })),
  post: jest.fn(),
}));

// Set env vars before requiring the module
process.env.DATABASE_SECRET_ARN = '';
process.env.USER_POOL_ID = 'us-east-1_testPool';
process.env.USER_POOL_CLIENT_ID = 'testClientId';
process.env.IMAGES_BUCKET_NAME = 'test-images';
process.env.STATIC_BUCKET_NAME = 'test-static';
process.env.ENVIRONMENT = 'dev';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_API_VERSION = '2023-10-16';
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

const { handler } = require('./index');

// Auth header that satisfies the JWT mock chain
const AUTH_HEADERS = { Authorization: 'Bearer fake-jwt-token' };

// Helper to build a Lambda event
function makeEvent(method, path, { body, pathParameters, headers } = {}) {
  return {
    httpMethod: method,
    path,
    headers: headers || {},
    pathParameters: pathParameters || null,
    body: body ? JSON.stringify(body) : null,
    queryStringParameters: null,
    requestContext: {},
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('Lambda API handler', () => {
  // ── CORS headers ────────────────────────────────────────────────
  describe('CORS headers', () => {
    it('returns CORS headers on OPTIONS preflight', async () => {
      const event = makeEvent('OPTIONS', '/cars');
      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);
      expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(res.headers['Access-Control-Allow-Methods']).toContain('OPTIONS');
    });

    it('returns CORS headers on a normal GET request', async () => {
      const event = makeEvent('GET', '/');
      const res = await handler(event, {});
      expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(res.headers['Access-Control-Allow-Headers']).toContain('Authorization');
    });
  });

  // ── GET /cars  (mock data fallback) ─────────────────────────────
  describe('GET /cars', () => {
    it('returns mock car data when DB is not configured', async () => {
      const event = makeEvent('GET', '/cars');
      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.cars).toBeDefined();
      expect(body.cars.length).toBeGreaterThan(0);
      expect(body.total).toBe(body.cars.length);

      // Verify mock car shape
      const car = body.cars[0];
      expect(car).toHaveProperty('id');
      expect(car).toHaveProperty('make');
      expect(car).toHaveProperty('model');
      expect(car).toHaveProperty('pricePerDay');
    });
  });

  // ── GET /cars/{carId}  (404 for unknown car) ───────────────────
  describe('GET /cars/{carId}', () => {
    it('returns 404 for an unknown car when DB returns null', async () => {
      // With DATABASE_SECRET_ARN empty, dbQuery returns null (no pool).
      // The handler treats null rows as "not found" and falls through to 404.
      const event = makeEvent('GET', '/cars/{carId}', {
        pathParameters: { carId: 'nonexistent_999' },
      });
      const res = await handler(event, {});
      expect(res.statusCode).toBe(404);

      const body = JSON.parse(res.body);
      expect(body.error).toMatch(/not found/i);
    });
  });

  // ── POST /bookings ─────────────────────────────────────────────
  describe('POST /bookings', () => {
    it('returns 201 with a bookingId', async () => {
      const event = makeEvent('POST', '/bookings', {
        headers: AUTH_HEADERS,
        body: {
          carId: 'car_1',
          userId: 'user_42',
          userName: 'Jane Doe',
          startDate: '2026-05-01',
          endDate: '2026-05-05',
        },
      });
      const res = await handler(event, {});
      expect(res.statusCode).toBe(201);

      const body = JSON.parse(res.body);
      expect(body.bookingId).toBeDefined();
      expect(body.bookingId).toMatch(/^booking_/);
      expect(body.message).toMatch(/booking created/i);
    });
  });

  // ── GET /vehicles/search  (mock data fallback) ─────────────────
  describe('GET /vehicles/search', () => {
    it('returns mock vehicle data when DB is not configured', async () => {
      const event = makeEvent('GET', '/vehicles/search');
      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.vehicles).toBeDefined();
      expect(body.vehicles.length).toBeGreaterThan(0);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.total).toBe(body.vehicles.length);

      // Verify mock vehicle shape
      const v = body.vehicles[0];
      expect(v).toHaveProperty('id');
      expect(v).toHaveProperty('make');
      expect(v).toHaveProperty('model');
      expect(v).toHaveProperty('pricePerDay');
      expect(v).toHaveProperty('type');
    });

    it('returns vehicles filtered by vehicleType', async () => {
      const event = {
        ...makeEvent('GET', '/vehicles/search'),
        queryStringParameters: { vehicleType: 'suv' },
      };
      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      body.vehicles.forEach(v => {
        expect(v.type).toBe('suv');
      });
    });
  });

  // ── payments table in schema.sql ──────────────────────────────
  describe('payments table schema', () => {
    const fs = require('fs');
    const path = require('path');

    it('schema.sql contains CREATE TABLE payments', () => {
      const schemaPath = path.resolve(__dirname, '../../../../portal/backend/db/schema.sql');
      const sql = fs.readFileSync(schemaPath, 'utf8');
      expect(sql).toContain('CREATE TABLE payments');
      expect(sql).toContain('stripe_payment_intent_id');
      expect(sql).toContain('reservation_id');
    });
  });

  // ── createResponse helper (via handler responses) ──────────────
  describe('response helper', () => {
    it('creates correct status codes and JSON body for 200', async () => {
      const event = makeEvent('GET', '/');
      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);
      expect(typeof res.body).toBe('string');
      const body = JSON.parse(res.body);
      expect(body.message).toBeDefined();
    });

    it('returns 404 for an unknown route', async () => {
      const event = makeEvent('GET', '/this-route-does-not-exist', {
        headers: AUTH_HEADERS,
      });
      const res = await handler(event, {});
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.error).toMatch(/route not found/i);
    });
  });

  // ── POST /payments/webhook ───────────────────────────────────────
  describe('POST /payments/webhook', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns 400 when stripe-signature header is missing', async () => {
      const event = makeEvent('POST', '/payments/webhook', {
        headers: {},
      });
      event.body = '{}';

      const res = await handler(event, {});
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toMatch(/missing|signature/i);
    });

    it('returns 400 when signature verification fails', async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const event = makeEvent('POST', '/payments/webhook', {
        headers: { 'stripe-signature': 'bad_sig' },
      });
      event.body = '{"type":"payment_intent.succeeded"}';

      const res = await handler(event, {});
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toMatch(/invalid signature/i);
    });

    it('returns 200 for a valid payment_intent.succeeded event', async () => {
      mockConstructEvent.mockReturnValue({
        id: 'evt_succeed_1',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_abc', status: 'succeeded' } },
      });

      const event = makeEvent('POST', '/payments/webhook', {
        headers: { 'stripe-signature': 'valid_sig' },
      });
      event.body = '{}';

      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).received).toBe(true);
    });

    it('returns 200 with duplicate flag for already-processed events', async () => {
      const evtId = 'evt_dedup_test_' + Date.now();
      mockConstructEvent.mockReturnValue({
        id: evtId,
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_dup', status: 'succeeded' } },
      });

      const event = makeEvent('POST', '/payments/webhook', {
        headers: { 'stripe-signature': 'valid_sig' },
      });
      event.body = '{}';

      // First call
      await handler(event, {});
      // Second call (duplicate)
      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).duplicate).toBe(true);
    });

    it('returns 200 for payment_intent.payment_failed event', async () => {
      mockConstructEvent.mockReturnValue({
        id: 'evt_fail_1',
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_fail', last_payment_error: { message: 'Card declined' } } },
      });

      const event = makeEvent('POST', '/payments/webhook', {
        headers: { 'stripe-signature': 'valid_sig' },
      });
      event.body = '{}';

      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).received).toBe(true);
    });

    it('returns 200 for charge.refunded event', async () => {
      mockConstructEvent.mockReturnValue({
        id: 'evt_refund_1',
        type: 'charge.refunded',
        data: { object: { id: 'ch_refund', payment_intent: 'pi_refund' } },
      });

      const event = makeEvent('POST', '/payments/webhook', {
        headers: { 'stripe-signature': 'valid_sig' },
      });
      event.body = '{}';

      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).received).toBe(true);
    });
  });

  // ── POST /bookings/complete ──────────────────────────────────────
  describe('POST /bookings/complete', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns 400 when paymentIntentId is missing', async () => {
      const event = makeEvent('POST', '/bookings/complete', {
        headers: AUTH_HEADERS,
        body: { reservationId: 'res_1' },
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toMatch(/payment intent id|required/i);
    });

    it('returns 201 with booking data when payment succeeded', async () => {
      mockPaymentIntentsRetrieve.mockResolvedValue({
        id: 'pi_test_complete',
        status: 'succeeded',
      });

      const event = makeEvent('POST', '/bookings/complete', {
        headers: AUTH_HEADERS,
        body: {
          paymentIntentId: 'pi_test_complete',
          reservationId: 'res_123',
          bookingDetails: {
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane@example.com',
          },
        },
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(201);

      const body = JSON.parse(res.body);
      expect(body.message).toBe('Booking confirmed successfully');
      expect(body.booking).toBeDefined();
      expect(body.booking.status).toBe('confirmed');
      expect(body.booking.paymentIntentId).toBe('pi_test_complete');
      expect(body.booking.paymentStatus).toBe('succeeded');
      expect(body.booking.id).toMatch(/^BK/);
      expect(body.booking.confirmation).toBeDefined();
      expect(body.booking.confirmation.bookingReference).toBe(body.booking.id);
      expect(body.email).toBeDefined();
      expect(body.nextSteps).toBeDefined();
      expect(Array.isArray(body.nextSteps)).toBe(true);
    });

    it('captures payment when status is requires_capture', async () => {
      mockPaymentIntentsRetrieve.mockResolvedValue({
        id: 'pi_capture',
        status: 'requires_capture',
      });
      mockPaymentIntentsCapture.mockResolvedValue({
        id: 'pi_capture',
        status: 'succeeded',
      });

      const event = makeEvent('POST', '/bookings/complete', {
        headers: AUTH_HEADERS,
        body: {
          paymentIntentId: 'pi_capture',
          reservationId: 'res_456',
        },
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(201);
      expect(mockPaymentIntentsCapture).toHaveBeenCalledWith('pi_capture');
      expect(JSON.parse(res.body).booking.paymentStatus).toBe('captured');
    });

    it('returns 400 when payment is not in a completable status', async () => {
      mockPaymentIntentsRetrieve.mockResolvedValue({
        id: 'pi_pending',
        status: 'requires_payment_method',
      });

      const event = makeEvent('POST', '/bookings/complete', {
        headers: AUTH_HEADERS,
        body: {
          paymentIntentId: 'pi_pending',
          reservationId: 'res_789',
        },
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toMatch(/payment not completed/i);
      expect(body.paymentStatus).toBe('requires_payment_method');
    });
  });
});
