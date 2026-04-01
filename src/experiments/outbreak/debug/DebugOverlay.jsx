import { useEffect, useState } from 'react'
import { DEBUG_MODE, TICKS_PER_DAY } from '../constants.js'

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmt(n, decimals = 0) {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })
}

function pct(n, decimals = 1) {
  if (n == null || isNaN(n)) return '—'
  return (n * 100).toFixed(decimals) + '%'
}

function checkmark(ok) {
  return ok ? <span style={{ color: '#4ade80' }}>✓</span> : <span style={{ color: '#f87171' }}>✗</span>
}

function placeholder(phase) {
  return <span style={{ color: '#4b5563', fontStyle: 'italic' }}>[not yet built — Phase {phase}]</span>
}

// ─── SECTION WRAPPER ─────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 14, borderBottom: '1px solid #1f2937', paddingBottom: 10 }}>
      <div style={{ color: '#6b7280', fontSize: 10, letterSpacing: '0.1em',
                    textTransform: 'uppercase', marginBottom: 6 }}>{title}</div>
      <div>{children}</div>
    </div>
  )
}

function Row({ label, value, warn }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16,
                  color: warn ? '#fbbf24' : '#d1d5db', marginBottom: 2, fontSize: 12 }}>
      <span style={{ color: '#9ca3af' }}>{label}</span>
      <span style={{ fontFamily: 'monospace' }}>{value}</span>
    </div>
  )
}

// ─── MAIN OVERLAY ─────────────────────────────────────────────────────────────

