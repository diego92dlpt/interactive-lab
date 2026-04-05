import { useState } from 'react'
import { PRESETS } from '../presets.js'
import { hasSeenCalibrationGuide } from './PresetCalibrationModal.jsx'

// ─── PRESET PANEL ─────────────────────────────────────────────────────────────
// Sits at the top of ConfigPanel. Renders 6 preset buttons in a 2×3 grid.
// Clicking a preset applies all disease-specific params while preserving
// canvasW/canvasH from the current staged config.
// First click on any preset triggers the calibration guide modal (one-time).
// ──────────────────────────────────────────────────────────────────────────────

function fmtPct(v) {
  if (v >= 0.01) return (v * 100).toFixed(1).replace(/\.0$/, '') + '%'
  return (v * 100).toFixed(2) + '%'
}

export default function PresetPanel({ config, onChange, onLearnMore, onShowCalibrationGuide, onCompare }) {
  const [activeId, setActiveId]   = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const active  = PRESETS.find(p => p.id === activeId)  ?? null
  const hovered = PRESETS.find(p => p.id === hoveredId) ?? null

  function applyPreset(preset) {
    setActiveId(preset.id)
    // Preserve canvasW/canvasH and any runtime-only keys from current config
    onChange({ ...config, ...preset.config })
    // Show calibration guide on first-ever preset use
    if (!hasSeenCalibrationGuide()) onShowCalibrationGuide()
  }

  return (
    <div className="mb-5">
      {/* Section label */}
      <div className="text-green-500 font-mono text-xs tracking-widest uppercase mb-2">
        Presets
      </div>

      {/* Help / info buttons — visually distinct from presets */}
      <div className="flex flex-col gap-1 mb-3">
        {onCompare && (
          <button
            onClick={onCompare}
            className="w-full py-1.5 rounded border border-gray-700 bg-gray-900 hover:bg-gray-800 hover:border-gray-500 font-mono text-[11px] text-gray-400 hover:text-gray-200 tracking-wide transition-all flex items-center justify-center gap-1.5"
          >
            <span className="text-gray-600">⊞</span> Compare all 6 diseases
          </button>
        )}
        <button
          onClick={onShowCalibrationGuide}
          className="w-full py-1.5 rounded border border-gray-700 bg-gray-900 hover:bg-gray-800 hover:border-gray-500 font-mono text-[11px] text-gray-400 hover:text-gray-200 tracking-wide transition-all flex items-center justify-center gap-1.5"
        >
          <span className="text-gray-600">ⓘ</span> R₀ &amp; Calibration
        </button>
      </div>

      {/* Divider */}
      <div className="border-b border-green-900 mb-3" />

      {/* 2 × 3 button grid */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {PRESETS.map(preset => {
          const isActive = activeId === preset.id
          return (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              onMouseEnter={() => setHoveredId(preset.id)}
              onMouseLeave={() => setHoveredId(null)}
              title={preset.subtitle}
              className={`px-1.5 py-1.5 rounded font-mono text-[12px] font-bold tracking-wide transition-all truncate text-left ${
                isActive ? 'text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
              style={isActive ? { background: preset.color } : {}}
            >
              {preset.name}
            </button>
          )
        })}
      </div>

      {/* Hover strip — quick stats preview while hovering a non-active preset */}
      {hovered && hovered.id !== activeId && (
        <div
          className="rounded-lg border px-3 py-2 mb-3 transition-all"
          style={{ borderColor: hovered.color + '40', background: hovered.color + '0e' }}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-mono text-[12px] font-bold" style={{ color: hovered.color }}>
              {hovered.name}
            </span>
            <span className="text-gray-500 font-mono text-[11px] truncate">{hovered.subtitle}</span>
          </div>
          <div className="grid grid-cols-4 gap-1 mb-1.5">
            {[
              { label: 'R₀',     value: hovered.targetR0 },
              { label: 'p',      value: fmtPct(hovered.config.p) },
              { label: 'IFR',    value: fmtPct(hovered.config.ifr) },
              { label: 'Infect', value: hovered.config.infectiousDays + 'd' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-900/60 rounded px-1.5 py-1 text-center">
                <div className="font-mono text-[12px] font-bold tabular-nums" style={{ color: hovered.color }}>
                  {value}
                </div>
                <div className="font-mono text-[10px] text-gray-500 leading-tight">{label}</div>
              </div>
            ))}
          </div>
          <p className="text-gray-400 font-mono text-[11px] italic leading-snug">{hovered.tagline}</p>
        </div>
      )}

      {/* Active preset info card */}
      {active && (
        <div
          className="rounded-lg border px-3 py-2.5 transition-all"
          style={{ borderColor: active.color + '50', background: active.color + '12' }}
        >
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <div className="font-mono text-xs font-bold truncate" style={{ color: active.color }}>
                {active.name}
              </div>
              <div className="text-gray-500 font-mono text-[11px] leading-tight truncate">
                {active.subtitle}
              </div>
            </div>
            <button
              onClick={() => onLearnMore(active.id)}
              className="shrink-0 font-mono text-[12px] underline underline-offset-2 transition-colors text-gray-300 hover:text-white"
            >
              learn more
            </button>
          </div>

          {/* Tagline */}
          <p className="text-gray-400 font-mono text-[12px] leading-relaxed mb-2">
            {active.tagline}
          </p>

          {/* Key facts — 2-column grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            {active.keyFacts.map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-gray-400 font-mono text-[11px]">{label}</span>
                <span className="font-mono text-[12px] font-bold tabular-nums" style={{ color: active.color }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calibration footnote */}
      <p className="text-gray-400 font-mono text-[12px] italic mt-2 leading-relaxed">
        Target R₀ is approximate — varies with N, speed &amp; dot size. See <span className="text-gray-300">R₀ &amp; Calibration</span> above.
      </p>
    </div>
  )
}
