import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

export default function ConfigHelpModal({ theme, onClose }) {
  const [page, setPage] = useState('main'); // 'main' | 'faq'

  const H = ({ children }) => (
    <h4 className="text-[11px] font-black uppercase tracking-widest mt-7 mb-3 pb-1 border-b"
      style={{ color: theme.primary, borderColor: theme.muted + '60' }}>
      {children}
    </h4>
  );
  const P = ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>;
  const Kv = ({ k, children }) => (
    <div className="mb-4 pl-3 border-l-2" style={{ borderColor: theme.muted }}>
      <div className="font-black mb-0.5" style={{ color: theme.primary }}>{k}</div>
      <div>{children}</div>
    </div>
  );
  const SubpageLink = ({ onClick, children, hint }) => (
    <button onClick={onClick}
      className="w-full text-left border px-4 py-3 mt-2 flex items-center justify-between gap-3 hover:bg-white/5 transition-all group"
      style={{ borderColor: theme.muted + '80' }}>
      <div>
        <div className="text-[10px] font-black uppercase tracking-wide" style={{ color: theme.primary }}>{children}</div>
        {hint && <div className="text-[9px] mt-0.5" style={{ color: theme.secondary }}>{hint}</div>}
      </div>
      <ChevronRight className="h-3 w-3 shrink-0 opacity-50 group-hover:opacity-100" style={{ color: theme.primary }} />
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8"
      style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-[#050505] border w-full max-w-2xl max-h-[90vh] flex flex-col"
        style={{ borderColor: theme.primary, boxShadow: `0 0 40px ${theme.glow}` }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: theme.muted }}>
          <div className="flex items-center gap-3">
            {page !== 'main' && (
              <button onClick={() => setPage('main')}
                className="p-1 border hover:bg-white/5 transition-all"
                style={{ borderColor: theme.muted }}>
                <ChevronLeft className="h-3 w-3" />
              </button>
            )}
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: theme.primary }}>
                {page === 'main'  ? 'How to Use Wait-Calc' : 'FAQ'}
              </h3>
              <p className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: theme.secondary }}>
                {page === 'main' ? 'Setup Guide · Controls' : 'Frequently Asked Questions · ← back to guide'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 border hover:bg-red-900/20" style={{ borderColor: theme.muted }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 text-xs" style={{ color: theme.secondary }}>

          {/* ── MAIN PAGE ──────────────────────────────────────────────────── */}
          {page === 'main' && (<>

            <H>What Is This?</H>
            <P>
              The <span style={{ color: theme.primary }}>Wait Calculation Simulator</span> brings
              Andrew Kennedy's 2006 insight to life: because propulsion improves over time, a ship
              launched today may be overtaken by a faster ship launched later — arriving already obsolete.
            </P>
            <P>
              Design a fleet across a technology growth curve, then watch the race play out with
              correct relativistic physics.
            </P>

            <H>Step 1 — Mission Parameters</H>
            <Kv k="Destination">
              Choose a target star system or enter any custom distance in Light Years.
            </Kv>
            <Kv k="Launch Stagger">
              Years between consecutive ship launches. More stagger = more time for technology to
              improve, but a longer overall mission span. This is the core tension of the Wait Calculation.
            </Kv>

            <H>Step 2 — Physics Constants</H>
            <Kv k="Acceleration (G)">
              Constant thrust the crew physically feels, in units of Earth gravity.
              1g is comfortable and the most common assumption. Higher G = shorter travel time.
            </Kv>
            <Kv k="Fleet Size">
              Number of ships in the simulation (2–10). Each ship represents a generation
              of propulsion technology.
            </Kv>

            <H>Step 3 — Propulsion Capability Curve</H>
            <P>
              This graph maps your fleet's technology progression. Ship 1 (left) launches first at
              the lowest speed; the last ship launches with the highest. The Y-axis is max cruise
              velocity as a fraction of light speed (% SOL).
            </P>
            <Kv k="Drag a marker">
              Move up or down to set that ship's max velocity.{' '}
              <span style={{ color: theme.primary }}>Double-click</span> any marker to type an
              exact % SOL value.
            </Kv>
            <Kv k="MIN / MAX limit handles">
              The dashed horizontal lines cap the fleet's velocity range. Drag them to
              narrow or widen the band — all markers stay within these bounds.
            </Kv>
            <Kv k="Presets">
              Auto-arrange markers into standard growth shapes:{' '}
              <span style={{ color: theme.primary }}>Linear</span> = equal steps ·{' '}
              <span style={{ color: theme.primary }}>Exponential</span> = hockey stick ·{' '}
              <span style={{ color: theme.primary }}>S-Curve</span> = slow → rapid → plateau ·{' '}
              <span style={{ color: theme.primary }}>Diminishing</span> = fast early gains that taper off.
            </Kv>

            <H>Step 4 — Launch</H>
            <P>
              The <span style={{ color: theme.primary }}>Fleet Status Summary</span> shows a live
              readout of your configuration. When you're ready, hit{' '}
              <span style={{ color: theme.primary }}>LAUNCH SIMULATION</span>.
            </P>

            <div className="mt-6 mb-2">
              <SubpageLink onClick={() => setPage('faq')}
                hint="6 quick answers to common questions">
                FAQ
              </SubpageLink>
            </div>

          </>)}

          {/* ── FAQ PAGE ───────────────────────────────────────────────────── */}
          {page === 'faq' && (<>

            <H>Frequently Asked Questions</H>

            <Kv k="What is % SOL?">
              Percent of the Speed of Light (c ≈ 300,000 km/s). 10% SOL = 30,000 km/s.
            </Kv>

            <Kv k="Why can ships only approach ~100% SOL?">
              Special relativity: nothing with mass can reach or exceed c. As velocity approaches
              the speed of light, the energy required grows without bound.
            </Kv>

            <Kv k="What is 'proper acceleration'?">
              The g-force the crew physically feels — what an onboard accelerometer reads.
              At 1g they experience normal Earth gravity throughout the journey.
            </Kv>

            <Kv k="What is the 'flip' maneuver?">
              At the halfway point the ship rotates 180° and fires its engine in reverse,
              decelerating to arrive at rest. This is the time-optimal trajectory for a fixed
              thrust level — called the brachistochrone.
            </Kv>

            <Kv k="Why does the ship clock run slow?">
              Time dilation: a moving clock ticks slower than a stationary one. At 90% SOL the
              ship clock runs at only ~44% of Earth rate. The crew ages far less than the years
              that pass on Earth.
            </Kv>

            <Kv k="What is the 'sweet spot' departure time?">
              The optimal launch window where waiting any longer delays arrival more than the
              speed improvement compensates for. It depends on the technology growth rate —
              steeper curves favor waiting longer.
            </Kv>

          </>)}

        </div>
      </div>
    </div>
  );
}
