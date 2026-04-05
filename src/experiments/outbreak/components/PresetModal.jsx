import { useEffect } from 'react'
import { PRESETS } from '../presets.js'

// ─── PRESET MODAL ─────────────────────────────────────────────────────────────
// Full-screen overlay rendered in index.jsx via portal-less absolute positioning.
// Click backdrop or × to close. Esc key also closes.
// ──────────────────────────────────────────────────────────────────────────────

export default function PresetModal({ presetId, onClose }) {
  const preset = PRESETS.find(p => p.id === presetId) ?? null

  // Close on Escape key
  useEffect(() => {
    if (!preset) return
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [preset, onClose])

  if (!preset) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)' }}
      onClick={onClose}
    >
      <div
        className="bg-gray-950 border border-gray-700 rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >

        {/* ── Sticky header ───────────────────────────────────────────────── */}
        <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-6 py-4 flex items-start justify-between shrink-0 rounded-t-xl">
          <div className="min-w-0">
            <div className="font-bold text-base leading-tight" style={{ color: preset.color }}>
              {preset.name}
            </div>
            <div className="text-gray-500 font-mono text-[12px] mt-0.5">
              {preset.subtitle}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 ml-4 text-gray-400 hover:text-gray-200 font-mono text-xl leading-none transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto">

          {/* Key facts strip */}
          <div className="grid grid-cols-4 gap-2">
            {preset.keyFacts.map(({ label, value }) => (
              <div key={label} className="bg-gray-900 rounded-lg p-2.5 text-center">
                <div className="font-mono font-bold text-sm tabular-nums" style={{ color: preset.color }}>
                  {value}
                </div>
                <div className="text-gray-400 font-mono text-[11px] mt-0.5 leading-tight">
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Overview */}
          <Section title="Overview" color={preset.color}>
            <p className="text-gray-300 text-sm leading-relaxed">
              {preset.learn.overview}
            </p>
          </Section>

          {/* Transmission */}
          <Section title="How it spreads" color={preset.color}>
            <p className="text-gray-300 text-sm leading-relaxed">
              {preset.learn.transmission}
            </p>
          </Section>

          {/* Sim assumptions */}
          <Section title="Simulation assumptions" color={preset.color}>
            <p className="text-gray-500 font-mono text-[12px] mb-2 leading-relaxed">
              Parameters were calibrated at N=300, temperature=0.30, dotRadiusMult=0.25.
              Emergent R₀ will shift if you change dot count or speed.
            </p>
            <ul className="space-y-1.5">
              {preset.learn.assumptions.map((a, i) => (
                <li key={i} className="flex gap-2 text-gray-500 font-mono text-[12px] leading-relaxed">
                  <span className="shrink-0 mt-px" style={{ color: preset.color }}>·</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Try this */}
          <Section title="Try this" color={preset.color}>
            <div className="space-y-2">
              {preset.learn.tryThis.map((t, i) => (
                <div key={i} className="bg-gray-900 rounded-lg p-3">
                  <div className="font-mono text-[13px] font-bold mb-0.5" style={{ color: preset.color }}>
                    → {t.prompt}
                  </div>
                  <div className="text-gray-500 font-mono text-[12px] leading-relaxed">
                    {t.description}
                  </div>
                </div>
              ))}
            </div>
          </Section>

        </div>
      </div>
    </div>
  )
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function Section({ title, color, children }) {
  return (
    <div>
      <div
        className="font-mono text-[12px] tracking-widest uppercase mb-2 pb-1 border-b"
        style={{ color, borderColor: color + '30' }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}
