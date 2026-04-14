import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { ModelInfo } from '../types/api'

export function ModelInfoTab() {
  const [info, setInfo] = useState<ModelInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.modelInfo()
      .then(setInfo)
      .catch(e => setError((e as Error).message))
  }, [])

  if (error) return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
  )

  if (!info) return (
    <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Loading…</div>
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Model Info</h2>
        <p className="text-sm text-slate-500">Metadata about the trained RandomForest model powering this API.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Model Type', value: info.model_type },
          { label: 'API Version', value: info.api_version },
          { label: 'Estimators', value: info.n_estimators },
          { label: 'Total Features', value: info.total_features },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm text-center">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">{label}</p>
            <p className="text-lg font-bold text-slate-800">{value}</p>
          </div>
        ))}
      </div>

      {/* Feature lists */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 uppercase tracking-wide">
            Numerical Features ({info.numerical_features.length})
          </div>
          <ul className="divide-y divide-slate-50">
            {info.numerical_features.map(f => (
              <li key={f} className="px-4 py-2 text-sm text-slate-700 font-mono">{f}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 uppercase tracking-wide">
            Categorical Features ({info.categorical_features.length})
          </div>
          <ul className="divide-y divide-slate-50">
            {info.categorical_features.map(f => (
              <li key={f} className="px-4 py-2 text-sm text-slate-700 font-mono">{f}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Target classes */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 uppercase tracking-wide">
          Target Classes ({info.target_classes.length})
        </div>
        <div className="flex flex-wrap gap-2 px-4 py-3">
          {info.target_classes.map(cls => (
            <span
              key={cls}
              className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
            >
              {cls}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
