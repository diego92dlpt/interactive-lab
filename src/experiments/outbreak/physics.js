import { DOT_DOT_ELASTIC, JITTER_FACTOR } from './constants.js'

// ─── SIZING HELPERS ───────────────────────────────────────────────────────────

// mult = dotRadiusMult from config (default 0.35)
export function computeDotRadius(canvasW, canvasH, N, mult = 0.35) {
  return Math.max(3, Math.sqrt((canvasW * canvasH) / N) * mult)
}

export function computeBaseSpeed(canvasW, canvasH, N, temperatureK) {
  return temperatureK * Math.sqrt((canvasW * canvasH) / N)
}

// ─── PHYSICS TICK ─────────────────────────────────────────────────────────────
// Mutates dot positions/velocities in place.
// Returns nothing — caller reads updated dots.

export function applyPhysics(dots, fences, canvasW, canvasH, dotRadius, collisionRadiusMult, debugStats, brownianMotion = true, rng = Math.random) {
  // 1. Move each mobile dot + wall bounce
  for (const dot of dots) {
    if (dot.state === 'D') continue
    if (dot.state === 'I' && dot.isCompliant) continue

    // Brownian: random heading nudge every tick.
    // Ballistic: heading only changes from wall/dot collisions.
    if (brownianMotion) {
      const angle = Math.atan2(dot.vy, dot.vx)
      const jitter = (rng() - 0.5) * 2 * JITTER_FACTOR
      const speed = Math.sqrt(dot.vx * dot.vx + dot.vy * dot.vy)
      const newAngle = angle + jitter
      dot.vx = Math.cos(newAngle) * speed
      dot.vy = Math.sin(newAngle) * speed
    }

    dot.x += dot.vx
    dot.y += dot.vy

    // Wall bounce — reflect and nudge inside boundary
    if (dot.x - dotRadius < 0) {
      dot.x = dotRadius
      dot.vx = Math.abs(dot.vx)
      debugStats.wallBounces++
    } else if (dot.x + dotRadius > canvasW) {
      dot.x = canvasW - dotRadius
      dot.vx = -Math.abs(dot.vx)
      debugStats.wallBounces++
    }
    if (dot.y - dotRadius < 0) {
      dot.y = dotRadius
      dot.vy = Math.abs(dot.vy)
      debugStats.wallBounces++
    } else if (dot.y + dotRadius > canvasH) {
      dot.y = canvasH - dotRadius
      dot.vy = -Math.abs(dot.vy)
      debugStats.wallBounces++
    }
  }

  // 2. Dot–dot elastic collisions
  // Dead dots (D-state) are pass-through — they don't act as physical walls.
  // Collision radius uses COLLISION_RADIUS_MULT (< 1) to give dots breathing
  // room to travel. Transmission detection in engine.js still uses full visual radius.
  if (DOT_DOT_ELASTIC) {
    const n = dots.length
    const elasticDist = 2 * dotRadius * collisionRadiusMult
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = dots[i]
        const b = dots[j]

        // Dead dots are pass-through — skip if either is dead
        if (a.state === 'D' || b.state === 'D') continue

        const dx = b.x - a.x
        const dy = b.y - a.y
        const distSq = dx * dx + dy * dy
        const minDist = elasticDist

        if (distSq < minDist * minDist && distSq > 0) {
          const dist = Math.sqrt(distSq)
          const nx = dx / dist
          const ny = dy / dist
          const overlap = minDist - dist

          // D-state already excluded above; only compliant I-dots are fixed here
          const aFixed = a.state === 'I' && a.isCompliant
          const bFixed = b.state === 'I' && b.isCompliant

          // Separate overlapping dots
          if (!aFixed && !bFixed) {
            a.x -= nx * overlap * 0.5
            a.y -= ny * overlap * 0.5
            b.x += nx * overlap * 0.5
            b.y += ny * overlap * 0.5
            // Equal-mass elastic velocity exchange
            const relVx = a.vx - b.vx
            const relVy = a.vy - b.vy
            const dot_prod = relVx * nx + relVy * ny
            if (dot_prod > 0) {
              a.vx -= dot_prod * nx
              a.vy -= dot_prod * ny
              b.vx += dot_prod * nx
              b.vy += dot_prod * ny
            }
          } else if (!aFixed) {
            a.x -= nx * overlap
            a.y -= ny * overlap
            const dot_prod = a.vx * nx + a.vy * ny
            if (dot_prod > 0) {
              a.vx -= 2 * dot_prod * nx
              a.vy -= 2 * dot_prod * ny
            }
          } else if (!bFixed) {
            b.x += nx * overlap
            b.y += ny * overlap
            const dot_prod = b.vx * (-nx) + b.vy * (-ny)
            if (dot_prod > 0) {
              b.vx += 2 * dot_prod * nx
              b.vy += 2 * dot_prod * ny
            }
          }

          debugStats.dotDotBounces++
        }
      }
    }
  }

  // 3. Fence bounces — all mobile dots bounce off quarantine fence circles
  for (const fence of fences) {
    for (const dot of dots) {
      if (dot.id === fence.dotId) continue // owner doesn't bounce off own fence
      if (dot.state === 'D') continue
      if (dot.state === 'I' && dot.isCompliant) continue

      const dx = dot.x - fence.x
      const dy = dot.y - fence.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const minDist = fence.radius + dotRadius

      if (dist < minDist && dist > 0) {
        const nx = dx / dist
        const ny = dy / dist

        // Push dot outside fence
        dot.x = fence.x + nx * minDist
        dot.y = fence.y + ny * minDist

        // Reflect velocity radially (only if moving toward center)
        const vDotN = dot.vx * nx + dot.vy * ny
        if (vDotN < 0) {
          dot.vx -= 2 * vDotN * nx
          dot.vy -= 2 * vDotN * ny
        }

        debugStats.fenceBounces++
      }
    }
  }
}

// ─── SPEED STATS (for debug overlay section 5) ────────────────────────────────

export function computeSpeedStats(dots) {
  let sum = 0, max = 0, min = Infinity, count = 0
  for (const dot of dots) {
    if (dot.state === 'D' || (dot.state === 'I' && dot.isCompliant)) continue
    const speed = Math.sqrt(dot.vx * dot.vx + dot.vy * dot.vy)
    sum += speed
    if (speed > max) max = speed
    if (speed < min) min = speed
    count++
  }
  return {
    avg: count > 0 ? sum / count : 0,
    max: count > 0 ? max : 0,
    min: count > 0 && min !== Infinity ? min : 0,
    count,
  }
}
