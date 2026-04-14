import type {
  AQIPredictionRequest,
  AQIPredictionResponse,
  ExplainResponse,
  CompareResponse,
  AQIClassInfo,
  HealthAdviceResponse,
  ModelInfo,
} from '../types/api'

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error((err as { detail?: string }).detail ?? 'Request failed')
  }
  return res.json() as Promise<T>
}

export const api = {
  health: () => request<{ status: string }>('/health'),

  modelInfo: () => request<ModelInfo>('/model/info'),

  aqiClasses: () => request<Record<string, AQIClassInfo>>('/aqi/classes'),

  healthAdvice: (aqiClass: string) =>
    request<HealthAdviceResponse>(`/health/advice/${encodeURIComponent(aqiClass)}`),

  predict: (body: AQIPredictionRequest) =>
    request<AQIPredictionResponse>('/predict', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  predictExplain: (body: AQIPredictionRequest) =>
    request<ExplainResponse>('/predict/explain', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  predictBatch: (body: AQIPredictionRequest[]) =>
    request<AQIPredictionResponse[]>('/predict/batch', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  compare: (location_a: AQIPredictionRequest, location_b: AQIPredictionRequest) =>
    request<CompareResponse>('/compare', {
      method: 'POST',
      body: JSON.stringify({ location_a, location_b }),
    }),
}
