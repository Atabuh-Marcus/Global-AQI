import { useState } from 'react'
import { api } from '../api/client'
import type { HealthAdviceResponse } from '../types/api'

// The five AQI classes — drives both the pill selector and the API call
const AQI_CLASSES = ['Good', 'Moderate', 'Unhealthy for Sensitive', 'Unhealthy', 'Hazardous']

// Classes whose AQI background colour is light enough to need dark text
const DARK_TEXT_CLASSES = new Set(['Good', 'Moderate', 'Unhealthy for Sensitive'])

/**
 * Health Advice tab.
 * Lets users select an AQI class via pill buttons; fetches GET /health/advice/{class}
 * on each selection and renders general-public and sensitive-groups advice panels.
 *
 * Unlike AQIClassesTab this is event-driven (not loaded on mount) — advice is fetched
 * when the user clicks a pill, so there's no initial data loaded until they interact.
 */
export function HealthAdviceTab() {
  const [selected, setSelected] = useState('Good')  // tracks which pill is highlighted
  const [advice, setAdvice] = useState<HealthAdviceResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Called when the user clicks a class pill.
   * Updates the selected highlight immediately, then fetches advice from the API.
   * Named `fetch` locally — shadows the global but is clearer in context.
   */
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

      {/* ── Class selector pills ── */}
      <div className="flex flex-wrap gap-2">
        {AQI_CLASSES.map(cls => (
          <button
            key={cls}
            onClick={() => fetch(cls)}
            // Active pill is filled blue; inactive pills are outlined and highlight on hover
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

      {/* Spinner shown while the fetch is in-flight */}
      {loading && (
        <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Loading…</div>
      )}

      {/* ── Advice card — only shown once advice is loaded and the request has settled */}
      {advice && !loading && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Coloured header matching the AQI class colour */}
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
            {/* AQI range badge with a semi-transparent dark background for contrast */}
            <span
              className="text-xs font-mono font-semibold px-3 py-1 rounded-full"
              style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}
            >
              AQI {advice.aqi_range}
            </span>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* One-sentence description of this AQI level */}
            <p className="text-sm text-slate-600 italic">{advice.description}</p>

            {/* ── General public advice ── blue panel */}
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">General Public</p>
              <p className="text-sm text-blue-800">{advice.general_advice}</p>
            </div>

            {/* ── Sensitive groups advice ── amber panel (stricter recommendations) */}
            <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Sensitive Groups</p>
              <p className="text-sm text-amber-800">{advice.sensitive_groups_advice}</p>
            </div>
          </div>
        </div>
      )}

      {/* Prompt shown before the user has clicked any pill */}
      {!advice && !loading && !error && (
        <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
          Select a class above to view advice.
        </div>
      )}
    </div>
  )
}
