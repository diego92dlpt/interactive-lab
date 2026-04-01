# Outbreak — Audit & Verification Plan

## Purpose

This document defines the developer-only debug harness for verifying
that the Outbreak simulation is mathematically and behaviorally correct
before public release. It is not a user-facing feature.

The harness must be built incrementally alongside the simulation — not
retrofitted after the fact. Each build phase lights up the corresponding
audit section automatically.

---

## Activation

Toggle with keyboard shortcut: `Shift + D`

- Renders a semi-transparent overlay panel in the corner of the screen
- Does not interfere with simulation running underneath
- State persists across PAUSE/RESUME
- Automatically hidden in production builds (gated by a `DEBUG_MODE`
  constant in constants file, set to `true` during development,
  `false` before release)
- Never visible to end users

---

## Harness skeleton — build in Phase 2

The full overlay panel structure should be created in Phase 2 alongside
the simulation engine. Sections that are not yet built show a placeholder:
`[not yet built — Phase N]`

This means from Phase 2 onward, `Shift+D` always works. It just shows
increasingly more data as build phases complete.

---

## Section 1 — Dot population counts
**Populates in: Phase 2 (state machine)**

Verifies that dot state totals always sum to N. Any discrepancy indicates
a state transition bug.

Display:
```
S: 612   E: 84   I: 127   R: 143   D: 12   V: 22
Total: 1000 / N: 1000  ✓
```

Verification check: S + E + I + R + D + V must equal N at every tick.
If not, show a red warning: `STATE SUM MISMATCH: got 999, expected 1000`

---

## Section 2 — Transmission coin toss accuracy
**Populates in: Phase 2 (transmission logic)**

Verifies that the observed transmission rate matches configured p.
Over sufficient collisions, observed rate should converge to p within
a reasonable tolerance (±3% at 1000+ collision attempts).

Display:
```
Configured p:           33.0%
S×I collision attempts: 1,847
Transmission successes: 614
Observed p:             33.2%  ✓

R×I collision attempts: 203
Effective p (RI=80%):   6.6%
Observed p:             6.8%   ✓

V×I collision attempts: 89
Effective p (VI=70%):   9.9%
Observed p:             10.1%  ✓
```

Flag if observed p deviates from configured p by more than ±5%:
`WARNING: observed p 38.1% deviates from configured 33.0% by 5.1%`

---

## Section 3 — IFR verification
**Populates in: Phase 2 (state transitions)**

Verifies that the death rate among resolved I-dots matches configured IFR.
Requires sufficient resolutions (50+ before the ratio is meaningful).

Display:
```
Configured IFR:   2.0%
I-dot resolutions: 312
Deaths (D):        7
Recoveries (R/V/M): 305
Observed IFR:     2.2%  ✓
(meaningful after 50+ resolutions)
```

Flag if observed IFR deviates from configured IFR by more than ±3
percentage points after 100+ resolutions.

---

## Section 4 — Emergent R0 verification
**Populates in: Phase 2 (transmission) + Phase 6 (readouts)**

Verifies that the emergent R0 is being calculated correctly. The observed
R0 should be consistent with the theoretical expectation:
R0_theoretical ≈ p × (contacts per infectious dot per day) × infectious_duration

Display:
```
Observed R0 (rolling):     2.41
Theoretical R0 estimate:   2.38
Deviation:                 +0.03  ✓

Secondary infections tracked: 847 index cases resolved
Mean secondary infections:    2.41
Std dev:                      1.83
```

---

## Section 5 — Brownian motion physics
**Populates in: Phase 2 (physics) + Phase 3 (rendering)**

Verifies that dot movement is behaving correctly. Not formula-based —
behavioral spot checks.

Display:
```
Temperature setting:    M
BASE_SPEED (computed):  1.84 px/tick
JITTER_FACTOR:          0.15 rad/tick
DOT_DOT_ELASTIC:        true
Average dot speed:      1.82 px/tick  ✓
Max dot speed:          3.21 px/tick
Min dot speed (non-zero): 0.41 px/tick

Wall bounces this run:  2,341
Dot-dot bounces:        18,204
```

Flag if average dot speed deviates from BASE_SPEED by more than ±20%.

---

## Section 6 — Quarantine fence mechanics
**Populates in: Phase 2 (quarantine logic)**

Verifies that fence creation, compliance coin tosses, and bounce logic
are working correctly.

Display:
```
QP: ON   QC: 60%

I-dot transitions this run:  127
Compliant (isolated):         78   (61.4%,  expected ~60%)  ✓
Non-compliant (free-moving):  49   (38.6%)

Active fences right now:      31
DOT-FENCE pairs flagged
  (currently passing through): 14

Fence bounces this tick:       7
Fence penetrations this tick:  2
```

Flag if compliance rate deviates from QC% by more than ±10% after
50+ I-dot transitions.

---

## Section 7 — Mask modifier verification
**Populates in: Phase 2 (mask logic)**

Verifies that the two-sided mask dampening formula is being applied
correctly. Checks all four collision combinations.

Display:
```
MW: 40%   ME: 30%

Dots with mask flag:   401 / 1000  (40.1%, expected ~40%)  ✓

S×I collisions breakdown:
  Neither masked:   attempts 621  successes 205  obs_p 33.0%  ✓
  I only masked:    attempts 289  successes 64   obs_p 22.1%  (expected 23.1%) ✓
  S only masked:    attempts 198  successes 45   obs_p 22.7%  (expected 23.1%) ✓
  Both masked:      attempts 142  successes 22   obs_p 15.5%  (expected 16.2%) ✓
```

