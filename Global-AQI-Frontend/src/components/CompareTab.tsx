import { useState } from 'react'
import { api } from '../api/client'
import type { AQIPredictionRequest, CompareResponse } from '../types/api'
import { AQIForm, DEFAULT_VALUES } from './AQIForm'
import { PredictionCard } from './PredictionCard'

/**
 * Default values for Location B (Tokyo) — chosen to contrast with Location A (Lahore)
 * and demonstrate a visibly different AQI class out of the box.
 */
const LOCATION_B_DEFAULT: AQIPredictionRequest = {
  City: 'Tokyo, Japan',
  DayOfWeek: 'Wednesday',
  Latitude: 35.6762,
  Longitude: 139.6503,
  PM2_5: 12.0,
  PM10: 22.0,
  NO2: 18.0,
  SO2: 3.0,
  CO: 0.4,
  Ozone: 38.0,
  Aerosol_Optical_Depth: 0.2,
}

/**
 * Side-by-side comparison tab.
 * Calls POST /compare with both locations wrapped in { location_a, location_b }.
 * The API runs both through the model in a single batch call and returns:
 *   - individual predictions for A and B
 *   - the name of the cleaner location
 *   - a human-readable summary sentence
 *
 * Both AQIForms share the same submit handler — state for each is held separately
 * in formA / formB so they're fully independent.
 */
export function CompareTab() {
  const [formA, setFormA] = useState<AQIPredictionRequest>(DEFAULT_VALUES)         // Location A: Lahore
  const [formB, setFormB] = useState<AQIPredictionRequest>(LOCATION_B_DEFAULT)     // Location B: Tokyo
  const [result, setResult] = useState<CompareResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setLoading(true)
    setError(null)
    try {
      setResult(await api.compare(formA, formB))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Compare Two Locations</h2>
        <p className="text-sm text-slate-500">Side-by-side AQI comparison with a verdict on which has cleaner air.</p>
      </div>

      {/* Two AQIForms in a responsive 2-column grid — stack on mobile, side-by-side on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AQIForm values={formA} onChange={setFormA} label="Location A" />
        <AQIForm values={formB} onChange={setFormB} label="Location B" />
      </div>

      <button
        onClick={submit}
        disabled={loading}
        className="w-full rounded-lg bg-orange-500 py-2.5 text-sm font-semibold text-white shadow hover:bg-orange-600 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Comparing…' : 'Compare Locations'}
      </button>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <>
          {/* ── Verdict banner ── dark card with the API's summary sentence */}
          <div className="rounded-xl bg-slate-800 px-5 py-4 text-white">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Verdict</p>
            {/* summary is generated server-side: e.g. "Location A (Tokyo) has cleaner air (Good)..." */}
            <p className="text-base font-semibold leading-snug">{result.summary}</p>
            {/* cleaner_location mirrors the winning location string for a quick at-a-glance read */}
            <p className="mt-1 text-xs text-emerald-400 font-medium">
              Cleaner: {result.cleaner_location}
            </p>
          </div>

          {/* ── Side-by-side PredictionCards — one per location result from the API */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.results.map(r => (
              <PredictionCard
                key={r.location}
                // Re-shape CompareResult to match the AQIPredictionResponse interface PredictionCard expects
                result={{ predicted_class: r.predicted_class, probabilities: r.probabilities }}
                title={r.location}  // e.g. "Location A (Lahore, Pakistan)"
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
