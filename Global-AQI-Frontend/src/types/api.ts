export interface AQIPredictionRequest {
  City: string
  DayOfWeek: string
  Latitude: number
  Longitude: number
  PM2_5: number
  PM10: number
  NO2: number
  SO2: number
  CO: number
  Ozone: number
  Aerosol_Optical_Depth: number
}

export interface AQIPredictionResponse {
  predicted_class: string
  probabilities: Record<string, number>
}

export interface FeatureContribution {
  feature: string
  importance: number
}

export interface ExplainResponse extends AQIPredictionResponse {
  top_features: FeatureContribution[]
}

export interface CompareResult {
  location: string
  predicted_class: string
  probabilities: Record<string, number>
  aqi_color: string
}

export interface CompareResponse {
  results: CompareResult[]
  cleaner_location: string
  summary: string
}

export interface AQIClassInfo {
  color: string
  aqi_range: string
  description: string
}

export interface HealthAdviceResponse {
  aqi_class: string
  color: string
  aqi_range: string
  description: string
  general_advice: string
  sensitive_groups_advice: string
}

export interface ModelInfo {
  model_type: string
  api_version: string
  n_estimators: number
  categorical_features: string[]
  numerical_features: string[]
  target_classes: string[]
  total_features: number
}
