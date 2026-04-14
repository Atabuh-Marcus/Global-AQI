import type { AQIPredictionRequest } from '../types/api'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

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
  values: AQIPredictionRequest
  onChange: (v: AQIPredictionRequest) => void
  label?: string
}

export function AQIForm({ values, onChange, label }: Props) {
  const set = (key: keyof AQIPredictionRequest, raw: string) => {
    const numericKeys: (keyof AQIPredictionRequest)[] = [
      'Latitude', 'Longitude', 'PM2_5', 'PM10', 'NO2', 'SO2', 'CO', 'Ozone', 'Aerosol_Optical_Depth',
    ]
    onChange({
      ...values,
      [key]: numericKeys.includes(key) ? parseFloat(raw) || 0 : raw,
    })
  }

  const inputCls =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
  const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1'

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      {label && <p className="mb-3 text-sm font-bold text-slate-600">{label}</p>}

      <div className="grid grid-cols-2 gap-3">
        {/* City */}
        <div className="col-span-2">
          <label className={labelCls}>City</label>
          <input className={inputCls} value={values.City} onChange={e => set('City', e.target.value)} />
        </div>

        {/* Day of Week */}
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

        {/* Lat / Lon */}
        <div>
          <label className={labelCls}>Latitude</label>
          <input type="number" step="any" className={inputCls} value={values.Latitude} onChange={e => set('Latitude', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Longitude</label>
          <input type="number" step="any" className={inputCls} value={values.Longitude} onChange={e => set('Longitude', e.target.value)} />
        </div>

        {/* Pollutants */}
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
        <div className="col-span-2">
          <label className={labelCls}>Aerosol Optical Depth</label>
          <input type="number" step="any" className={inputCls} value={values.Aerosol_Optical_Depth} onChange={e => set('Aerosol_Optical_Depth', e.target.value)} />
        </div>
      </div>
    </div>
  )
}
