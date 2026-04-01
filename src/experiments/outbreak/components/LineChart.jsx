import { useEffect, useRef, useState } from 'react'
import { TICKS_PER_DAY, STATE_COLORS } from '../constants.js'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const MODES = [
  { key: 'cum-inf',    label: 'Infected'  },
  { key: 'cum-dead',   label: 'Deaths'    },
  { key: 'state-maps', label: 'States'    },
  { key: 'daily-new',  label: 'Daily New' },
]

const STACK_ORDER  = ['S', 'V', 'E', 'I', 'R', 'D']
const STACK_LABELS = { S: 'Susceptible', V: 'Vaccinated', E: 'Exposed', I: 'Infected', R: 'Recovered', D: 'Dead' }

const C_INF  = '#60a5fa'  // blue-400
const C_DEAD = '#f97316'  // orange-500

const PAD = { top: 12, right: 10, bottom: 26, left: 38 }

// ─── HELPERS ─────────────────────────────────────────────────────────────────

// "Ever infected" = unique dots that have ever left S or V state.
// Using N - S - V avoids double-counting re-infections.
const everInfectedPct = (h, N) => N > 0 ? (N - h.S - h.V) / N * 100 : 0

function dayTicks(maxDays, chartW) {
  const target    = Math.max(3, Math.round(chartW / 90))
  const rawStep   = maxDays / target
  const niceSteps = [1, 2, 5, 7, 10, 14, 21, 30, 60, 90, 120, 180, 365]
  const step      = niceSteps.find(s => s >= rawStep) ?? 365
  const ticks     = []
  for (let t = 0; t <= maxDays; t += step) ticks.push(t)
  if (ticks[ticks.length - 1] !== maxDays) ticks.push(maxDays)
  return ticks
}

function autoTicks(yMax, count = 4) {
  if (yMax <= 0) return [0]
  const raw  = yMax / count
  const mag  = Math.pow(10, Math.floor(Math.log10(raw || 1)))
  const step = Math.ceil(raw / mag) * mag || 1
  const out  = []
  for (let t = 0; t <= yMax * 1.01; t += step) out.push(+t.toFixed(6))
  return out
}

// ─── SHARED AXES COMPONENT ───────────────────────────────────────────────────

