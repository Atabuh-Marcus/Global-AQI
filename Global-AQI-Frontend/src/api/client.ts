// Import only types — no runtime cost, purely for TypeScript checking
import type {
  AQIPredictionRequest,
  AQIPredictionResponse,
  ExplainResponse,
  CompareResponse,
  AQIClassInfo,
  HealthAdviceResponse,
  ModelInfo,
} from '../types/api'

// ─── Base URL ─────────────────────────────────────────────────────────────────
// Vite replaces import.meta.env.VITE_API_URL at build time if a .env file sets it.
// Falls back to localhost:8000 for local development without any extra configuration.
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

// ─── Core fetch wrapper ────────────────────────────────────────────────────────
/**
 * Generic typed fetch helper used by every API call below.
 * - Automatically sets Content-Type: application/json on every request.
 * - On non-2xx responses, parses the FastAPI error detail and throws an Error
 *   so calling code only needs a single catch block.
 * - T is inferred from the call site (e.g. request<ModelInfo>) — no casts needed.
 */
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,  // method, body, etc. spread on top of the default header
  })
  if (!res.ok) {
    // FastAPI returns { detail: "..." } for 4xx/5xx — extract it for readable errors
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error((err as { detail?: string }).detail ?? 'Request failed')
  }
  return res.json() as Promise<T>
}

// ─── API surface ───────────────────────────────────────────────────────────────
/**
 * Centralised API client. All components import from here so the base URL and
 * fetch logic live in one place.
 */
export const api = {
  /** GET /health — liveness check polled on app startup */
  health: () => request<{ status: string }>('/health'),

  /** GET /model/info — RandomForest metadata for the Model Info tab */
  modelInfo: () => request<ModelInfo>('/model/info'),

  /** GET /aqi/classes — colour + description for each AQI class */
  aqiClasses: () => request<Record<string, AQIClassInfo>>('/aqi/classes'),

  /**
   * GET /health/advice/{aqi_class}
   * encodeURIComponent handles the space in "Unhealthy for Sensitive"
   */
  healthAdvice: (aqiClass: string) =>
    request<HealthAdviceResponse>(`/health/advice/${encodeURIComponent(aqiClass)}`),

  /** POST /predict — single-location AQI classification */
  predict: (body: AQIPredictionRequest) =>
    request<AQIPredictionResponse>('/predict', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  /** POST /predict/explain — same as predict but also returns top 5 feature importances */
  predictExplain: (body: AQIPredictionRequest) =>
    request<ExplainResponse>('/predict/explain', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  /**
   * POST /predict/batch — classify up to 100 locations in one round-trip.
   * The backend validates and preprocesses all rows together, so this is
   * much more efficient than calling predict() in a loop.
   */
  predictBatch: (body: AQIPredictionRequest[]) =>
    request<AQIPredictionResponse[]>('/predict/batch', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  /**
   * POST /compare — side-by-side classification of two locations.
   * Wraps both requests in the { location_a, location_b } envelope the backend expects.
   */
  compare: (location_a: AQIPredictionRequest, location_b: AQIPredictionRequest) =>
    request<CompareResponse>('/compare', {
      method: 'POST',
      body: JSON.stringify({ location_a, location_b }),
    }),
}
