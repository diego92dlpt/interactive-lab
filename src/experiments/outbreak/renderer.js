import { STATE_COLORS } from './constants.js'

// ─── DRAW ONE FRAME ───────────────────────────────────────────────────────────
// Called every RAF frame. Draws the full simulation state onto ctx.

export function drawFrame(ctx, state, w, h) {
  if (!state) return

  const { dots, fences, dotRadius } = state

  // Arena background
  ctx.fillStyle = '#080808'
  ctx.fillRect(0, 0, w, h)

  // Subtle arena border
  ctx.strokeStyle = '#1f2937'
  ctx.lineWidth = 1
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1)

  // ── Quarantine fences (drawn behind dots) ──────────────────────────────────
  if (fences.length > 0) {
    ctx.save()
    ctx.setLineDash([5, 4])
    ctx.lineWidth = 1.5

    for (const fence of fences) {
      ctx.beginPath()
      ctx.arc(fence.x, fence.y, fence.radius, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(129, 140, 248, 0.35)' // indigo, low opacity
      ctx.stroke()
    }

    ctx.setLineDash([])
    ctx.restore()
  }

  // ── Dots ──────────────────────────────────────────────────────────────────
  for (const dot of dots) {
    const color = STATE_COLORS[dot.state] ?? '#ffffff'
    const x = dot.x
    const y = dot.y

    // Main filled circle
    ctx.beginPath()
    ctx.arc(x, y, dotRadius, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()

    // D-dot: × marker
    if (dot.state === 'D') {
      const m = dotRadius * 0.65
      ctx.beginPath()
      ctx.moveTo(x - m, y - m)
      ctx.lineTo(x + m, y + m)
      ctx.moveTo(x + m, y - m)
      ctx.lineTo(x - m, y + m)
      ctx.strokeStyle = '#111827'
      ctx.lineWidth = Math.max(1, dotRadius * 0.45)
      ctx.stroke()
    }

    // V-dot: small filled center dot (signals vaccinated)
    if (dot.state === 'V') {
      ctx.beginPath()
      ctx.arc(x, y, dotRadius * 0.38, 0, Math.PI * 2)
      ctx.fillStyle = '#0a0a0a'
      ctx.fill()
    }
  }
}

// ─── COMPUTE CANVAS DIMENSIONS ───────────────────────────────────────────────
// Returns { w, h } in CSS pixels that fit in the given container while
// maintaining a 16:9 ratio. Accounts for device pixel ratio separately.

export function computeCanvasSize(containerW, containerH) {
  let w = containerW
  let h = Math.round(w * 9 / 16)
  if (h > containerH) {
    h = containerH
    w = Math.round(h * 16 / 9)
  }
  return { w, h }
}
