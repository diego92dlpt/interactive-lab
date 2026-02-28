import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import SensitivityHelpModal from './SensitivityHelpModal';
import {
  C, LY_IN_METERS, YEAR_IN_SECONDS, G,
  CRAFT_NAMES, PRESET_CURVES,
  fmtN, fmtDist,
  computeShipState,
} from '../physics';
import CurveEditor from './CurveEditor';

// ─── SVG layout constants ─────────────────────────────────────────────────────
const VB_W = 900, VB_H = 548;
const ML = 70, MT = 40, MR = 210, MB = 93;
const PW = VB_W - ML - MR;   // 620
const PH = VB_H - MT - MB;   // 415

const DASH_PATTERNS = ['', '14,5', '5,5', '2,4', '14,5,2,5', '14,5,2,5,2,5'];

// ─── Non-overlapping label placement (1-D) ────────────────────────────────────
// Returns positions as close as possible to `ideals` with minimum separation
// `sep` between centres and clamped to [lo, hi].
function placeCards(ideals, sep, lo, hi) {
  const n = ideals.length;
  if (n === 0) return [];
  // Clamp each ideal to the slot it can legally occupy given its neighbours
  const pos = ideals.map((x, i) =>
    Math.max(lo + i * sep, Math.min(hi - (n - 1 - i) * sep, x))
  );
  for (let pass = 0; pass < 20; pass++) {
    // Pull each card toward its ideal (soft gravity)
    for (let i = 0; i < n; i++) {
      pos[i] = pos[i] + (ideals[i] - pos[i]) * 0.3;
      pos[i] = Math.max(lo + i * sep, Math.min(hi - (n - 1 - i) * sep, pos[i]));
    }
    // Forward sweep: push right on overlap
    for (let i = 1; i < n; i++) {
      if (pos[i] < pos[i - 1] + sep) pos[i] = pos[i - 1] + sep;
    }
    // Backward sweep: push left on overlap
    for (let i = n - 2; i >= 0; i--) {
      if (pos[i] > pos[i + 1] - sep) pos[i] = pos[i + 1] - sep;
    }
  }
  return pos;
}

function getGridStep(val) {
  if (val <=    10) return 1;
  if (val <=    50) return 5;
  if (val <=   200) return 25;
  if (val <=  1000) return 100;
  if (val <=  5000) return 500;
  return Math.pow(10, Math.floor(Math.log10(val)));
}

