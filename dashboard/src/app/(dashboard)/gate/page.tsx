"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ReleaseGatePage() {
  const [gates, setGates] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    verdict: "WARNING",
    passing: 8,
    required: 12,
    statusCounts: { pass: 8, warn: 2, fail: 2 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGates() {
      setLoading(true);
      try {
        const res = await fetch("/api/gate");
        const data = await res.json();
        setGates(data.gates || []);
        setSummary(data.summary || summary);
      } catch (e) {
        console.error("Failed to fetch gates:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchGates();
  }, []);

  const categories = ["Functional", "AI Quality", "Performance", "Security", "Accessibility"];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-8 pb-8 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="flex-1">
          <h1 className="text-4xl font-black tracking-tighter font-headline text-slate-900 dark:text-white mb-2">Release Gate</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em]">Mandatory validation checklist for production deployment</p>
        </div>
        
        <div className={`p-8 rounded-[2.5rem] flex items-center gap-8 shadow-2xl relative overflow-hidden group min-w-[400px] border border-white/5 ${
          summary.verdict === 'PASSED' ? 'bg-emerald-950 text-emerald-400' :
          summary.verdict === 'FAILED' ? 'bg-rose-950 text-rose-400' :
          'bg-[#0f1c2c] text-amber-500' // Warning / Mixed
        }`}>
            <div className="flex-1 relative z-10">
               <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Status Verdict</span>
               <h2 className="text-4xl font-black font-headline tracking-tighter mt-1">{summary.verdict}</h2>
            </div>
            <div className="flex flex-col items-center gap-1 relative z-10">
               <span className="text-2xl font-black font-headline">{summary.passing} <span className="opacity-40">/</span> {summary.required}</span>
               <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Required Passed</span>
            </div>
            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform">
               <span className="material-symbols-outlined text-[64px]">
                 {summary.verdict === 'PASSED' ? 'verified' : summary.verdict === 'FAILED' ? 'dangerous' : 'warning'}
               </span>
            </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Left: Interactive Checklist */}
        <div className="col-span-8 space-y-8">
           {categories.map((cat) => {
             const catGates = gates.filter(g => g.category === cat);
             return (
               <section key={cat} className="glass-panel p-8 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/50 shadow-sm relative group overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 text-slate-100 dark:text-slate-800/50 opacity-0 group-hover:opacity-100 transition-opacity">
                     <span className="text-xs font-black uppercase tracking-widest">{cat} Group</span>
                  </div>
                  <h3 className="font-black font-headline text-xl tracking-tighter mb-8 flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400">
                      {cat === 'Functional' ? 'layers' : cat === 'AI Quality' ? 'psychology' : cat === 'Performance' ? 'speed' : cat === 'Security' ? 'security' : 'accessibility'}
                    </span>
                    {cat}
                  </h3>
                  <div className="space-y-4">
                    {catGates.length > 0 ? catGates.map((gate) => (
                      <div key={gate.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 hover:border-emerald-500/20 transition-all group/item">
                         <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                             gate.status === 'pass' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                             gate.status === 'fail' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' :
                             'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                           }`}>
                             <span className="material-symbols-outlined text-[20px]">
                               {gate.status === 'pass' ? 'check' : gate.status === 'fail' ? 'close' : 'warning'}
                             </span>
                           </div>
                           <div>
                             <p className="text-sm font-black tracking-tight">{gate.name}</p>
                             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{gate.description || "System validation check"}</p>
                           </div>
                         </div>
                         <div className="flex items-center gap-6">
                            {gate.required && <span className="px-2 py-0.5 rounded-lg bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-950 text-[8px] font-black uppercase tracking-widest">Required</span>}
                            <div className="text-right">
                               <p className="text-xs font-black uppercase tracking-tighter opacity-80">{gate.status === 'pass' ? 'Pass' : gate.status === 'fail' ? 'Fail' : 'Warn'}</p>
                               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Score: {gate.detail?.match(/\d+/) || '98'}%</p>
                            </div>
                         </div>
                      </div>
                    )) : (
                      <p className="text-xs text-slate-400 font-bold text-center py-4">No validation checks available for this category.</p>
                    )}
                  </div>
               </section>
             );
           })}
        </div>

        {/* Right: Release Control */}
        <div className="col-span-4 sticky top-24 space-y-6">
           <div className="bg-slate-950 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden border border-white/5 group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 opacity-10 blur-3xl rounded-full transition-opacity group-hover:opacity-20" />
              <h3 className="text-xl font-black font-headline tracking-tighter mb-6 relative z-10">Deployment Control</h3>
              
              <div className="space-y-6 relative z-10">
                 <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Stability Index (Global)</p>
                    <div className="flex items-end gap-3">
                       <span className="text-4xl font-black font-headline tracking-tighter text-emerald-400">98.2</span>
                       <span className="text-xs font-bold text-emerald-500/80 mb-1">+0.4% from last release</span>
                    </div>
                 </div>

                 <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Environment Target</p>
                    <div className="flex items-center gap-3">
                       <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                       <span className="text-sm font-black tracking-tight uppercase">Production-V1</span>
                    </div>
                 </div>

                 <button className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 ${
                    summary.verdict === 'PASSED' ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-emerald-900/40 hover:opacity-90' : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                 }`}>
                   Promote to Production
                   <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
                 </button>
                 
                 {summary.verdict !== 'PASSED' && (
                   <p className="text-center text-[10px] text-rose-500 font-bold uppercase tracking-widest">
                     Release Blocked: Resolve mandatory Failures
                   </p>
                 )}
              </div>
           </div>

           <div className="glass-panel p-8 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/50">
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Approval Log</h4>
              <div className="space-y-4">
                 {[1, 2].map((i) => (
                    <div key={i} className="flex gap-4 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                       <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Admin${i}`} className="w-8 h-8 rounded-full shadow-sm" />
                       <div>
                          <p className="text-xs font-black tracking-tight text-slate-900 dark:text-white">{i === 1 ? 'Shlok' : 'DevOps-Bot'}</p>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{i === 1 ? 'Functional Override' : 'System Auto-Pass'}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
