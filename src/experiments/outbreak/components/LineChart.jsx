import { useEffect, useRef, useState, useCallback } from 'react'
import { STATE_COLORS } from '../constants.js'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const MODES = [
  { key: 'cum-inf',    label: 'Infected'  },
  { key: 'cum-dead',   label: 'Deaths'    },
  { key: 'state-maps', label: 'States'    },
  { key: 'daily-new',  label: 'Daily New' },
]

// Visual stack order bottom→top; STACK_TOP_DOWN is the reverse (for crosshair readout)
const STACK_ORDER    = ['S', 'V', 'E', 'I', 'R', 'D']
const STACK_TOP_DOWN = ['D', 'R', 'I', 'E', 'V', 'S']
const STACK_LABELS   = { S: 'Suscept.', V: 'Vaccin.', E: 'Exposed', I: 'Infected', R: 'Recov.', D: 'Dead' }

const C_INF   = '#60a5fa'  // blue-400
const C_DEAD  = '#f97316'  // orange-500
const C_REINF = '#f59e0b'  // amber-400

const PAD = { top: 12, right: 10, bottom: 26, left: 38 }

// ─── HELPERS ─────────────────────────────────────────────────────────────────

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

function nearestEntry(history, day) {
  if (!history || history.length === 0) return null
  let best = history[0], bestDiff = Math.abs(history[0].day - day)
  for (const h of history) {
    const d = Math.abs(h.day - day)
    if (d < bestDiff) { best = h; bestDiff = d }
  }
  return best
}

// ─── SHARED AXES ─────────────────────────────────────────────────────────────

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

