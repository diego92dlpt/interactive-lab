// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <div className="text-green-500 font-mono text-xs tracking-widest uppercase mb-3 pb-1 border-b border-green-900">
        {title}
      </div>
      <div className="space-y-3">
        {children}
      </div>
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

export default function ConfigPanel({ config, onChange }) {
  const set = key => val => onChange({ ...config, [key]: val })

  const asPct  = v => `${Math.round(v * 100)}%`
  const asDays = v => `${v}d`
  const as2dp  = v => v.toFixed(2)
  const asInt  = v => `${Math.round(v)}`

  return (
    <div className="p-4 text-sm select-none">


      {/* ── Population ─────────────────────────────────────────────────────── */}
      <Section title="Population">
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

      {/* ── Disease ────────────────────────────────────────────────────────── */}
      <Section title="Disease Model">
        <SliderRow
          label="Transmission p"
          tooltip="Probability of transmission per S×I collision. R₀ is emergent — shown in live readouts once built."
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
          tooltip="How immune Recovered (R) dots are to reinfection. At 100%, recovered dots cannot be re-infected."
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

      {/* ── Temperature ────────────────────────────────────────────────────── */}
      <Section title="Temperature">
        <div className="text-gray-600 text-xs mb-2">
          Movement speed — affects contact rate and epidemic spread
        </div>
        <SliderRow
          label="Speed (k)"
          tooltip="BASE_SPEED = k × √(arena / N). Low ≈ 0.05–0.15 (slow spread), medium ≈ 0.20–0.40, high ≈ 0.50–0.80 (rapid mixing)."
          min={0.05} max={0.80} step={0.01}
          value={config.temperature} onChange={set('temperature')} display={as2dp}
        />
      </Section>

      {/* ── Interventions ──────────────────────────────────────────────────── */}
      <Section title="Interventions">
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
            tooltip="Fraction of Infectious dots that comply with quarantine and self-isolate inside a fence."
            min={0} max={1.0} step={0.01}
            value={config.qcPct} onChange={set('qcPct')} display={asPct}
          />
        )}
        <SliderRow
          label="Mask wearing (MW)"
          tooltip="Fraction of dots assigned a mask at initialization. Mask assignment is static for the entire run."
          min={0} max={1.0} step={0.01}
          value={config.mwPct} onChange={set('mwPct')} display={asPct}
        />
        <SliderRow
          label="Mask effectiveness (ME)"
          tooltip="Per-wearer reduction in transmission probability per contact. Compounds when both dots wear masks: p × (1−ME)²."
          min={0} max={0.50} step={0.01}
          value={config.mePct} onChange={set('mePct')} display={asPct}
        />
      </Section>

      {/* ── Physics ────────────────────────────────────────────────────────── */}
      <Section title="Physics">
        <SliderRow
          label="Dot size"
          tooltip="Visual and physical dot radius as a multiplier of arena scale. Smaller = less crowding, dots travel further between collisions and contacts are less frequent."
          min={0.10} max={0.50} step={0.01}
          value={config.dotRadiusMult} onChange={set('dotRadiusMult')} display={as2dp}
        />
        <SliderRow
          label="Collision radius"
          tooltip="Physical bounce boundary as a fraction of visual dot radius. Below 0.60 becomes visually noticeable — dots appear to overlap before bouncing."
          min={0.60} max={1.0} step={0.01}
          value={config.collisionRadiusMult} onChange={set('collisionRadiusMult')} display={as2dp}
        />
        {/* Motion model toggle */}
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
            {[
              { label: 'Brownian', value: true },
              { label: 'Ballistic', value: false },
            ].map(opt => (
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

      {/* ── Simulation ─────────────────────────────────────────────────────── */}
      <Section title="Simulation">
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
