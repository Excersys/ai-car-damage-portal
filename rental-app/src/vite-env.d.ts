/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_ENV: string
  readonly VITE_USER_POOL_ID: string
  readonly VITE_USER_POOL_CLIENT_ID: string
  readonly VITE_AWS_REGION: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string
  /** Base URL for tunnel Review API (e.g. https://xxx.execute-api.region.amazonaws.com/v1) */
  readonly VITE_TUNNEL_REVIEW_API_BASE_URL?: string
  /** API Gateway key for TunnelDamageDetectionAPI */
  readonly VITE_TUNNEL_REVIEW_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
