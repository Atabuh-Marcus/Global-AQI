import type { AQIPredictionResponse } from '../types/api'

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

interface Props {
  result: AQIPredictionResponse
  title?: string
}

export function PredictionCard({ result, title }: Props) {
  const bg = CLASS_COLORS[result.predicted_class] ?? '#94a3b8'
  const text = CLASS_TEXT[result.predicted_class] ?? '#1e293b'
  const sorted = Object.entries(result.probabilities).sort((a, b) => b[1] - a[1])
  const maxProb = sorted[0]?.[1] ?? 1

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {title && (
        <div className="bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 uppercase tracking-wide">
          {title}
        </div>
      )}
      {/* Class badge */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ backgroundColor: bg, color: text }}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-75">Predicted Class</p>
          <p className="text-2xl font-bold mt-0.5">{result.predicted_class}</p>
        </div>
        <div className="text-4xl opacity-80">{classEmoji(result.predicted_class)}</div>
      </div>

      {/* Probability bars */}
      <div className="px-5 py-4 space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Class Probabilities
        </p>
        {sorted.map(([cls, prob]) => (
          <div key={cls}>
            <div className="flex justify-between text-xs text-slate-600 mb-0.5">
              <span>{cls}</span>
              <span className="font-mono font-semibold">{(prob * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(prob / maxProb) * 100}%`,
                  backgroundColor: CLASS_COLORS[cls] ?? '#94a3b8',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function classEmoji(cls: string): string {
  switch (cls) {
    case 'Good': return '🌿'
    case 'Moderate': return '🌤'
    case 'Unhealthy for Sensitive': return '😷'
    case 'Unhealthy': return '⚠️'
    case 'Hazardous': return '☠️'
    default: return '🌡️'
  }
}
