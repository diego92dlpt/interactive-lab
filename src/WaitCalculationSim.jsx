import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play, RotateCcw, X, Palette, Pause, Timer, ChevronsRight,
} from 'lucide-react';

// --- PHYSICS CONSTANTS ---
const C = 299792458;
const LY_IN_METERS = 9.461e15;
const YEAR_IN_SECONDS = 31536000;
const G = 9.80665;

const THEMES = {
  emerald: { primary: '#00FF41', secondary: '#008F11', muted: '#005500', glow: 'rgba(0, 255, 65, 0.2)' },
  amber:   { primary: '#FFB100', secondary: '#B37D00', muted: '#664700', glow: 'rgba(255, 177, 0, 0.2)' },
  cyan:    { primary: '#00E5FF', secondary: '#00A1B3', muted: '#005C66', glow: 'rgba(0, 229, 255, 0.2)' },
  frost:   { primary: '#FFFFFF', secondary: '#AAAAAA', muted: '#444444', glow: 'rgba(255, 255, 255, 0.1)' },
};

const CRAFT_NAMES = ["Alpha","Bravo","Charlie","Delta","Echo","Foxtrot","Golf","Hotel","India","Juliet"];

const DESTINATIONS = [
  { name: "Proxima Centauri b", dist: 4.24  },
  { name: "Alpha Centauri",     dist: 4.37  },
  { name: "Barnard's Star",     dist: 5.96  },
  { name: "Sirius",             dist: 8.6   },
  { name: "Epsilon Eridani",    dist: 10.5  },
  { name: "Tau Ceti",           dist: 11.9  },
  { name: "TRAPPIST-1",         dist: 39.5  },
  { name: "Kepler-186f",        dist: 582   },
  { name: "Galactic Center",    dist: 26000 },
];

const PRESET_CURVES = {
  Linear:       (i, n) => (i / (n - 1)),
  Exponential:  (i, n) => Math.pow(i / (n - 1), 2),
  'S-Curve':    (i, n) => { const x = (i / (n - 1)) * 10 - 5; return 1 / (1 + Math.exp(-x)); },
  'Diminishing':(i, n) => Math.sqrt(i / (n - 1)),
};

// ─── RELATIVISTIC PHYSICS: compute one ship's state at a given earthTime ─────
//
// All quantities are in the Earth (inertial) reference frame.
// 'acc' is proper acceleration — what the crew feels on an accelerometer (e.g. 1g).
// This is the correct relativistic brachistochrone model.
//
function computeShipState(earthTime, p) {
  const elapsedYears = earthTime - p.launchTime;
  if (elapsedYears <= 0) return { pos: 0, v: 0, shipTime: 0, hasLaunched: false, arrivedAt: null };

  const t = elapsedYears * YEAR_IN_SECONDS; // elapsed Earth-frame seconds since launch
  let pos = 0, v = 0, tau = 0;             // tau = proper time (ship clock), seconds

  if (p.type === 'peak') {
    // Ship never reaches vMax — turns around at the midpoint
    if (t < p.tAccel) {
      // Acceleration phase
      const atc = p.acc * t / C;
      v   = C * atc / Math.sqrt(1 + atc * atc);
      pos = (C * C / p.acc) * (Math.sqrt(1 + atc * atc) - 1);
      tau = (C / p.acc) * Math.asinh(atc);
    } else if (t < 2 * p.tAccel) {
      // Deceleration phase
      const tRem = p.tAccel - (t - p.tAccel); // Earth seconds remaining until arrival
      const atc  = p.acc * tRem / C;
      v   = C * atc / Math.sqrt(1 + atc * atc);
      pos = p.peakDist + (C * C / p.acc) * (p.gammaPeak - Math.sqrt(1 + atc * atc));
      tau = 2 * p.tauAccel - (C / p.acc) * Math.asinh(atc);
    } else {
      pos = p.totalDist; v = 0; tau = 2 * p.tauAccel;
    }

  } else {
    // Ship reaches vMax and cruises
    if (t < p.tAccel) {
      // Acceleration phase
      const atc = p.acc * t / C;
      v   = C * atc / Math.sqrt(1 + atc * atc);
      pos = (C * C / p.acc) * (Math.sqrt(1 + atc * atc) - 1);
      tau = (C / p.acc) * Math.asinh(atc);
    } else if (t < p.tAccel + p.tCruise) {
      // Cruise phase
      v   = p.vMax;
      pos = p.distToMax + p.vMax * (t - p.tAccel);
      tau = p.tauAccel + (t - p.tAccel) / p.gamma;
    } else if (t < 2 * p.tAccel + p.tCruise) {
      // Deceleration phase
      const tRem = p.tAccel - (t - p.tAccel - p.tCruise);
      const atc  = p.acc * tRem / C;
      v   = C * atc / Math.sqrt(1 + atc * atc);
      pos = (p.totalDist - p.distToMax) + (C * C / p.acc) * (p.gamma - Math.sqrt(1 + atc * atc));
      tau = 2 * p.tauAccel + p.tauCruise - (C / p.acc) * Math.asinh(atc);
    } else {
      pos = p.totalDist; v = 0; tau = 2 * p.tauAccel + p.tauCruise;
    }
  }

  pos = Math.min(pos, p.totalDist);
  const arrivedAt = earthTime >= p.arrivalT ? p.arrivalT : null;
  return { pos, v, shipTime: tau / YEAR_IN_SECONDS, hasLaunched: true, arrivedAt };
}

