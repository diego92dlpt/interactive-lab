import {
  TICKS_PER_DAY, FENCE_PADDING,
  DEFAULT_N, DEFAULT_INITIAL_INFECTED, DEFAULT_INITIAL_VAX_PCT,
  DEFAULT_P, DEFAULT_IFR, DEFAULT_RI_PCT, DEFAULT_VI_PCT,
  DEFAULT_INCUBATION_DAYS, DEFAULT_INFECTIOUS_DAYS, DEFAULT_TEMPERATURE,
  DEFAULT_INTERVENTION_DAY,
  DEFAULT_QP, DEFAULT_QC_PCT, DEFAULT_MW_PCT, DEFAULT_ME_PCT,
  DEFAULT_MAX_DAYS, DEFAULT_FIZZLE_DAYS,
  DEFAULT_DOT_RADIUS_MULT, COLLISION_RADIUS_MULT, DEFAULT_BROWNIAN,
} from './constants.js'
import { applyPhysics, computeDotRadius, computeBaseSpeed, computeSpeedStats } from './physics.js'

// ─── SEEDED PRNG (mulberry32) ─────────────────────────────────────────────────
// All randomness in the sim flows through this so runs are reproducible by seed.

function mulberry32(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6D2B79F5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── CONFIG ───────────────────────────────────────────────────────────────────

export function defaultConfig(canvasW = 800, canvasH = 450) {
  return {
    N:                   DEFAULT_N,
    initialInfected:     DEFAULT_INITIAL_INFECTED,
    initialVaxPct:       DEFAULT_INITIAL_VAX_PCT,
    p:                   DEFAULT_P,
    ifr:                 DEFAULT_IFR,
    riPct:               DEFAULT_RI_PCT,
    viPct:               DEFAULT_VI_PCT,
    incubationDays:      DEFAULT_INCUBATION_DAYS,
    infectiousDays:      DEFAULT_INFECTIOUS_DAYS,
    temperature:         DEFAULT_TEMPERATURE,
    qp:                  DEFAULT_QP,
    qcPct:               DEFAULT_QC_PCT,
    mwPct:               DEFAULT_MW_PCT,
    mePct:               DEFAULT_ME_PCT,
    maxDays:             DEFAULT_MAX_DAYS,
    fizzleDays:          DEFAULT_FIZZLE_DAYS,
    dotRadiusMult:       DEFAULT_DOT_RADIUS_MULT,
    collisionRadiusMult: COLLISION_RADIUS_MULT,
    brownianMotion:      DEFAULT_BROWNIAN,
    interventionDay:     DEFAULT_INTERVENTION_DAY,
    canvasW,
    canvasH,
    // seed: injected by index.jsx before each createSimState call
  }
}

// ─── DEBUG STATS SHAPE ────────────────────────────────────────────────────────

function blankStats() {
  return {
    wallBounces: 0, dotDotBounces: 0, fenceBounces: 0,
    siAttempts: 0, siSuccesses: 0,
    riAttempts: 0, riSuccesses: 0,
    viAttempts: 0, viSuccesses: 0,
    iResolutions: 0, iDeaths: 0,
    iTransitions: 0, compliantCount: 0,
    resolvedIndexCases: 0, totalSecondaryInfections: 0,
  }
}

// ─── STATE HELPERS ────────────────────────────────────────────────────────────

function countStates(dots) {
  const c = { S: 0, E: 0, I: 0, R: 0, D: 0, V: 0 }
  for (const dot of dots) c[dot.state]++
  return c
}

// ─── TRANSMISSION HELPER ──────────────────────────────────────────────────────

function effectiveP(config, iMasked, receiverMasked, receiverState, interventionsActive) {
  let p = config.p
  if (receiverState === 'R') p *= (1 - config.riPct)
  else if (receiverState === 'V') p *= (1 - config.viPct)
  // Masks only reduce transmission once policy is active
  if (interventionsActive) {
    const maskedCount = (iMasked ? 1 : 0) + (receiverMasked ? 1 : 0)
    if (maskedCount === 1) p *= (1 - config.mePct)
    else if (maskedCount === 2) p *= (1 - config.mePct) ** 2
  }
  return p
}

// ─── CREATE SIMULATION ────────────────────────────────────────────────────────

export function createSimState(config) {
  const { canvasW, canvasH, N, initialInfected, initialVaxPct,
          infectiousDays, mwPct, qp, qcPct } = config

  // All randomness flows through this seeded RNG
  const rng = mulberry32(config.seed ?? (Math.random() * 2 ** 31 | 0))

  const dotRadius   = computeDotRadius(canvasW, canvasH, N, config.dotRadiusMult)
  const baseSpeed   = computeBaseSpeed(canvasW, canvasH, N, config.temperature)
  const infectTicks = Math.round(infectiousDays * TICKS_PER_DAY)

  const numVax      = Math.round(N * initialVaxPct)
  const numInfected = Math.min(initialInfected, N - numVax)

  const dots = []
  for (let i = 0; i < N; i++) {
    const x     = dotRadius + rng() * (canvasW - 2 * dotRadius)
    const y     = dotRadius + rng() * (canvasH - 2 * dotRadius)
    const angle = rng() * Math.PI * 2
    const vx    = Math.cos(angle) * baseSpeed
    const vy    = Math.sin(angle) * baseSpeed

    let state = 'S'
    if (i < numVax)              state = 'V'
    else if (i < numVax + numInfected) state = 'I'

    dots.push({
      id: i,
      x, y, vx, vy,
      state,
      ticksInState:       0,
      stateDurationTicks: state === 'I' ? infectTicks : 0,
      hasMask:            rng() < mwPct,
      isCompliant:        false,
      fenceId:            null,
      resolvedInfections: 0,
    })
  }

  // Quarantine for initial I-dots — only if policy is already active at day 0
  const fences = []
  let nextFenceId = 0
  if (qp && config.interventionDay === 0) {
    for (const dot of dots) {
      if (dot.state === 'I' && rng() < qcPct) {
        dot.isCompliant = true
        dot.vx = 0
        dot.vy = 0
        dot.fenceId = nextFenceId
        fences.push({ id: nextFenceId++, dotId: dot.id,
                      x: dot.x, y: dot.y,
                      radius: dotRadius + FENCE_PADDING })
      }
    }
  }

  return {
    tick:                  0,
    dots,
    fences,
    nextFenceId,
    dotRadius,
    baseSpeed,
    canvasW,
    canvasH,
    rng,  // seeded PRNG — all randomness in tickSim uses this
    counts:                countStates(dots),
    history:               [{ day: 0, ...countStates(dots), totalInfections: numInfected, riToday: 0 }],
    newInfectionsThisTick: 0,
    newInfectionsToday:    0,
    reinfectionsToday:     0,  // R→E infections this sim-day (reset each day after history push)
    consecutiveZeroDays:   0,
    totalInfections:       numInfected,
    endCondition:          null,  // null | 'no-i' | 'fizzle' | 'max-days'
    cumStats:              blankStats(),
    tickStats:             { wallBounces: 0, dotDotBounces: 0, fenceBounces: 0 },
    speedStats:            { avg: baseSpeed, max: baseSpeed, min: baseSpeed },
  }
}

// ─── TICK ─────────────────────────────────────────────────────────────────────

export function tickSim(state, config) {
  if (state.endCondition) return state

  state.tick++
  state.newInfectionsThisTick = 0

  state.tickStats.wallBounces   = 0
  state.tickStats.dotDotBounces = 0
  state.tickStats.fenceBounces  = 0

  // 1. Physics — movement, wall bounce, elastic collisions, fence bounces
  applyPhysics(
    state.dots, state.fences,
    state.canvasW, state.canvasH,
    state.dotRadius, config.collisionRadiusMult, state.cumStats,
    config.brownianMotion, state.rng
  )

  // 2. Transmission — O(n²) pass over I × {S,R,V} pairs
  const currentDay        = state.tick / TICKS_PER_DAY
  const interventionsActive = currentDay >= config.interventionDay
  const infections  = []
  const infectTicks = Math.round(config.infectiousDays * TICKS_PER_DAY)
  const n           = state.dots.length

  for (let i = 0; i < n; i++) {
    const a = state.dots[i]
    if (a.state !== 'I') continue

    for (let j = 0; j < n; j++) {
      if (i === j) continue
      const b      = state.dots[j]
      const bState = b.state
      if (bState !== 'S' && bState !== 'R' && bState !== 'V') continue

      const dx = b.x - a.x
      const dy = b.y - a.y
      if (dx * dx + dy * dy > (2 * state.dotRadius) ** 2) continue

      const p_eff = effectiveP(config, a.hasMask, b.hasMask, bState, interventionsActive)

      if (bState === 'S') { state.cumStats.siAttempts++ }
      else if (bState === 'R') { state.cumStats.riAttempts++ }
      else if (bState === 'V') { state.cumStats.viAttempts++ }

      if (state.rng() < p_eff) {
        infections.push({ targetId: j, sourceId: i, receiverState: bState })
      }
    }
  }

  // Apply infections (avoid double-infecting a dot in one tick)
  const infectedThisTick = new Set()
  for (const { targetId, sourceId, receiverState } of infections) {
    if (infectedThisTick.has(targetId)) continue
    infectedThisTick.add(targetId)

    const b = state.dots[targetId]
    b.state              = 'E'
    b.ticksInState       = 0
    b.stateDurationTicks = Math.round(config.incubationDays * TICKS_PER_DAY)

    state.dots[sourceId].resolvedInfections++
    state.newInfectionsThisTick++
    state.totalInfections++

    if (receiverState === 'S') {
      state.cumStats.siSuccesses++
    } else if (receiverState === 'R') {
      state.cumStats.riSuccesses++
      state.reinfectionsToday++  // feeds second "Daily New" chart line
    } else if (receiverState === 'V') {
      state.cumStats.viSuccesses++
    }
  }

  // 3. State transitions (E→I, I→R/D)
  for (const dot of state.dots) {
    if (dot.state !== 'E' && dot.state !== 'I') continue
    dot.ticksInState++

    if (dot.state === 'E' && dot.ticksInState >= dot.stateDurationTicks) {
      // E → I
      dot.state              = 'I'
      dot.ticksInState       = 0
      dot.stateDurationTicks = infectTicks
      state.cumStats.iTransitions++

      if (interventionsActive && config.qp && state.rng() < config.qcPct) {
        dot.isCompliant = true
        dot.vx = 0
        dot.vy = 0
        dot.fenceId = state.nextFenceId
        state.fences.push({
          id: state.nextFenceId++,
          dotId: dot.id,
          x: dot.x, y: dot.y,
          radius: state.dotRadius + FENCE_PADDING,
        })
        state.cumStats.compliantCount++
      }

    } else if (dot.state === 'I' && dot.ticksInState >= dot.stateDurationTicks) {
      // I → R or D
      state.cumStats.iResolutions++
      state.cumStats.resolvedIndexCases++
      state.cumStats.totalSecondaryInfections += dot.resolvedInfections

      if (dot.fenceId !== null) {
        state.fences    = state.fences.filter(f => f.id !== dot.fenceId)
        dot.fenceId     = null
        dot.isCompliant = false
      }

      if (state.rng() < config.ifr) {
        dot.state = 'D'
        dot.vx    = 0
        dot.vy    = 0
        state.cumStats.iDeaths++
      } else {
        dot.state = 'R'
      }
      dot.ticksInState       = 0
      dot.stateDurationTicks = 0
    }
  }

  // 4. Daily counters + fizzle tracking
  state.newInfectionsToday += state.newInfectionsThisTick
  if (state.tick % TICKS_PER_DAY === 0) {
    if (state.newInfectionsToday === 0) {
      state.consecutiveZeroDays++
    } else {
      state.consecutiveZeroDays = 0
    }
    state.newInfectionsToday = 0
  }

  // 5. Update counts
  state.counts = countStates(state.dots)

  // 6. Daily history snapshot — one entry per sim-day
  if (state.tick % TICKS_PER_DAY === 0) {
    const { S, E, I, R, D, V } = state.counts
    state.history.push({
      day: state.tick / TICKS_PER_DAY,
      S, E, I, R, D, V,
      totalInfections: state.totalInfections,
      riToday: state.reinfectionsToday,  // R→E re-infections this day
    })
    state.reinfectionsToday = 0  // reset for next day
  }

  // 7. Speed snapshot for debug overlay
  state.speedStats = computeSpeedStats(state.dots)

  // 8. End condition checks
  const { S, E, I, R, D, V } = state.counts
  const day = state.tick / TICKS_PER_DAY
  if      (I === 0 && E === 0)                                          state.endCondition = 'no-i'
  else if (state.consecutiveZeroDays >= config.fizzleDays && day > 1)  state.endCondition = 'fizzle'
  else if (day >= config.maxDays)                                       state.endCondition = 'max-days'

  return state
}
