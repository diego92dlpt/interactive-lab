import { useEffect, useState } from 'react'
import { STATE_COLORS } from '../constants.js'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const BARS = [
  { key: 'S', label: 'S' },
  { key: 'V', label: 'V' },
  { key: 'E', label: 'E' },
  { key: 'I', label: 'I' },
  { key: 'R', label: 'R' },
  { key: 'D', label: 'D' },
]

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function PopulationChart({ simRef, simStarted, speed = 1, baseline = null }) {
  const [snap, setSnap] = useState(null)
  const [showPct, setShowPct] = useState(true)

  useEffect(() => {
    const ms = Math.max(30, Math.round(250 / speed))
    const id = setInterval(() => {
      const sim = simRef.current
      if (!sim) return
      const N = sim.dots.length
      setSnap({ N, counts: { ...sim.counts } })
    }, ms)
    return () => clearInterval(id)
  }, [simRef, speed])

  const hasData = snap && snap.N > 0

  // Baseline final snapshot — last entry in baseline history
  const blSnap = baseline?.history?.length
    ? baseline.history[baseline.history.length - 1]
    : null
  const blN = baseline?.N ?? 0

  return (
    <div className="w-80 shrink-0 flex flex-col border-l border-gray-800">

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 pt-2 pb-1.5 border-b border-green-900">
        <div className="flex items-baseline gap-2 shrink-0">
          <div className="text-green-500 font-mono text-[10px] tracking-widest uppercase">
            Population
          </div>
          {blSnap && (
            <span className="font-mono text-[8px] text-gray-600">BL | Now</span>
          )}
        </div>
        <div className="flex gap-1">
          {['%', '#'].map(label => (
            <button
              key={label}
              onClick={() => setShowPct(label === '%')}
              className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold transition-colors ${
                (showPct ? '%' : '#') === label
                  ? 'bg-green-500 text-black'
                  : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 flex items-end gap-1.5 px-3 pb-3 pt-2 min-h-0">
        {!hasData ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-gray-700 font-mono text-xs italic">Run a simulation to see data</span>
          </div>
        ) : (
          BARS.map(({ key, label }) => {
            const count = snap.counts[key] ?? 0
            const N     = snap.N
            const pct   = N > 0 ? count / N : 0

            const blCount = blSnap?.[key] ?? 0
            const blPct   = blN > 0 ? blCount / blN : 0

            return (
              <div key={key} className="flex-1 flex flex-col items-center gap-1 h-full">
                {/* Bar column — grouped side-by-side when baseline active */}
                <div className="flex-1 flex items-end gap-px w-full">
                  {blSnap ? (
                    <>
                      {/* BL bar (left, faded) — label sits just above bar */}
                      <div className="flex-1 h-full flex flex-col justify-end items-center">
                        <div className="font-mono text-[10px] tabular-nums leading-none mb-0.5"
                          style={{ color: STATE_COLORS[key], opacity: 0.55 }}>
                          {showPct
                            ? (blPct * 100).toFixed(0) + '%'
                            : blCount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </div>
                        <div className="w-full rounded-t"
                          style={{
                            background: STATE_COLORS[key],
                            height: `${Math.max(blPct * 100, blPct > 0 ? 2 : 0)}%`,
                            minHeight: blCount > 0 ? '2px' : '0',
                            opacity: 0.38,
                          }}
                        />
                      </div>
                      {/* NOW bar (right, full) — label sits just above bar */}
                      <div className="flex-1 h-full flex flex-col justify-end items-center">
                        <div className="font-mono text-[10px] tabular-nums leading-none mb-0.5"
                          style={{ color: STATE_COLORS[key] }}>
                          {showPct
                            ? (pct * 100).toFixed(0) + '%'
                            : count.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </div>
                        <div className="w-full rounded-t transition-all duration-200"
                          style={{
                            background: STATE_COLORS[key],
                            height: `${Math.max(pct * 100, pct > 0 ? 2 : 0)}%`,
                            minHeight: count > 0 ? '2px' : '0',
                            opacity: 0.88,
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col justify-end items-center">
                      <div className="font-mono text-[10px] tabular-nums leading-none mb-0.5"
                        style={{ color: STATE_COLORS[key] }}>
                        {showPct
                          ? (pct * 100).toFixed(0) + '%'
                          : count.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </div>
                      <div className="w-full rounded-t transition-all duration-200"
                        style={{
                          background: STATE_COLORS[key],
                          height: `${Math.max(pct * 100, pct > 0 ? 2 : 0)}%`,
                          minHeight: count > 0 ? '2px' : '0',
                          opacity: 0.88,
                        }}
                      />
                    </div>
                  )}
                </div>
                {/* State letter */}
                <div
                  className="font-mono text-[9px] font-bold leading-none"
                  style={{ color: STATE_COLORS[key] }}
                >
                  {label}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
