import { useState, useEffect } from 'react'
import { TOUR_STEPS } from './tourSteps.js'

// ─── TOUR OVERLAY ─────────────────────────────────────────────────────────────
// Spotlight + tooltip walk-through. Renders on top of everything (z-[200]).
// Finds each step's target via [data-tour="..."] attribute.
// Scrolls the target into view before measuring its bounding rect.
// ──────────────────────────────────────────────────────────────────────────────

const TOOLTIP_W = 296   // tooltip width in px
const TOOLTIP_H = 380   // generous upper-bound on tooltip height (longest step copy)
const GAP       = 16    // px gap between spotlight edge and tooltip
const EDGE      = 8     // min distance from viewport edge

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

// Smart positioning: try the hinted side first; flip to the opposite if there
// isn't enough room. Never allows the tooltip to overlap the target element.
function tooltipStyle(rect, position) {
  if (!rect) return { top: -9999, left: -9999 }
  const vw = window.innerWidth
  const vh = window.innerHeight

  const hasRoomAbove = rect.top  - TOOLTIP_H - GAP >= EDGE
  const hasRoomBelow = rect.bottom + TOOLTIP_H + GAP <= vh - EDGE
  const hasRoomLeft  = rect.left  - TOOLTIP_W - GAP >= EDGE
  const hasRoomRight = rect.right + TOOLTIP_W + GAP <= vw - EDGE

  let top, left

  switch (position) {
    case 'top':
      top  = hasRoomAbove ? rect.top - TOOLTIP_H - GAP : rect.bottom + GAP
      left = clamp(rect.left, EDGE, vw - TOOLTIP_W - EDGE)
      break
    case 'bottom':
      top  = hasRoomBelow ? rect.bottom + GAP : rect.top - TOOLTIP_H - GAP
      left = clamp(rect.left, EDGE, vw - TOOLTIP_W - EDGE)
      break
    case 'right':
      left = hasRoomRight ? rect.right + GAP : rect.left - TOOLTIP_W - GAP
      top  = clamp(rect.top, EDGE, vh - TOOLTIP_H - EDGE)
      break
    case 'left':
    default:
      left = hasRoomLeft ? rect.left - TOOLTIP_W - GAP : rect.right + GAP
      top  = clamp(rect.top, EDGE, vh - TOOLTIP_H - EDGE)
      break
  }

  // Final safety clamp — keep tooltip fully on screen
  return {
    top:  clamp(top,  EDGE, vh - TOOLTIP_H - EDGE),
    left: clamp(left, EDGE, vw - TOOLTIP_W - EDGE),
  }
}

export default function TourOverlay({ onClose }) {
  const [stepIdx, setStepIdx] = useState(0)
  const [rect, setRect]       = useState(null)

  const total   = TOUR_STEPS.length
  const step    = TOUR_STEPS[stepIdx]
  const isFirst = stepIdx === 0
  const isLast  = stepIdx === total - 1

  // Measure target element each time the step changes
  useEffect(() => {
    setRect(null)  // clear while transitioning
    const el = document.querySelector(`[data-tour="${step.target}"]`)
    if (!el) return

    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

    const t = setTimeout(() => {
      setRect(el.getBoundingClientRect())
    }, 350)
    return () => clearTimeout(t)
  }, [stepIdx, step.target])

  // Re-measure on window resize
  useEffect(() => {
    const onResize = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`)
      if (el) setRect(el.getBoundingClientRect())
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [step.target])

  // Keyboard nav
  useEffect(() => {
    const handler = e => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        isLast ? onClose() : setStepIdx(i => i + 1)
      } else if (e.key === 'ArrowLeft' && !isFirst) {
        setStepIdx(i => i - 1)
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isFirst, isLast, onClose])

  const handleNext = () => isLast ? onClose() : setStepIdx(i => i + 1)
  const handlePrev = () => setStepIdx(i => i - 1)

  const tipStyle = tooltipStyle(rect, step.position)

  const PAD = 6   // px padding around the spotlight box

  return (
    <>
      {/* ── Dark backdrop (pointer-events block except spotlight area) ── */}
      <div className="fixed inset-0 z-[200] pointer-events-none" />

      {/* ── Spotlight box with box-shadow cutout ── */}
      {rect && (
        <div
          style={{
            position: 'fixed',
            top:    rect.top    - PAD,
            left:   rect.left   - PAD,
            width:  rect.width  + PAD * 2,
            height: rect.height + PAD * 2,
            borderRadius: 10,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.80)',
            outline: '1.5px solid rgba(255,255,255,0.18)',
            zIndex: 200,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ── Tooltip card ── */}
      <div
        style={{
          position: 'fixed',
          top:    tipStyle.top,
          left:   tipStyle.left,
          width:  TOOLTIP_W,
          zIndex: 201,
        }}
        className="bg-gray-950 border border-gray-600 rounded-xl shadow-2xl p-4 flex flex-col gap-3"
      >
        {/* Step counter + skip */}
        <div className="flex items-center justify-between">
          <span className="text-gray-500 font-mono text-[10px] tracking-widest uppercase">
            Step {stepIdx + 1} of {total}
          </span>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 font-mono text-[11px] transition-colors"
          >
            skip tour
          </button>
        </div>

        {/* Title */}
        <div className="text-white font-bold text-sm leading-tight">{step.title}</div>

        {/* Body */}
        <p className="text-gray-400 font-mono text-[12px] leading-relaxed">{step.body}</p>

        {/* Progress dots + nav buttons */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={handlePrev}
            disabled={isFirst}
            className="px-3 py-1.5 rounded font-mono text-xs font-bold transition-colors bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200 disabled:opacity-25 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>

          {/* Dot indicators */}
          <div className="flex gap-1 flex-wrap justify-center">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStepIdx(i)}
                className="transition-all"
                style={{
                  width:  i === stepIdx ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === stepIdx ? '#22c55e' : i < stepIdx ? '#374151' : '#1f2937',
                  border: i === stepIdx ? 'none' : '1px solid #374151',
                }}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="px-3 py-1.5 rounded font-mono text-xs font-bold transition-colors bg-green-500 hover:bg-green-400 text-black"
          >
            {isLast ? 'Finish' : 'Next →'}
          </button>
        </div>

        {/* Keyboard hint */}
        <div className="text-gray-600 font-mono text-[10px] text-center">
          ← → arrow keys · Esc to skip
        </div>
      </div>
    </>
  )
}
