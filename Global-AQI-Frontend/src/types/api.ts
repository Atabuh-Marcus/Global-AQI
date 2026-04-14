// ─── Request types ─────────────────────────────────────────────────────────────

/**
 * Payload sent to /predict, /predict/explain, and used inside /compare.
 * Field names mirror the Pydantic model on the backend.
 * Note: PM2_5 here maps to "PM2.5" in the training dataset (dots are invalid
 * in Python identifiers, so the backend uses an underscore and remaps in _build_row).
 */
export interface AQIPredictionRequest {
  City: string
  DayOfWeek: string   // Must be one of the seven English day names
  Latitude: number
  Longitude: number
  PM2_5: number       // Fine particulate matter (μg/m³)
  PM10: number        // Coarse particulate matter (μg/m³)
  NO2: number         // Nitrogen dioxide (ppb)
  SO2: number         // Sulfur dioxide (ppb)
  CO: number          // Carbon monoxide (ppm)
  Ozone: number       // Ground-level ozone (ppb)
  Aerosol_Optical_Depth: number  // Dimensionless measure of atmospheric aerosols
}

// ─── Response types ────────────────────────────────────────────────────────────

/**
 * Base prediction result returned by /predict and /predict/batch.
 * probabilities is a map from class name → confidence score (0–1), summing to 1.
 */
export interface AQIPredictionResponse {
  predicted_class: string
  probabilities: Record<string, number>
}

/**
 * A single feature with its global RandomForest importance score.
 * importance values across all features in the model sum to 1.
 */
export interface FeatureContribution {
  feature: string     // Human-friendly display name (e.g. "PM2.5 (Fine Particles)")
  importance: number  // Fraction of total importance (0–1)
}

/**
 * Extended response from /predict/explain.
 * Inherits predicted_class and probabilities from AQIPredictionResponse,
 * and adds the top 5 features that most influenced the prediction.
 */
export interface ExplainResponse extends AQIPredictionResponse {
  top_features: FeatureContribution[]
}

/**
 * Prediction result for one location within a /compare response.
 * aqi_color is the hex colour code for the predicted class (e.g. "#00e400" for Good).
 */
export interface CompareResult {
  location: string          // e.g. "Location A (Lahore, Pakistan)"
  predicted_class: string
  probabilities: Record<string, number>
  aqi_color: string         // Hex colour for UI badge rendering
}

/**
 * Full response from /compare.
 * results holds one CompareResult per location (always 2 items).
 * cleaner_location repeats the location string of the lower-ranked AQI class.
 * summary is a ready-to-display sentence describing the comparison outcome.
 */
export interface CompareResponse {
  results: CompareResult[]
  cleaner_location: string
  summary: string
}

// ─── Reference data types ──────────────────────────────────────────────────────

/**
 * Metadata for a single AQI class returned by /aqi/classes.
 * The full set is keyed by class name: Record<string, AQIClassInfo>.
 */
export interface AQIClassInfo {
  color: string       // Hex colour code matching the official AQI colour scale
  aqi_range: string   // Numeric AQI range as a display string (e.g. "0–50")
  description: string // One-sentence description of this air quality level
}

/**
 * Full health advice payload returned by /health/advice/{aqi_class}.
 * Includes both general public and sensitive-groups recommendations.
 */
export interface HealthAdviceResponse {
  aqi_class: string
  color: string
  aqi_range: string
  description: string
  general_advice: string          // Recommendation for the general population
  sensitive_groups_advice: string // Stricter advice for children, elderly, people with conditions
}

/**
 * Model metadata returned by /model/info.
 * Provides details about the trained RandomForest and the features it uses.
 */
export interface ModelInfo {
  model_type: string              // sklearn class name, e.g. "RandomForestClassifier"
  api_version: string
  n_estimators: number            // Number of decision trees in the forest
  categorical_features: string[]  // Features encoded with OneHotEncoder (City, DayOfWeek)
  numerical_features: string[]    // Features scaled with StandardScaler (pollutants, lat/lon)
  target_classes: string[]        // The five AQI class labels the model predicts
  total_features: number          // categorical + numerical feature count
}
