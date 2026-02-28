import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

const PAGES = {
  main:             'Simulation Methodology',
  brachistochrone:  'Trajectory Model',
  newtonian:        'Newtonian vs Relativistic',
  accel:            'Acceleration Phase',
  shiptime:         'Ship Clock — Proper Time',
};

export default function MethodologyModal({ theme, onClose }) {
  const [page, setPage] = useState('main');

  const H = ({ children }) => (
    <h4 className="text-[11px] font-black uppercase tracking-widest mt-7 mb-3 pb-1 border-b"
      style={{ color: theme.primary, borderColor: theme.muted + '60' }}>
      {children}
    </h4>
  );
  const P = ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>;
  const Formula = ({ children }) => (
    <pre className="my-4 p-3 text-[11px] leading-6 overflow-x-auto border-l-2"
      style={{ color: theme.primary, borderColor: theme.primary + '60',
               backgroundColor: 'rgba(0,0,0,0.6)', fontFamily: 'inherit' }}>
      {children}
    </pre>
  );
  const Kv = ({ k, children }) => (
    <div className="mb-4 pl-3 border-l-2" style={{ borderColor: theme.muted }}>
      <div className="font-black mb-0.5" style={{ color: theme.primary }}>{k}</div>
      <div>{children}</div>
    </div>
  );
  const SubpageLink = ({ pageKey, hint }) => (
    <button onClick={() => setPage(pageKey)}
      className="w-full text-left border px-4 py-3 mt-2 flex items-center justify-between gap-3 hover:bg-white/5 transition-all group"
      style={{ borderColor: theme.muted + '80' }}>
      <div>
        <div className="text-[10px] font-black uppercase tracking-wide" style={{ color: theme.primary }}>
          {PAGES[pageKey]}
        </div>
        <div className="text-[9px] mt-0.5" style={{ color: theme.secondary }}>{hint}</div>
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
      <div className="relative bg-[#050505] border w-full max-w-2xl max-h-[88vh] flex flex-col"
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
                {PAGES[page]}
              </h3>
              <p className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: theme.secondary }}>
                {page === 'main' ? 'Physics · Reference Frames · Controls' : '← back to overview'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 border hover:bg-red-900/20" style={{ borderColor: theme.muted }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 text-xs" style={{ color: theme.secondary }}>

          {/* ── MAIN ───────────────────────────────────────────────────────── */}
          {page === 'main' && (<>

            <H>The Wait Calculation</H>
            <P>
              The <span style={{ color: theme.primary }}>Incessant Obsolescence Postulate</span>{' '}
              (Robert L. Forward, 1984) observes that because propulsion technology improves over
              time, a spacecraft launched today is likely to be overtaken by a faster craft
              launched later — arriving at the destination already scientifically obsolete.
            </P>
            <P>
              The <span style={{ color: theme.primary }}>Wait Calculation</span>{' '}
              (Andrew Kennedy, 2006) asks: given an exponentially-improving technology curve,
              when is the ideal departure time? Leaving too early means being overtaken; waiting
              too long means unnecessary delay. A mathematically optimal departure window exists,
              typically 50–200 years from now depending on assumptions about growth rate.
            </P>

            <H>Inside the Simulation</H>
            <Kv k="Rocket trails">
              <span style={{ color: theme.primary }}>Bright</span> = accelerating ·{' '}
              <span style={{ color: theme.secondary }}>dim</span> = cruising at top speed ·{' '}
              <span style={{ color: '#FFB100' }}>amber</span> = decelerating toward destination.
            </Kv>
            <Kv k="Ship label">
              Shows current velocity (% SOL) and elapsed ship-clock time. The ship clock runs
              slower than Earth's due to relativistic time dilation.
            </Kv>
            <Kv k="Stagger labels">
              The +0y, +25y… labels on the left show each ship's launch offset from the first departure.
            </Kv>
            <Kv k="Master Earth Clock">
              Bottom bar. Ticks in Earth coordinate time — the reference frame for all position
              and arrival calculations.
            </Kv>
            <Kv k="TIME SCALE">
              Controls how fast simulation time runs. 50× means each real second represents
              50 simulation years.
            </Kv>
            <Kv k="Newtonian Ghosts">
              Toggle (bottom bar) shows a dimmed outline of where each ship would be under
              classical physics — no speed limit, no time dilation. The gap widens dramatically
              at high velocities.
            </Kv>

            <H>Deep Dives</H>
            <div className="mb-2">
              <SubpageLink pageKey="brachistochrone"
                hint="How the flip maneuver works and why it's the fastest possible path." />
              <SubpageLink pageKey="newtonian"
                hint="Just how wrong is classical physics at 90% SOL? The answer may surprise you." />
              <SubpageLink pageKey="accel"
                hint="The exact Earth-frame equations for time and distance during constant thrust." />
              <SubpageLink pageKey="shiptime"
                hint="Why the crew ages so much less than Earth observers, with exact numbers." />
            </div>

          </>)}

          {/* ── BRACHISTOCHRONE ─────────────────────────────────────────────── */}
          {page === 'brachistochrone' && (<>

            <H>The Three Phases</H>
            <P>
              Each craft follows a constant-acceleration trajectory designed to arrive at rest:
            </P>
            <Formula>
{`  Phase 1  ACCELERATION — constant thrust from rest to cruise velocity
  Phase 2  CRUISE       — constant velocity (if cruise speed is reached
                          before the midpoint)
  Phase 3  DECELERATION — reversed thrust, arriving at rest at destination`}
            </Formula>
            <P>
              The "flip" maneuver at the midpoint turns the rocket 180° so the engine decelerates
              the craft. This is the time-optimal trajectory between two points for a fixed thrust
              level.{' '}
              <span style={{ color: theme.primary }}>Proper acceleration</span> (e.g. 1g) is what
              the crew physically feels — constant throughout both thrust phases.
            </P>
            <P>
              If the destination is close enough that the ship would overshoot by simply
              accelerating to midpoint, it instead peaks at the midpoint velocity and immediately
              begins decelerating — a "peak" profile with no cruise phase.
            </P>

          </>)}

          {/* ── NEWTONIAN vs RELATIVISTIC ───────────────────────────────────── */}
          {page === 'newtonian' && (<>

            <H>Classical vs Relativistic</H>
            <P>
              Classical mechanics predicts ship positions using simple equations that have no
              speed limit:
            </P>
            <Formula>
{`  Newtonian (approximation, valid only at v << c):
  v(t) = a · t
  x(t) = ½ · a · t²`}
            </Formula>
            <P>
              These equations break down at interstellar speeds. At 1g for one year, Newtonian
              mechanics says the ship exceeds the speed of light. This simulation uses the correct
              special-relativistic equations instead:
            </P>
            <Formula>
{`  Relativistic (Earth observer frame, exact):
  v(t) = (a · t) / √(1 + (a·t / c)²)
  x(t) = (c²/a) · (√(1 + (a·t / c)²) − 1)

  where  a = proper acceleration (crew-felt)
         t = Earth coordinate time
         c = speed of light`}
            </Formula>
            <P>
              Velocity asymptotically approaches c but never reaches it. The divergence becomes
              significant above ~30% SOL and is severe above 70%:
            </P>
            <Formula>
{`  v_max     Newtonian accel time    Relativistic accel time
  20% SOL       0.19 yr                  0.20 yr   (+2%)
  50% SOL       0.49 yr                  0.56 yr  (+15%)
  90% SOL       0.87 yr                  2.00 yr (+130%)`}
            </Formula>

          </>)}

          {/* ── ACCELERATION PHASE ─────────────────────────────────────────── */}
          {page === 'accel' && (<>

            <H>Key Derived Quantities</H>
            <P>
              Given cruise velocity v_max, the Earth-frame duration and distance of the
              acceleration phase are:
            </P>
            <Formula>
{`  β  = v_max / c                        (velocity as fraction of c)
  γ  = 1 / √(1 − β²)                   (Lorentz factor at v_max)

  Earth time to reach v_max:
    t_accel = β · γ · c / a

  Distance covered during acceleration:
    d_accel = (c²/a) · (γ − 1)

  If  2 · d_accel > total distance, the ship never reaches v_max.
  It peaks at the midpoint and immediately begins decelerating.`}
            </Formula>

          </>)}

          {/* ── SHIP CLOCK ─────────────────────────────────────────────────── */}
          {page === 'shiptime' && (<>

            <H>Proper Time</H>
            <P>
              Special relativity requires that a moving clock runs slower than a stationary one.
              The ship's elapsed time τ (proper time) accumulates more slowly than Earth time t.
              The exact analytic formula for constant proper acceleration is:
            </P>
            <Formula>
{`  During acceleration / deceleration:
    τ(t) = (c / a) · arcsinh(a · t / c)

  During cruise at v_max  (γ = Lorentz factor at v_max):
    τ(t) = τ_accel + (t − t_accel) / γ`}
            </Formula>
            <P>
              Example: a ship cruising at 90% SOL has γ ≈ 2.29. Its clock ticks 2.29× slower
              than Earth's. A journey measured as 100 Earth years accumulates only ~44 years
              on the ship's clock.
            </P>
            <P>
              All positions, velocities, and arrival times in this simulation are computed in
              the Earth (inertial) reference frame. The ship-relative time displayed on each
              marker is the only quantity shown from the crew's perspective.
            </P>

          </>)}

        </div>
      </div>
    </div>
  );
}
