import React, { useState, useEffect, useRef, useMemo } from 'react';

import { 

  Play, 

  RotateCcw, 

  X, 

  Palette, 

  Pause, 

  Timer,

} from 'lucide-react';



// --- PHYSICS CONSTANTS ---

const C = 299792458; 

const LY_IN_METERS = 9.461e15;

const YEAR_IN_SECONDS = 31536000;

const G = 9.80665;



const THEMES = {

  emerald: { primary: '#00FF41', secondary: '#008F11', muted: '#005500', glow: 'rgba(0, 255, 65, 0.2)' },

  amber: { primary: '#FFB100', secondary: '#B37D00', muted: '#664700', glow: 'rgba(255, 177, 0, 0.2)' },

  cyan: { primary: '#00E5FF', secondary: '#00A1B3', muted: '#005C66', glow: 'rgba(0, 229, 255, 0.2)' },

  frost: { primary: '#FFFFFF', secondary: '#AAAAAA', muted: '#444444', glow: 'rgba(255, 255, 255, 0.1)' }

};



const CRAFT_NAMES = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliet"];



const DESTINATIONS = [

  { name: "Alpha Centauri", dist: 4.37 },

  { name: "Barnard's Star", dist: 5.96 },

  { name: "TRAPPIST-1", dist: 39.5 },

  { name: "Kepler-186f", dist: 582 },

  { name: "Andromeda Galaxy", dist: 2537000 },

];



const PRESET_CURVES = {

  Linear: (i, n) => (i / (n - 1)),

  Exponential: (i, n) => Math.pow(i / (n - 1), 2),

  'S-Curve': (i, n) => {

    const x = (i / (n - 1)) * 10 - 5;

    return (1 / (1 + Math.exp(-x)));

  },

  'Diminishing': (i, n) => Math.sqrt(i / (n - 1))

};



// --- COMPONENTS ---



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



const CurveEditor = ({ craftCount, speeds, setSpeeds, minSol, setMinSol, maxSol, setMaxSol, theme, activePreset }) => {

  const containerRef = useRef(null);

  const [draggingIdx, setDraggingIdx] = useState(null);

  const [draggingLimit, setDraggingLimit] = useState(null);



  const padding = 40;

  const h = 288; 



  const handleMouseMove = (e) => {

    if (draggingIdx === null && draggingLimit === null) return;

    const rect = containerRef.current.getBoundingClientRect();

    const y = e.clientY - rect.top;

    const availableHeight = h - (padding * 2);

    const relativeY = y - padding;

    let val = 1 - (relativeY / availableHeight);

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

      onMouseUp={() => { setDraggingIdx(null); setDraggingLimit(null); }}

      onMouseLeave={() => { setDraggingIdx(null); setDraggingLimit(null); }}

    >

      <div className="absolute inset-x-10 inset-y-10 pointer-events-none opacity-10">

        {[0.25, 0.5, 0.75].map(p => (

          <React.Fragment key={p}>

            <div className="absolute left-0 right-0 border-t" style={{ top: `${p * 100}%`, borderColor: theme.primary }} />

            <div className="absolute top-0 bottom-0 border-l" style={{ left: `${p * 100}%`, borderColor: theme.primary }} />

          </React.Fragment>

        ))}

      </div>



      {[

        { type: 'MAX', val: maxSol, color: theme.primary, side: 'left' },

        { type: 'MIN', val: minSol, color: theme.primary, side: 'right' }

      ].map(limit => {

        const y = padding + (1 - limit.val) * (h - padding * 2);

        return (

          <div key={limit.type} className="absolute left-0 right-0 h-6 -translate-y-1/2 cursor-ns-resize z-20 flex items-center" style={{ top: `${y}px` }} onMouseDown={() => setDraggingLimit(limit.type.toLowerCase())}>

            <div className="absolute top-1/2 left-0 right-0 border-t border-dashed opacity-80" style={{ borderColor: limit.color }} />

            <div className={`px-2 py-0.5 text-[8px] font-black uppercase bg-black border border-current z-10 ${limit.side === 'left' ? 'ml-2' : 'mr-2 ml-auto'}`} style={{ color: limit.color }}>

              {limit.type} LIMIT: {(limit.val * 100).toFixed(1)}%

            </div>

          </div>

        );

      })}



      {activePreset && (

        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-x-10 inset-y-10 h-[calc(100%-80px)] w-[calc(100%-80px)] pointer-events-none z-0">

          <polyline fill="none" stroke={theme.primary} strokeWidth="0.8" strokeDasharray="2 2" opacity="0.6" points={Array.from({length: 51}).map((_, i) => {

              const x = (i / 50) * 100;

              const ratio = PRESET_CURVES[activePreset](i, 51);

              const sol = minSol + ratio * (maxSol - minSol);

              return `${x},${(1 - sol) * 100}`;

            }).join(' ')}

          />

        </svg>

      )}



      {speeds.map((sol, i) => {

        const xPercent = (i / (craftCount - 1));

        const x = 40 + xPercent * (containerRef.current?.clientWidth - 80 || 0);

        const y = 40 + (1 - sol) * (h - 80);

        const isActive = draggingIdx === i;

        return (

          <React.Fragment key={i}>

            <div onMouseDown={(e) => { e.stopPropagation(); setDraggingIdx(i); }} className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab border transition-all z-30" style={{ left: `${x}px`, top: `${y}px`, backgroundColor: isActive ? theme.primary : 'black', borderColor: theme.primary, boxShadow: isActive ? `0 0 10px ${theme.primary}` : 'none' }}>

              <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold" style={{ color: theme.primary }}>{(sol * 100).toFixed(1)}%</span>

            </div>

            <div className="absolute bottom-2 -translate-x-1/2 text-[8px] font-bold uppercase tracking-tighter" style={{ left: `${x}px`, color: theme.secondary }}>{CRAFT_NAMES[i]}</div>

          </React.Fragment>

        );

      })}

    </div>

  );

};