export default function DebugOverlay({ simRef, config: configOrRef, running }) {
  // Accept either a plain config object or a React ref wrapping one
  const config = configOrRef?.current !== undefined ? configOrRef.current : configOrRef
  const [visible, setVisible]   = useState(false)
  const [snapshot, setSnapshot] = useState(null)

  // Shift+D toggle
  useEffect(() => {
    if (!DEBUG_MODE) return
    function onKey(e) {
      if (e.key === 'D' && e.shiftKey) setVisible(v => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Snapshot sim state every 30 ticks for display
  useEffect(() => {
    if (!visible || !simRef?.current) return
    const id = setInterval(() => {
      const s = simRef.current
      if (!s) return
      setSnapshot({
        tick:                 s.tick,
        counts:               { ...s.counts },
        cumStats:             { ...s.cumStats },
        speedStats:           { ...s.speedStats },
        totalInfections:      s.totalInfections,
        consecutiveZeroDays:  s.consecutiveZeroDays,
        endCondition:         s.endCondition,
        dotRadius:            s.dotRadius,
        baseSpeed:            s.baseSpeed,
        fences:               s.fences.length,
        dots:                 s.dots,
        N:                    s.dots.length,
      })
    }, 300)
    return () => clearInterval(id)
  }, [visible, simRef])

  if (!DEBUG_MODE || !visible) return null

  const s = snapshot
  if (!s) return (
    <div style={overlayStyle}>
      <div style={{ color: '#4b5563', fontSize: 12 }}>Waiting for simulation data…</div>
    </div>
  )

  const { counts, cumStats, speedStats, N } = s
  const stateSum = (counts.S ?? 0) + (counts.E ?? 0) + (counts.I ?? 0)
                 + (counts.R ?? 0) + (counts.D ?? 0) + (counts.V ?? 0)
  const stateSumOk = stateSum === N
  const day = s.tick / TICKS_PER_DAY

  // Transmission accuracy
  const obsP_SI = cumStats.siAttempts > 0 ? cumStats.siSuccesses / cumStats.siAttempts : null
  const obsP_RI = cumStats.riAttempts > 0 ? cumStats.riSuccesses / cumStats.riAttempts : null
  const obsP_VI = cumStats.viAttempts > 0 ? cumStats.viSuccesses / cumStats.viAttempts : null
  const configP = config?.p ?? 0

  const pSI_ok = obsP_SI == null || Math.abs(obsP_SI - configP) < 0.05
  const pRI_ok = obsP_RI == null || true // tolerance check vs effective p
  const pVI_ok = obsP_VI == null || true

  // IFR
  const obsIFR = cumStats.iResolutions >= 50
    ? cumStats.iDeaths / cumStats.iResolutions : null
  const configIFR = config?.ifr ?? 0
  const ifrOk = obsIFR == null || Math.abs(obsIFR - configIFR) < 0.03

  // R0
  const obsR0 = cumStats.resolvedIndexCases > 0
    ? cumStats.totalSecondaryInfections / cumStats.resolvedIndexCases : null

  // Quarantine
  const complianceRate = cumStats.iTransitions > 0
    ? cumStats.compliantCount / cumStats.iTransitions : null
  const configQC = config?.qcPct ?? 0
  const qcOk = complianceRate == null || Math.abs(complianceRate - configQC) < 0.1

  // Mask
  const maskedDots = s.dots ? s.dots.filter(d => d.hasMask).length : 0
  const configMW = config?.mwPct ?? 0
  const mwOk = Math.abs(maskedDots / N - configMW) < 0.03

  return (
    <div style={overlayStyle}>
      <div style={{ color: '#4ade80', fontSize: 11, letterSpacing: '0.15em',
                    textTransform: 'uppercase', marginBottom: 12 }}>
        ⚙ Debug Overlay — Shift+D to hide
      </div>

      {/* ── Section 1: State counts ── */}
      <Section title="1 · Dot population counts">
        <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#d1d5db',
                      marginBottom: 4 }}>
          S:{fmt(counts.S)}  E:{fmt(counts.E)}  I:{fmt(counts.I)}  R:{fmt(counts.R)}  D:{fmt(counts.D)}  V:{fmt(counts.V)}
        </div>
        <Row label="Total / N" value={`${fmt(stateSum)} / ${fmt(N)}`} />
        <div style={{ fontSize: 11, marginTop: 2 }}>
          {stateSumOk
            ? <>{checkmark(true)} <span style={{ color: '#4ade80' }}>State sum correct</span></>
            : <><span style={{ color: '#f87171' }}>⚠ STATE SUM MISMATCH: got {stateSum}, expected {N}</span></>}
        </div>
      </Section>

      {/* ── Section 2: Transmission accuracy ── */}
      <Section title="2 · Transmission coin toss accuracy">
        <Row label="Configured p" value={pct(configP)} />
        <Row label="S×I attempts / successes"
             value={`${fmt(cumStats.siAttempts)} / ${fmt(cumStats.siSuccesses)}`} />
        <Row label="S×I observed p" value={obsP_SI != null ? pct(obsP_SI) : '—'} />
        {obsP_SI != null && <div style={{ fontSize: 11 }}>{checkmark(pSI_ok)}</div>}
        {cumStats.riAttempts > 0 && <>
          <Row label="R×I attempts / successes"
               value={`${fmt(cumStats.riAttempts)} / ${fmt(cumStats.riSuccesses)}`} />
          <Row label="R×I observed p" value={obsP_RI != null ? pct(obsP_RI) : '—'} />
        </>}
        {cumStats.viAttempts > 0 && <>
          <Row label="V×I attempts / successes"
               value={`${fmt(cumStats.viAttempts)} / ${fmt(cumStats.viSuccesses)}`} />
          <Row label="V×I observed p" value={obsP_VI != null ? pct(obsP_VI) : '—'} />
        </>}
        {cumStats.siAttempts < 500 &&
          <div style={{ color: '#4b5563', fontSize: 11, marginTop: 4 }}>
            (meaningful after 500+ S×I attempts)
          </div>}
      </Section>

      {/* ── Section 3: IFR ── */}
      <Section title="3 · IFR verification">
        <Row label="Configured IFR" value={pct(configIFR)} />
        <Row label="I resolutions" value={fmt(cumStats.iResolutions)} />
        <Row label="Deaths (D)" value={fmt(cumStats.iDeaths)} />
        <Row label="Recoveries" value={fmt(cumStats.iResolutions - cumStats.iDeaths)} />
        {obsIFR != null
          ? <><Row label="Observed IFR" value={pct(obsIFR)} />
              <div style={{ fontSize: 11 }}>{checkmark(ifrOk)}</div></>
          : <div style={{ color: '#4b5563', fontSize: 11 }}>
              (meaningful after 50+ resolutions)
            </div>}
      </Section>

      {/* ── Section 4: R0 ── */}
      <Section title="4 · Emergent R₀">
        <Row label="Resolved index cases" value={fmt(cumStats.resolvedIndexCases)} />
        {obsR0 != null
          ? <Row label="Observed R₀ (mean sec. infections)" value={fmt(obsR0, 2)} />
          : <div style={{ color: '#4b5563', fontSize: 11 }}>
              Live rolling R₀ readout {placeholder(6)}
            </div>}
      </Section>

      {/* ── Section 5: Motion physics ── */}
      <Section title="5 · Motion physics">
        <Row
          label="Motion model (live)"
          value={config?.brownianMotion === false ? 'BALLISTIC' : 'BROWNIAN'}
          warn={config?.brownianMotion === false}
        />
        <Row label="Temperature (k)" value={config?.temperature ?? '—'} />
        <Row label="BASE_SPEED" value={fmt(s.baseSpeed, 2) + ' px/tick'} />
        <Row label="Dot radius" value={fmt(s.dotRadius, 2) + ' px'} />
        <Row label="Avg dot speed" value={fmt(speedStats.avg, 2) + ' px/tick'} />
        <Row label="Max dot speed" value={fmt(speedStats.max, 2) + ' px/tick'} />
        <Row label="Min dot speed" value={fmt(speedStats.min, 2) + ' px/tick'} />
        <Row label="Wall bounces (total)" value={fmt(cumStats.wallBounces)} />
        <Row label="Dot–dot bounces (total)" value={fmt(cumStats.dotDotBounces)} />
        {speedStats.avg > 0 && (() => {
          const dev = Math.abs(speedStats.avg - s.baseSpeed) / s.baseSpeed
          return <div style={{ fontSize: 11 }}>{checkmark(dev < 0.2)}&nbsp;
            <span style={{ color: dev < 0.2 ? '#4ade80' : '#fbbf24' }}>
              avg speed within 20% of BASE_SPEED
            </span>
          </div>
        })()}
      </Section>

      {/* ── Section 6: Quarantine ── */}
      <Section title="6 · Quarantine fence mechanics">
        {config?.qp
          ? <>
              <Row label="QP" value="ON" />
              <Row label="QC configured" value={pct(configQC)} />
              <Row label="I-transitions (total)" value={fmt(cumStats.iTransitions)} />
              <Row label="Compliant (isolated)" value={`${fmt(cumStats.compliantCount)} (${pct(complianceRate ?? 0)})`} />
              <Row label="Active fences" value={fmt(s.fences)} />
              <Row label="Fence bounces (total)" value={fmt(cumStats.fenceBounces)} />
              {cumStats.iTransitions >= 50 &&
                <div style={{ fontSize: 11 }}>{checkmark(qcOk)}</div>}
            </>
          : <Row label="QP" value="OFF — enable quarantine to populate" />}
      </Section>

      {/* ── Section 7: Mask ── */}
      <Section title="7 · Mask modifier">
        <Row label="MW configured" value={pct(configMW)} />
        <Row label="Dots with mask" value={`${fmt(maskedDots)} / ${fmt(N)} (${pct(maskedDots / N)})`} />
        <div style={{ fontSize: 11 }}>{checkmark(mwOk)}</div>
        <div style={{ marginTop: 6 }}>
          <Row label="S×I breakdown by mask state" value="" />
          <div style={{ color: '#4b5563', fontSize: 11 }}>
            Per-combination breakdown {placeholder(3)}
          </div>
        </div>
      </Section>

      {/* ── Section 8: Clock ── */}
      <Section title="8 · Clock &amp; end conditions">
        <Row label="Sim day" value={fmt(day, 1)} />
        <Row label="Tick count" value={fmt(s.tick)} />
        <Row label="Ticks per sim-day" value={fmt(TICKS_PER_DAY)} />
        <Row label="End condition" value={s.endCondition ?? 'none'} />
        <Row label="Consec. zero-infection days" value={fmt(s.consecutiveZeroDays)} />
        <div style={{ color: '#4b5563', fontSize: 11, marginTop: 4 }}>
          Playback speed readout {placeholder(5)}
        </div>
      </Section>

      {/* ── Section 9: End state parade ── */}
      <Section title="9 · End state parade">
        {placeholder(7)}
      </Section>
    </div>
  )
}

// ─── OVERLAY STYLES ───────────────────────────────────────────────────────────

const overlayStyle = {
  position:     'fixed',
  top:          12,
  right:        12,
  width:        320,
  maxHeight:    'calc(100vh - 24px)',
  overflowY:    'auto',
  background:   'rgba(10, 10, 10, 0.92)',
  border:       '1px solid #1f2937',
  borderRadius: 10,
  padding:      '14px 16px',
  zIndex:       9999,
  backdropFilter: 'blur(4px)',
  color:        '#d1d5db',
  fontSize:     12,
}
