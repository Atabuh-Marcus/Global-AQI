import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { AQIClassInfo } from '../types/api'

/**
 * Classes that need dark text on their coloured backgrounds for legibility.
 * Good (#00e400), Moderate (#ffff00), and Unhealthy for Sensitive (#ff7e00)
 * are all light enough that dark slate text is more readable than white.
 */
const DARK_TEXT_CLASSES = new Set(['Good', 'Moderate', 'Unhealthy for Sensitive'])

/**
 * AQI Class Reference tab.
 * Fetches GET /aqi/classes once on mount and renders a card for each class.
 * No user interaction — this is a read-only reference panel.
 *
 * Loading state: shows "Loading…" while the fetch is in-flight (classes === null)
 * Error state: shows a red banner if the fetch fails
 * Loaded state: renders one card per class in the order the API returns them
 */
export function AQIClassesTab() {
  // null = still loading; Record when loaded
  const [classes, setClasses] = useState<Record<string, AQIClassInfo> | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch the class reference data once — empty dependency array means this runs
  // only on initial mount, not on re-renders
  useEffect(() => {
    api.aqiClasses()
      .then(setClasses)
      .catch(e => setError((e as Error).message))
  }, [])

  // Early returns for loading and error states keep the happy-path JSX clean below
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
          // Decide text colour based on whether this class has a light background
          const isDark = DARK_TEXT_CLASSES.has(name)
          return (
            <div
              key={name}
              className="rounded-xl overflow-hidden shadow-sm border border-slate-100"
            >
              {/* ── Coloured header ── AQI class name + AQI numeric range badge */}
              <div
                className="px-5 py-3 flex items-center justify-between"
                style={{
                  backgroundColor: info.color,
                  color: isDark ? '#1e293b' : '#fff',
                }}
              >
                <span className="text-base font-bold">{name}</span>
                {/* Semi-transparent pill shows the numeric AQI range for this class */}
                <span
                  className="text-xs font-mono font-semibold px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)',
                  }}
                >
                  AQI {info.aqi_range}
                </span>
              </div>
              {/* ── Description body ── white background for readability */}
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
