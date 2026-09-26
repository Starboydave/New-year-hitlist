import React, { useState, useEffect, useRef } from 'react';
import { Crosshair, CheckSquare, Trash2, AlertTriangle, Terminal, Activity, Zap } from 'lucide-react';

const CyberpunkHitList = () => {
  const [targets, setTargets] = useState([
    { id: 1, text: "Learn Rust", completed: false, deadline: 86400 },
    { id: 2, text: "Fix Sleep Schedule", completed: true, deadline: 0 },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isNagging, setIsNagging] = useState(false);
  const [nagTimer, setNagTimer] = useState(0);

  // References for timers
  const idleTimerRef = useRef(null);

  // --- THE NAG LOGIC ---
  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setIsNagging(false);
    
    // Only set the timer if there are active targets
    const hasActiveTargets = targets.some(t => !t.completed);
    
    if (hasActiveTargets) {
      idleTimerRef.current = setTimeout(() => {
        setIsNagging(true);
      }, 10000); // 10 seconds for demo purposes
    }
  };

  useEffect(() => {
    resetIdleTimer();
    return () => clearTimeout(idleTimerRef.current);
  }, [targets]);

  // --- TARGET MANAGEMENT ---
  const addTarget = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    const newTarget = {
      id: Date.now(),
      text: inputValue,
      completed: false,
      deadline: 86400, // 24 hours in seconds
    };
    
    setTargets([...targets, newTarget]);
    setInputValue("");
    resetIdleTimer(); // Reset nag timer on interaction
  };

  const toggleTarget = (id) => {
    setTargets(targets.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
    resetIdleTimer();
  };

  const deleteTarget = (id) => {
    setTargets(targets.filter(t => t.id !== id));
    resetIdleTimer();
  };

  const completionRate = targets.length > 0 
    ? Math.round((targets.filter(t => t.completed).length / targets.length) * 100) 
    : 0;

  return (
    <div className={`min-h-screen bg-[#0f172a] text-slate-200 font-mono p-4 md:p-8 relative overflow-hidden transition-all ${isNagging ? 'animate-shake' : ''}`}>
      
      {/* CSS for Glitch/Shake Effect */}
      <style>{`
        @keyframes shake {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          10% { transform: translate(-1px, -2px) rotate(-1deg); }
          20% { transform: translate(-3px, 0px) rotate(1deg); }
          30% { transform: translate(3px, 2px) rotate(0deg); }
          40% { transform: translate(1px, -1px) rotate(1deg); }
          50% { transform: translate(-1px, 2px) rotate(-1deg); }
          60% { transform: translate(-3px, 1px) rotate(0deg); }
          70% { transform: translate(3px, 1px) rotate(-1deg); }
          80% { transform: translate(-1px, -1px) rotate(1deg); }
          90% { transform: translate(1px, 2px) rotate(0deg); }
          100% { transform: translate(1px, -2px) rotate(-1deg); }
        }
        .animate-shake {
          animation: shake 0.5s infinite;
        }
        .scanline {
          background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2));
          background-size: 100% 4px;
          pointer-events: none;
        }
      `}</style>

      {/* Retro Scanline Overlay */}
      <div className="absolute inset-0 scanline z-0 h-full w-full pointer-events-none opacity-20"></div>

      <div className="max-w-3xl mx-auto relative z-10">
        
        {/* HEADER */}
        <header className="mb-8 border-b-2 border-slate-700 pb-4">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tighter text-red-500 uppercase flex items-center gap-3 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                <Crosshair className="w-8 h-8 md:w-12 md:h-12" />
                Hit List 2025
              </h1>
              <p className="text-xs text-slate-400 mt-1 tracking-widest">
                // SYSTEM_STATUS: {isNagging ? <span className="text-red-500 font-bold animate-pulse">CRITICAL</span> : <span className="text-green-400">ONLINE</span>}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400 mb-1">MISSION COMPLETION</div>
              <div className="text-2xl md:text-4xl font-bold text-green-400">
                {completionRate}%
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-4 bg-slate-800 border border-slate-600 relative overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-500 ease-out shadow-[0_0_15px_rgba(74,222,128,0.5)]"
              style={{ width: `${completionRate}%` }}
            ></div>
            {/* Grid overlay on progress bar */}
            <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
               {[...Array(12)].map((_, i) => (
                 <div key={i} className="border-r border-slate-900/50 h-full"></div>
               ))}
            </div>
          </div>
        </header>

        {/* INPUT AREA */}
        <form onSubmit={addTarget} className="mb-8 relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Terminal className="h-5 w-5 text-red-500" />
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="block w-full pl-10 pr-3 py-4 bg-slate-900 border-2 border-slate-700 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors font-mono uppercase tracking-wider"
            placeholder="ENTER NEW TARGET PARAMETERS..."
            autoComplete="off"
          />
          <button 
            type="submit"
            className="absolute inset-y-0 right-0 px-6 bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white border-l-2 border-slate-700 hover:border-red-500 transition-all font-bold uppercase text-sm"
          >
            Authorize
          </button>
        </form>

        {/* TARGET LIST */}
        <div className="space-y-4">
          {targets.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-slate-800 text-slate-600">
              NO ACTIVE CONTRACTS DETECTED
            </div>
          )}

          {targets.map((target) => (
            <div 
              key={target.id}
              className={`relative border-l-4 p-4 transition-all duration-300 group
                ${target.completed 
                  ? 'bg-slate-900 border-green-500 opacity-60' 
                  : 'bg-slate-800/50 border-red-500 hover:bg-slate-800 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <button 
                    onClick={() => toggleTarget(target.id)}
                    className={`mt-1 flex-shrink-0 transition-colors ${target.completed ? 'text-green-500' : 'text-slate-500 hover:text-red-500'}`}
                  >
                    <CheckSquare className="w-6 h-6" />
                  </button>
                  
                  <div>
                    <h3 className={`text-lg md:text-xl font-bold uppercase tracking-wide
                      ${target.completed ? 'text-green-500 line-through decoration-2' : 'text-slate-100'}`}>
                      {target.text}
                    </h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className={`text-xs px-2 py-0.5 border ${target.completed ? 'border-green-900 text-green-700' : 'border-red-900 text-red-500 bg-red-900/10'}`}>
                        {target.completed ? 'TERMINATED' : 'ACTIVE BOUNTY'}
                      </span>
                      
                      {!target.completed && (
                        <CountdownTimer />
                      )}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => deleteTarget(target.id)}
                  className="text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Decorative Corner accents */}
              <div className={`absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 ${target.completed ? 'border-green-500' : 'border-red-500'}`}></div>
              <div className={`absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 ${target.completed ? 'border-green-500' : 'border-red-500'}`}></div>
            </div>
          ))}
        </div>
      </div>

      {/* THE NAG MODAL */}
      {isNagging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-500/10 backdrop-blur-[2px]">
          <div className="bg-[#0f172a] border-4 border-red-500 p-8 max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.5)] text-center animate-bounce">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse" />
            <h2 className="text-3xl font-bold text-red-500 mb-2 tracking-tighter">WARNING: STAGNATION DETECTED</h2>
            <p className="text-slate-300 mb-6 text-sm">
              TARGETS ARE ACTIVE. INACTION IS NOT AN OPTION.
              <br/>
              INITIATE PROTOCOLS IMMEDIATELY.
            </p>
            <button
              onClick={resetIdleTimer}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 border border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.5)] uppercase tracking-widest transition-all hover:scale-105"
            >
              I'm working on it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple visual countdown component that resets every 24 hours visually
const CountdownTimer = () => {
  const [time, setTime] = useState("23:59:59");
  
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      // Calculate time remaining until next midnight
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      const diff = tomorrow - now;
      
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      
      setTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="flex items-center gap-1 text-xs text-red-400 font-mono">
      <Zap className="w-3 h-3" />
      {time}
    </span>
  );
};

export default CyberpunkHitList;
