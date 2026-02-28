import React, { useState, useRef, useEffect } from 'react';
import { PRESET_CURVES, CRAFT_NAMES } from '../physics';

export default function CurveEditor({ craftCount, speeds, setSpeeds, minSol, setMinSol, maxSol, setMaxSol, theme, activePreset }) {
  const containerRef  = useRef(null);
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => forceUpdate(n => n + 1));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);
  const [draggingIdx,     setDraggingIdx]     = useState(null);
  const [draggingLimit,   setDraggingLimit]   = useState(null);
  const [editingIdx,      setEditingIdx]      = useState(null);
  const [editingVal,      setEditingVal]      = useState('');
  const [editingLimit,    setEditingLimit]    = useState(null); // 'min' | 'max' | null
  const [editingLimitVal, setEditingLimitVal] = useState('');
  const padding = 40;
  const h = 288;

  const commitEdit = () => {
    if (editingIdx === null) return;
    const pct = parseFloat(editingVal);
    if (!isNaN(pct)) {
      let newSol = Math.max(0, Math.min(100, pct)) / 100;
      newSol = Math.max(minSol, Math.min(maxSol, newSol));
      const prev = editingIdx > 0 ? speeds[editingIdx - 1] : minSol;
      const next = editingIdx < speeds.length - 1 ? speeds[editingIdx + 1] : maxSol;
      newSol = Math.max(prev, Math.min(next, newSol));
      const nextSpeeds = [...speeds];
      nextSpeeds[editingIdx] = newSol;
      setSpeeds(nextSpeeds);
    }
    setEditingIdx(null);
  };

  const commitLimitEdit = () => {
    if (!editingLimit) return;
    const pct = parseFloat(editingLimitVal);
    if (!isNaN(pct)) {
      const newVal = Math.max(0, Math.min(100, pct)) / 100;
      if (editingLimit === 'max') setMaxSol(Math.max(newVal, minSol + 0.01));
      else                        setMinSol(Math.max(0.001, Math.min(newVal, maxSol - 0.01)));
    }
    setEditingLimit(null);
  };

  const handleMouseMove = (e) => {
    if (editingIdx !== null || editingLimit !== null) return;
    if (draggingIdx === null && draggingLimit === null) return;
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    let val = 1 - ((y - padding) / (h - padding * 2));
    val = Math.max(0, Math.min(1, val));
    if (draggingLimit === 'min') {
      setMinSol(Math.max(0.001, Math.min(val, maxSol - 0.01)));
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
      onMouseUp={()    => { setDraggingIdx(null); setDraggingLimit(null); }}
      onMouseLeave={() => { setDraggingIdx(null); setDraggingLimit(null); }}
    >
      {/* Hint text */}
      <div className="absolute top-1 right-2 text-[7px] pointer-events-none select-none"
        style={{ color: theme.secondary, opacity: 0.55 }}>
        drag · dbl-click for exact value
      </div>

      {/* Background grid */}
      <div className="absolute inset-x-10 inset-y-10 pointer-events-none opacity-10">
        {[0.25, 0.5, 0.75].map(p => (
          <React.Fragment key={p}>
            <div className="absolute left-0 right-0 border-t" style={{ top: `${p * 100}%`, borderColor: theme.primary }} />
            <div className="absolute top-0 bottom-0 border-l" style={{ left: `${p * 100}%`, borderColor: theme.primary }} />
          </React.Fragment>
        ))}
      </div>

      {/* Limit handles — double-click to type exact value */}
      {[
        { type: 'MAX', key: 'max', val: maxSol, side: 'left'  },
        { type: 'MIN', key: 'min', val: minSol, side: 'right' },
      ].map(limit => {
        const isEditingThis = editingLimit === limit.key;
        const y = padding + (1 - limit.val) * (h - padding * 2);
        return (
          <div key={limit.type}
            className="absolute left-0 right-0 h-6 -translate-y-1/2 cursor-ns-resize z-20 flex items-center"
            style={{ top: `${y}px` }}
            onMouseDown={() => { if (!isEditingThis) setDraggingLimit(limit.key); }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setDraggingLimit(null);
              setEditingLimit(limit.key);
              setEditingLimitVal((limit.val * 100).toFixed(1));
            }}
          >
            <div className="absolute top-1/2 left-0 right-0 border-t border-dashed opacity-80" style={{ borderColor: theme.primary }} />
            {isEditingThis ? (
              <div className={`z-10 flex items-center gap-1 bg-black border px-1 py-0.5 ${limit.side === 'left' ? 'ml-2' : 'mr-2 ml-auto'}`}
                style={{ borderColor: theme.primary }}>
                <input
                  type="number" step="0.1" autoFocus
                  value={editingLimitVal}
                  onChange={e => setEditingLimitVal(e.target.value)}
                  onFocus={e => e.target.select()}
                  onBlur={commitLimitEdit}
                  onKeyDown={e => {
                    if (e.key === 'Enter')  { e.preventDefault(); commitLimitEdit(); }
                    if (e.key === 'Escape') { setEditingLimit(null); }
                  }}
                  className="w-12 text-center text-[8px] font-black bg-black focus:outline-none"
                  style={{ color: theme.primary }}
                />
                <span className="text-[7px] font-black uppercase" style={{ color: theme.secondary }}>%</span>
              </div>
            ) : (
              <div className={`px-2 py-0.5 text-[8px] font-black uppercase bg-black border border-current z-10 ${limit.side === 'left' ? 'ml-2' : 'mr-2 ml-auto'}`}
                style={{ color: theme.primary }}>
                {limit.type} LIMIT: {(limit.val * 100).toFixed(1)}%
              </div>
            )}
          </div>
        );
      })}

      {/* Ghost curve preview */}
      {activePreset && (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none"
          className="absolute inset-x-10 inset-y-10 h-[calc(100%-80px)] w-[calc(100%-80px)] pointer-events-none z-0">
          <polyline fill="none" stroke={theme.primary} strokeWidth="0.8" strokeDasharray="2 2" opacity="0.6"
            points={Array.from({ length: 51 }).map((_, i) => {
              const x   = (i / 50) * 100;
              const sol = minSol + PRESET_CURVES[activePreset](i, 51) * (maxSol - minSol);
              return `${x},${(1 - sol) * 100}`;
            }).join(' ')} />
        </svg>
      )}

      {/* Draggable markers */}
      {speeds.map((sol, i) => {
        const xPercent = (i / (craftCount - 1));
        const x = 40 + xPercent * (containerRef.current?.clientWidth - 80 || 0);
        const y = 40 + (1 - sol) * (h - 80);
        const isActive = draggingIdx === i;
        return (
          <React.Fragment key={i}>
            {editingIdx === i && (
              <div className="absolute z-50 flex flex-col items-center"
                style={{ left: `${x}px`, top: `${y - 40}px`, transform: 'translateX(-50%)' }}>
                <input
                  type="number" step="0.1" autoFocus
                  value={editingVal}
                  onChange={e => setEditingVal(e.target.value)}
                  onFocus={e => e.target.select()}
                  onBlur={commitEdit}
                  onKeyDown={e => {
                    if (e.key === 'Enter')  { e.preventDefault(); commitEdit(); }
                    if (e.key === 'Escape') { setEditingIdx(null); }
                  }}
                  className="w-14 text-center text-[10px] font-black border bg-black focus:outline-none"
                  style={{ color: theme.primary, borderColor: theme.primary }}
                />
                <div className="text-[7px] mt-0.5" style={{ color: theme.secondary }}>% SOL · Enter</div>
              </div>
            )}
            <div
              onMouseDown={(e) => { e.stopPropagation(); if (editingIdx === null) setDraggingIdx(i); }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setDraggingIdx(null);
                setEditingIdx(i);
                setEditingVal((sol * 100).toFixed(1));
              }}
              className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab border transition-all z-30"
              style={{ left: `${x}px`, top: `${y}px`, backgroundColor: isActive ? theme.primary : 'black',
                       borderColor: theme.primary, boxShadow: isActive ? `0 0 10px ${theme.primary}` : 'none' }}>
              {editingIdx !== i && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold"
                  style={{ color: theme.primary }}>{(sol * 100).toFixed(1)}%</span>
              )}
            </div>
            <div className="absolute bottom-2 -translate-x-1/2 text-[8px] font-bold uppercase tracking-tighter"
              style={{ left: `${x}px`, color: theme.secondary }}>{CRAFT_NAMES[i]}</div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
