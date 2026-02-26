import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, RotateCcw, X, Palette, Pause, ChevronsRight } from 'lucide-react';

import {
  C, LY_IN_METERS, YEAR_IN_SECONDS, G,
  THEMES, CRAFT_NAMES, DESTINATIONS, PRESET_CURVES,
  fmtN, fmtDist,
} from './physics';
import { drawSimCanvas } from './canvas';
import CurveEditor      from './components/CurveEditor';
import ConfigHelpModal  from './components/ConfigHelpModal';
import MethodologyModal from './components/MethodologyModal';

// ─── RetroPanel — small shared layout wrapper used only in this file ──────────
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

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function WaitCalculationSim() {
  const [themeKey, setThemeKey] = useState('emerald');
  const theme = THEMES[themeKey];

  // Config state
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
  const [fadedNotifs,       setFadedNotifs]       = useState(new Set());

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
  const fadeTimersRef        = useRef({});     // notif id → setTimeout handle

  const getDistance = () => destination.name === 'Custom' ? customDistance : destination.dist;

  // ── RELATIVISTIC FLIGHT PROFILES ─────────────────────────────────────────────
  // Precomputed at config time. All Earth-frame quantities.
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
        const k          = 1 + (totalDist * acc) / (2 * C * C); // = γ at turnaround
        const tAccelPk   = (C / acc) * Math.sqrt(k * k - 1);    // Earth s to midpoint
        const tauAccelPk = (C / acc) * Math.asinh(Math.sqrt(k * k - 1));
        const arrivalT      = launchTime + (2 * tAccelPk)   / YEAR_IN_SECONDS;
        const finalShipTime = (2 * tauAccelPk) / YEAR_IN_SECONDS;
        return {
          id: i, name: CRAFT_NAMES[i], launchTime, arrivalT, type: 'peak',
          acc, tAccel: tAccelPk, gammaPeak: k, tauAccel: tauAccelPk,
          peakDist: totalDist / 2, totalDist,
          configuredSol: sol, finalShipTime,
        };
      } else {
        // CRUISE profile — ship reaches vMax and cruises
        const cruiseDist    = totalDist - 2 * distToMax;
        const tCruise       = cruiseDist / vMax;
        const tauCruise     = tCruise / gamma;
        const arrivalT      = launchTime + (2 * tAccel + tCruise)   / YEAR_IN_SECONDS;
        const finalShipTime = (2 * tauAccel + tauCruise) / YEAR_IN_SECONDS;
        return {
          id: i, name: CRAFT_NAMES[i], launchTime, arrivalT, type: 'cruise',
          acc, tAccel, gamma, tauAccel, distToMax, tCruise, tauCruise, vMax, totalDist,
          configuredSol: sol, finalShipTime,
        };
      }
    });
  }, [speeds, destination, customDistance, acceleration, stagger]);

  // Preset effect — recompute speeds when curve shape or bounds change
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
    setFadedNotifs(new Set());
    Object.values(fadeTimersRef.current).forEach(clearTimeout);
    fadeTimersRef.current = {};
    setIsSimPaused(true);
    setIsSkipping(false);
  };

  const startSim = () => {
    resetSim();
    setShowSim(true);
    setTimeout(() => setIsSimPaused(false), 100);
  };

  // Fade arrival cards to compact badges after 4 seconds
  useEffect(() => {
    notifications.forEach(n => {
      if (!fadeTimersRef.current[n.id]) {
        fadeTimersRef.current[n.id] = setTimeout(() => {
          setFadedNotifs(prev => new Set([...prev, n.id]));
          delete fadeTimersRef.current[n.id];
        }, 4000);
      }
    });
  }, [notifications]);

  // Loop body ref — always has fresh closure over current state/props
  const totalDistLY     = getDistance();
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

    // ── Time advancement ─────────────────────────────────────────────────────
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

    // ── Arrival detection — sort by arrivalT to fix same-frame ordering ──────
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

    // ── Auto-pause and freeze MEC when all ships have arrived ────────────────
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

  // ── RENDER ───────────────────────────────────────────────────────────────────
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
                    {DESTINATIONS.map(d => <option key={d.name} value={d.name}>{d.name} ({fmtDist(d.dist)} LY)</option>)}
                    <option value="Custom">Custom Target...</option>
                  </select>
                </div>
                {destination.name === 'Custom' && (
                  <div className="flex flex-col gap-1">
                    <label className="font-bold flex justify-between" style={{ color: theme.secondary }}>
                      <span>CUSTOM DISTANCE</span><span style={{ color: theme.primary }}>{fmtDist(customDistance)} LY</span>
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
                  <input type="range" min="1" max="200" value={stagger}
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
                ["FLEET SPAN",    `${fmtN((craftCount - 1) * stagger, 0)} YEARS`],
                ["FASTEST CRAFT", `${((speeds[speeds.length - 1] || 0) * 100).toFixed(1)}% SOL`],
                ["DESTINATION",   `${fmtDist(getDistance())} LY`],
                ["PREDICTED 1ST", winner ? `${winner.name} · ${fmtN(winner.arrivalT, 1)} YRS` : '—'],
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
              const idx   = flightProfiles.findIndex(p => p.id === n.id);
              const yPct  = flightProfiles.length <= 1 ? 50 : 15 + (idx / (flightProfiles.length - 1)) * 70;
              const faded = fadedNotifs.has(n.id);
              return (
                <div key={n.name}
                  className="absolute right-4 z-20 transition-all duration-700"
                  style={{ top: `${yPct}%`, transform: 'translateY(-50%)' }}>
                  {faded ? (
                    // Compact persistent badge
                    <div className="bg-black border px-2 py-1 text-[9px] font-black flex items-center gap-2"
                      style={{ borderColor: theme.muted }}>
                      <span style={{ color: theme.primary }}>{n.name}</span>
                      <span className="text-white">
                        {n.delay === 0 ? `T+${fmtN(n.time, 1)}y` : `+${fmtN(n.delay, 1)}y`}
                      </span>
                    </div>
                  ) : (
                    // Full arrival card — shown for first 4 seconds
                    <div className="bg-black border p-2 text-[10px] font-black animate-in slide-in-from-right duration-500"
                      style={{ borderColor: theme.primary, boxShadow: `0 0 10px ${theme.glow}` }}>
                      <div className="flex justify-between gap-4 items-center">
                        <span style={{ color: theme.primary }}>
                          {n.name} {n.delay === 0 ? 'ARRIVED FIRST!' : 'ARRIVED'}
                        </span>
                        <span className="text-white">EARTH T: {fmtN(n.time, 1)}y</span>
                      </div>
                      {n.delay > 0 && (
                        <div className="text-[9px] mt-0.5" style={{ color: theme.secondary }}>
                          DELAY RELATIVE TO LEADER: +{fmtN(n.delay, 1)} YEARS
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom controls */}
          <div className="mt-4 flex flex-wrap gap-4 text-[10px] font-bold uppercase">
            <div className="border p-2 flex gap-4" style={{ borderColor: theme.muted }}>
              <span className="text-white">MASTER EARTH CLOCK:</span>
              <span style={{ color: theme.primary }}>T + {fmtN(earthTimeDisplay, 2)} YRS</span>
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