// ─── Flight profile computation (fixed 1g, no destination lookup) ─────────────
function buildProfiles(speeds, fleetSize, distanceLY, stagger) {
  const totalDist = distanceLY * LY_IN_METERS;
  const acc = G;
  return speeds.slice(0, fleetSize).map((sol, i) => {
    const vMax      = sol * C;
    const launchTime = i * stagger;
    const beta      = vMax / C;
    const gamma     = 1 / Math.sqrt(1 - beta * beta);
    const betaGamma = beta * gamma;
    const tAccel    = betaGamma * C / acc;
    const distToMax = (C * C / acc) * (gamma - 1);
    const tauAccel  = (C / acc) * Math.asinh(betaGamma);

    if (distToMax * 2 > totalDist) {
      const k          = 1 + (totalDist * acc) / (2 * C * C);
      const tAccelPk   = (C / acc) * Math.sqrt(k * k - 1);
      const tauAccelPk = (C / acc) * Math.asinh(Math.sqrt(k * k - 1));
      return {
        id: i, name: CRAFT_NAMES[i], launchTime,
        arrivalT:      launchTime + (2 * tAccelPk)   / YEAR_IN_SECONDS,
        finalShipTime: (2 * tauAccelPk) / YEAR_IN_SECONDS,
        type: 'peak', acc,
        tAccel: tAccelPk, gammaPeak: k, tauAccel: tauAccelPk,
        peakDist: totalDist / 2, totalDist, configuredSol: sol,
      };
    } else {
      const cruiseDist = totalDist - 2 * distToMax;
      const tCruise    = cruiseDist / vMax;
      const tauCruise  = tCruise / gamma;
      return {
        id: i, name: CRAFT_NAMES[i], launchTime,
        arrivalT:      launchTime + (2 * tAccel + tCruise)   / YEAR_IN_SECONDS,
        finalShipTime: (2 * tauAccel + tauCruise) / YEAR_IN_SECONDS,
        type: 'cruise', acc, tAccel, gamma, tauAccel,
        distToMax, tCruise, tauCruise, vMax, totalDist, configuredSol: sol,
      };
    }
  });
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function SensitivityAnalysis({
  theme, onClose,
  initFleetSize, initDistance, initStagger,
  initSpeeds, initMinSol, initMaxSol, initActivePreset,
}) {
  const [showHelp,     setShowHelp]     = useState(false);
  const [fleetSize,    setFleetSize]    = useState(initFleetSize);
  const [distance,     setDistance]     = useState(initDistance);
  const [stagger,      setStagger]      = useState(initStagger);
  const [minSol,       setMinSol]       = useState(initMinSol);
  const [maxSol,       setMaxSol]       = useState(initMaxSol);
  const [speeds,       setSpeeds]       = useState(() => initSpeeds.slice(0, initFleetSize));
  const [activePreset, setActivePreset] = useState(initActivePreset);

  // Changing fleet size or preset recomputes all speeds from the curve
  const handleFleetSizeChange = (n) => {
    const fn = PRESET_CURVES[activePreset] || PRESET_CURVES.Linear;
    setFleetSize(n);
    setSpeeds(new Array(n).fill(0).map((_, i) => minSol + fn(i, n) * (maxSol - minSol)));
  };
  const handlePresetChange = (name) => {
    const fn = PRESET_CURVES[name] || PRESET_CURVES.Linear;
    setActivePreset(name);
    setSpeeds(new Array(fleetSize).fill(0).map((_, i) => minSol + fn(i, fleetSize) * (maxSol - minSol)));
  };

  // Recompute speeds within new bounds when MIN/MAX limits change (skip on mount)
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    const fn = PRESET_CURVES[activePreset] || PRESET_CURVES.Linear;
    setSpeeds(new Array(fleetSize).fill(0).map((_, i) => minSol + fn(i, fleetSize) * (maxSol - minSol)));
  }, [minSol, maxSol]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived chart data ────────────────────────────────────────────────────
  const profiles = buildProfiles(speeds, fleetSize, distance, stagger);

  const maxT    = profiles.length
    ? Math.max(...profiles.map(p => p.arrivalT)) * 1.08
    : distance * 2;

  const toSvgX = (t)  => ML + (t  / maxT)      * PW;
  const toSvgY = (ly) => MT + PH - (ly / distance) * PH;

  // Trajectory polylines — 150 sampled points per ship
  const trajectories = profiles.map(profile => {
    const N   = 150;
    const pts = [`${toSvgX(profile.launchTime).toFixed(1)},${toSvgY(0).toFixed(1)}`];
    for (let i = 1; i <= N; i++) {
      const t     = profile.launchTime + (i / N) * (profile.arrivalT - profile.launchTime);
      const state = computeShipState(t, profile);
      if (state.hasLaunched) {
        pts.push(`${toSvgX(t).toFixed(1)},${toSvgY(state.pos / LY_IN_METERS).toFixed(1)}`);
      }
    }
    return pts.join(' ');
  });

  // Callout column — sorted by arrival time, first ship on top
  const sorted   = [...profiles].sort((a, b) => a.arrivalT - b.arrivalT);
  const BOX_H    = 56, BOX_GAP = 8;
  const totalCH  = sorted.length * BOX_H + Math.max(0, sorted.length - 1) * BOX_GAP;
  const cbStartY = MT + (PH - totalCH) / 2;
  const bx       = ML + PW + 14;
  const bw       = MR - 22;

  // Grid line positions
  const distStep   = getGridStep(distance);
  const timeStep   = getGridStep(maxT);
  const distGrid   = [], timeGrid = [], yTicks = [], xTicks = [];
  for (let d = distStep; d < distance; d += distStep) distGrid.push(d);
  for (let t = timeStep; t < maxT;    t += timeStep) timeGrid.push(t);
  for (let d = 0; d <= distance; d += distStep) yTicks.push(d);
  for (let t = 0; t <= maxT;    t += timeStep) xTicks.push(t);

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col p-4 md:p-6"
      style={{ color: theme.primary }}>

      {/* Header */}
      <div className="flex justify-between items-center border-b pb-3 mb-4 shrink-0"
        style={{ borderColor: theme.muted }}>
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter" style={{ color: theme.primary }}>
            Sensitivity Analysis
          </h2>
          <p className="text-[10px] uppercase font-bold tracking-widest" style={{ color: theme.secondary }}>
            Spacetime Trajectory Explorer · Acceleration fixed at 1g
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHelp(true)} className="p-2 border"
            style={{ borderColor: theme.muted }} title="How to use Sensitivity Analysis">
            <span className="flex h-4 w-4 items-center justify-center text-sm font-black leading-none">?</span>
          </button>
          <button onClick={onClose} className="p-2 border hover:bg-red-900/20"
            style={{ borderColor: theme.muted }}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 gap-5 min-h-0">

        {/* ── Controls ──────────────────────────────────────────────────────── */}
        <div className="w-[280px] shrink-0 flex flex-col gap-5 overflow-y-auto text-xs pr-1">

          {/* Fleet size */}
          <div>
            <div className="font-bold uppercase mb-2 text-[10px]" style={{ color: theme.secondary }}>
              Fleet Size
            </div>
            <div className="flex gap-2">
              {[2, 4, 6].map(n => (
                <button key={n} onClick={() => handleFleetSizeChange(n)}
                  className={`flex-1 border py-2 font-black ${fleetSize === n ? 'bg-white/10' : ''}`}
                  style={{ borderColor: fleetSize === n ? theme.primary : theme.muted,
                           color:       fleetSize === n ? theme.primary : theme.muted }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Distance */}
          <div>
            <label className="font-bold uppercase flex justify-between mb-1 text-[10px]">
              <span style={{ color: theme.secondary }}>Distance to Destination</span>
              <span style={{ color: theme.primary }}>{fmtN(distance, 1)} LY</span>
            </label>
            <input type="range" min="4" max="600" step="0.5" value={distance}
              onChange={e => setDistance(Number(e.target.value))}
              className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer"
              style={{ accentColor: theme.primary }} />
            <div className="flex justify-between text-[8px] mt-0.5" style={{ color: theme.muted }}>
              <span>4 LY</span><span>600 LY</span>
            </div>
          </div>

          {/* Stagger */}
          <div>
            <label className="font-bold uppercase flex justify-between mb-1 text-[10px]">
              <span style={{ color: theme.secondary }}>Launch Stagger</span>
              <span style={{ color: theme.primary }}>{stagger} YRS</span>
            </label>
            <input type="range" min="1" max="200" step="1" value={stagger}
              onChange={e => setStagger(Number(e.target.value))}
              className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer"
              style={{ accentColor: theme.primary }} />
            <div className="flex justify-between text-[8px] mt-0.5" style={{ color: theme.muted }}>
              <span>1 YR</span><span>200 YRS</span>
            </div>
          </div>

          {/* Speed curve */}
          <div>
            <div className="font-bold uppercase mb-2 text-[10px]" style={{ color: theme.secondary }}>
              Speed Curve
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {Object.keys(PRESET_CURVES).map(name => (
                <button key={name} onClick={() => handlePresetChange(name)}
                  className={`border px-2 py-0.5 text-[9px] uppercase font-bold ${activePreset === name ? 'bg-white/10' : 'opacity-60'}`}
                  style={{ borderColor: theme.muted,
                           color: activePreset === name ? theme.primary : theme.secondary }}>
                  {name}
                </button>
              ))}
            </div>
            <CurveEditor
              craftCount={fleetSize}
              speeds={speeds.slice(0, fleetSize)}
              setSpeeds={setSpeeds}
              minSol={minSol} setMinSol={setMinSol}
              maxSol={maxSol} setMaxSol={setMaxSol}
              theme={theme}
              activePreset={activePreset}
            />
          </div>
        </div>

        {/* ── SVG Chart ─────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height="100%"
            preserveAspectRatio="xMidYMid meet"
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>

            {/* Grid */}
            {distGrid.map(d => (
              <line key={`dg${d}`} x1={ML} y1={toSvgY(d)} x2={ML + PW} y2={toSvgY(d)}
                stroke={theme.primary + '18'} strokeWidth="0.5" />
            ))}
            {timeGrid.map(t => (
              <line key={`tg${t}`} x1={toSvgX(t)} y1={MT} x2={toSvgX(t)} y2={MT + PH}
                stroke={theme.primary + '18'} strokeWidth="0.5" />
            ))}

            {/* Axes */}
            <line x1={ML} y1={MT} x2={ML} y2={MT + PH}
              stroke={theme.primary + '60'} strokeWidth="1" />
            <line x1={ML} y1={MT + PH} x2={ML + PW} y2={MT + PH}
              stroke={theme.primary + '60'} strokeWidth="1" />

            {/* Y tick labels */}
            {yTicks.map(d => (
              <text key={`yl${d}`} x={ML - 6} y={toSvgY(d) + 3}
                textAnchor="end" fontSize="8" fill={theme.secondary + 'CC'}>
                {fmtDist(d)}
              </text>
            ))}

            {/* X tick labels */}
            {xTicks.map(t => (
              <text key={`xl${t}`} x={toSvgX(t)} y={MT + PH + 14}
                textAnchor="middle" fontSize="8" fill={theme.secondary + 'CC'}>
                {fmtDist(Math.round(t))}
              </text>
            ))}

            {/* Axis labels */}
            <text x={ML + PW / 2} y={VB_H - 8}
              textAnchor="middle" fontSize="9" fontWeight="bold"
              fill={theme.secondary} letterSpacing="2">
              EARTH TIME (YRS)
            </text>
            <text x={12} y={MT + PH / 2}
              textAnchor="middle" fontSize="9" fontWeight="bold"
              fill={theme.secondary} letterSpacing="2"
              transform={`rotate(-90, 12, ${MT + PH / 2})`}>
              DISTANCE (LY)
            </text>

            {/* Finish line */}
            <line x1={ML} y1={MT} x2={ML + PW} y2={MT}
              stroke={theme.primary + 'CC'} strokeWidth="1" strokeDasharray="8,5" />
            <text x={ML + 4} y={MT - 6} fontSize="8" fontWeight="bold"
              fill={theme.primary + 'CC'}>
              {`DESTINATION · ${fmtN(distance, 1)} LY`}
            </text>

            {/* Trajectory polylines */}
            {profiles.map((profile, i) => (
              <polyline key={profile.id}
                points={trajectories[i]}
                fill="none"
                stroke={theme.primary}
                strokeWidth="1.8"
                strokeDasharray={DASH_PATTERNS[i] || ''}
                opacity="0.9"
              />
            ))}

            {/* Launch tick marks on x-axis */}
            {profiles.map(profile => (
              <circle key={`lt${profile.id}`}
                cx={toSvgX(profile.launchTime)} cy={MT + PH}
                r="2.5" fill={theme.primary + 'CC'} />
            ))}

            {/* Launch callout mini-cards — follow markers, collision-avoided */}
            {(() => {
              const cw = 66, CARD_SEP = cw + 2;
              const cardCX = placeCards(
                profiles.map(p => toSvgX(p.launchTime)),
                CARD_SEP,
                ML + cw / 2,
                ML + PW - cw / 2,
              );
              return profiles.map((profile, i) => {
              const cx   = cardCX[i];
              const cy   = MT + PH + 26;   // top of card
              const lx   = toSvgX(profile.launchTime);
              const peak = (profile.configuredSol * 100).toFixed(0);
              const ch = 28;
              return (
                <g key={`lc${profile.id}`}>
                  <line x1={cx} y1={cy} x2={lx} y2={MT + PH}
                    stroke={theme.muted + '90'} strokeWidth="0.8"
                    strokeDasharray="3,4" />
                  <rect x={cx - cw / 2} y={cy} width={cw} height={ch}
                    fill="rgba(0,0,0,0.88)" stroke={theme.muted + '60'}
                    strokeWidth="0.8" rx="1" />
                  <text x={cx} y={cy + 11}
                    textAnchor="middle" fontSize="8" fontWeight="bold" fill={theme.primary}>
                    {profile.name}
                  </text>
                  <text x={cx} y={cy + 22}
                    textAnchor="middle" fontSize="7" fill={theme.secondary}>
                    {`PEAK ${peak}% SOL`}
                  </text>
                </g>
              );
            });
            })()}

            {/* Arrival dots on finish line */}
            {profiles.map(profile => (
              <circle key={`dot${profile.id}`}
                cx={toSvgX(profile.arrivalT)} cy={MT}
                r="3" fill={theme.primary} />
            ))}

            {/* Callout boxes + leader lines — stacked in arrival order, first on top */}
            {sorted.map((profile, rank) => {
              const by     = cbStartY + rank * (BOX_H + BOX_GAP);
              const bmidY  = by + BOX_H / 2;
              const dotX   = toSvgX(profile.arrivalT);
              const eTransit = profile.arrivalT - profile.launchTime;
              return (
                <g key={`cb${profile.id}`}>
                  {/* Leader line → arrival dot */}
                  <line x1={bx} y1={bmidY} x2={dotX} y2={MT}
                    stroke={theme.muted + 'AA'} strokeWidth="0.8"
                    strokeDasharray="3,4" />
                  {/* Box */}
                  <rect x={bx} y={by} width={bw} height={BOX_H}
                    fill="rgba(0,0,0,0.88)" stroke={theme.muted + '80'}
                    strokeWidth="0.8" rx="1" />
                  {/* Ship name */}
                  <text x={bx + 6} y={by + 13}
                    fontSize="8" fontWeight="bold" fill={theme.primary}>
                    {profile.name}
                  </text>
                  {/* MEC */}
                  <text x={bx + 6}       y={by + 26} fontSize="7.5" fill={theme.secondary}>MEC</text>
                  <text x={bx + bw - 5}  y={by + 26} fontSize="7.5" fill="white" textAnchor="end">
                    {fmtN(profile.arrivalT, 1)}y
                  </text>
                  {/* E-transit */}
                  <text x={bx + 6}       y={by + 38} fontSize="7.5" fill={theme.secondary}>E-TRANSIT</text>
                  <text x={bx + bw - 5}  y={by + 38} fontSize="7.5" fill="white" textAnchor="end">
                    {fmtN(eTransit, 1)}y
                  </text>
                  {/* τ */}
                  <text x={bx + 6}       y={by + 50} fontSize="7.5" fill={theme.secondary}>τ (CREW)</text>
                  <text x={bx + bw - 5}  y={by + 50} fontSize="7.5" fill="white" textAnchor="end">
                    {fmtN(profile.finalShipTime, 1)}y
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="shrink-0 mt-1 pt-2 border-t flex flex-wrap gap-x-6 gap-y-1 text-[8px] justify-center"
            style={{ borderColor: theme.muted + '40', color: theme.muted }}>
            <span><span style={{ color: theme.primary }}>MEC</span> = Master Earth Clock at arrival</span>
            <span><span style={{ color: theme.primary }}>E-TRANSIT</span> = Earth-frame journey duration for this ship</span>
            <span><span style={{ color: theme.primary }}>τ (CREW)</span> = crew-experienced travel time (ship clock)</span>
          </div>
        </div>
      </div>

      {showHelp && <SensitivityHelpModal theme={theme} onClose={() => setShowHelp(false)} />}

      <style dangerouslySetInnerHTML={{ __html: `
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 12px; height: 12px; background: ${theme.primary};
          cursor: pointer; border-radius: 1px;
        }
        input[type='range']::-moz-range-thumb {
          width: 12px; height: 12px; background: ${theme.primary};
          cursor: pointer; border-radius: 1px; border: none;
        }
      `}} />
    </div>
  );
}
