import { useEffect } from 'react'
import { PRESETS } from '../presets.js'

// ─── PRESET COMPARE MODAL ─────────────────────────────────────────────────────
// Side-by-side comparison table for all 6 disease presets.
// Click backdrop or × to close. Esc key also closes.
// ──────────────────────────────────────────────────────────────────────────────

const COLS = [
  { key: 'name',     label: 'Disease',    width: 'w-28' },
  { key: 'targetR0', label: 'Target R₀',  width: 'w-20' },
  { key: 'p',        label: 'Trans. p',   width: 'w-16' },
  { key: 'ifr',      label: 'IFR',        width: 'w-16' },
  { key: 'incub',    label: 'Incubation', width: 'w-20' },
  { key: 'infect',   label: 'Infectious', width: 'w-20' },
  { key: 'tagline',  label: 'Character',  width: 'flex-1' },
]

function fmtPct(v) {
  if (v >= 0.01) return (v * 100).toFixed(1).replace(/\.0$/, '') + '%'
  return (v * 100).toFixed(2) + '%'
}

export default function PresetCompareModal({ onClose }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)' }}
      onClick={onClose}
    >
      <div
        className="bg-gray-950 border border-gray-700 rounded-xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-6 py-4 flex items-center justify-between shrink-0 rounded-t-xl">
          <div>
            <div className="font-bold text-base text-white leading-tight">Disease Comparison</div>
            <div className="text-gray-500 font-mono text-xs mt-0.5">
              Calibrated at N=300, temp=0.30, dot size=0.25
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

        {/* ── Table ──────────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-800">
                {COLS.map(col => (
                  <th
                    key={col.key}
                    className={`px-4 py-2.5 text-left font-mono text-[11px] tracking-widest uppercase text-gray-500 whitespace-nowrap ${col.width}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PRESETS.map((preset, i) => {
                const cfg = preset.config
                return (
                  <tr
                    key={preset.id}
                    className={`border-b border-gray-900 hover:bg-gray-900/60 transition-colors ${
                      i === PRESETS.length - 1 ? 'border-b-0' : ''
                    }`}
                  >
                    {/* Disease name */}
                    <td className="px-4 py-3">
                      <div className="font-mono text-sm font-bold" style={{ color: preset.color }}>
                        {preset.name}
                      </div>
                      <div className="font-mono text-[11px] text-gray-500 leading-tight mt-0.5 whitespace-nowrap">
                        {preset.subtitle.split('·')[0].trim()}
                      </div>
                    </td>
                    {/* Target R₀ */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-bold tabular-nums" style={{ color: preset.color }}>
                        {preset.targetR0}
                      </span>
                    </td>
                    {/* Transmission p */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm tabular-nums text-gray-300">
                        {fmtPct(cfg.p)}
                      </span>
                    </td>
                    {/* IFR */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm tabular-nums text-gray-300">
                        {fmtPct(cfg.ifr)}
                      </span>
                    </td>
                    {/* Incubation */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm tabular-nums text-gray-300">
                        {cfg.incubationDays}d
                      </span>
                    </td>
                    {/* Infectious */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm tabular-nums text-gray-300">
                        {cfg.infectiousDays}d
                      </span>
                    </td>
                    {/* Tagline */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-[12px] text-gray-400 leading-relaxed">
                        {preset.tagline}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Footer note ────────────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-gray-800 px-6 py-3">
          <p className="text-gray-500 font-mono text-[11px] leading-relaxed">
            R₀ is emergent — actual value depends on N, speed, and dot size. IFR values are population-level central estimates; real values vary widely by age and setting.
          </p>
        </div>
      </div>
    </div>
  )
}
