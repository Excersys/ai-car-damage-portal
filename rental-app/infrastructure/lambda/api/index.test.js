// Mocks must be declared before require.
// Modules that are not installed locally need { virtual: true }.
jest.mock('aws-sdk', () => ({
  SecretsManager: jest.fn(() => ({ getSecretValue: jest.fn() })),
  S3: jest.fn(() => ({})),
  CognitoIdentityServiceProvider: jest.fn(() => ({})),
}), { virtual: true });
jest.mock('pg', () => ({ Pool: jest.fn() }), { virtual: true });
jest.mock('stripe', () => jest.fn(() => ({})));
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
});
