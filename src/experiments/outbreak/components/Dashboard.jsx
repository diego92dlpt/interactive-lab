import { useEffect, useState } from 'react'
import { TICKS_PER_DAY, STATE_COLORS } from '../constants.js'

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function pct(n, total) {
  if (!total || n == null) return '—'
  return Math.round((n / total) * 100) + '%'
}

function fmt(n) {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function fmtDecimal(n, places = 2) {
  if (n == null || isNaN(n)) return '—'
  return n.toFixed(places)
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function GroupLabel({ children }) {
  return (
    <div className="text-gray-600 font-mono text-[10px] tracking-widest uppercase mt-2 mb-0.5">
      {children}
    </div>
  )
}

function MetricRow({ label, color, count, total, value, suffix = '', muted = false }) {
  const N = total
  const showCount = count != null
  return (
    <div className="flex items-center justify-between gap-1 py-[2px]">
      <span
        className="font-mono text-[11px] shrink-0"
        style={{ color: color || (muted ? '#6b7280' : '#9ca3af') }}
      >
        {label}
      </span>
      <span className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums">
        {showCount ? (
          <>
            <span className="text-gray-300 w-8 text-right">{fmt(count)}</span>
            <span className="text-gray-600 w-8 text-right">{pct(count, N)}</span>
          </>
        ) : (
          <span className={`${muted ? 'text-gray-500' : 'text-gray-300'} text-right`}>
            {value ?? '—'}{suffix}
          </span>
        )}
      </span>
    </div>
  )
}

function Divider() {
  return <div className="border-t border-gray-800 my-1.5" />
}

// ─── NULL STATE ───────────────────────────────────────────────────────────────

function NullState() {
  return (
    <div className="flex-1 flex flex-col justify-center items-center gap-1">
      <span className="text-gray-700 font-mono text-[10px] italic text-center leading-relaxed">
        Run a simulation<br />to see live stats
      </span>
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function Dashboard({ simRef, simStarted, speed = 1 }) {
  const [snap, setSnap] = useState(null)

  useEffect(() => {
    const ms = Math.max(30, Math.round(250 / speed))
    const id = setInterval(() => {
      const sim = simRef.current
      if (!sim) return
      const N = sim.dots.length
      const { counts, cumStats, tick } = sim
      setSnap({ N, counts: { ...counts }, cumStats: { ...cumStats }, tick, totalInfections: sim.totalInfections })
    }, ms)
    return () => clearInterval(id)
  }, [simRef, speed])

  return (
    <div className="flex flex-col px-3 py-2 h-full overflow-hidden">
      {/* Panel header */}
      <div className="text-green-500 font-mono text-[10px] tracking-widest uppercase pb-1 border-b border-green-900 shrink-0">
        Dashboard
      </div>

      {!simStarted || !snap ? (
        <NullState />
      ) : (() => {
        const { N, counts, cumStats, tick } = snap
        const day = Math.floor(tick / TICKS_PER_DAY)

        const obsR0 = cumStats.resolvedIndexCases >= 10
          ? cumStats.totalSecondaryInfections / cumStats.resolvedIndexCases
          : null
        const obsIFR = cumStats.iResolutions >= 20
          ? (cumStats.iDeaths / cumStats.iResolutions) * 100
          : null

        return (
          <div className="flex-1 overflow-hidden pt-0.5">

            {/* ── Current state ─────────────────────────────────────── */}
            <GroupLabel>Active</GroupLabel>
            <MetricRow label="Susceptible" color={STATE_COLORS.S} count={counts.S} total={N} />
            <MetricRow label="Vaccinated"  color={STATE_COLORS.V} count={counts.V} total={N} />
            <MetricRow label="Exposed"     color={STATE_COLORS.E} count={counts.E} total={N} />
            <MetricRow label="Infected"    color={STATE_COLORS.I} count={counts.I} total={N} />

            <Divider />

            {/* ── Cumulative totals ──────────────────────────────────── */}
            <GroupLabel>Cumulative</GroupLabel>
            <MetricRow label="Ever infected" color="#e5e7eb" count={N - counts.S - counts.V} total={N} />
            <MetricRow label="Recovered"   color={STATE_COLORS.R} count={counts.R} total={N} />
            <MetricRow label="Deaths"      color={STATE_COLORS.D} count={counts.D} total={N} />

            <Divider />

            {/* ── Epidemiology ───────────────────────────────────────── */}
            <GroupLabel>Epidemiology</GroupLabel>
            <MetricRow
              label="Emergent R₀"
              value={obsR0 != null ? fmtDecimal(obsR0, 2) : '< 10 cases'}
              muted={obsR0 == null}
            />
            <MetricRow
              label="Obs. IFR"
              value={obsIFR != null ? fmtDecimal(obsIFR, 1) : '< 20 resolved'}
              suffix={obsIFR != null ? '%' : ''}
              muted={obsIFR == null}
            />
            <MetricRow label="Day" color="#9ca3af" value={fmt(day)} />

          </div>
        )
      })()}
    </div>
  )
}
