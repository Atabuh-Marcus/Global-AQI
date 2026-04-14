import { useEffect, useState } from 'react'
import { api } from './api/client'
import { PredictTab } from './components/PredictTab'
import { ExplainTab } from './components/ExplainTab'
import { BatchTab } from './components/BatchTab'
import { CompareTab } from './components/CompareTab'
import { AQIClassesTab } from './components/AQIClassesTab'
import { HealthAdviceTab } from './components/HealthAdviceTab'
import { ModelInfoTab } from './components/ModelInfoTab'

// Union type listing every valid tab identifier — keeps setActiveTab type-safe
type TabId = 'predict' | 'explain' | 'batch' | 'compare' | 'classes' | 'advice' | 'model'

// Tab configuration array drives both the tab bar rendering and the TabContent switch below.
// Adding a new tab only requires adding one entry here plus a case in TabContent.
const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'predict',  label: 'Predict',        icon: '🎯' },
  { id: 'explain',  label: 'Explain',         icon: '🔍' },
  { id: 'batch',    label: 'Batch',           icon: '📋' },
  { id: 'compare',  label: 'Compare',         icon: '⚖️' },
  { id: 'classes',  label: 'AQI Classes',     icon: '🎨' },
  { id: 'advice',   label: 'Health Advice',   icon: '💊' },
  { id: 'model',    label: 'Model Info',      icon: '🤖' },
]

/**
 * Pure switch — maps the active tab ID to its component.
 * Extracted from App so the JSX stays flat and each tab component is isolated.
 */
function TabContent({ tab }: { tab: TabId }) {
  switch (tab) {
    case 'predict':  return <PredictTab />
    case 'explain':  return <ExplainTab />
    case 'batch':    return <BatchTab />
    case 'compare':  return <CompareTab />
    case 'classes':  return <AQIClassesTab />
    case 'advice':   return <HealthAdviceTab />
    case 'model':    return <ModelInfoTab />
  }
}

export default function App() {
  // Tracks which tab panel is currently visible
  const [activeTab, setActiveTab] = useState<TabId>('predict')

  // null  = still connecting (shows pulsing dot)
  // true  = API responded healthy (green dot)
  // false = fetch failed or status !== 'healthy' (red dot)
  const [healthy, setHealthy] = useState<boolean | null>(null)

  // Ping the backend once on mount to show the API health indicator in the header.
  // No cleanup needed — the promise resolves once and setState is idempotent.
  useEffect(() => {
    api.health()
      .then(r => setHealthy(r.status === 'healthy'))
      .catch(() => setHealthy(false))
  }, [])  // empty array → runs only once after the initial render

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      {/* ── Header ── */}
      <header className="bg-slate-900 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo + title */}
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌍</span>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">Global AQI Dashboard</h1>
              <p className="text-slate-400 text-xs">Air Quality Index Prediction</p>
            </div>
          </div>

          {/* API health indicator — pulsing while connecting, green/red once resolved */}
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                healthy === null ? 'bg-slate-500 animate-pulse' :
                healthy ? 'bg-emerald-400' : 'bg-red-500'
              }`}
            />
            <span className={`text-xs font-medium ${
              healthy === null ? 'text-slate-400' :
              healthy ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {healthy === null ? 'Connecting…' : healthy ? 'API Online' : 'API Offline'}
            </span>
          </div>
        </div>

        {/* ── Tab bar ── overflow-x-auto enables horizontal scroll on narrow screens */}
        <div className="max-w-5xl mx-auto px-4 overflow-x-auto">
          <div className="flex gap-0.5 pb-0">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                // Active tab gets a light background matching the page body; inactive tabs
                // are muted and highlight on hover
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-t-lg whitespace-nowrap transition-colors ${
                  activeTab === t.id
                    ? 'bg-slate-100 text-slate-800'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Main content ── renders the selected tab component */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <TabContent tab={activeTab} />
      </main>

      {/* ── Footer ── */}
      <footer className="mt-10 py-4 text-center text-xs text-slate-400">
        Global AQI Dashboard · Powered by RandomForest + FastAPI
      </footer>
    </div>
  )
}
