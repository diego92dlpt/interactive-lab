// ─── DEBUG ────────────────────────────────────────────────────────────────────
export const DEBUG_MODE = true // set to false before public release

// ─── CLOCK ───────────────────────────────────────────────────────────────────
export const TICKS_PER_DAY = 60

// ─── PHYSICS ─────────────────────────────────────────────────────────────────
export const DOT_DOT_ELASTIC       = true
export const JITTER_FACTOR         = 0.15  // max random angle nudge per tick (radians)
export const FENCE_PADDING         = 3     // fence radius = dotRadius + FENCE_PADDING (px)
export const QUARANTINE_CONTACT_R  = 1     // c_q: effective contact rate for isolated dots

// Elastic collision radius as a fraction of visual dot radius.
// Fixed at 0.80 — matches all disease presets and produces good visual/physics balance.
// Transmission detection always uses full visual radius (disease spreads on visual contact).
export const COLLISION_RADIUS_MULT  = 0.80
export const DEFAULT_BROWNIAN       = true   // true = Brownian (jitter every tick), false = Ballistic (collisions only)
export const DEFAULT_DOT_RADIUS_MULT = 0.35

// BASE_SPEED = k × sqrt(arenaArea / N) — k tuned per temperature level
export const TEMP_K = { L: 0.15, M: 0.30, H: 0.60 }

// ─── STATE DURATIONS ─────────────────────────────────────────────────────────
export const E_DURATION_TICKS = 120 // 2 sim-days fixed (not user-configurable)

// ─── SIMULATION DEFAULTS ─────────────────────────────────────────────────────
export const DEFAULT_N                = 1000
export const DEFAULT_INITIAL_INFECTED = 3
export const DEFAULT_INITIAL_VAX_PCT  = 0
export const DEFAULT_P                = 0.15
export const DEFAULT_IFR              = 0.02
export const DEFAULT_RI_PCT           = 0.80  // recovered immunity
export const DEFAULT_VI_PCT           = 0.70  // vaccinated immunity
export const DEFAULT_INCUBATION_DAYS  = 2
export const DEFAULT_INFECTIOUS_DAYS  = 7
export const DEFAULT_TEMPERATURE      = 0.30

// ─── INTERVENTION DEFAULTS ───────────────────────────────────────────────────
export const DEFAULT_INTERVENTION_DAY = 7    // day on which all NPI policies activate
export const DEFAULT_QP     = false
export const DEFAULT_QC_PCT = 0.50
export const DEFAULT_MW_PCT = 0
export const DEFAULT_ME_PCT = 0.30 // ME slider max is 50% per requirements

// ─── END CONDITION DEFAULTS ──────────────────────────────────────────────────
export const DEFAULT_MAX_DAYS    = 360
export const DEFAULT_FIZZLE_DAYS = 3

// ─── PLAYBACK ────────────────────────────────────────────────────────────────
// ticksPerFrame < 1: run 1 tick every (1/ticksPerFrame) frames
export const SPEED_OPTIONS = [
  { label: '0.2×', ticksPerFrame: 0.2 },
  { label: '0.5×', ticksPerFrame: 0.5 },
  { label: '1×',   ticksPerFrame: 1   },
  { label: '2×',   ticksPerFrame: 2   },
  { label: '3×',   ticksPerFrame: 3   },
  { label: '5×',   ticksPerFrame: 5   },
]
export const DEFAULT_SPEED_INDEX = 2 // 1× default

// ─── DOT STATE COLORS (used in Phase 3 canvas rendering) ─────────────────────
export const STATE_COLORS = {
  S: '#d1d5db', // soft white/light grey
  E: '#f59e0b', // amber
  I: '#ef4444', // vivid red
  R: '#2dd4bf', // teal/cyan
  D: '#6b7280', // desaturated grey
  V: '#818cf8', // soft blue/periwinkle
}