export default function App() {

  const [themeKey, setThemeKey] = useState('emerald');

  const theme = THEMES[themeKey];



  // CONFIG STATE

  const [craftCount, setCraftCount] = useState(6);

  const [minSol, setMinSol] = useState(0.05);

  const [maxSol, setMaxSol] = useState(0.95);

  const [speeds, setSpeeds] = useState([]);

  const [activePreset, setActivePreset] = useState('S-Curve');

  const [acceleration, setAcceleration] = useState(1.0);

  const [stagger, setStagger] = useState(25);

  const [destination, setDestination] = useState(DESTINATIONS[0]);

  const [customDistance, setCustomDistance] = useState(10);

  

  // SIMULATION STATE

  const [showSim, setShowSim] = useState(false);

  const [isSimPaused, setIsSimPaused] = useState(true);

  const [earthTime, setEarthTime] = useState(0);

  const [timeScale, setTimeScale] = useState(10);

  const [notifications, setNotifications] = useState([]);



  const animRef = useRef();

  const lastTimeRef = useRef();

  const firstArrivalRef = useRef(null);



  const getDistance = () => destination.name === "Custom" ? customDistance : destination.dist;



  // ANALYTICAL FLIGHT PROFILES

  const flightProfiles = useMemo(() => {

    const totalDist = getDistance() * LY_IN_METERS;

    const acc = acceleration * G;

    return speeds.map((sol, i) => {

      const vMax = sol * C;

      const launchTime = i * stagger;

      const tToMax = vMax / acc;

      const distToMax = 0.5 * acc * (tToMax * tToMax);

      if (distToMax * 2 > totalDist) {

        // PEAK PROFILE

        const peakDist = totalDist / 2;

        const tAccel = Math.sqrt((2 * peakDist) / acc);

        const arrivalT = launchTime + (2 * tAccel) / YEAR_IN_SECONDS;

        return { id: i, name: CRAFT_NAMES[i], launchTime, arrivalT, type: 'peak', acc, tAccel, peakDist, vMax: Math.sqrt(2 * acc * peakDist), totalDist };

      } else {

        // CRUISE PROFILE

        const cruiseDist = totalDist - (2 * distToMax);

        const tCruise = cruiseDist / vMax;

        const arrivalT = launchTime + (2 * tToMax + tCruise) / YEAR_IN_SECONDS;

        return { id: i, name: CRAFT_NAMES[i], launchTime, arrivalT, type: 'cruise', acc, tAccel: tToMax, distToMax, tCruise, vMax, totalDist };

      }

    });

  }, [speeds, destination, customDistance, acceleration, stagger]);



  useEffect(() => {

    const fn = PRESET_CURVES[activePreset] || PRESET_CURVES.Linear;

    const newSpeeds = new Array(craftCount).fill(0).map((_, i) => minSol + fn(i, craftCount) * (maxSol - minSol));

    setSpeeds(newSpeeds);

  }, [craftCount, activePreset, minSol, maxSol]);



  // SIMULATION ACTIONS

  const resetSim = () => {

    cancelAnimationFrame(animRef.current);

    lastTimeRef.current = null;

    firstArrivalRef.current = null;

    setEarthTime(0);

    setNotifications([]);

    setIsSimPaused(true);

  };



  const startSim = () => {

    resetSim();

    setShowSim(true);

    // Brief delay to ensure state updates before play

    setTimeout(() => {

      lastTimeRef.current = null;

      setIsSimPaused(false);

    }, 100);

  };



  // MASTER CLOCK LOOP

  useEffect(() => {

    if (showSim && !isSimPaused) {

      const step = (timestamp) => {

        if (!lastTimeRef.current) {

          lastTimeRef.current = timestamp;

          animRef.current = requestAnimationFrame(step);

          return;

        }

        const dtReal = (timestamp - lastTimeRef.current) / 1000;

        lastTimeRef.current = timestamp;

        setEarthTime(prev => prev + dtReal * timeScale);

        animRef.current = requestAnimationFrame(step);

      };

      animRef.current = requestAnimationFrame(step);

    } else {

      lastTimeRef.current = null;

      cancelAnimationFrame(animRef.current);

    }

    return () => cancelAnimationFrame(animRef.current);

  }, [showSim, isSimPaused, timeScale]);



  // DERIVED FLEET STATE

  const fleetState = useMemo(() => {

    return flightProfiles.map(p => {

      const elapsedYears = earthTime - p.launchTime;

      if (elapsedYears <= 0) return { ...p, pos: 0, v: 0, shipTime: 0, arrivedAt: null };

      

      const elapsedSec = elapsedYears * YEAR_IN_SECONDS;

      let pos = 0; let v = 0;



      if (p.type === 'peak') {

        if (elapsedSec < p.tAccel) {

          v = p.acc * elapsedSec;

          pos = 0.5 * p.acc * elapsedSec * elapsedSec;

        } else if (elapsedSec < 2 * p.tAccel) {

          const tDecel = elapsedSec - p.tAccel;

          v = (p.acc * p.tAccel) - (p.acc * tDecel);

          pos = p.peakDist + (p.acc * p.tAccel * tDecel) - (0.5 * p.acc * tDecel * tDecel);

        } else { pos = p.totalDist; v = 0; }

      } else {

        if (elapsedSec < p.tAccel) {

          v = p.acc * elapsedSec;

          pos = 0.5 * p.acc * elapsedSec * elapsedSec;

        } else if (elapsedSec < p.tAccel + p.tCruise) {

          v = p.vMax;

          pos = p.distToMax + (p.vMax * (elapsedSec - p.tAccel));

        } else if (elapsedSec < 2 * p.tAccel + p.tCruise) {

          const tDecel = elapsedSec - (p.tAccel + p.tCruise);

          v = p.vMax - (p.acc * tDecel);

          pos = (p.totalDist - p.distToMax) + (p.vMax * tDecel) - (0.5 * p.acc * tDecel * tDecel);

        } else { pos = p.totalDist; v = 0; }

      }



      pos = Math.min(pos, p.totalDist);

      const arrivedAt = earthTime >= p.arrivalT ? p.arrivalT : null;

      

      // Relativistic Proper Time Approximation

      const gamma = 1 / Math.sqrt(Math.max(0.0001, 1 - (v * v) / (C * C)));

      const shipTime = elapsedYears / gamma;



      return { ...p, pos, v, shipTime, arrivedAt };

    });

  }, [earthTime, flightProfiles]);



  // NOTIFICATION SYNCHRONIZATION

  useEffect(() => {

    fleetState.forEach(ship => {

      if (ship.arrivedAt && !notifications.some(n => n.name === ship.name)) {

        const arrT = ship.arrivedAt;

        if (firstArrivalRef.current === null) {

          firstArrivalRef.current = arrT;

          setNotifications(prev => [...prev, { name: ship.name, text: 'ARRIVED FIRST!', time: arrT, delay: 0 }]);

        } else {

          setNotifications(prev => [...prev, { name: ship.name, text: 'ARRIVED', time: arrT, delay: arrT - firstArrivalRef.current }]);

        }

      }

    });

  }, [fleetState, notifications]);



  return (

    <div className="min-h-screen bg-[#050505] font-mono p-4 md:p-8 transition-colors duration-1000 select-none" style={{ color: theme.primary }}>

      <header className="mb-8 flex flex-col md:flex-row items-baseline justify-between gap-4 border-b pb-4" style={{ borderColor: theme.muted }}>

        <div>

          <h1 className="text-2xl font-black tracking-tighter uppercase italic">Wait-Calc <span style={{ color: theme.muted }}>v1.4.2</span></h1>

          <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: theme.secondary }}>Interstellar Obsolescence Simulator</p>

        </div>

        <div className="flex items-center gap-6">

            <div className="flex items-center gap-2">

                <Palette className="h-3 w-3" />

                <div className="flex gap-1">

                    {Object.keys(THEMES).map(k => (

                        <button key={k} onClick={() => setThemeKey(k)} className={`w-4 h-4 border ${themeKey === k ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: THEMES[k].primary }} />

                    ))}

                </div>

            </div>

            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.muted }}>

                <span>System: Nominal</span>

                <span className="animate-pulse" style={{ color: theme.primary }}>● Link: Active</span>

            </div>

        </div>

      </header>



      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        <div className="lg:col-span-8 space-y-6">

          <RetroPanel title="Propulsion Capability Curve" theme={theme}>

            <div className="mb-4 flex flex-wrap gap-4 items-center justify-between text-[10px]">

              <div className="flex gap-2 items-center">

                <span style={{ color: theme.secondary }}>PRESETS:</span>

                {Object.keys(PRESET_CURVES).map(name => (

                  <button key={name} onClick={() => setActivePreset(name)} className={`border px-2 py-1 uppercase font-bold transition-all ${activePreset === name ? 'bg-white/10' : 'opacity-60'}`} style={{ borderColor: theme.muted, color: activePreset === name ? theme.primary : theme.secondary }}>{name}</button>

                ))}

              </div>

            </div>

            <CurveEditor craftCount={craftCount} speeds={speeds} setSpeeds={setSpeeds} minSol={minSol} setMinSol={setMinSol} maxSol={maxSol} setMaxSol={setMaxSol} theme={theme} activePreset={activePreset} />

          </RetroPanel>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <RetroPanel title="Mission Parameters" theme={theme}>

              <div className="space-y-4 text-xs">

                <div className="flex flex-col gap-1">

                  <label style={{ color: theme.secondary }} className="font-bold">DESTINATION</label>

                  <select value={destination.name} onChange={(e) => setDestination(DESTINATIONS.find(x => x.name === e.target.value) || { name: "Custom", dist: customDistance })} className="bg-black border p-2 focus:outline-none" style={{ borderColor: theme.muted, color: theme.primary }}>

                    {DESTINATIONS.map(d => <option key={d.name} value={d.name}>{d.name} ({d.dist} LY)</option>)}

                    <option value="Custom">Custom Target...</option>

                  </select>

                </div>

                <div className="flex flex-col gap-1">

                  <label className="font-bold flex justify-between" style={{ color: theme.secondary }}><span>LAUNCH STAGGER</span><span style={{ color: theme.primary }}>{stagger} YRS</span></label>

                  <input type="range" min="1" max="100" value={stagger} onChange={e => setStagger(Number(e.target.value))} className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer" style={{ accentColor: theme.primary }}/>

                </div>

              </div>

            </RetroPanel>

            <RetroPanel title="Physics Constants" theme={theme}>

              <div className="space-y-4 text-xs">

                <div className="flex flex-col gap-1">

                  <label className="font-bold flex justify-between" style={{ color: theme.secondary }}><span>ACCELERATION (G)</span><span style={{ color: theme.primary }}>{acceleration} G</span></label>

                  <input type="range" min="0.1" max="2.0" step="0.1" value={acceleration} onChange={e => setAcceleration(Number(e.target.value))} className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer" style={{ accentColor: theme.primary }}/>

                </div>

                <div className="flex flex-col gap-1">

                  <label style={{ color: theme.secondary }} className="font-bold uppercase">Fleet Size</label>

                  <div className="flex gap-1">

                    {[2, 4, 6, 8, 10].map(n => (

                      <button key={n} onClick={() => setCraftCount(n)} className={`flex-1 border p-1 text-[10px] font-bold ${craftCount === n ? 'bg-white/10' : ''}`} style={{ borderColor: craftCount === n ? theme.primary : theme.muted, color: craftCount === n ? theme.primary : theme.muted }}>{n}</button>

                    ))}

                  </div>

                </div>

              </div>

            </RetroPanel>

          </div>

        </div>

        <div className="lg:col-span-4 space-y-6">

          <RetroPanel title="Fleet Status Summary" theme={theme}>

            <div className="space-y-3">

              {[["FLEET SPAN", `${((craftCount - 1) * stagger)} YEARS`], ["PEAK VELOCITY", `${(speeds[speeds.length - 1] * 100).toFixed(1)}% SOL`], ["DESTINATION", `${getDistance()} LY`]].map(([l, v]) => (

                <div key={l} className="flex justify-between items-center text-[10px] border-b pb-2" style={{ borderColor: `${theme.muted}50` }}><span style={{ color: theme.secondary }}>{l}</span><span className="text-white">{v}</span></div>

              ))}

            </div>

            <button onClick={startSim} className="group w-full py-4 mt-6 font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95" style={{ backgroundColor: theme.primary, color: 'black' }}>Launch Simulation <Play className="h-4 w-4 fill-black"/></button>

          </RetroPanel>

        </div>

      </div>



      {showSim && (

        <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col p-4 md:p-8 animate-in fade-in zoom-in duration-300 overflow-hidden">

          <div className="flex justify-between items-center border-b pb-4 mb-4" style={{ borderColor: theme.muted }}>

            <div>

              <h2 className="text-xl font-bold uppercase tracking-tighter" style={{ color: theme.primary }}>Voyage Tracking: {destination.name}</h2>

              <p className="text-[10px] uppercase font-bold" style={{ color: theme.secondary }}>Analytical Vectors | Target: {getDistance()} LY</p>

            </div>

            <div className="flex items-center gap-2">

               <button onClick={() => { 

                 if (isSimPaused) lastTimeRef.current = null;

                 setIsSimPaused(!isSimPaused); 

               }} className="p-2 border" style={{ borderColor: theme.muted }}>{isSimPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button>

               <button onClick={resetSim} className="p-2 border" style={{ borderColor: theme.muted }}><RotateCcw className="h-4 w-4" /></button>

               <button onClick={() => setShowSim(false)} className="p-2 border hover:bg-red-900/20" style={{ borderColor: theme.muted }}><X className="h-4 w-4" /></button>

            </div>

          </div>

          <div className="flex-1 border relative bg-black/50 overflow-hidden flex flex-col" style={{ borderColor: `${theme.muted}50` }}>

             <div className="flex-1 relative border-b" style={{ borderColor: `${theme.muted}30` }}>

                <div className="absolute top-0 bottom-0 border-l border-dashed z-0" style={{ left: '80%', borderColor: theme.primary }}>
                   <div className="absolute top-4 left-2 bg-black px-2 py-1 border text-[10px] font-black uppercase whitespace-nowrap" style={{ color: theme.primary, borderColor: theme.primary }}>{destination.name}</div>
                   <div className="absolute top-12 left-2 text-[8px] font-bold" style={{ color: theme.secondary }}>{getDistance()} LY</div>

                </div>

                {fleetState.map((ship) => {

                  const totalDistMeters = getDistance() * LY_IN_METERS;

                  const xPercent = (ship.pos / totalDistMeters) * 80;

                  const hasLaunched = earthTime >= ship.launchTime;

                  const yPos = 15 + (ship.id / (craftCount - 1)) * 70;

                  return (

                    <div key={ship.name} className="absolute inset-x-0" style={{ top: `${yPos}%` }}>

                      <div className="absolute left-0 right-[20%] h-[1px] opacity-10" style={{ backgroundColor: theme.primary }} />

                      <div className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-75 ${!hasLaunched ? 'opacity-30' : ''}`} style={{ left: `${xPercent}%` }}>

                         <div className="w-1.5 h-4" style={{ backgroundColor: hasLaunched ? theme.primary : theme.muted, boxShadow: hasLaunched ? `0 0 15px ${theme.primary}` : 'none' }} />

                         {hasLaunched && !ship.arrivedAt && (

                           <div className="absolute top-5 left-2 bg-black border p-1.5 text-[8px] whitespace-nowrap z-10" style={{ borderColor: theme.muted }}>

                              <div className="text-white font-bold">{ship.name}</div>

                              <div style={{ color: theme.primary }}>{(ship.v / C * 100).toFixed(1)}% SOL</div>

                              <div style={{ color: theme.secondary }}>SHIP T: {ship.shipTime.toFixed(1)}y</div>

                           </div>

                         )}

                      </div>

                      {notifications.find(n => n.name === ship.name) && (

                         <div className="absolute right-4 top-0 -translate-y-1/2 bg-black border p-2 text-[10px] font-black animate-in slide-in-from-right duration-500 z-20" style={{ borderColor: theme.primary, boxShadow: `0 0 10px ${theme.glow}` }}>

                            <div className="flex justify-between gap-4 items-center">

                               <span style={{ color: theme.primary }}>{ship.name} {notifications.find(n => n.name === ship.name).delay === 0 ? 'ARRIVED FIRST!' : 'ARRIVED'}</span>

                               <span className="text-white">EARTH T: {notifications.find(n => n.name === ship.name).time.toFixed(1)}y</span>

                            </div>

                            {notifications.find(n => n.name === ship.name).delay > 0 && (

                               <div className="text-[9px] mt-0.5" style={{ color: theme.secondary }}>DELAY RELATIVE TO LEADER: +{notifications.find(n => n.name === ship.name).delay.toFixed(1)} YEARS</div>

                            )}

                         </div>

                      )}

                    </div>

                  );

                })}

             </div>

          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-[10px] font-bold uppercase">

             <div className="border p-2 flex gap-4" style={{ borderColor: theme.muted }}>

                <span className="text-white">MASTER EARTH CLOCK:</span>

                <span style={{ color: theme.primary }}>T + {earthTime.toFixed(2)} YRS</span>

             </div>

             <div className="border p-2 flex gap-4" style={{ borderColor: theme.muted }}>

                <span className="text-white">TIME SCALE:</span>

                <div className="flex gap-2">

                   {[1, 5, 10, 25, 50].map(s => (

                     <button key={s} onClick={() => setTimeScale(s)} className={`transition-all ${timeScale === s ? 'text-white underline underline-offset-4' : 'opacity-30'}`} style={{ color: theme.primary }}>{s}x</button>

                   ))}

                </div>

             </div>

             <div className="flex-1" />

             <div className="border p-2 flex gap-4" style={{ borderColor: theme.muted }}>

                <span className="text-white">MISSION STATUS:</span>

                <span className="animate-pulse" style={{ color: fleetState.every(s => s.arrivedAt) ? theme.primary : '#FFB100' }}>

                  {fleetState.every(s => s.arrivedAt) ? 'ALL CRAFT ARRIVED' : 'ACTIVE TRANSIT'}

                </span>

             </div>

          </div>

        </div>

      )}

      <style dangerouslySetInnerHTML={{ __html: `input[type='range']::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 12px; height: 12px; background: currentColor; cursor: pointer; border-radius: 1px; }` }} />

    </div>

  );

}