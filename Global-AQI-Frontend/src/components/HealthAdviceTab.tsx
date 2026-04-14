import { useState } from 'react'
import { api } from '../api/client'
import type { HealthAdviceResponse } from '../types/api'

const AQI_CLASSES = ['Good', 'Moderate', 'Unhealthy for Sensitive', 'Unhealthy', 'Hazardous']
const DARK_TEXT_CLASSES = new Set(['Good', 'Moderate', 'Unhealthy for Sensitive'])

export function HealthAdviceTab() {
  const [selected, setSelected] = useState('Good')
  const [advice, setAdvice] = useState<HealthAdviceResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = async (cls: string) => {
    setSelected(cls)
    setLoading(true)
    setError(null)
    try {
      setAdvice(await api.healthAdvice(cls))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Health Advice</h2>
        <p className="text-sm text-slate-500">Select an AQI class to see personalised health recommendations.</p>
      </div>

      {/* Class selector */}
      <div className="flex flex-wrap gap-2">
        {AQI_CLASSES.map(cls => (
          <button
            key={cls}
            onClick={() => fetch(cls)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold border transition-all ${
              selected === cls
                ? 'border-blue-600 bg-blue-600 text-white shadow'
                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            {cls}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Loading…</div>
      )}

      {advice && !loading && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{
              backgroundColor: advice.color,
              color: DARK_TEXT_CLASSES.has(advice.aqi_class) ? '#1e293b' : '#fff',
            }}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest opacity-70">AQI Class</p>
              <p className="text-2xl font-bold mt-0.5">{advice.aqi_class}</p>
            </div>
            <span
              className="text-xs font-mono font-semibold px-3 py-1 rounded-full"
              style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}
            >
              AQI {advice.aqi_range}
            </span>
          </div>

          <div className="px-5 py-4 space-y-4">
            <p className="text-sm text-slate-600 italic">{advice.description}</p>

            <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">General Public</p>
              <p className="text-sm text-blue-800">{advice.general_advice}</p>
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Sensitive Groups</p>
              <p className="text-sm text-amber-800">{advice.sensitive_groups_advice}</p>
            </div>
          </div>
        </div>
      )}

      {!advice && !loading && !error && (
        <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
          Select a class above to view advice.
        </div>
      )}
    </div>
  )
}
