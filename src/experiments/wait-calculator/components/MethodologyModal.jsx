import React from 'react';
import { X } from 'lucide-react';

export default function MethodologyModal({ theme, onClose }) {
  const P = ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>;
  const Formula = ({ children }) => (
    <pre className="my-3 p-3 text-[11px] leading-6 overflow-x-auto border-l-2"
      style={{ color: theme.primary, borderColor: theme.primary + '60', backgroundColor: 'rgba(0,0,0,0.6)', fontFamily: 'inherit' }}>
      {children}
    </pre>
  );
  const H = ({ children }) => (
    <h4 className="text-[11px] font-black uppercase tracking-widest mt-6 mb-3 pb-2 border-b"
      style={{ color: theme.primary, borderColor: theme.muted + '60' }}>
      {children}
    </h4>
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8"
      style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-[#050505] border w-full max-w-2xl max-h-[88vh] flex flex-col"
        style={{ borderColor: theme.primary, boxShadow: `0 0 40px ${theme.glow}` }}>

        {/* Sticky header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: theme.muted }}>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: theme.primary }}>
              Simulation Methodology
            </h3>
            <p className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: theme.secondary }}>
              Physics · Trajectory Model · Reference Frames
            </p>
          </div>
          <button onClick={onClose} className="p-2 border hover:bg-red-900/20" style={{ borderColor: theme.muted }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-6 py-5 text-xs space-y-1" style={{ color: theme.secondary }}>

          <H>The Wait Calculation</H>
          <P>
            This simulation is built on two ideas from interstellar mission planning. The{' '}
            <span style={{ color: theme.primary }}>Incessant Obsolescence Postulate</span>{' '}
            (Robert L. Forward, 1984) observes that because propulsion technology improves over time,
            a spacecraft launched today is likely to be overtaken by a faster craft launched later —
            arriving at the destination already scientifically obsolete.
          </P>
          <P>
            The <span style={{ color: theme.primary }}>Wait Calculation</span>{' '}
            (Andrew Kennedy, 2006) asks: given an exponentially-improving technology curve,
            when is the ideal departure time? Leaving too early means being overtaken;
            waiting too long means unnecessary delay. A mathematically optimal departure window exists,
            typically 50–200 years from now depending on assumptions about growth rate.
          </P>

          <H>Trajectory Model — The Brachistochrone</H>
          <P>
            Each craft follows a three-phase constant-acceleration trajectory designed to arrive
            at the destination at rest:
          </P>
          <Formula>
{`  Phase 1  ACCELERATION — constant thrust from rest to cruise velocity
  Phase 2  CRUISE       — constant velocity (if cruise velocity is reached
                          before the midpoint)
  Phase 3  DECELERATION — reversed thrust, arriving at rest at destination`}
          </Formula>
          <P>
            The "flip" maneuver at the midpoint turns the rocket 180° so the engine decelerates the
            craft. This is the time-optimal trajectory between two points for a fixed thrust level.
            <span style={{ color: theme.primary }}> Proper acceleration</span> (e.g. 1g) is what
            the crew physically feels — measured by an onboard accelerometer — and is constant
            throughout both thrust phases.
          </P>

          <H>Newtonian vs Relativistic Mechanics</H>
          <P>
            Classical mechanics predicts ship positions using simple equations that have no speed
            limit:
          </P>
          <Formula>
{`  Newtonian (approximation, valid only at v << c):
  v(t) = a · t
  x(t) = ½ · a · t²`}
          </Formula>
          <P>
            These equations are wrong at interstellar speeds. At 1g for one year, Newtonian mechanics
            says the ship exceeds the speed of light. This simulation uses the correct
            special-relativistic equations instead.
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
            The velocity asymptotically approaches c but never reaches it. At low speeds
            (v ≪ c) both equations reduce to the Newtonian approximation. The divergence
            becomes significant above ~30% SOL and is severe above 70%:
          </P>
          <Formula>
{`  vmax     Newtonian accel time    Relativistic accel time
  20% SOL       0.19 yr                  0.20 yr   (+2%)
  50% SOL       0.49 yr                  0.56 yr  (+15%)
  90% SOL       0.87 yr                  2.00 yr (+130%)`}
          </Formula>

          <H>Acceleration Phase — Key Derived Quantities</H>
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

          <H>Ship Clock — Proper Time</H>
          <P>
            Special relativity requires that a moving clock runs slower than a stationary one
            (time dilation). The ship's elapsed time τ (proper time) accumulates more slowly
            than Earth time t. The exact analytic formula for constant proper acceleration is:
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

        </div>
      </div>
    </div>
  );
}
