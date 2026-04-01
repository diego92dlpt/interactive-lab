import { useEffect, useRef, useState, useCallback } from 'react'
import { createSimState, defaultConfig, tickSim } from './engine.js'
import { drawFrame, computeCanvasSize } from './renderer.js'
import { DEBUG_MODE, TICKS_PER_DAY, FENCE_RADIUS_MULT } from './constants.js'
import { computeDotRadius, computeBaseSpeed } from './physics.js'
import DebugOverlay from './debug/DebugOverlay.jsx'
import ConfigPanel from './components/ConfigPanel.jsx'
import Dashboard   from './components/Dashboard.jsx'
import LineChart        from './components/LineChart.jsx'
import PopulationChart  from './components/PopulationChart.jsx'

export default function Outbreak() {
  const canvasRef     = useRef(null)
  const containerRef  = useRef(null)
  const simRef        = useRef(null)
  const configRef     = useRef(null)
  const rafRef        = useRef(null)
  const ctxRef        = useRef(null)
  const canvasSizeRef = useRef({ w: 800, h: 450 })
  const simEndedRef      = useRef(false)
  const pausedRef        = useRef(true)
  const dayRef           = useRef(0)
  const speedRef         = useRef(1)   // ticks per frame (0.5 = every other frame)
  const frameCountRef    = useRef(0)   // total frames elapsed, for sub-1× gating
  const lastRunConfigRef = useRef(null) // config snapshot at last startSim call

  const [speed, setSpeed]               = useState(1)   // 0.2 | 0.5 | 1 | 2 | 5 | 10
  const [endSnap, setEndSnap]           = useState(null)
  const [staged, setStaged]             = useState(() => {
    try {
      const saved = localStorage.getItem('outbreak-config')
      if (saved) return { ...defaultConfig(), ...JSON.parse(saved) }
    } catch {}
    return defaultConfig()
  })
  const [simStarted, setSimStarted]     = useState(false)
  const [simEnded, setSimEnded]         = useState(false)
  const [paused, setPaused]             = useState(true)
  const [midSimPaused, setMidSimPaused] = useState(false)
  const [day, setDay]                   = useState(0)

  // ── Start / restart simulation ─────────────────────────────────────────────
  const startSim = useCallback((cfg, autoPlay = false) => {
    const { w, h } = canvasSizeRef.current
    const liveCfg = { ...cfg, canvasW: w, canvasH: h }
    configRef.current      = liveCfg
    lastRunConfigRef.current = liveCfg
    simRef.current         = createSimState(liveCfg)
    simEndedRef.current    = false
    dayRef.current         = 0
    setSimStarted(true)
    setSimEnded(false)
    setEndSnap(null)
    setMidSimPaused(false)
    setDay(0)
    pausedRef.current = !autoPlay
    setPaused(!autoPlay)
  }, [])

  // ── Canvas setup + RAF loop (mount once) ──────────────────────────────────
  useEffect(() => {
    const canvas    = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const dpr = window.devicePixelRatio || 1
    const { w, h } = computeCanvasSize(container.clientWidth, container.clientHeight)
    canvasSizeRef.current = { w, h }

    canvas.width        = w * dpr
    canvas.height       = h * dpr
    canvas.style.width  = w + 'px'
    canvas.style.height = h + 'px'

    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctxRef.current = ctx

    const savedOverrides = (() => {
      try { const s = localStorage.getItem('outbreak-config'); return s ? JSON.parse(s) : null } catch { return null }
    })()
    const initialCfg = { ...defaultConfig(w, h), ...(savedOverrides ?? {}), canvasW: w, canvasH: h }
    setStaged(initialCfg)
    configRef.current   = initialCfg
    simRef.current      = createSimState(initialCfg)
    simEndedRef.current = false
    pausedRef.current   = true

    function loop() {
      const sim = simRef.current
      const cfg = configRef.current

      frameCountRef.current++

      if (sim && cfg && !sim.endCondition && !pausedRef.current) {
        const spd = speedRef.current
        if (spd < 1) {
          // sub-1× — tick once every N frames
          if (frameCountRef.current % Math.round(1 / spd) === 0) tickSim(sim, cfg)
        } else {
          // ≥1× — run target ticks but stop if we hit 14ms frame budget
          // (prevents RAF from stalling at high N × high speed)
          const target   = Math.round(spd)
          const deadline = performance.now() + 14
          for (let i = 0; i < target; i++) {
            if (sim.endCondition) break
            if (performance.now() > deadline) break
            tickSim(sim, cfg)
          }
        }
        const newDay = Math.floor(sim.tick / TICKS_PER_DAY)
        if (newDay !== dayRef.current) {
          dayRef.current = newDay
          setDay(newDay)
        }
      } else if (sim?.endCondition && !simEndedRef.current) {
        simEndedRef.current = true
        setSimEnded(true)
        setMidSimPaused(false)
        pausedRef.current = true
        setPaused(true)
        const finalDay = Math.floor(sim.tick / TICKS_PER_DAY)
        if (finalDay !== dayRef.current) { dayRef.current = finalDay; setDay(finalDay) }
        // Capture end snapshot for summary overlay
        const N = sim.dots.length
        const peakInfPct = sim.history.length > 0
          ? Math.max(...sim.history.map(h => N > 0 ? (N - h.S - h.V) / N * 100 : 0))
          : 0
        const r0 = sim.cumStats.resolvedIndexCases >= 10
          ? sim.cumStats.totalSecondaryInfections / sim.cumStats.resolvedIndexCases
          : null
        setEndSnap({
          reason:     sim.endCondition,
          peakInfPct,
          deathPct:   N > 0 ? (sim.counts.D / N) * 100 : 0,
          finalDay,
          r0,
        })
      }

      if (ctxRef.current && sim) {
        const { w: cw, h: ch } = canvasSizeRef.current
        drawFrame(ctxRef.current, sim, cw, ch)
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    // ── Canvas resize handler ──────────────────────────────────────────────
    const handleResize = () => {
      const { w: newW, h: newH } = computeCanvasSize(container.clientWidth, container.clientHeight)
      const { w: oldW, h: oldH } = canvasSizeRef.current
      if (newW === oldW && newH === oldH) return

      // Resize canvas pixel buffer + CSS size
      const dpr2 = window.devicePixelRatio || 1
      canvas.width        = newW * dpr2
      canvas.height       = newH * dpr2
      canvas.style.width  = newW + 'px'
      canvas.style.height = newH + 'px'

      // Reset ctx DPR transform (ctx.scale is cumulative — must use setTransform)
      if (ctxRef.current) ctxRef.current.setTransform(dpr2, 0, 0, dpr2, 0, 0)

      canvasSizeRef.current = { w: newW, h: newH }
      if (configRef.current) configRef.current = { ...configRef.current, canvasW: newW, canvasH: newH }

      // Rescale live sim to new dimensions
      const sim = simRef.current
      if (sim) {
        const scaleX = newW / oldW
        const scaleY = newH / oldH
        const N      = sim.dots.length
        const cfg    = configRef.current

        // Rescale dot positions
        for (const dot of sim.dots) {
          dot.x *= scaleX
          dot.y *= scaleY
        }

        // Recompute physics parameters for new arena size
        const newRadius = computeDotRadius(newW, newH, N, cfg?.dotRadiusMult ?? 0.35)
        const newSpeed  = computeBaseSpeed(newW, newH, N, cfg?.temperature  ?? 0.30)
        const vScale    = sim.baseSpeed > 0 ? newSpeed / sim.baseSpeed : 1

        // Rescale velocities to match new base speed
        for (const dot of sim.dots) {
          dot.vx *= vScale
          dot.vy *= vScale
        }

        // Rescale quarantine fences
        for (const fence of sim.fences) {
          fence.x      *= scaleX
          fence.y      *= scaleY
          fence.radius  = FENCE_RADIUS_MULT * newRadius
        }

        sim.canvasW   = newW
        sim.canvasH   = newH
        sim.dotRadius = newRadius
        sim.baseSpeed = newSpeed
      }
    }

    const ro = new ResizeObserver(handleResize)
    ro.observe(container)

    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect() }
  }, [])

  // ── Control handlers ──────────────────────────────────────────────────────
  const handleRun    = useCallback(() => { startSim(staged, true)  }, [staged, startSim])
  const handleReset  = useCallback(() => { startSim(staged, false) }, [staged, startSim])

  const handlePause  = useCallback(() => {
    pausedRef.current = true; setPaused(true); setMidSimPaused(true)
  }, [])

  const handleResume = useCallback(() => {
    pausedRef.current = false; setPaused(false)
  }, [])

  // ── Button state machine ──────────────────────────────────────────────────
  const isRunning      = simStarted && !simEnded && !paused
  const isPausedMidRun = simStarted && !simEnded && paused && midSimPaused
  const showRun        = !isRunning && !isPausedMidRun

  // ── Param change indicator ────────────────────────────────────────────────
  const USER_PARAM_KEYS = ['N','initialInfected','initialVaxPct','p','ifr','riPct','viPct',
    'incubationDays','infectiousDays','temperature','qp','qcPct','mwPct','mePct',
    'maxDays','fizzleDays','dotRadiusMult','collisionRadiusMult','brownianMotion']
  const paramsChanged = simStarted && lastRunConfigRef.current
    && USER_PARAM_KEYS.some(k => staged[k] !== lastRunConfigRef.current[k])

  // ── End reason labels ─────────────────────────────────────────────────────
  const END_REASONS = {
    'no-i':    'Epidemic ended — no active cases',
    'fizzle':  'Transmission fizzled out',
    'max-days':'Max simulation days reached',
  }

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center px-5 py-3 border-b border-gray-800 shrink-0">
        <span className="text-green-400 font-mono text-xs tracking-widest uppercase mr-4">Experiment #2</span>
        <span className="text-white font-bold text-lg">Outbreak</span>
        {DEBUG_MODE && <span className="ml-auto text-gray-700 font-mono text-xs">Shift+D — debug</span>}
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Left column: [dashboard | canvas] + control bar + charts row */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Canvas row: Dashboard sidebar + Canvas */}
          <div className="flex-1 flex min-h-0 overflow-hidden">

            {/* Dashboard sidebar — full canvas height */}
            <div className="w-52 shrink-0 border-r border-gray-800 bg-gray-950 overflow-y-auto">
              <Dashboard simRef={simRef} simStarted={simStarted} speed={speed} />
            </div>

            {/* Canvas */}
            <div ref={containerRef}
              className="flex-1 bg-black flex items-center justify-center min-w-0 relative">
              <canvas ref={canvasRef} className="block rounded" />

              {/* ── End-state overlay ──────────────────────────────────── */}
              {endSnap && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-gray-950 bg-opacity-90 border border-gray-700 rounded-lg px-6 py-4 min-w-48 shadow-xl">
                    <div className="text-green-400 font-mono text-[10px] tracking-widest uppercase mb-1">
                      Simulation ended
                    </div>
                    <div className="text-white font-mono text-xs mb-3">
                      {END_REASONS[endSnap.reason] ?? endSnap.reason}
                    </div>
                    <div className="space-y-1">
                      {[
                        ['Peak infected',  endSnap.peakInfPct.toFixed(1) + '%'],
                        ['Total deaths',   endSnap.deathPct.toFixed(1)   + '%'],
                        ['Duration',       endSnap.finalDay + ' days'],
                        ['Emergent R₀',    endSnap.r0 != null ? endSnap.r0.toFixed(2) : '< 10 cases'],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-6">
                          <span className="text-gray-500 font-mono text-[11px]">{label}</span>
                          <span className="text-gray-200 font-mono text-[11px] tabular-nums">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Control bar ────────────────────────────────────────────── */}
          <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-t border-gray-800 bg-gray-950">
            <span className="text-gray-500 font-mono text-sm tabular-nums w-20">Day {day}</span>

            <div className="flex items-center gap-2">
              {showRun ? (
                <button onClick={handleRun}
                  className="px-4 py-1.5 rounded font-mono text-xs font-bold tracking-wide transition-colors bg-green-500 hover:bg-green-400 active:bg-green-600 text-black">
                  {simEnded ? '↺  Run Again' : '▶  Run'}
                </button>
              ) : isRunning ? (
                <button onClick={handlePause}
                  className="px-4 py-1.5 rounded font-mono text-xs font-bold tracking-wide transition-colors bg-gray-700 hover:bg-gray-600 text-gray-300">
                  ⏸  Pause
                </button>
              ) : (
                <button onClick={handleResume}
                  className="px-4 py-1.5 rounded font-mono text-xs font-bold tracking-wide transition-colors bg-yellow-500 hover:bg-yellow-400 text-black">
                  ▶  Resume
                </button>
              )}

              <div className="flex flex-col items-start gap-0.5">
                <button onClick={handleReset}
                  className="px-4 py-1.5 rounded font-mono text-xs font-bold tracking-wide transition-colors bg-gray-800 hover:bg-gray-700 text-gray-400">
                  ↺  Reset
                </button>
                {paramsChanged && (
                  <span className="text-yellow-600 font-mono text-[9px] pl-1">⚠ reset to apply changes</span>
                )}
              </div>
            </div>

            <div className="ml-auto flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-mono text-xs">Speed:</span>
                {[0.2, 0.5, 1, 2, 5, 10].map(s => (
                  <button key={s}
                    onClick={() => { speedRef.current = s; setSpeed(s) }}
                    className={`px-2 py-1 rounded font-mono text-xs font-bold transition-colors ${
                      speed === s
                        ? 'bg-green-500 text-black'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                    }`}>
                    {s}×
                  </button>
                ))}
              </div>
              <span className="text-gray-700 font-mono text-[9px] italic">
                max effective speed depends on dot count &amp; your device
              </span>
            </div>
          </div>

          {/* ── Analytics row: Line chart + Population bar chart ───────── */}
          <div className="shrink-0 h-52 flex border-t border-gray-800 bg-gray-950">

            <LineChart simRef={simRef} configRef={configRef} simStarted={simStarted} speed={speed} />

            <PopulationChart simRef={simRef} simStarted={simStarted} speed={speed} />

          </div>
        </div>

        {/* ── Config panel — full-height right column ─────────────────── */}
        <div className="w-72 shrink-0 border-l border-gray-800 overflow-y-auto bg-gray-950">
          <ConfigPanel config={staged} onChange={cfg => {
            setStaged(cfg)
            try { localStorage.setItem('outbreak-config', JSON.stringify(cfg)) } catch {}
          }} />
        </div>
      </div>

      <DebugOverlay simRef={simRef} config={configRef} running={true} />
    </div>
  )
}
