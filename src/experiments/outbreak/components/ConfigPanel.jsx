import { useState } from 'react'
import PresetPanel from './PresetPanel.jsx'

// ─── SECTION COLORS ───────────────────────────────────────────────────────────

const SECTION_STYLES = {
  green:  { heading: 'text-green-400',  border: 'border-green-900',  bg: 'bg-green-950/20'  },
  indigo: { heading: 'text-indigo-400', border: 'border-indigo-900', bg: 'bg-indigo-950/25' },
  amber:  { heading: 'text-amber-400',  border: 'border-amber-900',  bg: 'bg-amber-950/20'  },
  rose:   { heading: 'text-rose-400',   border: 'border-rose-900',   bg: 'bg-rose-950/20'   },
  purple: { heading: 'text-purple-400', border: 'border-purple-900', bg: 'bg-purple-950/20' },
  teal:   { heading: 'text-teal-400',   border: 'border-teal-900',   bg: 'bg-teal-950/20'   },
  gray:   { heading: 'text-gray-500',   border: 'border-gray-800',   bg: 'bg-gray-900/30'   },
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

const SECTIONS_STORAGE_KEY = 'outbreak-sections'

function Section({ title, color = 'gray', defaultOpen = true, children }) {
  const [open, setOpen] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(SECTIONS_STORAGE_KEY) ?? '{}')
      return title in stored ? stored[title] : defaultOpen
    } catch {
      return defaultOpen
    }
  })

  const toggle = () => {
    setOpen(prev => {
      const next = !prev
      try {
        const stored = JSON.parse(localStorage.getItem(SECTIONS_STORAGE_KEY) ?? '{}')
        localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify({ ...stored, [title]: next }))
      } catch {}
      return next
    })
  }

  const c = SECTION_STYLES[color] ?? SECTION_STYLES.gray
  return (
    <div className={`mb-2 rounded-md overflow-hidden ${c.bg}`}>
      <button
        onClick={toggle}
        className={`w-full flex items-center justify-between px-3 py-2 border-b ${c.border} hover:brightness-125 transition-all`}
      >
        <span className={`${c.heading} font-mono text-xs tracking-widest uppercase`}>{title}</span>
        <span className={`${c.heading} font-mono text-[10px]`}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-3 pt-2 pb-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}

function SliderRow({ label, tooltip, min, max, step, value, onChange, display }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-gray-400 text-xs flex items-center gap-1">
          {label}
          {tooltip && (
            <span className="text-gray-600 cursor-help text-xs" title={tooltip}>ⓘ</span>
          )}
        </span>
        <span className="text-green-400 font-mono text-xs tabular-nums">
          {display ? display(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #22c55e ${pct}%, #374151 ${pct}%)`,
          accentColor: '#22c55e',
        }}
      />
    </div>
  )
}

// ─── CONFIG PANEL ─────────────────────────────────────────────────────────────

