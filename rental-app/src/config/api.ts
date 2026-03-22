// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  TIMEOUT: 10000,
  HEADERS: {
    'Content-Type': 'application/json',
  },
};

// AWS Cognito Configuration
export const COGNITO_CONFIG = {
  USER_POOL_ID: import.meta.env.VITE_USER_POOL_ID || '',
  USER_POOL_CLIENT_ID: import.meta.env.VITE_USER_POOL_CLIENT_ID || '',
  REGION: import.meta.env.VITE_AWS_REGION || 'us-east-1',
};

// Environment
export const ENV = import.meta.env.VITE_APP_ENV || 'development';

// Helper function to create full API URL
export const createApiUrl = (endpoint: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  // Ensure base URL doesn't end with slash
  const baseUrl = API_CONFIG.BASE_URL.endsWith('/') 
    ? API_CONFIG.BASE_URL.slice(0, -1) 
    : API_CONFIG.BASE_URL;
  
  return `${baseUrl}/${cleanEndpoint}`;
};

// Axios instance configuration
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - could redirect to login
      localStorage.removeItem('authToken');
      // You might want to redirect to login page here
    }
    return Promise.reject(error);
  }
);