---

## Section 8 — Clock and end conditions
**Populates in: Phase 2 (clock) + Phase 5 (playback)**

Verifies that the simulation clock is running correctly and end conditions
are evaluating properly.

Display:
```
Sim day (precise):      11.3
Tick count:             678
Ticks per sim-day:      60  (constant)
Current playback speed: 1x
Ticks per frame:        1

End conditions:
  No I-dots:            false  (I=127)
  No infectable:        false  (S=612)
  Fizzle (3d window):   false  (3 new infections today)
  Max days (365):       false  (11.3 / 365)
  User stopped:         false
```

---

## Section 9 — End state parade verification
**Populates in: Phase 7 (parade)**

Verifies that all dots are accounted for and correctly sorted into brigades
at the end of the simulation.

Display:
```
End condition triggered:  No I-dots remaining  (day 43.2)

Brigade counts:
  S:  72   (7.2%)
  V:  48   (4.8%)
  R:  836  (83.6%)
  D:  44   (4.4%)
  Total: 1000 / N: 1000  ✓

Dots still in E or I at end: 0  ✓
(any non-zero here is a bug)

Summary stats:
  Total ever infected:  880  (88.0%)
  Deaths:               44   (4.4% of N, 5.0% of infected)
  Observed IFR final:   5.0%  (configured: 2.0%)
```

Note on final IFR discrepancy: the observed IFR among resolved cases
may differ from configured IFR due to small sample variance. At N=1000
this is expected. Flag only if deviation exceeds ±5 percentage points.

---

## Headless validation mode

In addition to the visual overlay, implement a headless mode for
statistical validation. Activated by a URL parameter: `?headless=true`

Runs the simulation at maximum speed (no rendering) for a configurable
number of runs (default 10), then dumps a JSON summary to the browser
console:

```json
{
  "config": {
    "N": 1000, "p": 0.33, "IFR": 0.02,
    "temperature": "M", "QP": false,
    "MW": 0, "ME": 0
  },
  "runs": 10,
  "results": {
    "mean_infected_pct": 87.4,
    "std_infected_pct": 6.2,
    "mean_deaths": 17.6,
    "observed_IFR_mean": 0.020,
    "observed_p_mean": 0.331,
    "observed_R0_mean": 2.39,
    "extinction_count": 1,
    "mean_duration_days": 41.3
  }
}
```

Use this for systematic verification:
- Set p=0.33, run 10 headless runs, verify observed_p ≈ 0.33
- Set IFR=0.02, run 10 headless runs, verify observed_IFR ≈ 0.02
- Set QP=true, QC=1.0, verify transmission drops significantly vs baseline
- Set MW=1.0, ME=0.5, verify transmission drops by ~75% vs baseline

---

## Verification checklist before release

Work through this checklist manually before removing DEBUG_MODE:

### Transmission
- [ ] Observed p ≈ configured p (±3%) over 500+ collision attempts
- [ ] V×I effective p = p × (1 - VI%) verified
- [ ] R×I effective p = p × (1 - RI%) verified
- [ ] Mask: neither masked = p ✓
- [ ] Mask: one masked = p × (1-ME%) ✓
- [ ] Mask: both masked = p × (1-ME%)² ✓

### State machine
- [ ] Dot counts always sum to N
- [ ] No dot ever in two states simultaneously
- [ ] E-dots never transmit
- [ ] D-dots never move, never transmit, never receive
- [ ] V-dots return to V after recovery
- [ ] S-dots transition to R (not V) after recovery

### Fatality
- [ ] Observed IFR ≈ configured IFR (±3pp) over 200+ resolutions
- [ ] Only I-dots can transition to D (not E, P, A)

### Quarantine
- [ ] Compliance rate ≈ QC% (±5%) over 100+ I-transitions
- [ ] Compliant I-dots are stationary
- [ ] Non-compliant I-dots move freely
- [ ] Fences destroyed when I-dot transitions to R or D
- [ ] Fence bounces work at QC=100% (no penetrations)

### Mask initialization
- [ ] Mask flag assigned proportion ≈ MW% (±3%) over N=1000

### Clock
- [ ] 60 ticks = 1 sim day (verify at day 1.0 exactly)
- [ ] Playback speed scales ticks per frame correctly
- [ ] Fast-finish reaches same end state as normal speed

### End conditions
- [ ] Fizzle triggers after exactly X consecutive zero-infection days
- [ ] No-I end condition triggers immediately when last I resolves
- [ ] Max sim-days hard ceiling respected

### End state parade
- [ ] All N dots accounted for in brigades
- [ ] No dots in E or I state at parade time
- [ ] Brigade order: S · V · R · D

---

## Constants to expose in debug mode

These constants should be declared at the top of the simulation constants
file and logged to console when DEBUG_MODE is true:

```javascript
const DEBUG_MODE = true  // set false before release

const BASE_SPEED = ...        // computed from density formula
const JITTER_FACTOR = ...
const DOT_DOT_ELASTIC = true  // toggle for performance testing
const TICKS_PER_DAY = 60
const FENCE_RADIUS_MULTIPLIER = 3  // fence = 3x dot radius
const QUARANTINE_CONTACT_RATE = 1  // c_q for isolated dots
const E_DURATION_TICKS = 120       // 2 sim-days fixed
```

---

*This document is for developer use only. Remove or gate all debug
instrumentation behind DEBUG_MODE = false before public release.*