// ─── CANVAS: retro rocket shape (pointing right, centered at origin) ─────────
function drawRocket(ctx, cx, cy, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-12, -4);
  ctx.lineTo(-12, -8);
  ctx.lineTo( -4, -4);
  ctx.lineTo(  6, -4);
  ctx.lineTo( 16,  0);
  ctx.lineTo(  6,  4);
  ctx.lineTo( -4,  4);
  ctx.lineTo(-12,  8);
  ctx.lineTo(-12,  4);
  ctx.closePath();
  ctx.fill();
  const glow = ctx.createRadialGradient(-12, 0, 0, -12, 0, 8);
  glow.addColorStop(0, color + 'AA');
  glow.addColorStop(1, color + '00');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(-12, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function getGridStep(totalLY) {
  if (totalLY <=     10) return 1;
  if (totalLY <=     50) return 5;
  if (totalLY <=    200) return 25;
  if (totalLY <=   1000) return 100;
  if (totalLY <=  10000) return 1000;
  return Math.pow(10, Math.floor(Math.log10(totalLY)));
}

// ─── CANVAS: main draw function ───────────────────────────────────────────────
function drawSimCanvas(ctx, w, h, earthTime, flightProfiles, theme, totalDistLY, destinationName) {
  const n       = flightProfiles.length;
  const finishX = w * 0.80;
  const MONO    = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  const shipY   = (i) => n <= 1 ? h * 0.5 : h * (0.15 + (i / (n - 1)) * 0.70);

  ctx.clearRect(0, 0, w, h);

  // 1. Distance grid
  const step = getGridStep(totalDistLY);
  for (let d = step; d < totalDistLY; d += step) {
    const x = (d / totalDistLY) * finishX;

    // Dashed gridline — brighter than before
    ctx.save();
    ctx.strokeStyle = theme.primary + '50';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 7]);
    ctx.beginPath(); ctx.moveTo(x, 22); ctx.lineTo(x, h); ctx.stroke();

    // Solid tick at the top
    ctx.setLineDash([]);
    ctx.strokeStyle = theme.primary + 'AA';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 6); ctx.stroke();
    ctx.restore();

    // Label with a backing rect so it pops against the dark canvas
    const label = `${d} LY`;
    ctx.font = `bold 9px ${MONO}`;
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(0,0,0,0.70)';
    ctx.fillRect(x - tw / 2 - 3, 7, tw + 6, 14);
    ctx.fillStyle = theme.primary + 'CC';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, 18);
  }

  // 2. Lane tracks
  for (let i = 0; i < n; i++) {
    const y = shipY(i);
    ctx.save();
    ctx.strokeStyle = theme.primary + '18';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(finishX, y); ctx.stroke();
    ctx.restore();
  }

  // 3. Finish line
  ctx.save();
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([8, 5]);
  ctx.beginPath(); ctx.moveTo(finishX, 0); ctx.lineTo(finishX, h); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = theme.primary;
  ctx.font      = `bold 10px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.fillText(destinationName.toUpperCase(), finishX + 10, 20);
  ctx.fillStyle = theme.secondary;
  ctx.font      = `9px ${MONO}`;
  ctx.fillText(`${totalDistLY} LY`, finishX + 10, 34);

  // 4. Per-ship: trails → rocket → label
  // Pre-compute arrival rank (1 = first to arrive) sorted by arrivalT
  const rankMap = {};
  [...flightProfiles].sort((a, b) => a.arrivalT - b.arrivalT)
    .forEach((p, idx) => { rankMap[p.id] = idx + 1; });
  const MEDAL = ['#FFD700', '#C0C0C0', '#CD7F32']; // gold, silver, bronze

  for (let i = 0; i < n; i++) {
    const profile  = flightProfiles[i];
    const ship     = computeShipState(earthTime, profile);
    const y        = shipY(i);

    if (!ship.hasLaunched) {
      ctx.globalAlpha = 0.20;
      drawRocket(ctx, 4, y, theme.muted);
      ctx.globalAlpha = 1;
      continue;
    }

    const currentX = (ship.pos / profile.totalDist) * finishX;

    // Phase boundary X positions (for trail colouring)
    const accelEndX = profile.type === 'peak'
      ? (profile.peakDist  / profile.totalDist) * finishX
      : (profile.distToMax / profile.totalDist) * finishX;
    const cruiseEndX = profile.type === 'cruise'
      ? ((profile.totalDist - profile.distToMax) / profile.totalDist) * finishX
      : accelEndX;

    // Trail: accel (bright)
    if (currentX > 0) {
      const segEnd = Math.min(currentX, accelEndX);
      if (segEnd > 0) {
        ctx.save();
        ctx.strokeStyle = theme.primary; ctx.lineWidth = 3; ctx.globalAlpha = 0.90;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(segEnd, y); ctx.stroke();
        ctx.restore();
      }
    }
    // Trail: cruise (very dim)
    if (profile.type === 'cruise' && currentX > accelEndX) {
      const segEnd = Math.min(currentX, cruiseEndX);
      if (segEnd > accelEndX) {
        ctx.save();
        ctx.strokeStyle = theme.primary; ctx.lineWidth = 3; ctx.globalAlpha = 0.22;
        ctx.beginPath(); ctx.moveTo(accelEndX, y); ctx.lineTo(segEnd, y); ctx.stroke();
        ctx.restore();
      }
    }
    // Trail: decel (amber)
    const decelStart = profile.type === 'peak' ? accelEndX : cruiseEndX;
    if (currentX > decelStart) {
      ctx.save();
      ctx.strokeStyle = '#FFB100'; ctx.lineWidth = 3; ctx.globalAlpha = 0.80;
      ctx.beginPath(); ctx.moveTo(decelStart, y); ctx.lineTo(currentX, y); ctx.stroke();
      ctx.restore();
    }

    drawRocket(ctx, currentX, y, ship.arrivedAt ? theme.secondary : theme.primary);

    if (ship.arrivedAt) {
      // ── Permanent arrival label to the right of the finish line ──────────
      const rank       = rankMap[profile.id];
      const badgeColor = rank <= 3 ? MEDAL[rank - 1] : theme.secondary;
      const lx = finishX + 12;
      const ly = y - 23;
      ctx.save();
      // Box
      ctx.fillStyle   = 'rgba(0,0,0,0.90)';
      ctx.strokeStyle = theme.primary + '70';
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.rect(lx, ly, 82, 48); ctx.fill(); ctx.stroke();
      // Text
      ctx.textAlign = 'left';
      ctx.fillStyle = theme.primary; ctx.font = `bold 9px ${MONO}`;
      ctx.fillText(profile.name.toUpperCase(), lx + 4, ly + 13);
      ctx.fillStyle = theme.secondary; ctx.font = `8px ${MONO}`;
      ctx.fillText(`CAP: ${(profile.configuredSol * 100).toFixed(1)}% SOL`, lx + 4, ly + 26);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`\u03C4 = ${profile.finalShipTime.toFixed(2)}y`, lx + 4, ly + 39);
      // Rank badge — overlapping top-right corner of box
      const bx = lx + 82 - 1, by = ly + 1;  // top-right corner
      const br = 9;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fillStyle = badgeColor; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${rank >= 10 ? '7' : '9'}px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(rank), bx, by + 3.5);
      ctx.restore();
    } else {
      // ── En-route label — visible until arrival ───────────────────────────
      const lx = currentX + 18;
      const ly = y + 10;
      ctx.save();
      ctx.fillStyle   = 'rgba(0,0,0,0.88)';
      ctx.strokeStyle = theme.muted + '99';
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.rect(lx, ly, 82, 40); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#FFFFFF'; ctx.font = `bold 9px ${MONO}`;
      ctx.fillText(profile.name, lx + 4, ly + 13);
      ctx.fillStyle = theme.primary; ctx.font = `8px ${MONO}`;
      ctx.fillText(`${(ship.v / C * 100).toFixed(1)}% SOL`, lx + 4, ly + 25);
      ctx.fillStyle = theme.secondary;
      ctx.fillText(`SHIP T: ${ship.shipTime.toFixed(1)}y`, lx + 4, ly + 36);
      ctx.restore();
    }
  }
}

// ─── CONFIG HELP MODAL ────────────────────────────────────────────────────────
function ConfigHelpModal({ theme, onClose }) {
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

// ─── METHODOLOGY MODAL ────────────────────────────────────────────────────────
function MethodologyModal({ theme, onClose }) {
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

// ─── UNCHANGED: RetroPanel ────────────────────────────────────────────────────
const RetroPanel = ({ title, theme, children, className = "" }) => (
  <div
    className={`border bg-black p-4 transition-all duration-500 ${className}`}
    style={{ borderColor: `${theme.muted}80`, boxShadow: `0 0 15px ${theme.glow}` }}
  >
    <div className="mb-4 flex items-center gap-2 border-b pb-2" style={{ borderColor: `${theme.muted}50` }}>
      <div className="h-2 w-2 shadow-[0_0_5px_currentColor]" style={{ backgroundColor: theme.primary, color: theme.primary }} />
      <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.primary }}>{title}</h3>
    </div>
    {children}
  </div>
);

// ─── CurveEditor ─────────────────────────────────────────────────────────────
const CurveEditor = ({ craftCount, speeds, setSpeeds, minSol, setMinSol, maxSol, setMaxSol, theme, activePreset }) => {
  const containerRef  = useRef(null);
  const [draggingIdx,   setDraggingIdx]   = useState(null);
  const [draggingLimit, setDraggingLimit] = useState(null);
  const [editingIdx,    setEditingIdx]    = useState(null);
  const [editingVal,    setEditingVal]    = useState('');
  const [editingLimit,  setEditingLimit]  = useState(null); // 'min' | 'max' | null
  const [editingLimitVal, setEditingLimitVal] = useState('');
  const padding = 40;
  const h = 288;

  const commitEdit = () => {
    if (editingIdx === null) return;
    const pct = parseFloat(editingVal);
    if (!isNaN(pct)) {
      let newSol = Math.max(0, Math.min(100, pct)) / 100;
      newSol = Math.max(minSol, Math.min(maxSol, newSol));
      const prev = editingIdx > 0 ? speeds[editingIdx - 1] : minSol;
      const next = editingIdx < speeds.length - 1 ? speeds[editingIdx + 1] : maxSol;
      newSol = Math.max(prev, Math.min(next, newSol));
      const nextSpeeds = [...speeds];
      nextSpeeds[editingIdx] = newSol;
      setSpeeds(nextSpeeds);
    }
    setEditingIdx(null);
  };

  const commitLimitEdit = () => {
    if (!editingLimit) return;
    const pct = parseFloat(editingLimitVal);
    if (!isNaN(pct)) {
      const newVal = Math.max(0, Math.min(100, pct)) / 100;
      if (editingLimit === 'max') setMaxSol(Math.max(newVal, minSol + 0.01));
      else                        setMinSol(Math.min(newVal, maxSol - 0.01));
    }
    setEditingLimit(null);
  };

  const handleMouseMove = (e) => {
    if (editingIdx !== null || editingLimit !== null) return;
    if (draggingIdx === null && draggingLimit === null) return;
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    let val = 1 - ((y - padding) / (h - padding * 2));
    val = Math.max(0, Math.min(1, val));
    if (draggingLimit === 'min') {
      setMinSol(Math.min(val, maxSol - 0.01));
    } else if (draggingLimit === 'max') {
      setMaxSol(Math.max(val, minSol + 0.01));
    } else if (draggingIdx !== null) {
      let newSol = Math.max(minSol, Math.min(maxSol, val));
      const prev = draggingIdx > 0 ? speeds[draggingIdx - 1] : minSol;
      const next = draggingIdx < speeds.length - 1 ? speeds[draggingIdx + 1] : maxSol;
      newSol = Math.max(prev, Math.min(next, newSol));
      const nextSpeeds = [...speeds];
      nextSpeeds[draggingIdx] = newSol;
      setSpeeds(nextSpeeds);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative h-72 w-full cursor-crosshair overflow-hidden border select-none"
      style={{ borderColor: `${theme.muted}50`, backgroundColor: `${theme.muted}10` }}
      onMouseMove={handleMouseMove}
      onMouseUp={()    => { setDraggingIdx(null); setDraggingLimit(null); }}
      onMouseLeave={() => { setDraggingIdx(null); setDraggingLimit(null); }}
    >
      {/* Hint — tweak 1: use secondary at reduced opacity for better visibility */}
      <div className="absolute top-1 right-2 text-[7px] pointer-events-none select-none"
        style={{ color: theme.secondary, opacity: 0.55 }}>
        drag · dbl-click for exact value
      </div>

      <div className="absolute inset-x-10 inset-y-10 pointer-events-none opacity-10">
        {[0.25, 0.5, 0.75].map(p => (
          <React.Fragment key={p}>
            <div className="absolute left-0 right-0 border-t" style={{ top: `${p * 100}%`, borderColor: theme.primary }} />
            <div className="absolute top-0 bottom-0 border-l" style={{ left: `${p * 100}%`, borderColor: theme.primary }} />
          </React.Fragment>
        ))}
      </div>

      {/* Limit handles — tweak 2: double-click to type exact value */}
      {[
        { type: 'MAX', key: 'max', val: maxSol, side: 'left'  },
        { type: 'MIN', key: 'min', val: minSol, side: 'right' },
      ].map(limit => {
        const isEditingThis = editingLimit === limit.key;
        const y = padding + (1 - limit.val) * (h - padding * 2);
        return (
          <div key={limit.type}
            className="absolute left-0 right-0 h-6 -translate-y-1/2 cursor-ns-resize z-20 flex items-center"
            style={{ top: `${y}px` }}
            onMouseDown={() => { if (!isEditingThis) setDraggingLimit(limit.key); }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setDraggingLimit(null);
              setEditingLimit(limit.key);
              setEditingLimitVal((limit.val * 100).toFixed(1));
            }}
          >
            <div className="absolute top-1/2 left-0 right-0 border-t border-dashed opacity-80" style={{ borderColor: theme.primary }} />
            {isEditingThis ? (
              <div className={`z-10 flex items-center gap-1 bg-black border px-1 py-0.5 ${limit.side === 'left' ? 'ml-2' : 'mr-2 ml-auto'}`}
                style={{ borderColor: theme.primary }}>
                <input
                  type="number" step="0.1" autoFocus
                  value={editingLimitVal}
                  onChange={e => setEditingLimitVal(e.target.value)}
                  onFocus={e => e.target.select()}
                  onBlur={commitLimitEdit}
                  onKeyDown={e => {
                    if (e.key === 'Enter')  { e.preventDefault(); commitLimitEdit(); }
                    if (e.key === 'Escape') { setEditingLimit(null); }
                  }}
                  className="w-12 text-center text-[8px] font-black bg-black focus:outline-none"
                  style={{ color: theme.primary }}
                />
                <span className="text-[7px] font-black uppercase" style={{ color: theme.secondary }}>%</span>
              </div>
            ) : (
              <div className={`px-2 py-0.5 text-[8px] font-black uppercase bg-black border border-current z-10 ${limit.side === 'left' ? 'ml-2' : 'mr-2 ml-auto'}`}
                style={{ color: theme.primary }}>
                {limit.type} LIMIT: {(limit.val * 100).toFixed(1)}%
              </div>
            )}
          </div>
        );
      })}

      {activePreset && (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none"
          className="absolute inset-x-10 inset-y-10 h-[calc(100%-80px)] w-[calc(100%-80px)] pointer-events-none z-0">
          <polyline fill="none" stroke={theme.primary} strokeWidth="0.8" strokeDasharray="2 2" opacity="0.6"
            points={Array.from({ length: 51 }).map((_, i) => {
              const x   = (i / 50) * 100;
              const sol = minSol + PRESET_CURVES[activePreset](i, 51) * (maxSol - minSol);
              return `${x},${(1 - sol) * 100}`;
            }).join(' ')} />
        </svg>
      )}
      {speeds.map((sol, i) => {
        const xPercent = (i / (craftCount - 1));
        const x = 40 + xPercent * (containerRef.current?.clientWidth - 80 || 0);
        const y = 40 + (1 - sol) * (h - 80);
        const isActive = draggingIdx === i;
        return (
          <React.Fragment key={i}>
            {/* Precision input — tweak 3: onFocus selects all so user types to replace */}
            {editingIdx === i && (
              <div className="absolute z-50 flex flex-col items-center"
                style={{ left: `${x}px`, top: `${y - 40}px`, transform: 'translateX(-50%)' }}>
                <input
                  type="number" step="0.1" autoFocus
                  value={editingVal}
                  onChange={e => setEditingVal(e.target.value)}
                  onFocus={e => e.target.select()}
                  onBlur={commitEdit}
                  onKeyDown={e => {
                    if (e.key === 'Enter')  { e.preventDefault(); commitEdit(); }
                    if (e.key === 'Escape') { setEditingIdx(null); }
                  }}
                  className="w-14 text-center text-[10px] font-black border bg-black focus:outline-none"
                  style={{ color: theme.primary, borderColor: theme.primary }}
                />
                <div className="text-[7px] mt-0.5" style={{ color: theme.secondary }}>% SOL · Enter</div>
              </div>
            )}
            <div
              onMouseDown={(e) => { e.stopPropagation(); if (editingIdx === null) setDraggingIdx(i); }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setDraggingIdx(null);
                setEditingIdx(i);
                setEditingVal((sol * 100).toFixed(1));
              }}
              className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab border transition-all z-30"
              style={{ left: `${x}px`, top: `${y}px`, backgroundColor: isActive ? theme.primary : 'black',
                       borderColor: theme.primary, boxShadow: isActive ? `0 0 10px ${theme.primary}` : 'none' }}>
              {editingIdx !== i && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold"
                  style={{ color: theme.primary }}>{(sol * 100).toFixed(1)}%</span>
              )}
            </div>
            <div className="absolute bottom-2 -translate-x-1/2 text-[8px] font-bold uppercase tracking-tighter"
              style={{ left: `${x}px`, color: theme.secondary }}>{CRAFT_NAMES[i]}</div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [themeKey, setThemeKey] = useState('emerald');
  const theme = THEMES[themeKey];

  // Config state (unchanged)
  const [craftCount,     setCraftCount]     = useState(6);
  const [minSol,         setMinSol]         = useState(0.05);
  const [maxSol,         setMaxSol]         = useState(0.95);
  const [speeds,         setSpeeds]         = useState([]);
  const [activePreset,   setActivePreset]   = useState('S-Curve');
  const [acceleration,   setAcceleration]   = useState(1.0);
  const [stagger,        setStagger]        = useState(25);
  const [destination,    setDestination]    = useState(DESTINATIONS[0]);
  const [customDistance, setCustomDistance] = useState(10);

  // Sim control state
  const [showSim,           setShowSim]           = useState(false);
  const [showMethodology,   setShowMethodology]   = useState(false);
  const [showHelp,          setShowHelp]          = useState(() => !localStorage.getItem('waitcalc-help-seen'));
  const [isSimPaused,       setIsSimPaused]       = useState(true);
  const [isSkipping,        setIsSkipping]        = useState(false);
  const [earthTimeDisplay,  setEarthTimeDisplay]  = useState(0);
  const [timeScale,         setTimeScale]         = useState(10);
  const [notifications,     setNotifications]     = useState([]);

  // Sim refs
  const canvasRef            = useRef(null);
  const earthTimeRef         = useRef(0);
  const lastTimeRef          = useRef(null);
  const animRef              = useRef(null);
  const firstArrivalRef      = useRef(null);
  const arrivedShipsRef      = useRef(new Set());
  const lastDisplayUpdateRef = useRef(0);
  const loopBodyRef          = useRef(null);
  const skipRef              = useRef(null);   // { startRealTime, startEarthTime, targetEarthTime }
  const allArrivedPausedRef  = useRef(false);  // fire auto-pause only once

  const getDistance = () => destination.name === 'Custom' ? customDistance : destination.dist;

  // ── RELATIVISTIC FLIGHT PROFILES ───────────────────────────────────────────
  // Precomputed at launch time. All Earth-frame quantities.
  const flightProfiles = useMemo(() => {
    const totalDist = getDistance() * LY_IN_METERS;
    const acc       = acceleration * G;

    return speeds.map((sol, i) => {
      const vMax      = sol * C;
      const launchTime = i * stagger;
      const beta      = vMax / C;                                 // β = v/c
      const gamma     = 1 / Math.sqrt(1 - beta * beta);          // Lorentz factor
      const betaGamma = beta * gamma;                             // β·γ
      const tAccel    = betaGamma * C / acc;                      // Earth s to reach vMax
      const distToMax = (C * C / acc) * (gamma - 1);             // Earth m during accel
      const tauAccel  = (C / acc) * Math.asinh(betaGamma);       // proper s during accel

      if (distToMax * 2 > totalDist) {
        // PEAK profile — ship never reaches vMax, turns around at midpoint
        const k         = 1 + (totalDist * acc) / (2 * C * C);  // = γ at turnaround
        const tAccelPk  = (C / acc) * Math.sqrt(k * k - 1);     // Earth s to midpoint
        const tauAccelPk = (C / acc) * Math.asinh(Math.sqrt(k * k - 1));
        const arrivalT    = launchTime + (2 * tAccelPk) / YEAR_IN_SECONDS;
        const finalShipTime = (2 * tauAccelPk) / YEAR_IN_SECONDS;
        return {
          id: i, name: CRAFT_NAMES[i], launchTime, arrivalT, type: 'peak',
          acc, tAccel: tAccelPk, gammaPeak: k, tauAccel: tauAccelPk,
          peakDist: totalDist / 2, totalDist,
          configuredSol: sol, finalShipTime,
        };
      } else {
        // CRUISE profile — ship reaches vMax and cruises
        const cruiseDist = totalDist - 2 * distToMax;
        const tCruise    = cruiseDist / vMax;
        const tauCruise  = tCruise / gamma;
        const arrivalT   = launchTime + (2 * tAccel + tCruise) / YEAR_IN_SECONDS;
        const finalShipTime = (2 * tauAccel + tauCruise) / YEAR_IN_SECONDS;
        return {
          id: i, name: CRAFT_NAMES[i], launchTime, arrivalT, type: 'cruise',
          acc, tAccel, gamma, tauAccel, distToMax, tCruise, tauCruise, vMax, totalDist,
          configuredSol: sol, finalShipTime,
        };
      }
    });
  }, [speeds, destination, customDistance, acceleration, stagger]);

  // Preset effect (unchanged)
  useEffect(() => {
    const fn = PRESET_CURVES[activePreset] || PRESET_CURVES.Linear;
    setSpeeds(new Array(craftCount).fill(0).map((_, i) => minSol + fn(i, craftCount) * (maxSol - minSol)));
  }, [craftCount, activePreset, minSol, maxSol]);

  // Sim actions
  const resetSim = () => {
    earthTimeRef.current         = 0;
    lastTimeRef.current          = null;
    firstArrivalRef.current      = null;
    arrivedShipsRef.current      = new Set();
    lastDisplayUpdateRef.current = 0;
    skipRef.current              = null;
    allArrivedPausedRef.current  = false;
    setEarthTimeDisplay(0);
    setNotifications([]);
    setIsSimPaused(true);
    setIsSkipping(false);
  };

  const startSim = () => {
    resetSim();
    setShowSim(true);
    setTimeout(() => setIsSimPaused(false), 100);
  };

  // Loop body ref — always has fresh closure over current state/props
  const totalDistLY    = getDistance();
  const destinationName = destination.name;

  loopBodyRef.current = (timestamp) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr  = window.devicePixelRatio || 1;
    const cssW = canvas.parentElement.clientWidth;
    const cssH = canvas.parentElement.clientHeight;
    if (canvas.width  !== Math.round(cssW * dpr) ||
        canvas.height !== Math.round(cssH * dpr)) {
      canvas.width  = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // ── Time advancement ───────────────────────────────────────────────────
    if (skipRef.current) {
      // Skip-to-end: smooth linear advance over 10 real seconds
      if (!skipRef.current.startRealTime) skipRef.current.startRealTime = timestamp;
      const progress = Math.min(1, (timestamp - skipRef.current.startRealTime) / 10000);
      earthTimeRef.current = skipRef.current.startEarthTime
        + progress * (skipRef.current.targetEarthTime - skipRef.current.startEarthTime);
      if (progress >= 1) {
        earthTimeRef.current = skipRef.current.targetEarthTime;
        skipRef.current = null;
        setIsSkipping(false);
        setIsSimPaused(true);
        lastTimeRef.current = null;
      }
    } else if (!isSimPaused) {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      } else {
        const dtReal = (timestamp - lastTimeRef.current) / 1000;
        lastTimeRef.current = timestamp;
        earthTimeRef.current += dtReal * timeScale;
      }
    } else {
      lastTimeRef.current = null;
    }

    if (cssW > 0 && cssH > 0) {
      drawSimCanvas(ctx, cssW, cssH, earthTimeRef.current, flightProfiles, theme, totalDistLY, destinationName);
    }

    if (timestamp - lastDisplayUpdateRef.current > 100) {
      lastDisplayUpdateRef.current = timestamp;
      setEarthTimeDisplay(earthTimeRef.current);
    }

    // ── Arrival detection — sort by arrivalT to fix same-frame ordering ────
    const newArrivals = flightProfiles.filter(
      p => earthTimeRef.current >= p.arrivalT && !arrivedShipsRef.current.has(p.id)
    );
    if (newArrivals.length > 0) {
      newArrivals.sort((a, b) => a.arrivalT - b.arrivalT);
      newArrivals.forEach(profile => {
        arrivedShipsRef.current.add(profile.id);
        if (firstArrivalRef.current === null) {
          firstArrivalRef.current = profile.arrivalT;
          setNotifications(prev => [...prev, { id: profile.id, name: profile.name, time: profile.arrivalT, delay: 0 }]);
        } else {
          setNotifications(prev => [...prev, { id: profile.id, name: profile.name, time: profile.arrivalT, delay: profile.arrivalT - firstArrivalRef.current }]);
        }
      });
    }

    // ── Auto-pause and freeze MEC when all ships have arrived ──────────────
    if (flightProfiles.length > 0 && !allArrivedPausedRef.current) {
      const allDone = flightProfiles.every(p => arrivedShipsRef.current.has(p.id));
      if (allDone) {
        allArrivedPausedRef.current = true;
        const maxArrival = Math.max(...flightProfiles.map(p => p.arrivalT));
        earthTimeRef.current = maxArrival;
        setEarthTimeDisplay(maxArrival);
        setIsSimPaused(true);
        lastTimeRef.current = null;
      }
    }
  };

  // Canvas animation loop
  useEffect(() => {
    if (!showSim) return;
    const step = (timestamp) => {
      loopBodyRef.current(timestamp);
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [showSim]);

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#050505] font-mono p-4 md:p-8 transition-colors duration-1000 select-none"
      style={{ color: theme.primary }}>

      <header className="mb-8 flex flex-col md:flex-row items-baseline justify-between gap-4 border-b pb-4"
        style={{ borderColor: theme.muted }}>
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">
            Wait-Calc <span style={{ color: theme.muted }}>v2.0</span>
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: theme.secondary }}>
            Interstellar Obsolescence Simulator · Relativistic Brachistochrone
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Palette className="h-3 w-3" />
            <div className="flex gap-1">
              {Object.keys(THEMES).map(k => (
                <button key={k} onClick={() => setThemeKey(k)}
                  className={`w-4 h-4 border ${themeKey === k ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: THEMES[k].primary }} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.muted }}>
            <span>System: Nominal</span>
            <span className="animate-pulse" style={{ color: theme.primary }}>● Link: Active</span>
            <button
              onClick={() => setShowHelp(true)}
              className="border px-3 py-1 font-black uppercase tracking-widest transition-all hover:bg-white/5"
              style={{ borderColor: theme.primary, color: theme.primary }}
              title="How to use this simulator"
            >
              ? HELP
            </button>
          </div>
        </div>
      </header>

      {/* Config grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <RetroPanel title="Propulsion Capability Curve" theme={theme}>
            <div className="mb-4 flex flex-wrap gap-4 items-center justify-between text-[10px]">
              <div className="flex gap-2 items-center">
                <span style={{ color: theme.secondary }}>PRESETS:</span>
                {Object.keys(PRESET_CURVES).map(name => (
                  <button key={name} onClick={() => setActivePreset(name)}
                    className={`border px-2 py-1 uppercase font-bold transition-all ${activePreset === name ? 'bg-white/10' : 'opacity-60'}`}
                    style={{ borderColor: theme.muted, color: activePreset === name ? theme.primary : theme.secondary }}>
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <CurveEditor craftCount={craftCount} speeds={speeds} setSpeeds={setSpeeds}
              minSol={minSol} setMinSol={setMinSol} maxSol={maxSol} setMaxSol={setMaxSol}
              theme={theme} activePreset={activePreset} />
          </RetroPanel>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RetroPanel title="Mission Parameters" theme={theme}>
              <div className="space-y-4 text-xs">
                <div className="flex flex-col gap-1">
                  <label style={{ color: theme.secondary }} className="font-bold">DESTINATION</label>
                  <select value={destination.name}
                    onChange={(e) => {
                      const found = DESTINATIONS.find(x => x.name === e.target.value);
                      setDestination(found || { name: 'Custom', dist: customDistance });
                    }}
                    className="bg-black border p-2 focus:outline-none"
                    style={{ borderColor: theme.muted, color: theme.primary }}>
                    {DESTINATIONS.map(d => <option key={d.name} value={d.name}>{d.name} ({d.dist} LY)</option>)}
                    <option value="Custom">Custom Target...</option>
                  </select>
                </div>
                {destination.name === 'Custom' && (
                  <div className="flex flex-col gap-1">
                    <label className="font-bold flex justify-between" style={{ color: theme.secondary }}>
                      <span>CUSTOM DISTANCE</span><span style={{ color: theme.primary }}>{customDistance} LY</span>
                    </label>
                    <input type="number" min="0.1" step="0.1" value={customDistance}
                      onChange={e => {
                        const v = Math.max(0.1, Number(e.target.value));
                        setCustomDistance(v);
                        setDestination({ name: 'Custom', dist: v });
                      }}
                      className="bg-black border p-2 focus:outline-none w-full"
                      style={{ borderColor: theme.muted, color: theme.primary }} />
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <label className="font-bold flex justify-between" style={{ color: theme.secondary }}>
                    <span>LAUNCH STAGGER</span><span style={{ color: theme.primary }}>{stagger} YRS</span>
                  </label>
                  <input type="range" min="1" max="100" value={stagger}
                    onChange={e => setStagger(Number(e.target.value))}
                    className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer"
                    style={{ accentColor: theme.primary }} />
                </div>
              </div>
            </RetroPanel>

            <RetroPanel title="Physics Constants" theme={theme}>
              <div className="space-y-4 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="font-bold flex justify-between" style={{ color: theme.secondary }}>
                    <span>ACCELERATION (G)</span><span style={{ color: theme.primary }}>{acceleration} G</span>
                  </label>
                  <input type="range" min="0.1" max="2.0" step="0.1" value={acceleration}
                    onChange={e => setAcceleration(Number(e.target.value))}
                    className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer"
                    style={{ accentColor: theme.primary }} />
                </div>
                <div className="flex flex-col gap-1">
                  <label style={{ color: theme.secondary }} className="font-bold uppercase">Fleet Size</label>
                  <div className="flex gap-1">
                    {[2, 4, 6, 8, 10].map(n => (
                      <button key={n} onClick={() => setCraftCount(n)}
                        className={`flex-1 border p-1 text-[10px] font-bold ${craftCount === n ? 'bg-white/10' : ''}`}
                        style={{ borderColor: craftCount === n ? theme.primary : theme.muted,
                                 color: craftCount === n ? theme.primary : theme.muted }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </RetroPanel>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <RetroPanel title="Fleet Status Summary" theme={theme}>
            {(() => {
              const winner = flightProfiles.length
                ? flightProfiles.reduce((a, b) => a.arrivalT < b.arrivalT ? a : b)
                : null;
              const rows = [
                ["FLEET SPAN",    `${(craftCount - 1) * stagger} YEARS`],
                ["FASTEST CRAFT", `${((speeds[speeds.length - 1] || 0) * 100).toFixed(1)}% SOL`],
                ["DESTINATION",   `${getDistance()} LY`],
                ["PREDICTED 1ST", winner ? `${winner.name} · ${winner.arrivalT.toFixed(1)} YRS` : '—'],
              ];
              return (
            <div className="space-y-3">
              {rows.map(([l, v]) => (
                <div key={l} className="flex justify-between items-center text-[10px] border-b pb-2"
                  style={{ borderColor: `${theme.muted}50` }}>
                  <span style={{ color: theme.secondary }}>{l}</span>
                  <span style={{ color: l === 'PREDICTED 1ST' ? theme.primary : 'white' }}>{v}</span>
                </div>
              ))}
            </div>
              );
            })()}
            <button onClick={startSim}
              className="group w-full py-4 mt-6 font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
              style={{ backgroundColor: theme.primary, color: 'black' }}>
              Launch Simulation <Play className="h-4 w-4 fill-black" />
            </button>
          </RetroPanel>
        </div>
      </div>

      {/* Simulation overlay */}
      {showSim && (
        <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col p-4 md:p-8 animate-in fade-in zoom-in duration-300 overflow-hidden">

          {/* Header bar */}
          <div className="flex justify-between items-center border-b pb-4 mb-4" style={{ borderColor: theme.muted }}>
            <div>
              <h2 className="text-xl font-bold uppercase tracking-tighter" style={{ color: theme.primary }}>
                Voyage Tracking: {destination.name}
              </h2>
              <p className="text-[10px] uppercase font-bold" style={{ color: theme.secondary }}>
                Relativistic Brachistochrone · Target: {getDistance()} LY
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsSimPaused(p => !p)} className="p-2 border" style={{ borderColor: theme.muted }}>
                {isSimPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>
              <button
                onClick={() => {
                  if (isSkipping || !flightProfiles.length) return;
                  const maxArrival = Math.max(...flightProfiles.map(p => p.arrivalT));
                  if (earthTimeRef.current >= maxArrival) return;
                  skipRef.current = { startRealTime: null, startEarthTime: earthTimeRef.current, targetEarthTime: maxArrival };
                  setIsSkipping(true);
                  setIsSimPaused(false);
                  lastTimeRef.current = null;
                }}
                className="p-2 border" style={{ borderColor: theme.muted, opacity: isSkipping ? 0.4 : 1 }}
                title="Skip to end (10s)"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
              <button onClick={resetSim} className="p-2 border" style={{ borderColor: theme.muted }}>
                <RotateCcw className="h-4 w-4" />
              </button>
              <button onClick={() => setShowMethodology(true)} className="p-2 border" style={{ borderColor: theme.muted }} title="Simulation Methodology">
                <span className="flex h-4 w-4 items-center justify-center text-sm font-black leading-none">?</span>
              </button>
              <button onClick={() => { setShowSim(false); resetSim(); }}
                className="p-2 border hover:bg-red-900/20" style={{ borderColor: theme.muted }}>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Canvas viewport */}
          <div className="flex-1 relative overflow-hidden" style={{ border: `1px solid ${theme.muted}50` }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
            {notifications.map(n => {
              const idx  = flightProfiles.findIndex(p => p.id === n.id);
              const yPct = flightProfiles.length <= 1 ? 50 : 15 + (idx / (flightProfiles.length - 1)) * 70;
              return (
                <div key={n.name}
                  className="absolute right-4 z-20 animate-in slide-in-from-right duration-500"
                  style={{ top: `${yPct}%`, transform: 'translateY(-50%)' }}>
                  <div className="bg-black border p-2 text-[10px] font-black"
                    style={{ borderColor: theme.primary, boxShadow: `0 0 10px ${theme.glow}` }}>
                    <div className="flex justify-between gap-4 items-center">
                      <span style={{ color: theme.primary }}>
                        {n.name} {n.delay === 0 ? 'ARRIVED FIRST!' : 'ARRIVED'}
                      </span>
                      <span className="text-white">EARTH T: {n.time.toFixed(1)}y</span>
                    </div>
                    {n.delay > 0 && (
                      <div className="text-[9px] mt-0.5" style={{ color: theme.secondary }}>
                        DELAY RELATIVE TO LEADER: +{n.delay.toFixed(1)} YEARS
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom controls */}
          <div className="mt-4 flex flex-wrap gap-4 text-[10px] font-bold uppercase">
            <div className="border p-2 flex gap-4" style={{ borderColor: theme.muted }}>
              <span className="text-white">MASTER EARTH CLOCK:</span>
              <span style={{ color: theme.primary }}>T + {earthTimeDisplay.toFixed(2)} YRS</span>
            </div>
            <div className="border p-2 flex gap-4" style={{ borderColor: theme.muted }}>
              <span className="text-white">TIME SCALE:</span>
              <div className="flex gap-2">
                {[1, 5, 10, 25, 50, 100, 200].map(s => (
                  <button key={s} onClick={() => setTimeScale(s)}
                    className={`transition-all ${timeScale === s ? 'text-white underline underline-offset-4' : 'opacity-30'}`}
                    style={{ color: theme.primary }}>{s}x</button>
                ))}
              </div>
            </div>
            <div className="flex-1" />
            <div className="border p-2 flex gap-4" style={{ borderColor: theme.muted }}>
              <span className="text-white">MISSION STATUS:</span>
              <span className="animate-pulse"
                style={{ color: notifications.length >= flightProfiles.length ? theme.primary : '#FFB100' }}>
                {notifications.length >= flightProfiles.length ? 'ALL CRAFT ARRIVED' : 'ACTIVE TRANSIT'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Config help modal */}
      {showHelp && (
        <ConfigHelpModal theme={theme} onClose={() => {
          localStorage.setItem('waitcalc-help-seen', '1');
          setShowHelp(false);
        }} />
      )}

      {/* Methodology modal */}
      {showMethodology && (
        <MethodologyModal theme={theme} onClose={() => setShowMethodology(false)} />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 12px; height: 12px; background: currentColor;
          cursor: pointer; border-radius: 1px;
        }
      `}} />
    </div>
  );
}
