// ─── PHYSICS CONSTANTS ────────────────────────────────────────────────────────
export const C               = 299792458;
export const LY_IN_METERS    = 9.461e15;
export const YEAR_IN_SECONDS = 31536000;
export const G               = 9.80665;

// ─── UI THEMES ────────────────────────────────────────────────────────────────
export const THEMES = {
  emerald: { primary: '#00FF41', secondary: '#008F11', muted: '#005500', glow: 'rgba(0, 255, 65, 0.2)'    },
  amber:   { primary: '#FFB100', secondary: '#B37D00', muted: '#664700', glow: 'rgba(255, 177, 0, 0.2)'   },
  cyan:    { primary: '#00E5FF', secondary: '#00A1B3', muted: '#005C66', glow: 'rgba(0, 229, 255, 0.2)'   },
  violet:  { primary: '#C084FC', secondary: '#8B5CF6', muted: '#3B1F5E', glow: 'rgba(192, 132, 252, 0.15)'},
};

// ─── FLEET DATA ───────────────────────────────────────────────────────────────
export const CRAFT_NAMES = ["Alpha","Bravo","Charlie","Delta","Echo","Foxtrot","Golf","Hotel","India","Juliet"];

export const DESTINATIONS = [
  { name: "Proxima Centauri b", dist: 4.24  },
  { name: "Alpha Centauri",     dist: 4.37  },
  { name: "Barnard's Star",     dist: 5.96  },
  { name: "Sirius",             dist: 8.6   },
  { name: "Epsilon Eridani",    dist: 10.5  },
  { name: "Tau Ceti",           dist: 11.9  },
  { name: "Gliese 667C",        dist: 23.6  },
  { name: "TRAPPIST-1",         dist: 39.5  },
  { name: "HR 8799",            dist: 129   },
  { name: "Kepler-186f",        dist: 582   },
  { name: "Galactic Center",    dist: 26000 },
];

export const PRESET_CURVES = {
  Linear:       (i, n) => (i / (n - 1)),
  Exponential:  (i, n) => Math.pow(i / (n - 1), 2),
  'S-Curve':    (i, n) => { const x = (i / (n - 1)) * 10 - 5; return 1 / (1 + Math.exp(-x)); },
  'Diminishing':(i, n) => Math.sqrt(i / (n - 1)),
};

// ─── NUMBER FORMATTING ────────────────────────────────────────────────────────
// Comma-separated with fixed decimal places (for year/time values)
export const fmtN    = (n, d = 1) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
// Natural precision with commas (strips trailing zeros — for distances)
export const fmtDist = (n) => n.toLocaleString('en-US');

// ─── RELATIVISTIC PHYSICS ─────────────────────────────────────────────────────
//
// Computes one ship's state at a given Earth coordinate time.
// All quantities are in the Earth (inertial) reference frame.
// 'acc' is proper acceleration — what the crew feels on an accelerometer (e.g. 1g).
// This is the correct relativistic brachistochrone model.
//
export function computeShipState(earthTime, p) {
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

// ─── NEWTONIAN PHYSICS (classical comparison) ─────────────────────────────────
//
// Same profile shape and vMax as the real ship, but using F=ma without
// relativistic corrections: v(t) = a·t, x(t) = ½·a·t²
// For cruise profiles: Newtonian t_accel = vMax/a  (vs relativistic βγc/a)
//                      Newtonian d_accel = vMax²/2a (vs relativistic c²/a·(γ-1))
// The Newtonian ship always arrives sooner; the gap widens at high velocities.
//
export function computeNewtonianState(earthTime, p) {
  const elapsed = earthTime - p.launchTime;
  if (elapsed <= 0) return { pos: 0, hasLaunched: false };

  const t = elapsed * YEAR_IN_SECONDS;
  let pos;

  if (p.type === 'peak') {
    // Peak profile: Newtonian flip at midpoint using ½at²
    const tPeak = Math.sqrt(p.totalDist / p.acc);
    if (t < tPeak) {
      pos = 0.5 * p.acc * t * t;
    } else if (t < 2 * tPeak) {
      const tD    = t - tPeak;
      const vPeak = p.acc * tPeak;
      pos = p.totalDist / 2 + vPeak * tD - 0.5 * p.acc * tD * tD;
    } else {
      pos = p.totalDist;
    }
  } else {
    // Cruise profile: classical acceleration to the same vMax
    const vMax    = p.vMax;
    const tAccelN = vMax / p.acc;               // classical time to reach vMax
    const dAccelN = 0.5 * vMax * vMax / p.acc;  // = vMax² / (2a)

    if (dAccelN * 2 >= p.totalDist) {
      // Distance too short to cruise even in Newtonian — treat as peak
      const tPeak = Math.sqrt(p.totalDist / p.acc);
      if (t < tPeak) {
        pos = 0.5 * p.acc * t * t;
      } else if (t < 2 * tPeak) {
        const tD    = t - tPeak;
        const vPeak = p.acc * tPeak;
        pos = p.totalDist / 2 + vPeak * tD - 0.5 * p.acc * tD * tD;
      } else {
        pos = p.totalDist;
      }
    } else {
      const tCruiseN = (p.totalDist - 2 * dAccelN) / vMax;
      if (t < tAccelN) {
        pos = 0.5 * p.acc * t * t;
      } else if (t < tAccelN + tCruiseN) {
        pos = dAccelN + vMax * (t - tAccelN);
      } else if (t < 2 * tAccelN + tCruiseN) {
        const tD = t - tAccelN - tCruiseN;
        pos = (p.totalDist - dAccelN) + vMax * tD - 0.5 * p.acc * tD * tD;
      } else {
        pos = p.totalDist;
      }
    }
  }

  return { pos: Math.min(Math.max(pos, 0), p.totalDist), hasLaunched: true };
}
