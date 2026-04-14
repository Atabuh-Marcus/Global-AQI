import { useState } from 'react'
import { api } from '../api/client'
import type { AQIPredictionResponse } from '../types/api'

/**
 * Pre-formatted example JSON for three cities spanning the full severity range:
 *   Lahore  → Unhealthy (high PM values)
 *   Tokyo   → Good/Moderate (low PM values)
 *   Delhi   → Hazardous (very high PM values)
 * Shown in the textarea by default and restored by the "Load example" button.
 * null + 2 args to JSON.stringify produce pretty-printed output.
 */
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

// Colour maps reused from PredictionCard — duplicated here to keep BatchTab self-contained
// (avoids a shared module just for two constants)
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

/**
 * Batch prediction tab.
 * Accepts a raw JSON array in a textarea, parses it client-side, and sends it
 * to POST /predict/batch. Results are displayed in a table with coloured class
 * badges and a mini confidence bar per row.
 *
 * Client-side validation ensures the input is a JSON array before hitting the API,
 * giving an immediate error rather than a confusing 422 from the backend.
 */
export function BatchTab() {
  // json holds the raw textarea string — kept as a string so the user can type freely
  const [json, setJson] = useState(EXAMPLE_BATCH)
  const [results, setResults] = useState<AQIPredictionResponse[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setLoading(true)
    setError(null)
    try {
      // JSON.parse throws a SyntaxError on invalid JSON — caught below
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
        {/* Textarea header row: label on left, "Load example" shortcut on right */}
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            JSON Input
          </label>
          {/* Resets textarea to the built-in example so users can always get back to a known-good state */}
          <button
            onClick={() => setJson(EXAMPLE_BATCH)}
            className="text-xs text-blue-600 hover:underline"
          >
            Load example (3 cities)
          </button>
        </div>
        {/* Monospace font makes the JSON easier to read and edit */}
        <textarea
          className="w-full h-64 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={json}
          onChange={e => setJson(e.target.value)}
          spellCheck={false}  // disable red underlines on JSON strings
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

      {/* ── Results table ── only rendered after a successful response */}
      {results && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Header strip shows record count */}
          <div className="bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 uppercase tracking-wide">
            Results — {results.length} record{results.length !== 1 ? 's' : ''}
          </div>
          {/* overflow-x-auto lets the table scroll horizontally on narrow viewports */}
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
                  // Highest probability across all classes = the model's confidence in its prediction
                  const topProb = Math.max(...Object.values(r.probabilities))
                  const bg = CLASS_COLORS[r.predicted_class] ?? '#94a3b8'
                  const txt = CLASS_TEXT[r.predicted_class] ?? '#1e293b'
                  return (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      {/* Row index (1-based for readability) */}
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{i + 1}</td>
                      {/* Coloured pill badge matching the AQI class colour */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-block rounded-full px-3 py-0.5 text-xs font-semibold"
                          style={{ backgroundColor: bg, color: txt }}
                        >
                          {r.predicted_class}
                        </span>
                      </td>
                      {/* Numeric confidence percentage */}
                      <td className="px-4 py-3 text-slate-700">{(topProb * 100).toFixed(1)}%</td>
                      {/* Mini progress bar — width is absolute (0–100% of topProb) */}
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
