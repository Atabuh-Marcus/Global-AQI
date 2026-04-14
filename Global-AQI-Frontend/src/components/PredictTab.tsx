import { useState } from 'react'
import { api } from '../api/client'
import type { AQIPredictionRequest, AQIPredictionResponse } from '../types/api'
import { AQIForm, DEFAULT_VALUES } from './AQIForm'
import { PredictionCard } from './PredictionCard'

export function PredictTab() {
  const [form, setForm] = useState<AQIPredictionRequest>(DEFAULT_VALUES)
  const [result, setResult] = useState<AQIPredictionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setLoading(true)
    setError(null)
    try {
      setResult(await api.predict(form))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Single Prediction</h2>
        <p className="text-sm text-slate-500">Enter pollutant readings to classify the AQI for one location.</p>
      </div>

      <AQIForm values={form} onChange={setForm} />

      <button
        onClick={submit}
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Predicting…' : 'Predict AQI'}
      </button>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && <PredictionCard result={result} title="Result" />}
    </div>
  )
}