function Axes({ chartW, chartH, xAt, yAt, yMax, xTicks, yTicks, yFmt }) {
  return (
    <g>
      {yTicks.map(v => (
        <g key={v}>
          <line x1={PAD.left} y1={yAt(v, yMax)} x2={PAD.left + chartW} y2={yAt(v, yMax)}
            stroke="#1f2937" strokeWidth="1" />
          <text x={PAD.left - 4} y={yAt(v, yMax) + 3.5}
            textAnchor="end" fontSize="9" fill="#4b5563">{yFmt(v)}</text>
        </g>
      ))}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + chartH} stroke="#374151" strokeWidth="1" />
      <line x1={PAD.left} y1={PAD.top + chartH} x2={PAD.left + chartW} y2={PAD.top + chartH} stroke="#374151" strokeWidth="1" />
      {xTicks.map(d => (
        <g key={d}>
          <line x1={xAt(d)} y1={PAD.top + chartH} x2={xAt(d)} y2={PAD.top + chartH + 4}
            stroke="#374151" strokeWidth="1" />
          <text x={xAt(d)} y={PAD.top + chartH + 14} textAnchor="middle" fontSize="9" fill="#4b5563">
            {d}d
          </text>
        </g>
      ))}
    </g>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function LineChart({ simRef, configRef, simStarted, speed = 1 }) {
  const [mode, setMode] = useState('cum-inf')
  const [snap, setSnap] = useState(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })
  const containerRef    = useRef(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setDims({ w: Math.round(r.width), h: Math.round(r.height) })
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const ms = Math.max(30, Math.round(250 / speed))
    const id = setInterval(() => {
      const sim = simRef.current
      const cfg = configRef?.current
      if (!sim) return
      setSnap({
        N:       sim.dots.length,
        history: [...sim.history],
        maxDays: cfg?.maxDays ?? 360,
      })
    }, ms)
    return () => clearInterval(id)
  }, [simRef, configRef, speed])

  // ── Geometry ──────────────────────────────────────────────────────────────
  const { w: W, h: H } = dims
  const chartW = Math.max(W - PAD.left - PAD.right, 1)
  const chartH = Math.max(H - PAD.top - PAD.bottom, 1)
  const maxDays = snap?.maxDays ?? 365

  const xAt = d => PAD.left + (d / maxDays) * chartW
  const yAt = (v, yMax) => yMax > 0 ? PAD.top + chartH * (1 - v / yMax) : PAD.top + chartH

  const hasData = simStarted && snap && snap.history.length >= 2 && W > 0 && H > 0
  const xTicks  = hasData ? dayTicks(maxDays, chartW) : []

  // Pre-compute series maxima for y-axis scaling
  const infMax  = hasData ? Math.max(...snap.history.map(h => everInfectedPct(h, snap.N)), 0) : 0
  const deadMax = hasData ? Math.max(...snap.history.map(h => (h.D / snap.N) * 100), 0)      : 0

  // ── Single-line chart ─────────────────────────────────────────────────────
  function SingleLine({ getValue, color, yMax, yTicks }) {
    const pts = snap.history.map(h =>
      `${xAt(h.day).toFixed(1)},${yAt(getValue(h), yMax).toFixed(1)}`
    ).join(' ')
    const last    = snap.history[snap.history.length - 1]
    const lastVal = getValue(last)
    const lx      = xAt(last.day)
    const ly      = yAt(lastVal, yMax)
    // nudge label left if too close to right edge
    const labelX  = lx + chartW - (lx - PAD.left) < 36 ? lx - 4 : lx + 4
    const anchor  = lx + chartW - (lx - PAD.left) < 36 ? 'end' : 'start'
    return (
      <g>
        <Axes chartW={chartW} chartH={chartH} xAt={xAt} yAt={yAt}
          yMax={yMax} xTicks={xTicks} yTicks={yTicks} yFmt={v => v.toFixed(1) + '%'} />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
        <circle cx={lx} cy={ly} r="3" fill={color} />
        <text x={labelX} y={ly - 5} textAnchor={anchor} fontSize="9" fill={color} fontWeight="bold">
          {lastVal.toFixed(1)}%
        </text>
      </g>
    )
  }

  // ── State Maps ────────────────────────────────────────────────────────────
  function StateMaps() {
    const { history, N } = snap
    const yMax  = 100
    const yFmt  = v => v + '%'
    return (
      <g>
        <Axes chartW={chartW} chartH={chartH} xAt={xAt} yAt={yAt}
          yMax={yMax} xTicks={xTicks} yTicks={[0, 25, 50, 75, 100]} yFmt={yFmt} />
        {STACK_ORDER.map((key, ki) => {
          const topKeys = STACK_ORDER.slice(0, ki + 1)
          const botKeys = STACK_ORDER.slice(0, ki)
          const topY = h => yAt(topKeys.reduce((s, k) => s + (h[k] || 0), 0) / N * 100, yMax)
          const botY = h => yAt(botKeys.reduce((s, k) => s + (h[k] || 0), 0) / N * 100, yMax)
          const fwd = history.map(h =>               `${xAt(h.day).toFixed(1)},${topY(h).toFixed(1)}`)
          const rev = [...history].reverse().map(h => `${xAt(h.day).toFixed(1)},${botY(h).toFixed(1)}`)
          return (
            <polygon key={key} points={[...fwd, ...rev].join(' ')}
              fill={STATE_COLORS[key]} fillOpacity={0.88} stroke="none" />
          )
        })}
        {STACK_ORDER.slice(0, -1).map((key, ki) => {
          const topKeys = STACK_ORDER.slice(0, ki + 1)
          const pts = history.map(h =>
            `${xAt(h.day).toFixed(1)},${yAt(topKeys.reduce((s, k) => s + (h[k] || 0), 0) / N * 100, yMax).toFixed(1)}`
          ).join(' ')
          return <polyline key={key + '-sep'} points={pts} fill="none" stroke="#000" strokeWidth="0.5" strokeOpacity="0.3" />
        })}
      </g>
    )
  }

  // ── Daily New ─────────────────────────────────────────────────────────────
  function DailyNew() {
    const { history, N } = snap
    const daily  = history.map((h, i) => ({
      day: h.day,
      pct: i === 0 ? everInfectedPct(h, N)
                   : Math.max(0, everInfectedPct(h, N) - everInfectedPct(history[i - 1], N)),
    }))
    const rawMax = Math.max(...daily.map(d => d.pct), 0)
    const yMax   = rawMax > 0 ? rawMax * 1.3 : 1
    const pts    = daily.map(d => `${xAt(d.day).toFixed(1)},${yAt(d.pct, yMax).toFixed(1)}`).join(' ')
    const baseY  = (PAD.top + chartH).toFixed(1)
    const area   = `${xAt(daily[0].day).toFixed(1)},${baseY} ${pts} ${xAt(daily[daily.length - 1].day).toFixed(1)},${baseY}`
    const peak   = rawMax > 0 ? daily.reduce((a, b) => b.pct > a.pct ? b : a) : null
    return (
      <g>
        <Axes chartW={chartW} chartH={chartH} xAt={xAt} yAt={yAt}
          yMax={yMax} xTicks={xTicks} yTicks={autoTicks(yMax)} yFmt={v => v.toFixed(1) + '%'} />
        <polygon points={area} fill={STATE_COLORS.I} fillOpacity={0.18} stroke="none" />
        <polyline points={pts} fill="none" stroke={STATE_COLORS.I} strokeWidth="1.75" strokeLinejoin="round" />
        {peak && (
          <g>
            <circle cx={xAt(peak.day)} cy={yAt(peak.pct, yMax)} r="3" fill={STATE_COLORS.I} />
            <text x={xAt(peak.day)} y={yAt(peak.pct, yMax) - 6}
              textAnchor="middle" fontSize="9" fill={STATE_COLORS.I}>
              {peak.pct.toFixed(1)}%
            </text>
          </g>
        )}
      </g>
    )
  }

  // ── Legend panel (right side, outside SVG) ────────────────────────────────
  function Legend() {
    const lineItem = (color, label) => (
      <div className="flex items-center gap-2">
        <div className="shrink-0 h-[2px] w-5 rounded" style={{ background: color }} />
        <span className="font-mono text-[10px] leading-tight" style={{ color }}>{label}</span>
      </div>
    )
    if (mode === 'cum-inf')    return lineItem(C_INF,           'Cumul. infected %')
    if (mode === 'cum-dead')   return lineItem(C_DEAD,          'Cumul. deaths %')
    if (mode === 'daily-new')  return lineItem(STATE_COLORS.I,  'Daily new infect. %')
    if (mode === 'state-maps') return (
      <div className="flex flex-col gap-1.5">
        {[...STACK_ORDER].reverse().map(key => (
          <div key={key} className="flex items-center gap-2">
            <div className="shrink-0 w-3 h-3 rounded-sm" style={{ background: STATE_COLORS[key], opacity: 0.88 }} />
            <span className="font-mono text-[10px] text-gray-400 leading-tight">{STACK_LABELS[key]}</span>
          </div>
        ))}
      </div>
    )
    return null
  }

  return (
    <div className="flex-1 flex flex-col border-r border-gray-800 min-w-0 overflow-hidden">

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 pt-2 pb-1.5 border-b border-green-900">
        <div className="text-green-500 font-mono text-[10px] tracking-widest uppercase shrink-0 mr-2">
          Trend
        </div>
        <div className="flex gap-1 flex-wrap justify-end">
          {MODES.map(m => (
            <button key={m.key} onClick={() => setMode(m.key)}
              className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold transition-colors ${
                mode === m.key
                  ? 'bg-green-500 text-black'
                  : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart + Legend side by side */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* SVG chart — 80% */}
        <div ref={containerRef} className="flex-1 relative min-h-0 overflow-hidden">
          {!hasData ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-gray-700 font-mono text-xs italic">Run a simulation to see data</span>
            </div>
          ) : (
            <svg width={W} height={H}>
              {mode === 'cum-inf'    && (
                <SingleLine
                  getValue={h => everInfectedPct(h, snap.N)}
                  color={C_INF}
                  yMax={Math.max(infMax * 1.15, 5)}
                  yTicks={autoTicks(Math.max(infMax * 1.15, 5))}
                />
              )}
              {mode === 'cum-dead'   && (
                <SingleLine
                  getValue={h => (h.D / snap.N) * 100}
                  color={C_DEAD}
                  yMax={Math.max(deadMax * 1.3, 0.5)}
                  yTicks={autoTicks(Math.max(deadMax * 1.3, 0.5))}
                />
              )}
              {mode === 'state-maps' && <StateMaps />}
              {mode === 'daily-new'  && <DailyNew  />}
            </svg>
          )}
        </div>

        {/* Legend panel — ~20% */}
        <div className="w-28 shrink-0 border-l border-gray-800 flex flex-col justify-center px-3 gap-2">
          {hasData ? <Legend /> : null}
        </div>

      </div>
    </div>
  )
}
