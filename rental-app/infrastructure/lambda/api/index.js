const AWS = require('aws-sdk');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const {
  ensureThirdPartyConfig,
  getStripeClient,
  thirdParty
} = require('./thirdPartyConfig');

// Initialize AWS services
const secretsManager = new AWS.SecretsManager();
const s3 = new AWS.S3();
const cognito = new AWS.CognitoIdentityServiceProvider();

// Environment variables (secrets load at runtime — see thirdPartyConfig.js)
const {
  USER_POOL_ID,
  USER_POOL_CLIENT_ID,
  DATABASE_SECRET_ARN,
  IMAGES_BUCKET_NAME,
  STATIC_BUCKET_NAME,
  ENVIRONMENT,
  EXPERIAN_BASE_URL
} = process.env;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
};

// Response helper
const createResponse = (statusCode, body, additionalHeaders = {}) => ({
  statusCode,
  headers: { ...corsHeaders, ...additionalHeaders },
  body: JSON.stringify(body)
});

// JWT Authentication helpers
const authHelpers = {
  // Cache for JWKs to avoid repeated requests
  jwksCache: new Map(),
  
  // Get JWKs from Cognito User Pool
  getJWKS: async () => {
    const cacheKey = `jwks-${USER_POOL_ID}`;
    if (authHelpers.jwksCache.has(cacheKey)) {
      return authHelpers.jwksCache.get(cacheKey);
    }
    
    const region = process.env.AWS_REGION || 'us-east-1';
    const jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`;
    
    try {
      const response = await axios.get(jwksUrl);
      const jwks = response.data;
      authHelpers.jwksCache.set(cacheKey, jwks);
      return jwks;
    } catch (error) {
      console.error('Error fetching JWKS:', error);
      throw new Error('Failed to fetch JWKS');
    }
  },
  
  // Verify JWT token
  verifyToken: async (token) => {
    try {
      // Decode token header to get kid
      const decodedHeader = jwt.decode(token, { complete: true });
      if (!decodedHeader || !decodedHeader.header.kid) {
        throw new Error('Invalid token header');
      }
      
      // Get JWKs and find matching key
      const jwks = await authHelpers.getJWKS();
      const jwk = jwks.keys.find(key => key.kid === decodedHeader.header.kid);
      if (!jwk) {
        throw new Error('JWK not found');
      }
      
      // Convert JWK to PEM
      const pem = jwkToPem(jwk);
      
      // Verify token
      const decoded = jwt.verify(token, pem, {
        issuer: `https://cognito-idp.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${USER_POOL_ID}`,
        audience: USER_POOL_CLIENT_ID
      });
      
      return decoded;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  },
  
  // Extract token from Authorization header
  extractToken: (event) => {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  },
  
  // Check if endpoint requires authentication
  isProtectedEndpoint: (method, path) => {
    // Public endpoints that don't require authentication
    const publicEndpoints = [
      'GET /',
      'GET /health',
      'GET /deployment/status',
      'POST /auth',
      'GET /cars',
      'GET /vehicles/search',
      'GET /vehicles/',
      'POST /verification/webhook',
      'POST /payments/webhook'
    ];
    
    const endpoint = `${method} ${path}`;
    
    // Check exact matches
    if (publicEndpoints.includes(endpoint)) {
      return false;
    }
    
    // Check pattern matches
    if ((method === 'GET' && path.startsWith('/vehicles/')) || 
        (method === 'GET' && path.startsWith('/cars/'))) {
      return false;
    }
    
    // All other endpoints require authentication
    return true;
  },
  
  // Authenticate request
  authenticate: async (event) => {
    const method = event.httpMethod;
    const path = event.path;
    
    // Check if endpoint requires authentication
    if (!authHelpers.isProtectedEndpoint(method, path)) {
      return { authenticated: true, user: null }; // Public endpoint
    }
    
    // Extract and verify token
    const token = authHelpers.extractToken(event);
    if (!token) {
      return { authenticated: false, error: 'Missing authorization token' };
    }
    
    const decoded = await authHelpers.verifyToken(token);
    if (!decoded) {
      return { authenticated: false, error: 'Invalid or expired token' };
    }
    
    return { authenticated: true, user: decoded };
  }
};

// Database connection helper (placeholder for now)
const getDbCredentials = async () => {
  if (!DATABASE_SECRET_ARN) return null;
  
  try {
    const result = await secretsManager.getSecretValue({ SecretId: DATABASE_SECRET_ARN }).promise();
    return JSON.parse(result.SecretString);
  } catch (error) {
    console.error('Error getting database credentials:', error);
    return null;
  }
};

