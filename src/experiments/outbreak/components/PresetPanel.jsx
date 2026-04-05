import { useState } from 'react'
import { PRESETS } from '../presets.js'
import { hasSeenCalibrationGuide } from './PresetCalibrationModal.jsx'

// ─── PRESET PANEL ─────────────────────────────────────────────────────────────
// Sits at the top of ConfigPanel. Renders 6 preset buttons in a 2×3 grid.
// Clicking a preset applies all disease-specific params while preserving
// canvasW/canvasH from the current staged config.
// First click on any preset triggers the calibration guide modal (one-time).
// ──────────────────────────────────────────────────────────────────────────────

export default function PresetPanel({ config, onChange, onLearnMore, onShowCalibrationGuide }) {
  const [activeId, setActiveId] = useState(null)
  const active = PRESETS.find(p => p.id === activeId) ?? null

  function applyPreset(preset) {
    setActiveId(preset.id)
    // Preserve canvasW/canvasH and any runtime-only keys from current config
    onChange({ ...config, ...preset.config })
    // Show calibration guide on first-ever preset use
    if (!hasSeenCalibrationGuide()) onShowCalibrationGuide()
  }

  return (
    <div className="mb-5">
      {/* Section header with persistent ⓘ */}
      <div className="flex items-center justify-between mb-3 pb-1 border-b border-green-900">
        <div className="text-green-500 font-mono text-xs tracking-widest uppercase">
          Presets
        </div>
        <button
          onClick={onShowCalibrationGuide}
          title="How presets & R₀ work in this sim"
          className="w-4 h-4 rounded-full border border-gray-700 text-gray-600 hover:text-gray-300 hover:border-gray-500 font-mono text-[10px] flex items-center justify-center transition-colors"
        >
          ?
        </button>
      </div>

      {/* 2 × 3 button grid */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {PRESETS.map(preset => {
          const isActive = activeId === preset.id
          return (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              title={preset.subtitle}
              className={`px-1.5 py-1.5 rounded font-mono text-[10px] font-bold tracking-wide transition-all truncate text-left ${
                isActive ? 'text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
              style={isActive ? { background: preset.color } : {}}
            >
              {preset.name}
            </button>
          )
        })}
      </div>

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
              <div className="text-gray-500 font-mono text-[9px] leading-tight truncate">
                {active.subtitle}
              </div>
            </div>
            <button
              onClick={() => onLearnMore(active.id)}
              className="shrink-0 font-mono text-[9px] underline underline-offset-2 transition-colors text-gray-600 hover:text-gray-300"
            >
              learn more
            </button>
          </div>

          {/* Tagline */}
          <p className="text-gray-400 font-mono text-[10px] leading-relaxed mb-2">
            {active.tagline}
          </p>

          {/* Key facts — 2-column grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            {active.keyFacts.map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-gray-600 font-mono text-[9px]">{label}</span>
                <span className="font-mono text-[10px] font-bold tabular-nums" style={{ color: active.color }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calibration footnote */}
      <p className="text-gray-700 font-mono text-[9px] italic mt-2 leading-relaxed">
        Target R₀ is approximate — varies with N, speed &amp; dot size. See <span className="text-gray-600">?</span> above.
      </p>
    </div>
  )
}