export default function LineChart({
  simRef, configRef, simStarted, speed = 1,
  baseline, onSetBaseline, onRemoveBaseline,
}) {
  const [mode, setMode]         = useState('cum-inf')
  const [snap, setSnap]         = useState(null)
  const [dims, setDims]         = useState({ w: 0, h: 0 })
  const [hoverDay, setHoverDay] = useState(null)
  const containerRef            = useRef(null)

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
      setSnap({ N: sim.dots.length, history: [...sim.history], maxDays: cfg?.maxDays ?? 360 })
    }, ms)
    return () => clearInterval(id)
  }, [simRef, configRef, speed])

  // ── Set baseline handler ──────────────────────────────────────────────────
  const handleSetBaseline = useCallback(() => {
    if (!snap || snap.history.length < 2) return
    onSetBaseline({ history: [...snap.history], N: snap.N, maxDays: snap.maxDays })
  }, [snap, onSetBaseline])

  const canSetBaseline = snap && snap.history.length >= 2

  // ── Geometry ──────────────────────────────────────────────────────────────
  const { w: W, h: H } = dims
  const chartW = Math.max(W - PAD.left - PAD.right, 1)
  const chartH = Math.max(H - PAD.top  - PAD.bottom, 1)

  // X-axis spans the longer of baseline or current run
  const effectiveMaxDays = baseline
    ? Math.max(baseline.maxDays, snap?.maxDays ?? 360)
    : (snap?.maxDays ?? 360)

  const xAt = d => PAD.left + (d / effectiveMaxDays) * chartW
  const yAt = (v, yMax) => yMax > 0 ? PAD.top + chartH * (1 - v / yMax) : PAD.top + chartH

  const hasData = snap && snap.history.length >= 2 && W > 0 && H > 0
  const xTicks  = hasData ? dayTicks(effectiveMaxDays, chartW) : []

  const infMax  = hasData ? Math.max(...snap.history.map(h => everInfectedPct(h, snap.N)), 0) : 0
  const deadMax = hasData ? Math.max(...snap.history.map(h => (h.D / snap.N) * 100), 0)      : 0

  // ── Mouse handlers ────────────────────────────────────────────────────────
  const handleMouseMove  = e => {
    if (!hasData) return
    const rect = e.currentTarget.getBoundingClientRect()
    const day  = Math.max(0, Math.min(effectiveMaxDays, ((e.clientX - rect.left - PAD.left) / chartW) * effectiveMaxDays))
    setHoverDay(day)
  }
  const handleMouseLeave = () => setHoverDay(null)

  // ── Crosshair component ────────────────────────────────────────────────────
  // lines      = current run [{y, color, label}]
  // blLines    = baseline    [{y, color, label}]  — rendered dashed/faded, labels on LEFT side
  function Crosshair({ lines = [], blLines = [] }) {
    if (hoverDay == null) return null
    const entry = nearestEntry(snap.history, hoverDay)
    if (!entry) return null
    const cx = xAt(entry.day)

    return (
      <g>
        {/* vertical cursor */}
        <line x1={cx} y1={PAD.top} x2={cx} y2={PAD.top + chartH}
          stroke="#9ca3af" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.6" />

        {/* baseline horizontal lines — dashed, labels LEFT of cursor */}
        {blLines.map(({ y, color, label }, i) => (
          <g key={`bl-${i}`} opacity="0.65">
            <line x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y}
              stroke={color} strokeWidth="1" strokeDasharray="4 3" />
            <circle cx={cx} cy={y} r="3" fill={color} />
            <text x={cx - 5} y={y - 4 + i * 11}
              textAnchor="end" fontSize="9" fill={color}>
              BL: {label}
            </text>
          </g>
        ))}

        {/* current horizontal lines — solid, labels RIGHT of cursor */}
        {lines.map(({ y, color, label }, i) => (
          <g key={`cur-${i}`}>
            <line x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y}
              stroke={color} strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.5" />
            <circle cx={cx} cy={y} r="3.5" fill={color} />
            <text x={cx + 5} y={y - 4 + i * 11}
              fontSize="9" fill={color} fontWeight="bold">
              {label}
            </text>
          </g>
        ))}

        {/* day label at top */}
        <text x={cx} y={PAD.top - 2} textAnchor="middle" fontSize="9" fill="#6b7280">
          {entry.day}d
        </text>
      </g>
    )
  }

  // ── Single-line chart ─────────────────────────────────────────────────────
  function SingleLine({ getValue, color, yMax, yTicks }) {
    // current run
    const pts     = snap.history.map(h => `${xAt(h.day).toFixed(1)},${yAt(getValue(h), yMax).toFixed(1)}`).join(' ')
    const last    = snap.history[snap.history.length - 1]
    const lastVal = getValue(last)
    const lx      = xAt(last.day)
    const ly      = yAt(lastVal, yMax)
    const labelX  = lx + chartW - (lx - PAD.left) < 36 ? lx - 4 : lx + 4
    const anchor  = lx + chartW - (lx - PAD.left) < 36 ? 'end' : 'start'

    // baseline ghost
    const blPts = baseline
      ? baseline.history.map(h => `${xAt(h.day).toFixed(1)},${yAt(getValue(h), yMax).toFixed(1)}`).join(' ')
      : null

    // crosshair
    const hEntry   = hoverDay != null ? nearestEntry(snap.history, hoverDay)      : null
    const hBlEntry = hoverDay != null && baseline ? nearestEntry(baseline.history, hoverDay) : null
    const curLines = hEntry   ? [{ y: yAt(getValue(hEntry),   yMax), color, label: getValue(hEntry).toFixed(1)   + '%' }] : []
    const blLines  = hBlEntry ? [{ y: yAt(getValue(hBlEntry), yMax), color, label: getValue(hBlEntry).toFixed(1) + '%' }] : []

    return (
      <g>
        <Axes chartW={chartW} chartH={chartH} xAt={xAt} yAt={yAt}
          yMax={yMax} xTicks={xTicks} yTicks={yTicks} yFmt={v => v.toFixed(1) + '%'} />

        {/* baseline ghost (dashed, faded) */}
        {blPts && (
          <polyline points={blPts} fill="none" stroke={color}
            strokeWidth="1.5" strokeDasharray="5 3" opacity="0.38" />
        )}

        {/* current run */}
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
        <circle cx={lx} cy={ly} r="3" fill={color} />
        <text x={labelX} y={ly - 5} textAnchor={anchor} fontSize="9" fill={color} fontWeight="bold">
          {lastVal.toFixed(1)}%
        </text>

        <Crosshair lines={curLines} blLines={blLines} />
      </g>
    )
  }

  // ── State Maps ────────────────────────────────────────────────────────────
  function StateMaps() {
    const { history, N } = snap
    const yMax = 100

    const hoverEntry   = hoverDay != null ? nearestEntry(history, hoverDay) : null
    const hoverBlEntry = hoverDay != null && baseline ? nearestEntry(baseline.history, hoverDay) : null
    const cx           = hoverEntry ? xAt(hoverEntry.day) : null

    // Splitter mode: cursor is active and baseline exists
    const splitterActive = !!(baseline && cx != null)

    // Compute stacked polygon points from any history array + population N
    const stackPoly = (hist, popN, ki) => {
      const topKeys = STACK_ORDER.slice(0, ki + 1)
      const botKeys = STACK_ORDER.slice(0, ki)
      const topY = h => yAt(topKeys.reduce((s, k) => s + (h[k] || 0), 0) / popN * 100, yMax)
      const botY = h => yAt(botKeys.reduce((s, k) => s + (h[k] || 0), 0) / popN * 100, yMax)
      const fwd = hist.map(h => `${xAt(h.day).toFixed(1)},${topY(h).toFixed(1)}`)
      const rev = [...hist].reverse().map(h => `${xAt(h.day).toFixed(1)},${botY(h).toFixed(1)}`)
      return [...fwd, ...rev].join(' ')
    }

    // Separator line points between two adjacent zones
    const sepPts = (hist, popN, ki) => {
      const topKeys = STACK_ORDER.slice(0, ki + 1)
      return hist.map(h =>
        `${xAt(h.day).toFixed(1)},${yAt(topKeys.reduce((s, k) => s + (h[k] || 0), 0) / popN * 100, yMax).toFixed(1)}`
      ).join(' ')
    }

    // Static baseline dashed boundary outlines — shown only when no cursor hover
    const blBoundaries = (!splitterActive && baseline)
      ? STACK_ORDER.slice(0, -1).map((_, ki) => ({
          pts: baseline.history.map(h => {
            const topKeys = STACK_ORDER.slice(0, ki + 1)
            return `${xAt(h.day).toFixed(1)},${yAt(topKeys.reduce((s, k) => s + (h[k] || 0), 0) / baseline.N * 100, yMax).toFixed(1)}`
          }).join(' '),
          color: STATE_COLORS[STACK_ORDER[ki + 1]],
        }))
      : null

    const ROW_H  = 11
    const COL_BL = baseline ? 34 : 0
    const COL_WI = 32
    const BOX_W  = 28 + COL_BL + COL_WI

    return (
      <g>
        <Axes chartW={chartW} chartH={chartH} xAt={xAt} yAt={yAt}
          yMax={yMax} xTicks={xTicks} yTicks={[0, 25, 50, 75, 100]}
          yFmt={v => v + '%'} />

        {/* SVG clipPaths for splitter — NOW=left, BL=right */}
        {splitterActive && (
          <defs>
            <clipPath id="sm-now">
              <rect x={PAD.left} y={PAD.top} width={cx - PAD.left} height={chartH} />
            </clipPath>
            <clipPath id="sm-bl">
              <rect x={cx} y={PAD.top} width={PAD.left + chartW - cx} height={chartH} />
            </clipPath>
          </defs>
        )}

        {/* Static baseline boundary outlines (no cursor hover) */}
        {blBoundaries?.map(({ pts, color }, i) => (
          <polyline key={`bl-b-${i}`} points={pts} fill="none"
            stroke={color} strokeWidth="1.25" strokeDasharray="4 3" opacity="0.55" />
        ))}

        {/* Splitter: baseline fills + separators on RIGHT side of cursor */}
        {splitterActive && STACK_ORDER.map((key, ki) => (
          <polygon key={`bl-${key}`}
            points={stackPoly(baseline.history, baseline.N, ki)}
            fill={STATE_COLORS[key]} fillOpacity={0.82} stroke="none"
            clipPath="url(#sm-bl)" />
        ))}
        {splitterActive && STACK_ORDER.slice(0, -1).map((_, ki) => (
          <polyline key={`bl-sep-${ki}`} points={sepPts(baseline.history, baseline.N, ki)}
            fill="none" stroke="#000" strokeWidth="0.5" strokeOpacity="0.3"
            clipPath="url(#sm-bl)" />
        ))}

        {/* NOW fills + separators — full width normally, clipped LEFT in splitter mode */}
        {STACK_ORDER.map((key, ki) => (
          <polygon key={key}
            points={stackPoly(history, N, ki)}
            fill={STATE_COLORS[key]} fillOpacity={0.88} stroke="none"
            clipPath={splitterActive ? 'url(#sm-now)' : undefined} />
        ))}
        {STACK_ORDER.slice(0, -1).map((_, ki) => (
          <polyline key={`sep-${ki}`} points={sepPts(history, N, ki)}
            fill="none" stroke="#000" strokeWidth="0.5" strokeOpacity="0.3"
            clipPath={splitterActive ? 'url(#sm-now)' : undefined} />
        ))}

        {/* Splitter divider line + side labels */}
        {splitterActive && (
          <g>
            <line x1={cx} y1={PAD.top} x2={cx} y2={PAD.top + chartH}
              stroke="#fff" strokeWidth="1.5" strokeOpacity="0.40" />
            <text x={cx - 4} y={PAD.top + 10} textAnchor="end"   fontSize="8" fill="#9ca3af">NOW</text>
            <text x={cx + 4} y={PAD.top + 10} textAnchor="start" fontSize="8" fill="#9ca3af">BL</text>
          </g>
        )}

        {/* Crosshair: cursor line (non-splitter) + day label + data table */}
        {hoverEntry && cx != null && (() => {
          const bx = cx + 6 > PAD.left + chartW - BOX_W - 4 ? cx - BOX_W - 4 : cx + 6
          // push table below the NOW/BL side labels when splitter is active
          const by = PAD.top + (splitterActive ? 18 : 4)
          return (
            <g>
              {!splitterActive && (
                <line x1={cx} y1={PAD.top} x2={cx} y2={PAD.top + chartH}
                  stroke="#9ca3af" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.6" />
              )}
              <text x={cx} y={PAD.top - 2} textAnchor="middle" fontSize="9" fill="#6b7280">
                {hoverEntry.day}d
              </text>

              <rect x={bx - 2} y={by - 2} width={BOX_W} height={STACK_TOP_DOWN.length * ROW_H + 8}
                fill="#111827" fillOpacity="0.92" rx="2" />

              {baseline && (
                <g>
                  <text x={bx + 24 + COL_BL / 2}        y={by + 5} fontSize="8" fill="#9ca3af" textAnchor="middle">Now</text>
                  <text x={bx + 24 + COL_BL + COL_WI / 2} y={by + 5} fontSize="8" fill="#6b7280" textAnchor="middle">BL</text>
                </g>
              )}

              {STACK_TOP_DOWN.map((key, i) => {
                const count   = hoverEntry[key] ?? 0
                const pct     = N > 0 ? (count / N * 100).toFixed(0) : '0'
                const blCount = hoverBlEntry?.[key] ?? 0
                const blPct   = baseline && baseline.N > 0
                  ? (blCount / baseline.N * 100).toFixed(0) : null
                const rowY = by + (baseline ? ROW_H : 0) + i * ROW_H + ROW_H - 1
                return (
                  <g key={key}>
                    <rect x={bx} y={rowY - ROW_H + 2} width={8} height={8}
                      fill={STATE_COLORS[key]} fillOpacity="0.88" rx="1" />
                    <text x={bx + 11} y={rowY} fontSize="9" fill={STATE_COLORS[key]}>
                      {STACK_LABELS[key].slice(0, 3)}
                    </text>
                    <text x={baseline ? bx + 24 + COL_BL / 2 : bx + 24 + COL_WI / 2} y={rowY}
                      fontSize="9" fill={STATE_COLORS[key]} textAnchor="middle" fontWeight="bold">
                      {pct}%
                    </text>
                    {baseline && blPct != null && (
                      <text x={bx + 24 + COL_BL + COL_WI / 2} y={rowY}
                        fontSize="9" fill={STATE_COLORS[key]} textAnchor="middle" opacity="0.6">
                        {blPct}%
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          )
        })()}
      </g>
    )
  }

  // ── Daily New ─────────────────────────────────────────────────────────────
  function DailyNew() {
    const { history, N } = snap

    const daily1 = history.map((h, i) => ({
      day: h.day,
      pct: i === 0 ? everInfectedPct(h, N)
                   : Math.max(0, everInfectedPct(h, N) - everInfectedPct(history[i - 1], N)),
    }))
    const daily2 = history.map((h, i) => ({
      day: h.day,
      pct: daily1[i].pct + (N > 0 ? (h.riToday ?? 0) / N * 100 : 0),
    }))

    // baseline series
    const blDaily1 = baseline?.history.map((h, i) => ({
      day: h.day,
      pct: i === 0 ? everInfectedPct(h, baseline.N)
                   : Math.max(0, everInfectedPct(h, baseline.N) - everInfectedPct(baseline.history[i - 1], baseline.N)),
    }))
    const blDaily2 = baseline?.history.map((h, i) => ({
      day: h.day,
      pct: (blDaily1[i].pct) + (baseline.N > 0 ? (h.riToday ?? 0) / baseline.N * 100 : 0),
    }))

    const rawMax = Math.max(
      ...daily1.map(d => d.pct), ...daily2.map(d => d.pct),
      ...(blDaily1 ?? []).map(d => d.pct), ...(blDaily2 ?? []).map(d => d.pct),
      0
    )
    const yMax = rawMax > 0 ? rawMax * 1.3 : 1

    const pts1   = daily1.map(d => `${xAt(d.day).toFixed(1)},${yAt(d.pct, yMax).toFixed(1)}`).join(' ')
    const pts2   = daily2.map(d => `${xAt(d.day).toFixed(1)},${yAt(d.pct, yMax).toFixed(1)}`).join(' ')
    const baseY  = (PAD.top + chartH).toFixed(1)
    const area1  = `${xAt(daily1[0].day).toFixed(1)},${baseY} ${pts1} ${xAt(daily1[daily1.length - 1].day).toFixed(1)},${baseY}`

    const blPts1 = blDaily1?.map(d => `${xAt(d.day).toFixed(1)},${yAt(d.pct, yMax).toFixed(1)}`).join(' ')
    const blPts2 = blDaily2?.map(d => `${xAt(d.day).toFixed(1)},${yAt(d.pct, yMax).toFixed(1)}`).join(' ')

    const peak1  = rawMax > 0 ? daily1.reduce((a, b) => b.pct > a.pct ? b : a) : null
    const peak2  = Math.max(...daily2.map(d => d.pct)) > Math.max(...daily1.map(d => d.pct))
      ? daily2.reduce((a, b) => b.pct > a.pct ? b : a) : null

    // crosshair
    const hE   = hoverDay != null ? nearestEntry(daily1, hoverDay) : null
    const hE2  = hoverDay != null ? nearestEntry(daily2, hoverDay) : null
    const hBl1 = hoverDay != null && blDaily1 ? nearestEntry(blDaily1, hoverDay) : null
    const hBl2 = hoverDay != null && blDaily2 ? nearestEntry(blDaily2, hoverDay) : null

    const curLines = [
      ...(hE  ? [{ y: yAt(hE.pct,  yMax), color: STATE_COLORS.I, label: hE.pct.toFixed(2)  + '%' }] : []),
      ...(hE2 && hE2.pct !== hE?.pct ? [{ y: yAt(hE2.pct, yMax), color: C_REINF,         label: hE2.pct.toFixed(2) + '%' }] : []),
    ]
    const blLines = [
      ...(hBl1 ? [{ y: yAt(hBl1.pct, yMax), color: STATE_COLORS.I, label: hBl1.pct.toFixed(2) + '%' }] : []),
      ...(hBl2 && hBl2.pct !== hBl1?.pct ? [{ y: yAt(hBl2.pct, yMax), color: C_REINF, label: hBl2.pct.toFixed(2) + '%' }] : []),
    ]

    return (
      <g>
        <Axes chartW={chartW} chartH={chartH} xAt={xAt} yAt={yAt}
          yMax={yMax} xTicks={xTicks} yTicks={autoTicks(yMax)} yFmt={v => v.toFixed(1) + '%'} />

        {/* Baseline ghost lines */}
        {blPts2 && <polyline points={blPts2} fill="none" stroke={C_REINF} strokeWidth="1.25"
          strokeDasharray="4 2" opacity="0.35" />}
        {blPts1 && <polyline points={blPts1} fill="none" stroke={STATE_COLORS.I} strokeWidth="1.5"
          strokeDasharray="5 3" opacity="0.38" />}

        {/* Current run */}
        <polygon points={area1} fill={STATE_COLORS.I} fillOpacity={0.12} stroke="none" />
        <polyline points={pts2} fill="none" stroke={C_REINF} strokeWidth="1.5"
          strokeDasharray="4 2" strokeLinejoin="round" />
        <polyline points={pts1} fill="none" stroke={STATE_COLORS.I} strokeWidth="1.75" strokeLinejoin="round" />

        {peak1 && (
          <g>
            <circle cx={xAt(peak1.day)} cy={yAt(peak1.pct, yMax)} r="3" fill={STATE_COLORS.I} />
            <text x={xAt(peak1.day)} y={yAt(peak1.pct, yMax) - 6}
              textAnchor="middle" fontSize="9" fill={STATE_COLORS.I}>
              {peak1.pct.toFixed(1)}%
            </text>
          </g>
        )}
        {peak2 && (
          <g>
            <circle cx={xAt(peak2.day)} cy={yAt(peak2.pct, yMax)} r="3" fill={C_REINF} />
            <text x={xAt(peak2.day)} y={yAt(peak2.pct, yMax) - 6}
              textAnchor="middle" fontSize="9" fill={C_REINF}>
              {peak2.pct.toFixed(1)}%
            </text>
          </g>
        )}

        <Crosshair lines={curLines} blLines={blLines} />
      </g>
    )
  }

  // ── Legend ────────────────────────────────────────────────────────────────
  function Legend() {
    const lineItem = (color, label, dashed = false) => (
      <div className="flex items-center gap-2">
        <svg width="20" height="4" className="shrink-0">
          <line x1="0" y1="2" x2="20" y2="2"
            stroke={color} strokeWidth="2" strokeDasharray={dashed ? '4 2' : undefined} />
        </svg>
        <span className="font-mono text-[10px] leading-tight" style={{ color }}>{label}</span>
      </div>
    )
    if (mode === 'cum-inf')   return lineItem(C_INF,         'Cumul. infected %')
    if (mode === 'cum-dead')  return lineItem(C_DEAD,        'Cumul. deaths %')
    if (mode === 'daily-new') return (
      <div className="flex flex-col gap-2">
        {lineItem(STATE_COLORS.I, 'Daily new (unique)')}
        {lineItem(C_REINF, 'Incl. reinfections', true)}
        {baseline && (
          <div className="mt-1 pt-1 border-t border-gray-800">
            <span className="font-mono text-[9px] text-gray-600">Dashed = baseline</span>
          </div>
        )}
      </div>
    )
    if (mode === 'state-maps') return (
      <div className="flex flex-col gap-1.5">
        {[...STACK_ORDER].reverse().map(key => (
          <div key={key} className="flex items-center gap-2">
            <div className="shrink-0 w-3 h-3 rounded-sm" style={{ background: STATE_COLORS[key], opacity: 0.88 }} />
            <span className="font-mono text-[10px] text-gray-400 leading-tight">{STACK_LABELS[key]}</span>
          </div>
        ))}
        {baseline && (
          <div className="mt-1 pt-1 border-t border-gray-800">
            <span className="font-mono text-[9px] text-gray-600">Hover to split Now / BL</span>
          </div>
        )}
      </div>
    )
    return null
  }

  return (
    <div className="flex-1 flex flex-col border-r border-gray-800 min-w-0 overflow-hidden">

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 pt-2 pb-1.5 border-b border-green-900 gap-2">

        {/* Left: label + baseline buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-green-500 font-mono text-[10px] tracking-widest uppercase">
            Trend
          </div>
          <button
            onClick={handleSetBaseline}
            disabled={!canSetBaseline}
            title={baseline ? 'Replace the current baseline with this run' : 'Save this run as the baseline reference'}
            className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold transition-colors ${
              canSetBaseline
                ? baseline
                  ? 'bg-amber-700 hover:bg-amber-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                : 'bg-gray-900 text-gray-700 cursor-not-allowed'
            }`}
          >
            {baseline ? 'Update BL' : 'Set BL'}
          </button>
          {baseline && (
            <button
              onClick={onRemoveBaseline}
              title="Remove baseline and return to single-run view"
              className="px-2 py-0.5 rounded font-mono text-[10px] font-bold transition-colors bg-gray-800 hover:bg-gray-700 text-gray-400"
            >
              Clear BL
            </button>
          )}
        </div>

        {/* Right: mode buttons */}
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

      {/* Chart + Legend */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        <div ref={containerRef} className="flex-1 relative min-h-0 overflow-hidden">
          {!hasData ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-gray-700 font-mono text-xs italic">Run a simulation to see data</span>
            </div>
          ) : (
            <svg width={W} height={H}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: 'crosshair' }}
            >
              {mode === 'cum-inf'  && (
                <SingleLine
                  getValue={h => everInfectedPct(h, snap.N)}
                  color={C_INF}
                  yMax={Math.max(
                    infMax,
                    baseline ? Math.max(...baseline.history.map(h => everInfectedPct(h, baseline.N)), 0) : 0,
                    5
                  ) * 1.15}
                  yTicks={autoTicks(Math.max(
                    infMax,
                    baseline ? Math.max(...baseline.history.map(h => everInfectedPct(h, baseline.N)), 0) : 0,
                    5
                  ) * 1.15)}
                />
              )}
              {mode === 'cum-dead' && (
                <SingleLine
                  getValue={h => (h.D / snap.N) * 100}
                  color={C_DEAD}
                  yMax={Math.max(
                    deadMax,
                    baseline ? Math.max(...baseline.history.map(h => (h.D / baseline.N) * 100), 0) : 0,
                    0.5
                  ) * 1.3}
                  yTicks={autoTicks(Math.max(
                    deadMax,
                    baseline ? Math.max(...baseline.history.map(h => (h.D / baseline.N) * 100), 0) : 0,
                    0.5
                  ) * 1.3)}
                />
              )}
              {mode === 'state-maps' && <StateMaps />}
              {mode === 'daily-new'  && <DailyNew  />}
            </svg>
          )}
        </div>

        <div className="w-28 shrink-0 border-l border-gray-800 flex flex-col justify-center px-3 gap-2">
          {hasData ? <Legend /> : null}
        </div>
      </div>
    </div>
  )
}