export default function ConfigPanel({
  config, onChange,
  seed, seedLocked, onToggleSeedLock,
  onLearnMore, onShowCalibrationGuide,
}) {
  const set = key => val => onChange({ ...config, [key]: val })

  const asPct  = v => `${Math.round(v * 100)}%`
  const asDays = v => `${v}d`
  const as2dp  = v => v.toFixed(2)
  const asInt  = v => `${Math.round(v)}`

  return (
    <div className="p-3 text-sm select-none">

      {/* ── Seed ─────────────────────────────────────────────────────────────── */}
      {seed != null && (
        <div className="flex items-center justify-between mb-3 px-1 py-2 border-b border-gray-800">
          <div>
            <div className="text-gray-600 font-mono text-[9px] tracking-widest uppercase leading-none mb-0.5">
              Seed
            </div>
            <div className="text-gray-300 font-mono text-xs tabular-nums">{seed}</div>
          </div>
          <button
            onClick={onToggleSeedLock}
            title={seedLocked
              ? 'Seed locked — same seed reused on next Run/Reset. Click to unlock.'
              : 'Lock this seed to replay the exact same run with different parameters.'}
            className={`px-2.5 py-1 rounded font-mono text-xs font-bold transition-colors ${
              seedLocked
                ? 'bg-amber-600 hover:bg-amber-500 text-black'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
            }`}
          >
            {seedLocked ? 'LOCKED' : 'LOCK'}
          </button>
        </div>
      )}

      {/* ── Presets ──────────────────────────────────────────────────────────── */}
      <Section title="Presets" color="green">
        <PresetPanel
          config={config}
          onChange={onChange}
          onLearnMore={onLearnMore}
          onShowCalibrationGuide={onShowCalibrationGuide}
        />
      </Section>

      {/* ── Physics ──────────────────────────────────────────────────────────── */}
      <Section title="Physics" color="indigo">
        <SliderRow
          label="Dot size"
          tooltip="Visual and physical dot radius as a multiplier of arena scale. Smaller = less crowding, dots travel further between collisions."
          min={0.10} max={0.50} step={0.01}
          value={config.dotRadiusMult} onChange={set('dotRadiusMult')} display={as2dp}
        />
        <SliderRow
          label="Collision radius"
          tooltip="Physical bounce boundary as a fraction of visual dot radius. Below 0.60 becomes visually noticeable — dots appear to overlap before bouncing."
          min={0.60} max={1.0} step={0.01}
          value={config.collisionRadiusMult} onChange={set('collisionRadiusMult')} display={as2dp}
        />
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-400 text-xs">Motion model</span>
            <span className="text-gray-500 text-xs">
              {config.brownianMotion ? 'Brownian' : 'Ballistic'}
            </span>
          </div>
          <div className="text-gray-600 text-xs mb-2">
            {config.brownianMotion
              ? 'Random heading nudge every tick — molecules in a gas.'
              : 'Heading only changes from wall/dot collisions — billiard balls.'}
          </div>
          <div className="flex gap-2">
            {[{ label: 'Brownian', value: true }, { label: 'Ballistic', value: false }].map(opt => (
              <button
                key={opt.label}
                onClick={() => set('brownianMotion')(opt.value)}
                className={`flex-1 py-1.5 rounded font-mono text-xs font-bold transition-colors ${
                  config.brownianMotion === opt.value
                    ? 'bg-green-500 text-black'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Temperature ──────────────────────────────────────────────────────── */}
      <Section title="Temperature" color="amber">
        <div className="text-gray-600 text-xs">
          Movement speed — affects contact rate and epidemic spread
        </div>
        <SliderRow
          label="Speed (k)"
          tooltip="BASE_SPEED = k × √(arena / N). Low ≈ 0.05–0.15 (slow spread), medium ≈ 0.20–0.40, high ≈ 0.50–0.80 (rapid mixing)."
          min={0.05} max={0.80} step={0.01}
          value={config.temperature} onChange={set('temperature')} display={as2dp}
        />
      </Section>

      {/* ── Disease Model ────────────────────────────────────────────────────── */}
      <Section title="Disease Model" color="rose">
        <SliderRow
          label="Transmission p"
          tooltip="Probability of transmission per S×I collision per tick."
          min={0.01} max={1.0} step={0.01}
          value={config.p} onChange={set('p')} display={asPct}
        />
        <SliderRow
          label="Fatality (IFR)"
          tooltip="Fraction of Infectious dots that die (I→D) rather than recover (I→R)."
          min={0} max={0.20} step={0.001}
          value={config.ifr} onChange={set('ifr')} display={asPct}
        />
        <SliderRow
          label="Recovered immunity"
          tooltip="How immune Recovered (R) dots are to re-infection. At 100%, recovered dots cannot be re-infected."
          min={0} max={1.0} step={0.01}
          value={config.riPct} onChange={set('riPct')} display={asPct}
        />
        <SliderRow
          label="Vaccinated immunity"
          tooltip="How immune Vaccinated (V) dots are to infection. At 100%, vaccinated dots cannot be infected."
          min={0} max={1.0} step={0.01}
          value={config.viPct} onChange={set('viPct')} display={asPct}
        />
        <SliderRow
          label="Incubation period"
          tooltip="Days in Exposed (E) state — infected but not yet infectious."
          min={1} max={14} step={0.5}
          value={config.incubationDays} onChange={set('incubationDays')} display={asDays}
        />
        <SliderRow
          label="Infectious period"
          tooltip="Days in Infectious (I) state before resolving to Recovered or Dead."
          min={1} max={30} step={0.5}
          value={config.infectiousDays} onChange={set('infectiousDays')} display={asDays}
        />
      </Section>

      {/* ── Interventions ────────────────────────────────────────────────────── */}
      <Section title="Interventions" color="purple">
        <SliderRow
          label="Policy onset day"
          tooltip="All non-pharmaceutical interventions (quarantine, mask effectiveness) are inactive before this day. Set to 0 for immediate policy. Reflects the real-world delay between outbreak detection and public health action."
          min={0} max={60} step={1}
          value={config.interventionDay}
          onChange={set('interventionDay')}
          display={v => v === 0 ? 'Day 0 (immediate)' : `Day ${v}`}
        />
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-xs flex items-center gap-1">
            Quarantine practiced
            <span className="text-gray-600 cursor-help text-xs"
              title="When on, each dot that becomes Infectious flips a compliance coin (QC%). Compliant dots self-isolate inside a quarantine fence.">ⓘ</span>
          </span>
          <button
            onClick={() => set('qp')(!config.qp)}
            className={`px-3 py-1 rounded font-mono text-xs font-bold transition-colors ${
              config.qp ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {config.qp ? 'ON' : 'OFF'}
          </button>
        </div>
        {config.qp && (
          <SliderRow
            label="Compliance (QC)"
            tooltip="Fraction of Infectious dots that comply with quarantine and self-isolate."
            min={0} max={1.0} step={0.01}
            value={config.qcPct} onChange={set('qcPct')} display={asPct}
          />
        )}
        <SliderRow
          label="Mask wearing (MW)"
          tooltip="Fraction of dots assigned a mask at initialization. Assignment is static for the entire run."
          min={0} max={1.0} step={0.01}
          value={config.mwPct} onChange={set('mwPct')} display={asPct}
        />
        <SliderRow
          label="Mask effectiveness (ME)"
          tooltip="Per-wearer reduction in transmission probability. Compounds when both dots wear masks: p × (1−ME)²."
          min={0} max={0.50} step={0.01}
          value={config.mePct} onChange={set('mePct')} display={asPct}
        />
      </Section>

      {/* ── Population ───────────────────────────────────────────────────────── */}
      <Section title="Population" color="teal">
        <SliderRow
          label="Dots (N)"
          tooltip="Total number of dots. Higher N = slower performance above ~1500."
          min={100} max={2000} step={50}
          value={config.N} onChange={set('N')} display={asInt}
        />
        <SliderRow
          label="Initial infected"
          tooltip="Dots seeded as Infectious (I) at t=0."
          min={1} max={10} step={1}
          value={config.initialInfected} onChange={set('initialInfected')} display={asInt}
        />
        <SliderRow
          label="Initial vaccinated"
          tooltip="Fraction of dots starting in Vaccinated (V) state at t=0."
          min={0} max={0.99} step={0.01}
          value={config.initialVaxPct} onChange={set('initialVaxPct')} display={asPct}
        />
      </Section>

      {/* ── Simulation ───────────────────────────────────────────────────────── */}
      <Section title="Simulation" color="gray">
        <SliderRow
          label="Max sim days"
          tooltip="Hard ceiling on simulation length. Prevents runs that never naturally terminate."
          min={30} max={360} step={30}
          value={config.maxDays} onChange={set('maxDays')} display={asInt}
        />
        <SliderRow
          label="Fizzle threshold"
          tooltip="Simulation ends if zero new infections occur for this many consecutive sim-days."
          min={1} max={14} step={1}
          value={config.fizzleDays} onChange={set('fizzleDays')} display={asDays}
        />
      </Section>

    </div>
  )
}
