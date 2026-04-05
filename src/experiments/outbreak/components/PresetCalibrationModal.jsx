import { useEffect } from 'react'

// ─── PRESET CALIBRATION GUIDE ─────────────────────────────────────────────────
// Shown automatically the FIRST TIME a user clicks any disease preset.
// Explains why emergent R₀ may not match the preset's target, which dials
// to tune, and how to get a clean baseline before adding interventions.
//
// Dismissed state is persisted in localStorage ('outbreak-preset-intro-seen').
// ──────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'outbreak-preset-intro-seen'

export function hasSeenCalibrationGuide() {
  try { return !!localStorage.getItem(STORAGE_KEY) } catch { return false }
}

export default function PresetCalibrationModal({ onClose }) {
  // Mark as seen on any close
  function handleClose() {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
    onClose()
  }

  // Escape key
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)' }}
      onClick={handleClose}
    >
      <div
        className="bg-gray-950 border border-gray-700 rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >

        {/* Header */}
        <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-6 py-4 flex items-start justify-between rounded-t-xl">
          <div>
            <div className="text-green-400 font-mono text-[10px] tracking-widest uppercase mb-0.5">
              Before you run a preset
            </div>
            <div className="text-white font-bold text-base leading-tight">
              How R₀ works in this sim
            </div>
          </div>
          <button
            onClick={handleClose}
            className="ml-4 text-gray-600 hover:text-gray-200 font-mono text-xl leading-none transition-colors shrink-0"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* What R₀ actually is */}
          <Section title="What R₀ actually means">
            <p className="text-gray-300 text-[13px] leading-relaxed">
              R₀ (the "basic reproduction number") is the average number of secondary infections
              one infectious person generates in a <em className="text-white">fully susceptible</em> population,
              with <em className="text-white">no interventions</em>, over their entire infectious period.
            </p>
            <p className="text-gray-400 text-[13px] leading-relaxed mt-2">
              R₀ is not a property of the virus alone — it's a property of <strong className="text-gray-200">virus + population + contact structure</strong>.
              The moment you add masks, quarantine, or prior immunity, you're no longer measuring R₀.
              You're measuring <strong className="text-gray-200">Rₑff</strong> (effective reproduction number) —
              what the disease actually achieves given real-world conditions.
            </p>
            <div className="mt-3 bg-gray-900 rounded-lg p-3 font-mono text-[10px] text-gray-400 leading-relaxed">
              <span className="text-green-400">Rₑff</span> = R₀ × (fraction susceptible) × (intervention multiplier)
              <br />
              <span className="text-gray-600 mt-1 block">If Rₑff &gt; 1 → epidemic grows. If Rₑff &lt; 1 → epidemic shrinks.</span>
            </div>
          </Section>

          {/* Why presets won't exactly hit the target */}
          <Section title="Why your sim may not hit the target R₀">
            <p className="text-gray-300 text-[13px] leading-relaxed">
              Each preset was calibrated at specific settings: <span className="text-green-400 font-mono text-[11px]">N=300, temperature=0.30, dot size=0.25</span>.
              In this sim, R₀ is <em className="text-white">emergent</em> — it falls out of how dots actually move,
              collide, and transmit. Change any of these and the R₀ shifts:
            </p>
            <ul className="mt-2 space-y-1.5">
              {[
                ['Dot count (N)', 'Both speed and dot size scale down with N, so R₀ stays roughly stable. But at very low N, stochastic variance dominates; at very high N, packing effects emerge.'],
                ['↑ Temperature (speed)', 'Faster dots → more collisions per tick → higher R₀'],
                ['↑ Dot size', 'Larger collision radius → more contacts per tick → higher R₀'],
                ['↑ Transmission p', 'Higher p → more infections per contact → directly raises R₀'],
              ].map(([param, effect]) => (
                <li key={param} className="flex gap-2 font-mono text-[10px] leading-relaxed">
                  <span className="shrink-0 text-green-500 mt-px">·</span>
                  <span><span className="text-gray-200">{param}</span> <span className="text-gray-500">— {effect}</span></span>
                </li>
              ))}
            </ul>
          </Section>

          {/* How to calibrate */}
          <Section title="How to tune for a target R₀">
            <div className="space-y-2">
              {[
                {
                  step: '1',
                  title: 'Calibrate clean',
                  body: 'Start with all interventions OFF — masks at 0%, quarantine off, initial vaccination at 0%. You want to measure the bare disease, not the disease + your responses.',
                },
                {
                  step: '2',
                  title: 'Run until day 30–50',
                  body: 'The Emergent R₀ in the Dashboard only appears after 10 resolved cases. For a stable reading, run at least 30–50 sim-days and watch the number settle. Early readings are noisy.',
                },
                {
                  step: '3',
                  title: 'Adjust one dial at a time',
                  body: 'Too high? Lower temperature or dot size. Too low? Raise p. Reset and re-run after each change. Each full run gives you a new data point.',
                },
                {
                  step: '4',
                  title: 'Then add interventions',
                  body: 'Once you\'re happy with the baseline R₀, turn masks, quarantine, or vaccination back on. The Dashboard will label the number Rₑff — that change is the story you\'re exploring.',
                },
              ].map(({ step, title, body }) => (
                <div key={step} className="flex gap-3 bg-gray-900 rounded-lg p-3">
                  <div className="shrink-0 w-5 h-5 rounded-full bg-green-900 text-green-400 font-mono text-[10px] font-bold flex items-center justify-center mt-0.5">
                    {step}
                  </div>
                  <div>
                    <div className="text-gray-200 font-mono text-[11px] font-bold mb-0.5">{title}</div>
                    <div className="text-gray-500 font-mono text-[10px] leading-relaxed">{body}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Note on variance */}
          <div className="bg-gray-900 rounded-lg px-3 py-2.5">
            <p className="text-gray-500 font-mono text-[10px] leading-relaxed">
              <span className="text-gray-400 font-bold">Note: </span>
              With small populations (N=300), R₀ will vary between runs — this is real stochastic variance,
              the same reason small outbreaks sometimes fizzle by chance and sometimes explode.
              Average across 2–3 runs for a more stable estimate.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-950 border-t border-gray-800 px-6 py-3 flex items-center justify-between rounded-b-xl">
          <span className="text-gray-600 font-mono text-[9px]">
            You can re-read this via the <span className="text-gray-400">ⓘ</span> next to any preset
          </span>
          <button
            onClick={handleClose}
            className="px-4 py-1.5 bg-green-500 hover:bg-green-400 text-black font-mono text-xs font-bold rounded transition-colors"
          >
            Got it — let's run
          </button>
        </div>

      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <div className="text-gray-400 font-mono text-[10px] tracking-widest uppercase mb-2 pb-1 border-b border-gray-800">
        {title}
      </div>
      {children}
    </div>
  )
}
