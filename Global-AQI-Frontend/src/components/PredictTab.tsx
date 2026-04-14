import { useState } from 'react'
import { api } from '../api/client'
import type { AQIPredictionRequest, AQIPredictionResponse } from '../types/api'
import { AQIForm, DEFAULT_VALUES } from './AQIForm'
import { PredictionCard } from './PredictionCard'

/**
 * Single-location prediction tab.
 * Calls POST /predict and displays the result in a PredictionCard.
 *
 * State:
 *   form    — controlled form values, initialised with the Lahore example
 *   result  — null until a successful prediction; replaced on each new submission
 *   loading — disables the button while the request is in-flight
 *   error   — non-null when the request throws (network error or 4xx/5xx from API)
 */
export function PredictTab() {
  const [form, setForm] = useState<AQIPredictionRequest>(DEFAULT_VALUES)
  const [result, setResult] = useState<AQIPredictionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setLoading(true)
    setError(null)   // clear any previous error before each new attempt
    try {
      setResult(await api.predict(form))
    } catch (e) {
      // api.predict throws an Error with the FastAPI detail message as its message
      setError((e as Error).message)
    } finally {
      // Always re-enable the button whether the request succeeded or failed
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Section heading */}
      <div>
        <h2 className="text-lg font-bold text-slate-800">Single Prediction</h2>
        <p className="text-sm text-slate-500">Enter pollutant readings to classify the AQI for one location.</p>
      </div>

      {/* Controlled form — setForm is passed directly as the onChange handler */}
      <AQIForm values={form} onChange={setForm} />

      {/* Submit button — disabled while loading to prevent duplicate requests */}
      <button
        onClick={submit}
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Predicting…' : 'Predict AQI'}
      </button>

      {/* Error banner — only shown when the last request failed */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Result card — only rendered once we have a successful response */}
      {result && <PredictionCard result={result} title="Result" />}
    </div>
  )
}
