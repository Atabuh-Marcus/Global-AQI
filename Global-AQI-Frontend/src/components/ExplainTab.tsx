import { useState } from 'react'
import { api } from '../api/client'
import type { AQIPredictionRequest, ExplainResponse } from '../types/api'
import { AQIForm, DEFAULT_VALUES } from './AQIForm'
import { PredictionCard } from './PredictionCard'

/**
 * Predict + Explain tab.
 * Calls POST /predict/explain which returns the same result as /predict plus
 * the top 5 global RandomForest feature importances.
 *
 * The feature importance bars visualise *which inputs the model relied on most*
 * to reach its classification — useful for understanding why a city gets a
 * particular AQI class (e.g. PM2.5 dominated vs. geographic location).
 */
export function ExplainTab() {
  const [form, setForm] = useState<AQIPredictionRequest>(DEFAULT_VALUES)
  const [result, setResult] = useState<ExplainResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setLoading(true)
    setError(null)
    try {
      setResult(await api.predictExplain(form))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Pre-compute max importance so bar widths are relative (top feature = 100% wide)
  const maxImportance = result ? Math.max(...result.top_features.map(f => f.importance)) : 1

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Predict + Explain</h2>
        <p className="text-sm text-slate-500">Same as Predict, but also shows which features drove the classification.</p>
      </div>

      <AQIForm values={form} onChange={setForm} />

      <button
        onClick={submit}
        disabled={loading}
        className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white shadow hover:bg-violet-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Analysing…' : 'Predict & Explain'}
      </button>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <>
          {/* Standard prediction card — same as PredictTab */}
          <PredictionCard result={result} title="Prediction" />

          {/* ── Feature importance panel ── */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 uppercase tracking-wide">
              Top Contributing Features
            </div>
            <div className="px-5 py-4 space-y-3">
              {result.top_features.map((f, i) => (
                <div key={f.feature}>
                  {/* Feature name row: rank badge on the left, importance % on the right */}
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span className="flex items-center gap-1.5">
                      {/* Rank number in a small circular badge */}
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold">
                        {i + 1}
                      </span>
                      {f.feature}
                    </span>
                    <span className="font-mono font-semibold">{(f.importance * 100).toFixed(2)}%</span>
                  </div>
                  {/* Importance bar — width relative to the top-ranked feature */}
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all duration-500"
                      style={{ width: `${(f.importance / maxImportance) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
