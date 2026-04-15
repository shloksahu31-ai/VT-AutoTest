"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LiveLogViewer } from "./LiveLogViewer";

export function TriggerRunModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [suites, setSuites] = useState<any[]>([]);
  const [selectedSuite, setSelectedSuite] = useState<string>("");
  const [runId, setRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
       fetch('/api/suites').then(r => r.json()).then(data => {
         setSuites(data);
         if (data.length > 0) setSelectedSuite(data[0].name);
       }).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Swap to the Live Log Viewer overlay if a run is triggered
  if (runId) {
    return <LiveLogViewer runId={runId} onClose={() => { setRunId(null); onClose(); }} />;
  }

  const handleExecute = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suiteName: selectedSuite })
      });
      const data = await res.json();
      if (data.runId) {
        setRunId(data.runId);
      } else {
        alert("Execution failed to start: " + data.error);
      }
    } catch(e) {
      console.error(e);
      alert("Failed to reach execution backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl relative overflow-hidden"
      >
        {/* Subtle glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 opacity-10 blur-3xl pointer-events-none" />

        <h2 className="text-2xl font-black font-headline text-slate-900 dark:text-white mb-2 relative z-10">Trigger Execution</h2>
        <p className="text-xs text-slate-500 font-medium mb-8 relative z-10">Select a test suite to initialize the Playwright core against the active UAT staging environment.</p>
        
        <div className="space-y-6 relative z-10">
          <div>
             <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Target Suite</label>
             <select 
               className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer"
               value={selectedSuite}
               onChange={(e) => setSelectedSuite(e.target.value)}
               disabled={loading || suites.length === 0}
             >
                {suites.length === 0 && <option>Loading suites...</option>}
                {suites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
             </select>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <button onClick={onClose} disabled={loading} className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors px-2">
               Cancel
            </button>
            <button 
              onClick={handleExecute}
              disabled={loading || suites.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-900/20 flex items-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[16px]">play_arrow</span>
              )}
              {loading ? "Starting..." : "Execute"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
