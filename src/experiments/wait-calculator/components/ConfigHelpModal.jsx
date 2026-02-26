import React from 'react';
import { X } from 'lucide-react';

export default function ConfigHelpModal({ theme, onClose }) {
  const H = ({ children }) => (
    <h4 className="text-[11px] font-black uppercase tracking-widest mt-6 mb-2 pb-1 border-b"
      style={{ color: theme.primary, borderColor: theme.muted + '60' }}>
      {children}
    </h4>
  );
  const P = ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>;
  const Kv = ({ k, children }) => (
    <div className="mb-2 pl-3 border-l-2" style={{ borderColor: theme.muted }}>
      <span className="font-black" style={{ color: theme.primary }}>{k} — </span>
      <span>{children}</span>
    </div>
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
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: theme.primary }}>
              How to Use Wait-Calc
            </h3>
            <p className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: theme.secondary }}>
              Setup Guide · Controls · FAQ
            </p>
          </div>
          <button onClick={onClose} className="p-2 border hover:bg-red-900/20" style={{ borderColor: theme.muted }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-5 text-xs space-y-1" style={{ color: theme.secondary }}>

          <H>What Is This?</H>
          <P>
            The <span style={{ color: theme.primary }}>Wait Calculation Simulator</span> demonstrates
            Andrew Kennedy's 2006 insight: because propulsion technology improves over time, a ship
            launched today may be overtaken by a faster ship launched later — arriving at the destination
            already obsolete. This tool lets you design a fleet across a technology curve and then watch
            the race play out with correct relativistic physics.
          </P>

          <H>Step 1 — Propulsion Capability Curve</H>
          <P>
            This graph shows your fleet's technology progression. Ship 1 (left) launches first with
            the lowest top speed; the last ship launches with the highest. The Y-axis is max cruise
            velocity as a percentage of light speed (% SOL).
          </P>
          <Kv k="Drag a marker">Move it up or down to set that ship's max velocity. For a precise value, <span style={{ color: theme.primary }}>double-click any marker</span> — a number input appears. Type the exact % SOL you want and press Enter (or click away to confirm).</Kv>
          <Kv k="MIN / MAX limit handles">The dashed horizontal lines cap the entire fleet's velocity
            range. Drag them to narrow or widen the band — all markers stay within these bounds.</Kv>
          <Kv k="PRESETS">Auto-arrange markers into standard growth shapes:
            <span style={{ color: theme.primary }}> Linear</span> = equal speed steps;
            <span style={{ color: theme.primary }}> Exponential</span> = slow start, fast finish (hockey stick);
            <span style={{ color: theme.primary }}> S-Curve</span> = slow → rapid → plateau (classic adoption);
            <span style={{ color: theme.primary }}> Diminishing</span> = fast early gains that taper off.
          </Kv>

          <H>Step 2 — Mission Parameters</H>
          <Kv k="DESTINATION">Choose a target star or enter any custom distance in Light Years.</Kv>
          <Kv k="LAUNCH STAGGER">Years between consecutive ship launches. More stagger = more time
            for technology to improve, but longer overall mission span.</Kv>

          <H>Step 3 — Physics Constants</H>
          <Kv k="ACCELERATION">Constant thrust the crew feels, in units of g (Earth gravity). 1g is
            comfortable and the most common assumption; 2g is an aggressive upper bound for sustained
            thrust. Higher g = shorter travel time.</Kv>
          <Kv k="FLEET SIZE">Number of ships in the simulation (2–10). Each ship represents a
            generation of propulsion technology.</Kv>

          <H>Step 4 — Launch</H>
          <P>
            The <span style={{ color: theme.primary }}>Fleet Status Summary</span> on the right
            shows live readouts: total span from first to last launch, the global %SOL ceiling
            (the MAX LIMIT slider value), and the target distance.
            Hit <span style={{ color: theme.primary }}>LAUNCH SIMULATION</span> when ready.
          </P>

          <H>Inside the Simulation</H>
          <Kv k="Rocket trails">Bright = accelerating; dim = cruising at top speed; amber = decelerating.</Kv>
          <Kv k="Ship label">Shows current velocity (% SOL) and elapsed ship-clock time. The ship
            clock runs slower than Earth's due to relativistic time dilation.</Kv>
          <Kv k="Master Earth Clock">Bottom bar. Ticks in Earth coordinate time — the reference frame
            for all position and arrival calculations.</Kv>
          <Kv k="TIME SCALE">Controls how fast simulation time runs. 50× means each real second
            represents 50 simulation years.</Kv>
          <Kv k="? button">Opens the Physics Methodology panel — equations, reference frames,
            and a deep dive into the brachistochrone trajectory model.</Kv>

          <H>FAQ</H>
          <Kv k="What is % SOL?">Percent of the Speed of Light (c ≈ 300,000 km/s). 10% SOL = 30,000 km/s.</Kv>
          <Kv k="Why can ships only reach ~100% SOL?">Special relativity: nothing with mass can
            reach or exceed c. As velocity approaches the speed of light, the energy required grows
            without bound.</Kv>
          <Kv k="What is 'proper acceleration'?">The g-force the crew physically feels — what an
            onboard accelerometer reads. At 1g they experience normal Earth gravity throughout
            the journey.</Kv>
          <Kv k="What is the 'flip' maneuver?">At the halfway point the ship rotates 180° and fires
            its engine in reverse, decelerating to arrive at rest. This is the time-optimal
            trajectory for a fixed thrust level (the brachistochrone).</Kv>
          <Kv k="Why does the ship clock run slow?">Time dilation: a moving clock runs slower than a
            stationary one. At 90% SOL the ship clock ticks at only ~44% of Earth rate. The crew ages
            far less than the years that pass on Earth.</Kv>
          <Kv k="What is the 'wait calculation' sweet spot?">The optimal launch window where waiting
            any longer delays arrival more than it gains from the speed improvement. It depends on the
            technology growth rate — steeper curves favor waiting longer.</Kv>

        </div>
      </div>
    </div>
  );
}