// Experian API integration helpers
const experianApi = {
  // Get Experian API credentials from Secrets Manager
  getCredentials: async () => {
    try {
      if (ENVIRONMENT === 'dev') {
        // Use mock credentials for development
        return {
          apiKey: 'mock_experian_key',
          apiSecret: 'mock_experian_secret',
          baseUrl: 'https://sandbox.experian.com/api'
        };
      }

      await ensureThirdPartyConfig(secretsManager);
      return {
        apiKey: thirdParty.experianKey,
        apiSecret: thirdParty.experianSecret,
        baseUrl: EXPERIAN_BASE_URL || 'https://api.experian.com'
      };
    } catch (error) {
      console.error('Error getting Experian credentials:', error);
      throw error;
    }
  },

  // Perform soft credit check
  performSoftCreditCheck: async (personalInfo) => {
    try {
      const credentials = await experianApi.getCredentials();
      
      if (ENVIRONMENT === 'dev') {
        // Mock Experian response for development
        return experianApi.mockCreditCheckResponse(personalInfo);
      }
      
      const requestBody = {
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        street1: personalInfo.address,
        city: personalInfo.city,
        state: personalInfo.state,
        zip: personalInfo.zipCode,
        ssn: personalInfo.ssn,
        dob: personalInfo.dateOfBirth
      };

      const response = await axios.post(
        `${credentials.baseUrl}/credit-check/soft-pull`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${credentials.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error performing Experian credit check:', error);
      throw error;
    }
  },

  // Mock credit check response for development/testing
  mockCreditCheckResponse: (personalInfo) => {
    // Generate deterministic but realistic mock data based on input
    const mockScore = 650 + (personalInfo.firstName.length * 10) + (personalInfo.lastName.length * 5);
    const riskLevel = mockScore >= 750 ? 'LOW' : mockScore >= 650 ? 'MEDIUM' : 'HIGH';
    
    return {
      requestId: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      creditScore: Math.min(850, mockScore),
      riskLevel,
      addressVerification: {
        status: 'VERIFIED',
        confidence: 0.92,
        matchType: 'EXACT'
      },
      identityVerification: {
        status: 'VERIFIED',
        ssnMatch: true,
        nameMatch: true,
        dobMatch: true,
        confidence: 0.89
      },
      fraudIndicators: {
        syntheticIdentity: false,
        velocityRisk: false,
        deviceRisk: false,
        riskScore: 0.15
      },
      creditHistory: {
        accountsOpen: Math.floor(Math.random() * 8) + 2,
        totalCreditLimit: 25000 + (Math.random() * 75000),
        utilization: Math.random() * 0.3,
        lengthOfHistory: Math.floor(Math.random() * 15) + 2
      },
      timestamp: new Date().toISOString()
    };
  },

  // Verify address against credit bureau data
  verifyAddress: async (addressInfo) => {
    try {
      const credentials = await experianApi.getCredentials();
      
      if (ENVIRONMENT === 'dev') {
        // Mock address verification
        return {
          status: 'VERIFIED',
          confidence: 0.94,
          standardizedAddress: {
            street: addressInfo.street.toUpperCase(),
            city: addressInfo.city.toUpperCase(),
            state: addressInfo.state.toUpperCase(),
            zipCode: addressInfo.zipCode
          },
          deliverable: true
        };
      }
      
      // Real Experian address verification API call would go here
      // This is a placeholder for the actual implementation
      return {
        status: 'VERIFIED',
        confidence: 0.95,
        standardizedAddress: addressInfo,
        deliverable: true
      };
    } catch (error) {
      console.error('Error verifying address:', error);
      throw error;
    }
  }
};

// Comprehensive verification scoring system
const verificationScoring = {
  // Calculate combined verification score
  calculateCombinedScore: (veriffResult, experianResult) => {
    try {
      const scores = {
        veriff: verificationScoring.calculateVeriffScore(veriffResult),
        experian: verificationScoring.calculateExperianScore(experianResult),
        combined: 0
      };
      
      // Weighted scoring: Veriff 40%, Experian 60%
      const weights = {
        veriff: 0.4,
        experian: 0.6
      };
      
      scores.combined = (scores.veriff * weights.veriff) + (scores.experian * weights.experian);
      
      return {
        scores,
        weights,
        finalScore: Math.round(scores.combined),
        riskLevel: verificationScoring.determineRiskLevel(scores.combined),
        recommendation: verificationScoring.getRecommendation(scores.combined),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error calculating combined score:', error);
      throw error;
    }
  },

  // Calculate Veriff-specific score (0-100)
  calculateVeriffScore: (veriffResult) => {
    if (!veriffResult || !veriffResult.decision) {
      return 0;
    }
    
    let score = 0;
    
    // Document verification (40 points)
    if (veriffResult.decision.verification?.status === 'approved') {
      score += 40 * (veriffResult.decision.verification?.score || 0.8);
    }
    
    // Identity matching (40 points)
    if (veriffResult.decision.identity?.status === 'approved') {
      score += 40 * (veriffResult.decision.identity?.score || 0.8);
    }
    
    // Overall status bonus (20 points)
    if (veriffResult.status === 'approved') {
      score += 20;
    }
    
    return Math.min(100, Math.round(score));
  },

  // Calculate Experian-specific score (0-100)
  calculateExperianScore: (experianResult) => {
    if (!experianResult) {
      return 0;
    }
    
    let score = 0;
    
    // Credit score component (50 points)
    if (experianResult.creditScore) {
      // Normalize credit score (300-850) to 0-50 scale
      const normalizedCredit = ((experianResult.creditScore - 300) / 550) * 50;
      score += Math.max(0, Math.min(50, normalizedCredit));
    }
    
    // Identity verification (25 points)
    if (experianResult.identityVerification) {
      const identityScore = experianResult.identityVerification.confidence * 25;
      score += identityScore;
    }
    
    // Address verification (15 points)
    if (experianResult.addressVerification) {
      const addressScore = experianResult.addressVerification.confidence * 15;
      score += addressScore;
    }
    
    // Fraud risk deduction (up to -10 points)
    if (experianResult.fraudIndicators) {
      const fraudDeduction = experianResult.fraudIndicators.riskScore * 10;
      score -= fraudDeduction;
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  },

  // Determine risk level based on combined score
  determineRiskLevel: (score) => {
    if (score >= 80) return 'LOW';
    if (score >= 60) return 'MEDIUM';
    if (score >= 40) return 'HIGH';
    return 'VERY_HIGH';
  },

  // Get recommendation based on score
  getRecommendation: (score) => {
    if (score >= 80) return 'APPROVE';
    if (score >= 60) return 'APPROVE_WITH_CONDITIONS';
    if (score >= 40) return 'MANUAL_REVIEW';
    return 'DECLINE';
  },

  // Generate detailed verification report
  generateReport: (sessionId, veriffResult, experianResult) => {
    const scoringResult = verificationScoring.calculateCombinedScore(veriffResult, experianResult);
    
    return {
      sessionId,
      timestamp: new Date().toISOString(),
      verification: {
        veriff: {
          status: veriffResult?.status || 'unknown',
          scores: {
            verification: veriffResult?.decision?.verification?.score || 0,
            identity: veriffResult?.decision?.identity?.score || 0
          },
          calculatedScore: scoringResult.scores.veriff
        },
        experian: {
          creditScore: experianResult?.creditScore || null,
          riskLevel: experianResult?.riskLevel || 'UNKNOWN',
          identityVerified: experianResult?.identityVerification?.status === 'VERIFIED',
          addressVerified: experianResult?.addressVerification?.status === 'VERIFIED',
          calculatedScore: scoringResult.scores.experian
        }
      },
      scoring: scoringResult,
      riskFactors: verificationScoring.identifyRiskFactors(veriffResult, experianResult),
      compliance: {
        fcraCompliant: true,
        auditTrail: true,
        dataRetention: '7_YEARS'
      }
    };
  },

  // Identify specific risk factors
  identifyRiskFactors: (veriffResult, experianResult) => {
    const riskFactors = [];
    
    // Veriff risk factors
    if (veriffResult?.decision?.verification?.score < 0.8) {
      riskFactors.push('LOW_DOCUMENT_VERIFICATION_SCORE');
    }
    if (veriffResult?.decision?.identity?.score < 0.8) {
      riskFactors.push('LOW_IDENTITY_MATCH_SCORE');
    }
    
    // Experian risk factors
    if (experianResult?.creditScore < 600) {
      riskFactors.push('LOW_CREDIT_SCORE');
    }
    if (experianResult?.fraudIndicators?.syntheticIdentity) {
      riskFactors.push('SYNTHETIC_IDENTITY_RISK');
    }
    if (experianResult?.fraudIndicators?.velocityRisk) {
      riskFactors.push('VELOCITY_RISK');
    }
    if (experianResult?.identityVerification?.confidence < 0.8) {
      riskFactors.push('LOW_IDENTITY_CONFIDENCE');
    }
    if (experianResult?.addressVerification?.confidence < 0.8) {
      riskFactors.push('ADDRESS_VERIFICATION_ISSUES');
    }
    
    return riskFactors;
  }
};

// Route handlers
const handlers = {
  // Health check
  'GET /': async () => {
    return createResponse(200, {
      message: 'AI Car Rental API is running',
      environment: ENVIRONMENT,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  },

  // Deployment status and health monitoring
  'GET /health': async () => {
    const healthStatus = {
      status: 'healthy',
      environment: ENVIRONMENT,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        database: 'healthy', // Would check actual DB connection
        authentication: 'healthy',
        payment: 'healthy',
        verification: 'healthy',
        storage: 'healthy'
      },
      features: {
        vehicleSearch: 'active',
        identityVerification: 'active',
        creditCheck: 'active',
        paymentProcessing: 'active',
        adminDashboard: 'deploying', // Current status
        bookingManagement: 'active'
      },
      lastDeployment: {
        version: 'v1.0.0-production',
        timestamp: '2024-01-08T12:00:00Z',
        commit: '3c04ce8',
        environment: ENVIRONMENT
      }
    };

    return createResponse(200, healthStatus);
  },

  // Deployment monitoring endpoint
  'GET /deployment/status': async () => {
    const deploymentStatus = {
      currentVersion: '1.0.0',
      environment: ENVIRONMENT,
      deploymentTime: new Date().toISOString(),
      gitCommit: '3c04ce8',
      gitBranch: 'main',
      features: {
        coreApi: { status: 'deployed', version: '1.0.0' },
        vehicleSearch: { status: 'deployed', version: '1.0.0' },
        identityVerification: { status: 'deployed', version: '1.0.0' },
        paymentProcessing: { status: 'deployed', version: '1.0.0' },
        adminDashboard: { status: 'deploying', version: '1.0.0' }
      },
      infrastructure: {
        lambda: 'healthy',
        apiGateway: 'healthy',
        database: 'healthy',
        storage: 'healthy',
        monitoring: 'active'
      },
      metrics: {
        responseTime: '< 200ms',
        errorRate: '< 0.1%',
        availability: '99.9%'
      }
    };

    return createResponse(200, deploymentStatus);
  },

  // Authentication routes
  'POST /auth': async (event) => {
    const body = JSON.parse(event.body || '{}');
    const { action, email, password, name } = body;

    try {
      if (action === 'register') {
        const params = {
          ClientId: USER_POOL_CLIENT_ID,
          Username: email,
          Password: password,
          UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'given_name', Value: name?.split(' ')[0] || '' },
            { Name: 'family_name', Value: name?.split(' ').slice(1).join(' ') || '' }
          ]
        };
        
        const result = await cognito.signUp(params).promise();
        return createResponse(201, {
          message: 'User registered successfully',
          userSub: result.UserSub,
          emailVerificationRequired: true
        });
      } else if (action === 'login') {
        const params = {
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: USER_POOL_CLIENT_ID,
          AuthParameters: {
            USERNAME: email,
            PASSWORD: password
          }
        };
        
        const result = await cognito.initiateAuth(params).promise();
        return createResponse(200, {
          message: 'Login successful',
          accessToken: result.AuthenticationResult.AccessToken,
          refreshToken: result.AuthenticationResult.RefreshToken,
          idToken: result.AuthenticationResult.IdToken
        });
      } else {
        return createResponse(400, { error: 'Invalid action. Use "register" or "login"' });
      }
    } catch (error) {
      console.error('Auth error:', error);
      return createResponse(400, { error: error.message || 'Authentication failed' });
    }
  },

  // Cars routes
  'GET /cars': async () => {
    // Mock data for now - will be replaced with database queries
    const mockCars = [
      {
        id: '1',
        make: 'Toyota',
        model: 'Camry',
        year: 2023,
        type: 'Sedan',
        pricePerDay: 49.99,
        available: true,
        features: ['Air Conditioning', 'Bluetooth', 'Backup Camera'],
        imageUrl: `https://${IMAGES_BUCKET_NAME}.s3.amazonaws.com/cars/camry-2023.jpg`
      },
      {
        id: '2',
        make: 'Honda',
        model: 'CR-V',
        year: 2023,
        type: 'SUV',
        pricePerDay: 59.99,
        available: true,
        features: ['AWD', 'Sunroof', 'Apple CarPlay', 'Safety Sense'],
        imageUrl: `https://${IMAGES_BUCKET_NAME}.s3.amazonaws.com/cars/crv-2023.jpg`
      }
    ];

    return createResponse(200, {
      cars: mockCars,
      total: mockCars.length
    });
  },

  'POST /cars': async (event) => {
    // Admin only - car creation
    const body = JSON.parse(event.body || '{}');
    console.log('Creating car:', body);
    
    // Mock response - will be replaced with database operations
    return createResponse(201, {
      message: 'Car created successfully',
      carId: `car_${Date.now()}`,
      ...body
    });
  },

  'GET /cars/{carId}': async (event) => {
    const carId = event.pathParameters?.carId;
    
    // Mock response - will be replaced with database query
    return createResponse(200, {
      id: carId,
      make: 'Toyota',
      model: 'Camry',
      year: 2023,
      type: 'Sedan',
      pricePerDay: 49.99,
      available: true,
      features: ['Air Conditioning', 'Bluetooth', 'Backup Camera'],
      imageUrl: `https://${IMAGES_BUCKET_NAME}.s3.amazonaws.com/cars/camry-2023.jpg`
    });
  },

  // Bookings routes
  'GET /bookings': async () => {
    // Mock data - will be replaced with database queries
    return createResponse(200, {
      bookings: [],
      total: 0
    });
  },

  'POST /bookings': async (event) => {
    const body = JSON.parse(event.body || '{}');
    console.log('Creating booking:', body);
    
    // Mock response - will be replaced with database operations
    return createResponse(201, {
      message: 'Booking created successfully',
      bookingId: `booking_${Date.now()}`,
      ...body
    });
  },

  // Verification endpoints (Enhanced with Experian integration)
  'POST /verification/create-session': async (event) => {
    const body = JSON.parse(event.body || '{}');
    const { userEmail, carId, bookingReference, metadata, personalInfo } = body;

    try {
      // Step 1: Create Veriff session
      // In production, this would call Veriff API to create session
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Mock Veriff session creation
      const veriffSession = {
        sessionId,
        url: `https://stationapi.veriff.com/sessions/${sessionId}`,
        status: 'created',
        userEmail,
        carId,
        bookingReference,
        metadata,
        createdAt: new Date().toISOString()
      };

      // Step 2: If personal info provided, also initiate credit check
      let creditCheckResult = null;
      if (personalInfo && personalInfo.firstName && personalInfo.lastName) {
        try {
          creditCheckResult = await experianApi.performSoftCreditCheck(personalInfo);
          console.log('Credit check completed:', creditCheckResult.requestId);
        } catch (creditError) {
          console.error('Credit check failed, continuing with identity verification only:', creditError);
          // Continue without credit check - identity verification is still valuable
        }
      }

      console.log('Created enhanced verification session:', sessionId);

      return createResponse(201, {
        sessionId: veriffSession.sessionId,
        url: veriffSession.url,
        status: veriffSession.status,
        creditCheckInitiated: !!creditCheckResult,
        creditCheckId: creditCheckResult?.requestId || null
      });

    } catch (error) {
      console.error('Error creating enhanced verification session:', error);
      return createResponse(500, {
        error: 'Failed to create verification session',
        message: error.message
      });
    }
  },

  'GET /verification/status/{sessionId}': async (event) => {
    const sessionId = event.pathParameters?.sessionId;
    
    if (!sessionId) {
      return createResponse(400, { error: 'Session ID is required' });
    }

    try {
      // Step 1: Get Veriff verification status
      // In production, this would query Veriff API for session status
      const veriffStatus = {
        sessionId,
        status: 'approved', // or 'pending', 'declined'
        decision: {
          verification: {
            status: 'approved',
            score: 0.95
          },
          identity: {
            status: 'approved',
            score: 0.98
          }
        },
        updatedAt: new Date().toISOString()
      };

      // Step 2: Get credit check status (mock for now)
      const experianStatus = experianApi.mockCreditCheckResponse({
        firstName: 'John',
        lastName: 'Doe'
      });

      // Step 3: Calculate combined verification score
      const combinedReport = verificationScoring.generateReport(
        sessionId,
        veriffStatus,
        experianStatus
      );

      return createResponse(200, {
        sessionId,
        status: combinedReport.scoring.recommendation,
        verificationComplete: true,
        report: combinedReport,
        lastUpdated: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error getting enhanced verification status:', error);
      return createResponse(500, {
        error: 'Failed to get verification status',
        message: error.message
      });
    }
  },

  // New endpoint: Enhanced verification with credit check
  'POST /verification/enhanced-check': async (event) => {
    const body = JSON.parse(event.body || '{}');
    const { sessionId, personalInfo, skipCreditCheck = false } = body;

    try {
      // Step 1: Validate session exists (mock for now)
      if (!sessionId) {
        return createResponse(400, { error: 'Session ID is required' });
      }

      // Step 2: Get Veriff results (mock)
      const veriffResult = {
        sessionId,
        status: 'approved',
        decision: {
          verification: { status: 'approved', score: 0.92 },
          identity: { status: 'approved', score: 0.96 }
        }
      };

      // Step 3: Perform credit check if not skipped
      let experianResult = null;
      if (!skipCreditCheck && personalInfo) {
        experianResult = await experianApi.performSoftCreditCheck(personalInfo);
        
        // Also verify address
        if (personalInfo.address) {
          const addressVerification = await experianApi.verifyAddress({
            street: personalInfo.address,
            city: personalInfo.city,
            state: personalInfo.state,
            zipCode: personalInfo.zipCode
          });
          experianResult.addressVerification = addressVerification;
        }
      }

      // Step 4: Generate comprehensive report
      const report = verificationScoring.generateReport(sessionId, veriffResult, experianResult);

      // Step 5: Store results (placeholder for database storage)
      console.log('Storing verification results for session:', sessionId);

      return createResponse(200, {
        sessionId,
        verificationComplete: true,
        report,
        recommendation: report.scoring.recommendation,
        riskLevel: report.scoring.riskLevel,
        finalScore: report.scoring.finalScore
      });

    } catch (error) {
      console.error('Error performing enhanced verification:', error);
      return createResponse(500, {
        error: 'Enhanced verification failed',
        message: error.message
      });
    }
  },

  // New endpoint: Credit check only
  'POST /verification/credit-check': async (event) => {
    const body = JSON.parse(event.body || '{}');
    const { personalInfo, sessionId } = body;

    try {
      if (!personalInfo || !personalInfo.firstName || !personalInfo.lastName) {
        return createResponse(400, { 
          error: 'Personal information is required',
          required: ['firstName', 'lastName', 'address', 'city', 'state', 'zipCode', 'ssn', 'dateOfBirth']
        });
      }

      // Perform soft credit check
      const creditResult = await experianApi.performSoftCreditCheck(personalInfo);

      // Verify address if provided
      let addressVerification = null;
      if (personalInfo.address) {
        addressVerification = await experianApi.verifyAddress({
          street: personalInfo.address,
          city: personalInfo.city,
          state: personalInfo.state,
          zipCode: personalInfo.zipCode
        });
      }

      const response = {
        requestId: creditResult.requestId,
        sessionId: sessionId || null,
        creditCheck: {
          score: creditResult.creditScore,
          riskLevel: creditResult.riskLevel,
          identityVerified: creditResult.identityVerification?.status === 'VERIFIED',
          addressVerified: addressVerification?.status === 'VERIFIED'
        },
        verification: {
          identity: creditResult.identityVerification,
          address: addressVerification,
          fraud: creditResult.fraudIndicators
        },
        timestamp: new Date().toISOString()
      };

      return createResponse(200, response);

    } catch (error) {
      console.error('Error performing credit check:', error);
      return createResponse(500, {
        error: 'Credit check failed',
        message: error.message
      });
    }
  },

  // New endpoint: Get verification report
  'GET /verification/report/{sessionId}': async (event) => {
    const sessionId = event.pathParameters?.sessionId;
    
    if (!sessionId) {
      return createResponse(400, { error: 'Session ID is required' });
    }

    try {
      // In production, this would fetch from database
      // For now, generate a mock comprehensive report
      const mockVeriffResult = {
        sessionId,
        status: 'approved',
        decision: {
          verification: { status: 'approved', score: 0.94 },
          identity: { status: 'approved', score: 0.97 }
        }
      };

      const mockExperianResult = experianApi.mockCreditCheckResponse({
        firstName: 'John',
        lastName: 'Doe'
      });

      const report = verificationScoring.generateReport(sessionId, mockVeriffResult, mockExperianResult);

      return createResponse(200, {
        sessionId,
        report,
        downloadUrl: null, // Could generate PDF download link
        createdAt: report.timestamp
      });

    } catch (error) {
      console.error('Error getting verification report:', error);
      return createResponse(500, {
        error: 'Failed to get verification report',
        message: error.message
      });
    }
  },

  // Vehicle search and filtering
  'GET /vehicles/search': async (event) => {
    const queryParams = event.queryStringParameters || {};
    const { 
      location = 'all',
      startDate,
      endDate,
      vehicleType = 'all',
      minPrice = 0,
      maxPrice = 1000,
      features = '',
      sortBy = 'price',
      sortOrder = 'asc',
      page = 1,
      limit = 12
    } = queryParams;

    try {
      // Mock vehicle data - in production this would come from database
      const mockVehicles = [
        {
          id: 'VH001',
          make: 'Tesla',
          model: 'Model 3',
          year: 2024,
          type: 'electric',
          category: 'luxury',
          pricePerDay: 120,
          location: 'san-francisco',
          features: ['autopilot', 'premium-audio', 'wifi'],
          images: ['https://example.com/tesla-model3-1.jpg'],
          rating: 4.8,
          reviewCount: 156,
          available: true,
          transmission: 'automatic',
          passengers: 5,
          luggage: 2,
          fuelType: 'electric',
          range: 350
        },
        {
          id: 'VH002',
          make: 'BMW',
          model: 'X5',
          year: 2023,
          type: 'suv',
          category: 'luxury',
          pricePerDay: 95,
          location: 'san-francisco',
          features: ['navigation', 'leather-seats', 'sunroof'],
          images: ['https://example.com/bmw-x5-1.jpg'],
          rating: 4.6,
          reviewCount: 89,
          available: true,
          transmission: 'automatic',
          passengers: 7,
          luggage: 4,
          fuelType: 'gasoline',
          mpg: 28
        },
        {
          id: 'VH003',
          make: 'Toyota',
          model: 'Camry',
          year: 2024,
          type: 'sedan',
          category: 'economy',
          pricePerDay: 65,
          location: 'san-francisco',
          features: ['bluetooth', 'backup-camera'],
          images: ['https://example.com/toyota-camry-1.jpg'],
          rating: 4.4,
          reviewCount: 203,
          available: true,
          transmission: 'automatic',
          passengers: 5,
          luggage: 2,
          fuelType: 'gasoline',
          mpg: 32
        },
        {
          id: 'VH004',
          make: 'Ford',
          model: 'Mustang',
          year: 2023,
          type: 'sports',
          category: 'premium',
          pricePerDay: 110,
          location: 'los-angeles',
          features: ['performance-package', 'premium-audio'],
          images: ['https://example.com/ford-mustang-1.jpg'],
          rating: 4.7,
          reviewCount: 142,
          available: true,
          transmission: 'manual',
          passengers: 4,
          luggage: 1,
          fuelType: 'gasoline',
          mpg: 25
        }
      ];

      // Apply filters
      let filteredVehicles = mockVehicles.filter(vehicle => {
        // Location filter
        if (location !== 'all' && vehicle.location !== location) return false;
        
        // Vehicle type filter
        if (vehicleType !== 'all' && vehicle.type !== vehicleType) return false;
        
        // Price range filter
        if (vehicle.pricePerDay < parseInt(minPrice) || vehicle.pricePerDay > parseInt(maxPrice)) return false;
        
        // Features filter
        if (features) {
          const requestedFeatures = features.split(',');
          const hasAllFeatures = requestedFeatures.every(feature => 
            vehicle.features.includes(feature.trim())
          );
          if (!hasAllFeatures) return false;
        }

        return true;
      });

      // Apply sorting
      filteredVehicles.sort((a, b) => {
        let aVal, bVal;
        switch (sortBy) {
          case 'price':
            aVal = a.pricePerDay;
            bVal = b.pricePerDay;
            break;
          case 'rating':
            aVal = a.rating;
            bVal = b.rating;
            break;
          case 'make':
            aVal = a.make;
            bVal = b.make;
            break;
          default:
            aVal = a.pricePerDay;
            bVal = b.pricePerDay;
        }

        if (sortOrder === 'desc') {
          return bVal > aVal ? 1 : -1;
        }
        return aVal > bVal ? 1 : -1;
      });

      // Apply pagination
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const endIndex = startIndex + parseInt(limit);
      const paginatedVehicles = filteredVehicles.slice(startIndex, endIndex);

      return createResponse(200, {
        vehicles: paginatedVehicles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredVehicles.length,
          totalPages: Math.ceil(filteredVehicles.length / parseInt(limit))
        },
        filters: {
          location,
          vehicleType,
          priceRange: { min: minPrice, max: maxPrice },
          features: features ? features.split(',') : []
        }
      });

    } catch (error) {
      console.error('Error searching vehicles:', error);
      return createResponse(500, {
        error: 'Failed to search vehicles',
        message: error.message
      });
    }
  },

  // Get vehicle details by ID
  'GET /vehicles/{id}': async (event) => {
    const vehicleId = event.pathParameters?.id;
    
    if (!vehicleId) {
      return createResponse(400, { error: 'Vehicle ID is required' });
    }

    try {
      // Mock vehicle detail - in production this would come from database
      const mockVehicleDetail = {
        id: vehicleId,
        make: 'Tesla',
        model: 'Model 3',
        year: 2024,
        type: 'electric',
        category: 'luxury',
        pricePerDay: 120,
        pricePerWeek: 750,
        pricePerMonth: 2800,
        location: 'san-francisco',
        locationDetails: {
          address: '123 Market St, San Francisco, CA 94103',
          coordinates: { lat: 37.7749, lng: -122.4194 },
          pickupInstructions: 'Parking level B2, Tesla charging stations area'
        },
        features: ['autopilot', 'premium-audio', 'wifi', 'heated-seats', 'navigation'],
        images: [
          'https://example.com/tesla-model3-1.jpg',
          'https://example.com/tesla-model3-2.jpg',
          'https://example.com/tesla-model3-interior.jpg'
        ],
        rating: 4.8,
        reviewCount: 156,
        available: true,
        transmission: 'automatic',
        passengers: 5,
        luggage: 2,
        fuelType: 'electric',
        range: 350,
        chargeTime: '45 minutes (Supercharger)',
        specifications: {
          acceleration: '0-60 mph in 5.8 seconds',
          topSpeed: '140 mph',
          safety: '5-Star NHTSA Safety Rating',
          technology: 'Autopilot included, Over-the-air updates'
        },
        policies: {
          minimumAge: 25,
          insurance: 'Comprehensive coverage included',
          cancellation: 'Free cancellation up to 24 hours before pickup',
          mileage: 'Unlimited mileage included'
        },
        reviews: [
          {
            id: 'R001',
            rating: 5,
            comment: 'Amazing car! Autopilot made the road trip so easy.',
            author: 'John D.',
            date: '2024-01-15',
            verified: true
          },
          {
            id: 'R002',
            rating: 4,
            comment: 'Great vehicle, very clean and well-maintained.',
            author: 'Sarah M.',
            date: '2024-01-10',
            verified: true
          }
        ]
      };

      return createResponse(200, { vehicle: mockVehicleDetail });

    } catch (error) {
      console.error('Error getting vehicle details:', error);
      return createResponse(500, {
        error: 'Failed to get vehicle details',
        message: error.message
      });
    }
  },

  // Check vehicle availability for specific dates
  'POST /vehicles/availability': async (event) => {
    const body = JSON.parse(event.body || '{}');
    const { vehicleId, startDate, endDate } = body;

    if (!vehicleId || !startDate || !endDate) {
      return createResponse(400, {
        error: 'Vehicle ID, start date, and end date are required'
      });
    }

    try {
      // Date validation
      const start = new Date(startDate);
      const end = new Date(endDate);
      const now = new Date();

      if (start >= end) {
        return createResponse(400, {
          error: 'End date must be after start date'
        });
      }

      if (start < now) {
        return createResponse(400, {
          error: 'Start date cannot be in the past'
        });
      }

      // Mock availability check - in production this would check database
      const mockBookings = [
        { startDate: '2024-01-20', endDate: '2024-01-25' },
        { startDate: '2024-02-01', endDate: '2024-02-05' }
      ];

      const isConflict = mockBookings.some(booking => {
        const bookingStart = new Date(booking.startDate);
        const bookingEnd = new Date(booking.endDate);
        
        return (start <= bookingEnd && end >= bookingStart);
      });

      const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      const pricePerDay = 120; // Would come from vehicle data
      const subtotal = duration * pricePerDay;
      const tax = subtotal * 0.08; // 8% tax
      const total = subtotal + tax;

      return createResponse(200, {
        available: !isConflict,
        vehicleId,
        startDate,
        endDate,
        duration: `${duration} ${duration === 1 ? 'day' : 'days'}`,
        pricing: {
          pricePerDay,
          duration,
          subtotal,
          tax,
          total,
          currency: 'USD'
        },
        conflictReason: isConflict ? 'Vehicle is already booked for selected dates' : null,
        alternativeDates: isConflict ? [
          { startDate: '2024-01-26', endDate: '2024-01-31' },
          { startDate: '2024-02-06', endDate: '2024-02-11' }
        ] : null
      });

    } catch (error) {
      console.error('Error checking availability:', error);
      return createResponse(500, {
        error: 'Failed to check availability',
        message: error.message
      });
    }
  },

  // Create a temporary reservation (hold)
  'POST /vehicles/reserve': async (event) => {
    const body = JSON.parse(event.body || '{}');
    const { vehicleId, startDate, endDate, customerInfo } = body;

    if (!vehicleId || !startDate || !endDate || !customerInfo) {
      return createResponse(400, {
        error: 'Vehicle ID, dates, and customer info are required'
      });
    }

    try {
      // Generate reservation ID
      const reservationId = `HOLD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Mock reservation creation - in production this would:
      // 1. Check availability again
      // 2. Create temporary reservation in database
      // 3. Set expiration timer (typically 15-30 minutes)
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      const pricePerDay = 120;
      const subtotal = duration * pricePerDay;
      const tax = subtotal * 0.08;
      const total = subtotal + tax;

      const reservation = {
        id: reservationId,
        vehicleId,
        startDate,
        endDate,
        customerInfo,
        status: 'held',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
        pricing: {
          pricePerDay,
          duration,
          subtotal,
          tax,
          total,
          currency: 'USD'
        }
      };

      return createResponse(201, {
        message: 'Vehicle reserved successfully',
        reservation,
        holdDuration: '30 minutes',
        nextStep: 'Complete verification and payment to confirm booking'
      });

    } catch (error) {
      console.error('Error creating reservation:', error);
      return createResponse(500, {
        error: 'Failed to create reservation',
        message: error.message
      });
    }
  },

  // Get reservation details
  'GET /reservations/{id}': async (event) => {
    const reservationId = event.pathParameters?.id;
    
    if (!reservationId) {
      return createResponse(400, { error: 'Reservation ID is required' });
    }

    try {
      // Mock reservation retrieval - in production would query database
      const mockReservation = {
        id: reservationId,
        vehicleId: 'VH001',
        vehicle: {
          make: 'Tesla',
          model: 'Model 3',
          year: 2024,
          image: 'https://example.com/tesla-model3-1.jpg'
        },
        startDate: '2024-01-15',
        endDate: '2024-01-20',
        customerInfo: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1-555-0123'
        },
        status: 'held',
        createdAt: '2024-01-10T10:00:00Z',
        expiresAt: '2024-01-10T10:30:00Z',
        pricing: {
          pricePerDay: 120,
          duration: 5,
          subtotal: 600,
          tax: 48,
          total: 648,
          currency: 'USD'
        }
      };

      return createResponse(200, { reservation: mockReservation });

    } catch (error) {
      console.error('Error getting reservation:', error);
      return createResponse(500, {
        error: 'Failed to get reservation',
        message: error.message
      });
    }
  },

  // Cancel a reservation
  'DELETE /reservations/{id}': async (event) => {
    const reservationId = event.pathParameters?.id;
    
    if (!reservationId) {
      return createResponse(400, { error: 'Reservation ID is required' });
    }

    try {
      // Mock reservation cancellation - in production would update database
      return createResponse(200, {
        message: 'Reservation cancelled successfully',
        reservationId,
        vehicleReleased: true
      });

    } catch (error) {
      console.error('Error cancelling reservation:', error);
      return createResponse(500, {
        error: 'Failed to cancel reservation',
        message: error.message
      });
    }
  },

  // Webhook endpoint for external verification providers
  'POST /verification/webhook': async (event) => {
    const body = JSON.parse(event.body || '{}');
    
    try {
      // In production, this would handle Veriff webhook events
      // Verify webhook signature, process the verification result
      console.log('Received verification webhook:', body);

      // Mock processing
      const { sessionId, status, decision, provider = 'veriff' } = body;
      
      // Store verification result in database
      // Send notifications to user
      // Update booking status if needed
      
      // If this is a Veriff webhook, we might trigger credit check here
      if (provider === 'veriff' && status === 'approved') {
        console.log('Veriff verification approved, could trigger credit check if needed');
      }

      return createResponse(200, {
        message: 'Webhook processed successfully',
        sessionId,
        status,
        provider
      });

    } catch (error) {
      console.error('Error processing verification webhook:', error);
      return createResponse(500, {
        error: 'Failed to process webhook',
        message: error.message
      });
    }
  },

  // Stripe Payment Integration

  // Create payment intent
  'POST /payments/create-intent': async (event) => {
    const body = JSON.parse(event.body || '{}');
    const { amount, currency = 'usd', reservationId, customerId, metadata = {} } = body;

    if (!amount || !reservationId) {
      return createResponse(400, {
        error: 'Amount and reservation ID are required'
      });
    }

    try {
      // Create payment intent with Stripe
      const paymentIntent = await getStripeClient().paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: {
          reservationId,
          customerId: customerId || 'guest',
          environment: ENVIRONMENT,
          ...metadata
        },
        capture_method: 'manual', // Manual capture for pre-authorization
        confirmation_method: 'manual',
        confirm: false,
        setup_future_usage: 'off_session', // Allow saving payment method
      });

      return createResponse(200, {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        publishableKey: thirdParty.publishableKey
      });

    } catch (error) {
      console.error('Error creating payment intent:', error);
      return createResponse(500, {
        error: 'Failed to create payment intent',
        message: error.message
      });
    }
  },

  // Confirm payment
  'POST /payments/confirm': async (event) => {
    const body = JSON.parse(event.body || '{}');
    const { paymentIntentId, paymentMethodId, returnUrl } = body;

    if (!paymentIntentId) {
      return createResponse(400, {
        error: 'Payment intent ID is required'
      });
    }

    try {
      const confirmParams = {
        payment_method: paymentMethodId,
        return_url: returnUrl || `https://${event.headers.Host}/payment/return`
      };

      const paymentIntent = await getStripeClient().paymentIntents.confirm(
        paymentIntentId,
        confirmParams
      );

      return createResponse(200, {
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          charges: paymentIntent.charges?.data || []
        },
        requiresAction: paymentIntent.status === 'requires_action',
        nextAction: paymentIntent.next_action
      });

    } catch (error) {
      console.error('Error confirming payment:', error);
      return createResponse(500, {
        error: 'Failed to confirm payment',
        message: error.message
      });
    }
  },

  // Capture payment (after successful rental)
  'POST /payments/capture': async (event) => {
    const body = JSON.parse(event.body || '{}');
    const { paymentIntentId, amountToCapture } = body;

    if (!paymentIntentId) {
      return createResponse(400, {
        error: 'Payment intent ID is required'
      });
    }

    try {
      const captureParams = {};
      if (amountToCapture) {
        captureParams.amount_to_capture = Math.round(amountToCapture * 100);
      }

      const paymentIntent = await getStripeClient().paymentIntents.capture(
        paymentIntentId,
        captureParams
      );

      return createResponse(200, {
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          amount_captured: paymentIntent.amount_captured,
          currency: paymentIntent.currency
        },
        captured: paymentIntent.status === 'succeeded'
      });

    } catch (error) {
      console.error('Error capturing payment:', error);
      return createResponse(500, {
        error: 'Failed to capture payment',
        message: error.message
      });
    }
  },

  // Get payment status
  'GET /payments/status/{paymentIntentId}': async (event) => {
    const paymentIntentId = event.pathParameters?.paymentIntentId;

    if (!paymentIntentId) {
      return createResponse(400, { error: 'Payment intent ID is required' });
    }

    try {
      const paymentIntent = await getStripeClient().paymentIntents.retrieve(paymentIntentId);

      return createResponse(200, {
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          amount_captured: paymentIntent.amount_captured,
          currency: paymentIntent.currency,
          metadata: paymentIntent.metadata,
          charges: paymentIntent.charges?.data || []
        }
      });

    } catch (error) {
      console.error('Error getting payment status:', error);
      return createResponse(500, {
        error: 'Failed to get payment status',
        message: error.message
      });
    }
  },

  // Create refund
  'POST /payments/refund': async (event) => {
    const body = JSON.parse(event.body || '{}');
    const { paymentIntentId, amount, reason = 'requested_by_customer', metadata = {} } = body;

    if (!paymentIntentId) {
      return createResponse(400, {
        error: 'Payment intent ID is required'
      });
    }

    try {
      const refundParams = {
        payment_intent: paymentIntentId,
        reason,
        metadata: {
          refundedBy: 'system',
          timestamp: new Date().toISOString(),
          ...metadata
        }
      };

      if (amount) {
        refundParams.amount = Math.round(amount * 100); // Convert to cents
      }

      const refund = await getStripeClient().refunds.create(refundParams);

      return createResponse(200, {
        refund: {
          id: refund.id,
          amount: refund.amount,
          currency: refund.currency,
          status: refund.status,
          reason: refund.reason,
          receipt_number: refund.receipt_number
        }
      });

    } catch (error) {
      console.error('Error creating refund:', error);
      return createResponse(500, {
        error: 'Failed to create refund',
        message: error.message
      });
    }
  },

  // Save payment method
  'POST /payments/methods': async (event) => {
    const body = JSON.parse(event.body || '{}');
    const { customerId, paymentMethodId, isDefault = false } = body;

    if (!customerId || !paymentMethodId) {
      return createResponse(400, {
        error: 'Customer ID and payment method ID are required'
      });
    }

    try {
      // Attach payment method to customer
      await getStripeClient().paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      // Set as default if requested
      if (isDefault) {
        await getStripeClient().customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      }

      const paymentMethod = await getStripeClient().paymentMethods.retrieve(paymentMethodId);

      return createResponse(200, {
        paymentMethod: {
          id: paymentMethod.id,
          type: paymentMethod.type,
          card: paymentMethod.card,
          created: paymentMethod.created
        },
        saved: true,
        isDefault
      });

    } catch (error) {
      console.error('Error saving payment method:', error);
      return createResponse(500, {
        error: 'Failed to save payment method',
        message: error.message
      });
    }
  },

  // List customer payment methods
  'GET /payments/methods': async (event) => {
    const customerId = event.queryStringParameters?.customerId;

    if (!customerId) {
      return createResponse(400, { error: 'Customer ID is required' });
    }

    try {
      const paymentMethods = await getStripeClient().paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return createResponse(200, {
        paymentMethods: paymentMethods.data.map(pm => ({
          id: pm.id,
          type: pm.type,
          card: pm.card,
          created: pm.created
        }))
      });

    } catch (error) {
      console.error('Error listing payment methods:', error);
      return createResponse(500, {
        error: 'Failed to list payment methods',
        message: error.message
      });
    }
  },

  // Delete payment method
  'DELETE /payments/methods': async (event) => {
    const body = JSON.parse(event.body || '{}');
    const { paymentMethodId } = body;

    if (!paymentMethodId) {
      return createResponse(400, {
        error: 'Payment method ID is required'
      });
    }

    try {
      await getStripeClient().paymentMethods.detach(paymentMethodId);

      return createResponse(200, {
        message: 'Payment method deleted successfully',
        paymentMethodId,
        deleted: true
      });

    } catch (error) {
      console.error('Error deleting payment method:', error);
      return createResponse(500, {
        error: 'Failed to delete payment method',
        message: error.message
      });
    }
  },

  // Stripe webhook handler
  'POST /payments/webhook': async (event) => {
    const sig = event.headers['stripe-signature'];
    let stripeEvent;

    try {
      stripeEvent = getStripeClient().webhooks.constructEvent(event.body, sig, thirdParty.webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return createResponse(400, { error: 'Invalid signature' });
    }

    try {
      // Handle the event
      switch (stripeEvent.type) {
        case 'payment_intent.succeeded':
          console.log('Payment succeeded:', stripeEvent.data.object);
          // Update booking status, send confirmation email, etc.
          break;

        case 'payment_intent.payment_failed':
          console.log('Payment failed:', stripeEvent.data.object);
          // Handle failed payment, notify user, etc.
          break;

        case 'payment_intent.requires_action':
          console.log('Payment requires action:', stripeEvent.data.object);
          // Handle 3D Secure or other authentication requirements
          break;

        case 'charge.dispute.created':
          console.log('Dispute created:', stripeEvent.data.object);
          // Handle dispute, notify support team, etc.
          break;

        default:
          console.log(`Unhandled event type ${stripeEvent.type}`);
      }

      return createResponse(200, { received: true });

    } catch (error) {
      console.error('Error processing webhook:', error);
      return createResponse(500, {
        error: 'Webhook processing failed',
        message: error.message
      });
    }
  },

  // Complete booking after successful payment
  'POST /bookings/complete': async (event) => {
    const body = JSON.parse(event.body || '{}');
    const { 
      paymentIntentId, 
      reservationId, 
      verificationSessionId, 
      bookingDetails 
    } = body;

    if (!paymentIntentId || !reservationId) {
      return createResponse(400, {
        error: 'Payment intent ID and reservation ID are required'
      });
    }

    try {
      // Generate booking confirmation number
      const bookingId = `BK${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      // In production, this would:
      // 1. Verify payment status with Stripe
      // 2. Update database with confirmed booking
      // 3. Send confirmation email
      // 4. Update vehicle availability
      // 5. Create booking record with all details
      
      const booking = {
        id: bookingId,
        status: 'confirmed',
        paymentIntentId,
        reservationId,
        verificationSessionId,
        customer: {
          firstName: bookingDetails.firstName || '',
          lastName: bookingDetails.lastName || '',
          email: bookingDetails.email || '',
          phone: bookingDetails.phone || ''
        },
        vehicle: {
          id: bookingDetails.car?.id || '',
          make: bookingDetails.car?.make || '',
          model: bookingDetails.car?.model || '',
          year: bookingDetails.car?.year || '',
          pricePerDay: bookingDetails.car?.pricePerDay || 0
        },
        rental: {
          pickupDate: bookingDetails.pickupDate,
          returnDate: bookingDetails.returnDate,
          pickupTime: bookingDetails.pickupTime || '10:00',
          returnTime: bookingDetails.returnTime || '10:00',
          pickupLocation: bookingDetails.pickupLocation || 'main-office',
          returnLocation: bookingDetails.returnLocation || 'main-office',
          totalDays: bookingDetails.totalDays || 1
        },
        pricing: {
          basePrice: bookingDetails.pricing?.basePrice || 0,
          insurancePrice: bookingDetails.pricing?.insurancePrice || 0,
          addOnsPrice: bookingDetails.pricing?.addOnsPrice || 0,
          taxes: bookingDetails.pricing?.taxes || 0,
          total: bookingDetails.pricing?.total || 0,
          currency: 'USD'
        },
        insurance: {
          type: bookingDetails.insuranceType || 'basic',
          coverage: bookingDetails.insuranceType === 'comprehensive' ? 'Full Coverage' : 'Basic Coverage'
        },
        addOns: bookingDetails.addOns || [],
        confirmation: {
          bookingReference: bookingId,
          confirmationCode: `${bookingId.slice(-6)}`,
          bookingDate: new Date().toISOString(),
          estimatedTotal: bookingDetails.pricing?.total || 0
        },
        policies: {
          cancellationPolicy: 'Free cancellation up to 24 hours before pickup',
          lateFees: '$50 per hour for late returns',
          fuelPolicy: 'Return with same fuel level',
          mileagePolicy: 'Unlimited mileage included'
        }
      };

      // Mock sending confirmation email
      const emailResult = {
        sent: true,
        recipient: booking.customer.email,
        confirmationNumber: booking.confirmation.confirmationCode,
        timestamp: new Date().toISOString()
      };

      return createResponse(201, {
        message: 'Booking confirmed successfully',
        booking,
        email: emailResult,
        nextSteps: [
          'Check your email for booking confirmation',
          'Bring a valid driver\'s license and credit card for pickup',
          'Arrive 15 minutes early for vehicle inspection',
          'Contact us if you need to modify your booking'
        ]
      });

    } catch (error) {
      console.error('Error completing booking:', error);
      return createResponse(500, {
        error: 'Failed to complete booking',
        message: error.message
      });
    }
  },

  // Get booking details
  'GET /bookings/{id}': async (event) => {
    const bookingId = event.pathParameters?.id;

    if (!bookingId) {
      return createResponse(400, { error: 'Booking ID is required' });
    }

    try {
      // Mock booking retrieval - in production would query database
      const mockBooking = {
        id: bookingId,
        status: 'confirmed',
        customer: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1-555-0123'
        },
        vehicle: {
          id: 'VH001',
          make: 'Tesla',
          model: 'Model 3',
          year: 2024,
          pricePerDay: 120,
          image: 'https://example.com/tesla-model3-1.jpg'
        },
        rental: {
          pickupDate: '2024-01-15',
          returnDate: '2024-01-20',
          pickupTime: '10:00',
          returnTime: '10:00',
          pickupLocation: 'main-office',
          returnLocation: 'main-office',
          totalDays: 5
        },
        pricing: {
          basePrice: 600,
          insurancePrice: 75,
          addOnsPrice: 0,
          taxes: 54,
          total: 729,
          currency: 'USD'
        },
        confirmation: {
          bookingReference: bookingId,
          confirmationCode: bookingId.slice(-6),
          bookingDate: '2024-01-10T10:00:00Z'
        }
      };

      return createResponse(200, { booking: mockBooking });

    } catch (error) {
      console.error('Error getting booking:', error);
      return createResponse(500, {
        error: 'Failed to get booking details',
        message: error.message
      });
    }
  },

  // Cancel booking
  'DELETE /bookings/{id}': async (event) => {
    const bookingId = event.pathParameters?.id;

    if (!bookingId) {
      return createResponse(400, { error: 'Booking ID is required' });
    }

    try {
      // In production, this would:
      // 1. Check cancellation policy
      // 2. Calculate refund amount
      // 3. Process refund through Stripe
      // 4. Update booking status
      // 5. Send cancellation email
      // 6. Update vehicle availability

      const cancellation = {
        bookingId,
        status: 'cancelled',
        refundAmount: 729.00, // Would be calculated based on policy
        refundMethod: 'original_payment_method',
        cancellationFee: 0,
        estimatedRefundDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days
        cancellationReason: 'customer_request',
        processedAt: new Date().toISOString()
      };

      return createResponse(200, {
        message: 'Booking cancelled successfully',
        cancellation
      });

    } catch (error) {
      console.error('Error cancelling booking:', error);
      return createResponse(500, {
        error: 'Failed to cancel booking',
        message: error.message
      });
    }
  },

  // =============================================
  // ADMIN DASHBOARD SYSTEM
  // =============================================

  // Admin authentication and role verification
  verifyAdminRole: (userAttributes, requiredRole) => {
    const userRole = userAttributes['custom:role'] || 'customer';
    const roles = {
      'super-admin': 3,
      'fleet-manager': 2,
      'agent': 1,
      'customer': 0
    };
    
    return roles[userRole] >= roles[requiredRole];
  },

  // Get admin user info from Cognito token
  getAdminUserInfo: async (event) => {
    try {
      const authHeader = event.headers.Authorization || event.headers.authorization;
      if (!authHeader) {
        throw new Error('No authorization header');
      }

      const token = authHeader.replace('Bearer ', '');
      const userInfo = await cognito.getUser({
        AccessToken: token
      }).promise();

      const attributes = {};
      userInfo.UserAttributes.forEach(attr => {
        attributes[attr.Name] = attr.Value;
      });

      return {
        username: userInfo.Username,
        email: attributes.email,
        role: attributes['custom:role'] || 'customer',
        firstName: attributes.given_name || '',
        lastName: attributes.family_name || '',
        attributes
      };
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  },

  // Admin Dashboard Overview
  'GET /admin/dashboard': async (event) => {
    try {
      const userInfo = await handlers.getAdminUserInfo(event);
      
      if (!handlers.verifyAdminRole(userInfo.attributes, 'agent')) {
        return createResponse(403, { error: 'Insufficient permissions' });
      }

      // Mock dashboard data - in production would query real database
      const dashboardData = {
        overview: {
          totalBookings: 1247,
          activeBookings: 89,
          totalRevenue: 156780.50,
          totalVehicles: 156,
          availableVehicles: 134,
          pendingVerifications: 23,
          flaggedUsers: 7,
          systemHealth: 'healthy'
        },
        recentActivity: [
          {
            id: 'ACT001',
            type: 'booking_created',
            user: 'john.doe@email.com',
            vehicle: 'Tesla Model 3 - VH001',
            amount: 450.00,
            timestamp: new Date(Date.now() - 30000).toISOString()
          },
          {
            id: 'ACT002',
            type: 'verification_completed',
            user: 'jane.smith@email.com',
            status: 'approved',
            score: 89,
            timestamp: new Date(Date.now() - 120000).toISOString()
          },
          {
            id: 'ACT003',
            type: 'payment_processed',
            user: 'mike.wilson@email.com',
            amount: 320.00,
            method: 'apple_pay',
            timestamp: new Date(Date.now() - 180000).toISOString()
          }
        ],
        alerts: [
          {
            id: 'ALT001',
            type: 'high_risk_booking',
            message: 'Booking BK12345 requires manual review - risk score 45',
            severity: 'warning',
            timestamp: new Date(Date.now() - 300000).toISOString()
          },
          {
            id: 'ALT002',
            type: 'verification_failed',
            message: 'Identity verification failed for user ID UV67890',
            severity: 'info',
            timestamp: new Date(Date.now() - 600000).toISOString()
          }
        ],
        userRole: userInfo.role,
        permissions: {
          canManageUsers: handlers.verifyAdminRole(userInfo.attributes, 'super-admin'),
          canManageVehicles: handlers.verifyAdminRole(userInfo.attributes, 'fleet-manager'),
          canViewFinancials: handlers.verifyAdminRole(userInfo.attributes, 'fleet-manager'),
          canManageBookings: handlers.verifyAdminRole(userInfo.attributes, 'agent'),
          canViewAnalytics: handlers.verifyAdminRole(userInfo.attributes, 'agent')
        }
      };

      return createResponse(200, dashboardData);

    } catch (error) {
      console.error('Error getting admin dashboard:', error);
      return createResponse(500, {
        error: 'Failed to load dashboard',
        message: error.message
      });
    }
  },

  // User Management (Super Admin only)
  'GET /admin/users': async (event) => {
    try {
      const userInfo = await handlers.getAdminUserInfo(event);
      
      if (!handlers.verifyAdminRole(userInfo.attributes, 'super-admin')) {
        return createResponse(403, { error: 'Super Admin access required' });
      }

      const queryParams = event.queryStringParameters || {};
      const { status = 'all', role = 'all', page = 1, limit = 20 } = queryParams;

      // Mock user data - in production would query Cognito User Pool
      const mockUsers = [
        {
          id: 'user-001',
          username: 'john.doe',
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'customer',
          status: 'active',
          verificationStatus: 'verified',
          verificationScore: 92,
          joinDate: '2024-01-15T10:00:00Z',
          lastActivity: '2024-01-20T14:30:00Z',
          totalBookings: 12,
          totalSpent: 2450.00,
          riskLevel: 'low'
        },
        {
          id: 'user-002',
          username: 'jane.smith',
          email: 'jane.smith@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'customer',
          status: 'active',
          verificationStatus: 'pending',
          verificationScore: null,
          joinDate: '2024-01-18T09:15:00Z',
          lastActivity: '2024-01-20T16:45:00Z',
          totalBookings: 0,
          totalSpent: 0,
          riskLevel: 'unknown'
        },
        {
          id: 'admin-001',
          username: 'admin.user',
          email: 'admin@aicarrental.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'super-admin',
          status: 'active',
          verificationStatus: 'verified',
          verificationScore: 100,
          joinDate: '2024-01-01T00:00:00Z',
          lastActivity: '2024-01-20T18:00:00Z',
          totalBookings: 0,
          totalSpent: 0,
          riskLevel: 'verified_admin'
        }
      ];

      // Apply filters
      let filteredUsers = mockUsers;
      if (status !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.status === status);
      }
      if (role !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.role === role);
      }

      // Pagination
      const startIndex = (page - 1) * limit;
      const paginatedUsers = filteredUsers.slice(startIndex, startIndex + limit);

      return createResponse(200, {
        users: paginatedUsers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(filteredUsers.length / limit),
          totalUsers: filteredUsers.length,
          limit: parseInt(limit)
        },
        filters: { status, role }
      });

    } catch (error) {
      console.error('Error getting users:', error);
      return createResponse(500, {
        error: 'Failed to load users',
        message: error.message
      });
    }
  },

  // Vehicle Management (Fleet Manager and above)
  'GET /admin/vehicles': async (event) => {
    try {
      const userInfo = await handlers.getAdminUserInfo(event);
      
      if (!handlers.verifyAdminRole(userInfo.attributes, 'fleet-manager')) {
        return createResponse(403, { error: 'Fleet Manager access required' });
      }

      const queryParams = event.queryStringParameters || {};
      const { status = 'all', location = 'all', page = 1, limit = 20 } = queryParams;

      // Mock vehicle data with management information
      const mockVehicles = [
        {
          id: 'VH001',
          make: 'Tesla',
          model: 'Model 3',
          year: 2024,
          vin: '5YJ3E1EA9LF123456',
          licensePlate: 'CA-ABC123',
          status: 'available',
          location: 'san-francisco',
          mileage: 15420,
          batteryLevel: 89, // for electric vehicles
          lastInspection: '2024-01-15T10:00:00Z',
          nextMaintenance: '2024-02-15T10:00:00Z',
          totalBookings: 47,
          totalRevenue: 8940.00,
          averageRating: 4.8,
          currentBooking: null,
          damageReports: [
            {
              id: 'DMG001',
              type: 'minor_scratch',
              location: 'rear_bumper',
              severity: 'cosmetic',
              reportDate: '2024-01-10T14:30:00Z',
              repairStatus: 'scheduled',
              cost: 150.00
            }
          ],
          maintenanceHistory: [
            {
              id: 'MAINT001',
              type: 'routine_service',
              description: 'Oil change and inspection',
              date: '2024-01-15T10:00:00Z',
              cost: 120.00,
              mileage: 15000
            }
          ]
        },
        {
          id: 'VH002',
          make: 'BMW',
          model: '330i',
          year: 2023,
          vin: 'WBA8E9G59LNT12345',
          licensePlate: 'CA-XYZ789',
          status: 'rented',
          location: 'los-angeles',
          mileage: 8750,
          fuelLevel: 65,
          lastInspection: '2024-01-20T11:00:00Z',
          nextMaintenance: '2024-03-01T10:00:00Z',
          totalBookings: 23,
          totalRevenue: 4560.00,
          averageRating: 4.6,
          currentBooking: {
            id: 'BK789012',
            customer: 'john.doe@example.com',
            startDate: '2024-01-20T10:00:00Z',
            endDate: '2024-01-22T10:00:00Z',
            status: 'active'
          },
          damageReports: [],
          maintenanceHistory: [
            {
              id: 'MAINT002',
              type: 'tire_rotation',
              description: 'Tire rotation and brake inspection',
              date: '2024-01-20T11:00:00Z',
              cost: 85.00,
              mileage: 8500
            }
          ]
        }
      ];

      // Apply filters
      let filteredVehicles = mockVehicles;
      if (status !== 'all') {
        filteredVehicles = filteredVehicles.filter(vehicle => vehicle.status === status);
      }
      if (location !== 'all') {
        filteredVehicles = filteredVehicles.filter(vehicle => vehicle.location === location);
      }

      // Pagination
      const startIndex = (page - 1) * limit;
      const paginatedVehicles = filteredVehicles.slice(startIndex, startIndex + limit);

      return createResponse(200, {
        vehicles: paginatedVehicles,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(filteredVehicles.length / limit),
          totalVehicles: filteredVehicles.length,
          limit: parseInt(limit)
        },
        filters: { status, location },
        summary: {
          available: mockVehicles.filter(v => v.status === 'available').length,
          rented: mockVehicles.filter(v => v.status === 'rented').length,
          maintenance: mockVehicles.filter(v => v.status === 'maintenance').length,
          totalRevenue: mockVehicles.reduce((sum, v) => sum + v.totalRevenue, 0)
        }
      });

    } catch (error) {
      console.error('Error getting vehicles:', error);
      return createResponse(500, {
        error: 'Failed to load vehicles',
        message: error.message
      });
    }
  },

  // Booking Management (Agent and above)
  'GET /admin/bookings': async (event) => {
    try {
      const userInfo = await handlers.getAdminUserInfo(event);
      
      if (!handlers.verifyAdminRole(userInfo.attributes, 'agent')) {
        return createResponse(403, { error: 'Agent access required' });
      }

      const queryParams = event.queryStringParameters || {};
      const { status = 'all', dateRange = 'week', page = 1, limit = 20 } = queryParams;

      // Mock booking data with management information
      const mockBookings = [
        {
          id: 'BK789012',
          bookingReference: 'ACR789012',
          customer: {
            id: 'user-001',
            name: 'John Doe',
            email: 'john.doe@example.com',
            phone: '+1-555-0123'
          },
          vehicle: {
            id: 'VH001',
            make: 'Tesla',
            model: 'Model 3',
            year: 2024,
            licensePlate: 'CA-ABC123'
          },
          rental: {
            startDate: '2024-01-22T10:00:00Z',
            endDate: '2024-01-25T10:00:00Z',
            pickupLocation: 'San Francisco Airport',
            returnLocation: 'San Francisco Airport',
            totalDays: 3
          },
          pricing: {
            basePrice: 360.00,
            insurance: 45.00,
            taxes: 32.40,
            total: 437.40,
            currency: 'USD'
          },
          status: 'confirmed',
          paymentStatus: 'paid',
          verificationStatus: 'approved',
          verificationScore: 92,
          riskLevel: 'low',
          createdAt: '2024-01-20T14:30:00Z',
          updatedAt: '2024-01-20T14:35:00Z',
          notes: [],
          flags: []
        },
        {
          id: 'BK789013',
          bookingReference: 'ACR789013',
          customer: {
            id: 'user-002',
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            phone: '+1-555-0456'
          },
          vehicle: {
            id: 'VH002',
            make: 'BMW',
            model: '330i',
            year: 2023,
            licensePlate: 'CA-XYZ789'
          },
          rental: {
            startDate: '2024-01-21T14:00:00Z',
            endDate: '2024-01-23T14:00:00Z',
            pickupLocation: 'Los Angeles Downtown',
            returnLocation: 'Los Angeles Downtown',
            totalDays: 2
          },
          pricing: {
            basePrice: 240.00,
            insurance: 30.00,
            taxes: 21.60,
            total: 291.60,
            currency: 'USD'
          },
          status: 'active',
          paymentStatus: 'paid',
          verificationStatus: 'pending',
          verificationScore: null,
          riskLevel: 'medium',
          createdAt: '2024-01-20T16:45:00Z',
          updatedAt: '2024-01-21T10:00:00Z',
          notes: [
            {
              id: 'NOTE001',
              author: 'agent.user',
              content: 'Customer verification still pending - monitoring for completion',
              timestamp: '2024-01-21T10:00:00Z'
            }
          ],
          flags: [
            {
              id: 'FLAG001',
              type: 'verification_pending',
              message: 'Identity verification not completed',
              severity: 'warning',
              timestamp: '2024-01-21T10:00:00Z'
            }
          ]
        }
      ];

      // Apply filters
      let filteredBookings = mockBookings;
      if (status !== 'all') {
        filteredBookings = filteredBookings.filter(booking => booking.status === status);
      }

      // Date range filter (simplified)
      const now = new Date();
      if (dateRange === 'day') {
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        filteredBookings = filteredBookings.filter(booking => 
          new Date(booking.createdAt) >= dayAgo
        );
      } else if (dateRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredBookings = filteredBookings.filter(booking => 
          new Date(booking.createdAt) >= weekAgo
        );
      }

      // Pagination
      const startIndex = (page - 1) * limit;
      const paginatedBookings = filteredBookings.slice(startIndex, startIndex + limit);

      return createResponse(200, {
        bookings: paginatedBookings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(filteredBookings.length / limit),
          totalBookings: filteredBookings.length,
          limit: parseInt(limit)
        },
        filters: { status, dateRange },
        summary: {
          total: mockBookings.length,
          confirmed: mockBookings.filter(b => b.status === 'confirmed').length,
          active: mockBookings.filter(b => b.status === 'active').length,
          completed: mockBookings.filter(b => b.status === 'completed').length,
          cancelled: mockBookings.filter(b => b.status === 'cancelled').length,
          totalRevenue: mockBookings.reduce((sum, b) => sum + b.pricing.total, 0),
          pendingVerifications: mockBookings.filter(b => b.verificationStatus === 'pending').length
        }
      });

    } catch (error) {
      console.error('Error getting bookings:', error);
      return createResponse(500, {
        error: 'Failed to load bookings',
        message: error.message
      });
    }
  },

  // Financial Analytics (Fleet Manager and above)
  'GET /admin/analytics/financial': async (event) => {
    try {
      const userInfo = await handlers.getAdminUserInfo(event);
      
      if (!handlers.verifyAdminRole(userInfo.attributes, 'fleet-manager')) {
        return createResponse(403, { error: 'Fleet Manager access required' });
      }

      const queryParams = event.queryStringParameters || {};
      const { period = 'month', year = new Date().getFullYear() } = queryParams;

      // Mock financial analytics data
      const analyticsData = {
        summary: {
          totalRevenue: 156780.50,
          totalBookings: 1247,
          averageBookingValue: 125.78,
          revenueGrowth: 12.5, // percentage
          bookingGrowth: 8.3,
          topPerformingVehicle: 'Tesla Model 3',
          totalRefunds: 2340.00,
          netRevenue: 154440.50
        },
        revenueByMonth: [
          { month: 'Jan', revenue: 12450.00, bookings: 98 },
          { month: 'Feb', revenue: 15780.50, bookings: 124 },
          { month: 'Mar', revenue: 18920.00, bookings: 149 },
          { month: 'Apr', revenue: 16340.25, bookings: 132 },
          { month: 'May', revenue: 19580.75, bookings: 156 },
          { month: 'Jun', revenue: 21240.00, bookings: 168 },
          { month: 'Jul', revenue: 23650.00, bookings: 187 },
          { month: 'Aug', revenue: 20180.50, bookings: 159 },
          { month: 'Sep', revenue: 18970.25, bookings: 148 },
          { month: 'Oct', revenue: 17850.00, bookings: 142 },
          { month: 'Nov', revenue: 15980.75, bookings: 126 },
          { month: 'Dec', revenue: 13840.25, bookings: 109 }
        ],
        paymentMethods: [
          { method: 'Credit Card', percentage: 65.2, amount: 102280.50 },
          { method: 'Apple Pay', percentage: 18.7, percentage: 29320.14 },
          { method: 'Google Pay', percentage: 12.1, amount: 18970.82 },
          { method: 'Other', percentage: 4.0, amount: 6209.04 }
        ],
        vehiclePerformance: [
          {
            vehicleId: 'VH001',
            make: 'Tesla',
            model: 'Model 3',
            totalRevenue: 8940.00,
            totalBookings: 47,
            averageRating: 4.8,
            utilizationRate: 78.5
          },
          {
            vehicleId: 'VH002',
            make: 'BMW',
            model: '330i',
            totalRevenue: 4560.00,
            totalBookings: 23,
            averageRating: 4.6,
            utilizationRate: 65.3
          }
        ],
        refundsAndDisputes: {
          totalRefunds: 2340.00,
          refundRate: 1.49, // percentage
          averageRefundAmount: 78.00,
          disputeRate: 0.32,
          resolvedDisputes: 98.5 // percentage
        }
      };

      return createResponse(200, analyticsData);

    } catch (error) {
      console.error('Error getting financial analytics:', error);
      return createResponse(500, {
        error: 'Failed to load financial analytics',
        message: error.message
      });
    }
  },

  // System Health Monitoring (Agent and above)
  'GET /admin/system/health': async (event) => {
    try {
      const userInfo = await handlers.getAdminUserInfo(event);
      
      if (!handlers.verifyAdminRole(userInfo.attributes, 'agent')) {
        return createResponse(403, { error: 'Agent access required' });
      }

      // Mock system health data
      const healthData = {
        overall: {
          status: 'healthy',
          uptime: '99.98%',
          lastIncident: '2024-01-15T03:22:00Z',
          activeAlerts: 2
        },
        services: [
          {
            name: 'API Gateway',
            status: 'healthy',
            responseTime: 145, // ms
            errorRate: 0.02, // percentage
            lastCheck: new Date().toISOString()
          },
          {
            name: 'Authentication Service',
            status: 'healthy',
            responseTime: 89,
            errorRate: 0.01,
            lastCheck: new Date().toISOString()
          },
          {
            name: 'Payment Processing',
            status: 'healthy',
            responseTime: 234,
            errorRate: 0.05,
            lastCheck: new Date().toISOString()
          },
          {
            name: 'Verification Service',
            status: 'warning',
            responseTime: 567,
            errorRate: 1.2,
            lastCheck: new Date().toISOString(),
            issue: 'Slightly elevated response times'
          },
          {
            name: 'Database',
            status: 'healthy',
            responseTime: 23,
            errorRate: 0.00,
            lastCheck: new Date().toISOString()
          },
          {
            name: 'File Storage',
            status: 'healthy',
            responseTime: 178,
            errorRate: 0.03,
            lastCheck: new Date().toISOString()
          }
        ],
        performance: {
          averageResponseTime: 204, // ms
          requestsPerMinute: 1247,
          peakRequestsPerMinute: 3456,
          cpuUsage: 23.5, // percentage
          memoryUsage: 67.8,
          diskUsage: 45.2
        },
        alerts: [
          {
            id: 'ALT003',
            type: 'performance',
            service: 'Verification Service',
            message: 'Response time above normal threshold',
            severity: 'warning',
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            acknowledged: false
          },
          {
            id: 'ALT004',
            type: 'security',
            service: 'API Gateway',
            message: 'Unusual traffic pattern detected',
            severity: 'info',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            acknowledged: true
          }
        ],
        metrics: {
          dailyRequests: 45672,
          successfulRequests: 45589,
          failedRequests: 83,
          averageUserSessions: 234,
          peakConcurrentUsers: 567
        }
      };

      return createResponse(200, healthData);

    } catch (error) {
      console.error('Error getting system health:', error);
      return createResponse(500, {
        error: 'Failed to load system health',
        message: error.message
      });
    }
  }
};

// Main Lambda handler
exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, {});
    }

    await ensureThirdPartyConfig(secretsManager);

    // Authenticate request
    const authResult = await authHelpers.authenticate(event);
    if (!authResult.authenticated) {
      return createResponse(401, { 
        error: 'Unauthorized', 
        message: authResult.error 
      });
    }

    // Add user info to event for handlers to use
    event.user = authResult.user;

    // Create route key using actual path (not resource template)
    const method = event.httpMethod;
    const path = event.path;
    const routeKey = `${method} ${path}`;
    
    console.log('Route key:', routeKey);
    console.log('User:', authResult.user ? authResult.user.sub : 'public');

    // Find handler
    const handler = handlers[routeKey];
    if (!handler) {
      return createResponse(404, { error: 'Route not found', route: routeKey });
    }

    // Execute handler
    return await handler(event, context);
    
  } catch (error) {
    console.error('Lambda error:', error);
    return createResponse(500, { 
      error: 'Internal server error',
      message: error.message 
    });
  }
};