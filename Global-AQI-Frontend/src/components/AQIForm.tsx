import type { AQIPredictionRequest } from '../types/api'

// Valid options for the DayOfWeek dropdown — must match VALID_DAYS in the backend
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/**
 * Pre-filled example values based on Lahore, Pakistan — one of the most polluted
 * cities in the training dataset. Used as the initial form state in PredictTab,
 * ExplainTab, and Location A of CompareTab so users can immediately hit "Predict"
 * without having to enter data from scratch.
 */
export const DEFAULT_VALUES: AQIPredictionRequest = {
  City: 'Lahore, Pakistan',
  DayOfWeek: 'Monday',
  Latitude: 31.5497,
  Longitude: 74.3436,
  PM2_5: 85.0,
  PM10: 120.0,
  NO2: 40.0,
  SO2: 15.0,
  CO: 1.2,
  Ozone: 55.0,
  Aerosol_Optical_Depth: 0.8,
}

interface Props {
  values: AQIPredictionRequest   // Current field values — controlled from parent state
  onChange: (v: AQIPredictionRequest) => void  // Called with the updated full object on every change
  label?: string  // Optional heading shown inside the form card (used in CompareTab: "Location A/B")
}

/**
 * Reusable controlled form that renders all 11 AQI prediction fields.
 * Parent components own the state; this component only calls onChange.
 * Keeping state in the parent makes it easy for CompareTab to read both forms
 * and pass them together to the API in a single call.
 */
export function AQIForm({ values, onChange, label }: Props) {
  /**
   * Generic field-change handler.
   * Numeric fields are parsed with parseFloat; falls back to 0 on empty/invalid input
   * so the request object always contains a number, never NaN or a string.
   */
  const set = (key: keyof AQIPredictionRequest, raw: string) => {
    const numericKeys: (keyof AQIPredictionRequest)[] = [
      'Latitude', 'Longitude', 'PM2_5', 'PM10', 'NO2', 'SO2', 'CO', 'Ozone', 'Aerosol_Optical_Depth',
    ]
    onChange({
      ...values,           // spread existing values so only the changed key is updated
      [key]: numericKeys.includes(key) ? parseFloat(raw) || 0 : raw,
    })
  }

  // Shared Tailwind class strings kept as variables to avoid repetition across all inputs
  const inputCls =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
  const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1'

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      {/* Optional section heading, e.g. "Location A" in the CompareTab */}
      {label && <p className="mb-3 text-sm font-bold text-slate-600">{label}</p>}

      {/* 2-column grid; individual fields span 2 columns when they need full width */}
      <div className="grid grid-cols-2 gap-3">
        {/* City — text input, spans full width */}
        <div className="col-span-2">
          <label className={labelCls}>City</label>
          <input className={inputCls} value={values.City} onChange={e => set('City', e.target.value)} />
        </div>

        {/* Day of Week — <select> constrained to VALID_DAYS to prevent backend 422 errors */}
        <div>
          <label className={labelCls}>Day of Week</label>
          <select
            className={inputCls}
            value={values.DayOfWeek}
            onChange={e => set('DayOfWeek', e.target.value)}
          >
            {DAYS.map(d => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Geographic coordinates — step="any" allows fractional values */}
        <div>
          <label className={labelCls}>Latitude</label>
          <input type="number" step="any" className={inputCls} value={values.Latitude} onChange={e => set('Latitude', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Longitude</label>
          <input type="number" step="any" className={inputCls} value={values.Longitude} onChange={e => set('Longitude', e.target.value)} />
        </div>

        {/* Pollutant concentration inputs — units shown in the label */}
        <div>
          <label className={labelCls}>PM2.5 (μg/m³)</label>
          <input type="number" step="any" className={inputCls} value={values.PM2_5} onChange={e => set('PM2_5', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>PM10 (μg/m³)</label>
          <input type="number" step="any" className={inputCls} value={values.PM10} onChange={e => set('PM10', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>NO₂ (ppb)</label>
          <input type="number" step="any" className={inputCls} value={values.NO2} onChange={e => set('NO2', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>SO₂ (ppb)</label>
          <input type="number" step="any" className={inputCls} value={values.SO2} onChange={e => set('SO2', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>CO (ppm)</label>
          <input type="number" step="any" className={inputCls} value={values.CO} onChange={e => set('CO', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Ozone (ppb)</label>
          <input type="number" step="any" className={inputCls} value={values.Ozone} onChange={e => set('Ozone', e.target.value)} />
        </div>
        {/* AOD spans full width since it's the last field and would otherwise sit alone */}
        <div className="col-span-2">
          <label className={labelCls}>Aerosol Optical Depth</label>
          <input type="number" step="any" className={inputCls} value={values.Aerosol_Optical_Depth} onChange={e => set('Aerosol_Optical_Depth', e.target.value)} />
        </div>
      </div>
    </div>
  )
}
