import { useState } from 'react'
import { api } from '../api/client'
import type { AQIPredictionResponse } from '../types/api'

const EXAMPLE_BATCH = JSON.stringify(
  [
    {
      City: 'Lahore, Pakistan', DayOfWeek: 'Monday', Latitude: 31.5497, Longitude: 74.3436,
      PM2_5: 85.0, PM10: 120.0, NO2: 40.0, SO2: 15.0, CO: 1.2, Ozone: 55.0, Aerosol_Optical_Depth: 0.8,
    },
    {
      City: 'Tokyo, Japan', DayOfWeek: 'Wednesday', Latitude: 35.6762, Longitude: 139.6503,
      PM2_5: 12.0, PM10: 22.0, NO2: 18.0, SO2: 3.0, CO: 0.4, Ozone: 38.0, Aerosol_Optical_Depth: 0.2,
    },
    {
      City: 'Delhi, India', DayOfWeek: 'Friday', Latitude: 28.6139, Longitude: 77.2090,
      PM2_5: 220.0, PM10: 310.0, NO2: 80.0, SO2: 45.0, CO: 3.5, Ozone: 70.0, Aerosol_Optical_Depth: 1.4,
    },
  ],
  null,
  2
)

const CLASS_COLORS: Record<string, string> = {
  Good: '#00e400',
  Moderate: '#ffff00',
  'Unhealthy for Sensitive': '#ff7e00',
  Unhealthy: '#ff0000',
  Hazardous: '#7e0023',
}

const CLASS_TEXT: Record<string, string> = {
  Good: '#166534',
  Moderate: '#713f12',
  'Unhealthy for Sensitive': '#7c2d12',
  Unhealthy: '#fff',
  Hazardous: '#fff',
}

export function BatchTab() {
  const [json, setJson] = useState(EXAMPLE_BATCH)
  const [results, setResults] = useState<AQIPredictionResponse[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setLoading(true)
    setError(null)
    try {
      const parsed = JSON.parse(json)
      if (!Array.isArray(parsed)) throw new Error('Input must be a JSON array')
      setResults(await api.predictBatch(parsed))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Batch Prediction</h2>
        <p className="text-sm text-slate-500">Paste a JSON array of up to 100 records to predict all at once.</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            JSON Input
          </label>
          <button
            onClick={() => setJson(EXAMPLE_BATCH)}
            className="text-xs text-blue-600 hover:underline"
          >
            Load example (3 cities)
          </button>
        </div>
        <textarea
          className="w-full h-64 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={json}
          onChange={e => setJson(e.target.value)}
          spellCheck={false}
        />
      </div>

      <button
        onClick={submit}
        disabled={loading}
        className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Processing…' : 'Run Batch Prediction'}
      </button>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {results && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 uppercase tracking-wide">
            Results — {results.length} record{results.length !== 1 ? 's' : ''}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">#</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Class</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Top Probability</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const topProb = Math.max(...Object.values(r.probabilities))
                  const bg = CLASS_COLORS[r.predicted_class] ?? '#94a3b8'
                  const txt = CLASS_TEXT[r.predicted_class] ?? '#1e293b'
                  return (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{i + 1}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block rounded-full px-3 py-0.5 text-xs font-semibold"
                          style={{ backgroundColor: bg, color: txt }}
                        >
                          {r.predicted_class}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{(topProb * 100).toFixed(1)}%</td>
                      <td className="px-4 py-3 w-40">
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${topProb * 100}%`, backgroundColor: bg }}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
