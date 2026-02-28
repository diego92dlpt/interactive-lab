import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

export default function SensitivityHelpModal({ theme, onClose }) {
  const [page, setPage] = useState('main'); // 'main' | 'labels'

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
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 md:p-8"
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
                {page === 'main' ? 'Sensitivity Analysis — Guide' : 'Reading the Callout Labels'}
              </h3>
              <p className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: theme.secondary }}>
                {page === 'main' ? 'Chart · Controls · What to Look For' : '← back to guide'}
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

            <H>What Am I Looking At?</H>
            <P>
              This is a <span style={{ color: theme.primary }}>spacetime trajectory chart</span> — a
              static snapshot of every ship's full journey from launch to arrival.
            </P>
            <P>
              The <span style={{ color: theme.primary }}>x-axis</span> is Earth coordinate time (years).
              The <span style={{ color: theme.primary }}>y-axis</span> is distance from Earth (light-years).
              Each curve traces one ship's path through space and time. The dashed horizontal line
              at the top is the destination — the "finish line."
            </P>

            <H>Reading the Chart</H>
            <Kv k="Curve shapes">
              Each curve has three phases. A small upward bend at launch (accelerating) and a
              mirrored downward bend at arrival (decelerating) — like a hockey stick and its
              inverse. The cruise phase in between is a{' '}
              <span style={{ color: theme.primary }}>perfectly straight line</span>: constant
              velocity means constant slope on a distance-time chart. At long distances, the
              accel and decel bends compress into tiny kinks at each end, with a long straight
              middle segment dominating the curve.
            </Kv>
            <Kv k="Line styles">
              Each ship uses a distinct dash pattern (solid, long-dash, short-dash, dotted…)
              so they remain distinguishable even when they overlap. Ship names are labeled
              below the x-axis at their launch time.
            </Kv>
            <Kv k="Peak velocity label">
              The small % SOL annotation near the inflection point of each curve shows that
              ship's maximum speed — the moment it stops accelerating and begins cruising
              (or reverses, for short distances).
            </Kv>
            <Kv k="Finish-line dots & callouts">
              Each ship's dot on the finish line marks the exact Earth time of arrival. The
              callout column on the right stacks them in arrival order (first on top) with
              detailed time breakdowns.
            </Kv>

            <H>The Controls</H>
            <Kv k="Fleet Size (2 / 4 / 6)">
              How many ships to model. Changing this resets the speed curve to the active preset.
            </Kv>
            <Kv k="Distance to Destination">
              Drag to instantly explore how the race changes at different distances. Short distances
              → all ships are in "peak" mode (no cruise phase). Long distances → later ships gain
              a compounding advantage.
            </Kv>
            <Kv k="Launch Stagger">
              Years between consecutive launches. More stagger gives later ships more of a speed
              advantage, but also delays the last launch further.
            </Kv>
            <Kv k="Speed Curve">
              Drag individual markers or use presets. Any change updates all trajectories instantly.
              This is the heart of the Wait Calculation — the steeper the curve, the more it
              pays to wait.
            </Kv>

            <H>What to Look For</H>
            <P>
              The most revealing moment is when a later ship's curve{' '}
              <span style={{ color: theme.primary }}>crosses</span> an earlier ship's — that is
              the overtake. It is the visual expression of Forward's Incessant Obsolescence
              Postulate: the earlier ship is now heading to a destination it will arrive at second.
            </P>
            <P>
              Try increasing the distance while watching the crossing points shift. Notice how
              a large enough distance causes even a ship with modest speed improvements to
              eventually overtake — given enough room to accelerate.
            </P>

            <div className="mt-6 mb-2">
              <SubpageLink onClick={() => setPage('labels')}
                hint="What MEC, E-TRANSIT, and τ (CREW) actually mean and why all three matter.">
                Reading the Callout Labels
              </SubpageLink>
            </div>

          </>)}

          {/* ── LABELS PAGE ────────────────────────────────────────────────── */}
          {page === 'labels' && (<>

            <H>Three Ways to Measure Time</H>
            <P>
              Each callout box shows the same journey measured from three different perspectives.
              They can differ dramatically at high speeds.
            </P>

            <Kv k="MEC — Master Earth Clock at arrival">
              The absolute Earth time when this ship reaches the destination, measured from the
              very first launch (year 0). This is the x-coordinate where the curve meets the
              finish line. Ships launched later will generally have a higher MEC even if they
              arrived in less travel time.
            </Kv>

            <Kv k="E-TRANSIT — Earth-frame journey duration">
              How long this specific ship's journey took, from Earth's point of view:{' '}
              <span style={{ color: theme.primary }}>MEC minus that ship's launch time</span>.
              This is the fairer comparison for "which ship was faster" — a ship that launched
              25 years later and arrived only 10 years later still travelled faster, even though
              its MEC is higher.
            </Kv>

            <Kv k="τ (CREW) — Proper time (ship clock)">
              Time experienced by the crew on board. Due to time dilation, this is always less
              than E-TRANSIT. At 90% SOL, the crew ages at only ~44% the rate of Earth. For
              very fast ships covering great distances, τ can be a small fraction of E-TRANSIT.
            </Kv>

            <P>
              <span style={{ color: theme.primary }}>Example:</span> Ship Bravo launches at year 25.
              Its MEC is 546y, E-TRANSIT is 521y (= 546 − 25), and τ is 454y.
              Ship Foxtrot launches at year 125 with a faster engine: MEC 529y, E-TRANSIT 404y,
              τ 81y. Foxtrot arrives earlier (lower MEC) AND travelled much faster (lower
              E-TRANSIT) AND its crew barely aged compared to Bravo's crew.
            </P>

          </>)}

        </div>
      </div>
    </div>
  );
}
