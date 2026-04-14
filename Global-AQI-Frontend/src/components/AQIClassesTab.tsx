import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { AQIClassInfo } from '../types/api'

const DARK_TEXT_CLASSES = new Set(['Good', 'Moderate', 'Unhealthy for Sensitive'])

export function AQIClassesTab() {
  const [classes, setClasses] = useState<Record<string, AQIClassInfo> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.aqiClasses()
      .then(setClasses)
      .catch(e => setError((e as Error).message))
  }, [])

  if (error) return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
  )

  if (!classes) return (
    <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Loading…</div>
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-800">AQI Class Reference</h2>
        <p className="text-sm text-slate-500">The five Air Quality Index classifications used by the model.</p>
      </div>

      <div className="space-y-3">
        {Object.entries(classes).map(([name, info]) => {
          const isDark = DARK_TEXT_CLASSES.has(name)
          return (
            <div
              key={name}
              className="rounded-xl overflow-hidden shadow-sm border border-slate-100"
            >
              {/* Color header */}
              <div
                className="px-5 py-3 flex items-center justify-between"
                style={{
                  backgroundColor: info.color,
                  color: isDark ? '#1e293b' : '#fff',
                }}
              >
                <span className="text-base font-bold">{name}</span>
                <span
                  className="text-xs font-mono font-semibold px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)',
                  }}
                >
                  AQI {info.aqi_range}
                </span>
              </div>
              {/* Description */}
              <div className="bg-white px-5 py-3">
                <p className="text-sm text-slate-600">{info.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
