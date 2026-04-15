"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

export default function FailuresPage() {
  const [failures, setFailures] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function fetchFailures() {
      setLoading(true);
      try {
        const res = await fetch(`/api/failures${filter !== "all" ? `?category=${filter}` : ""}`);
        const data = await res.json();
        setFailures(data || []);
      } catch (e) {
        console.error("Failed to fetch failures:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchFailures();
  }, [filter]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const categories = ["REGRESSION", "FLAKE", "ENV_ISSUE", "AI_DRIFT", "SECURITY"];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter font-headline text-slate-900 dark:text-white mb-2">Failure Triage</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em]">Analyze and Fix Automated Test Regressions</p>
        </div>
        <div className="flex gap-2">
           <button className="px-6 py-3 rounded-xl bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-950 font-black text-sm shadow-xl transition-all flex items-center gap-2 active:scale-95">
              <span className="material-symbols-outlined text-[18px]">auto_fix</span>
              Batch Triage All
           </button>
        </div>
      </header>

      {/* Category Pills */}
      <div className="flex gap-3 overflow-x-auto pb-2 noscrollbar">
        <button 
          onClick={() => setFilter("all")}
          className={`px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${
            filter === "all" ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent" : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800"
          }`}
        >
          All Failures ({failures.length})
        </button>
        {categories.map((cat) => (
          <button 
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${
              filter === cat ? "bg-emerald-600 text-white border-transparent" : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800"
            }`}
          >
            {cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {failures.length > 0 ? failures.map((failure) => (
          <div key={failure.id} className="bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden transition-all shadow-sm">
            <div 
              className={`p-6 flex items-center justify-between cursor-pointer group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 ${expandedId === failure.id ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''}`}
              onClick={() => toggleExpand(failure.id)}
            >
              <div className="flex items-center gap-6">
                <div className={`w-3 h-3 rounded-full ${failure.category === 'REGRESSION' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]'}`} />
                <div>
                  <h4 className="text-lg font-black font-headline tracking-tighter text-slate-950 dark:text-white leading-none mb-1 group-hover:text-emerald-600 transition-colors">
                    {failure.name}
                  </h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {failure.file} • {failure.run?.environment} • {formatDistanceToNow(new Date(failure.run?.startedAt))} ago
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  failure.category === 'REGRESSION' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30' : 'bg-slate-100 text-slate-700 dark:bg-slate-800'
                }`}>
                  {failure.category || "UNCATEGORIZED"}
                </span>
                <span className="material-symbols-outlined text-slate-400 transition-transform group-hover:translate-y-1" style={{ transform: expandedId === failure.id ? 'rotate(180deg)' : '' }}>
                   expand_more
                </span>
              </div>
            </div>

            <AnimatePresence>
              {expandedId === failure.id && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-slate-100 dark:border-slate-800/50"
                >
                  <div className="p-8 grid grid-cols-12 gap-8 bg-slate-50/50 dark:bg-slate-900/30">
                    {/* Left: Error & Stack */}
                    <div className="col-span-8 space-y-6">
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Error Message</h5>
                        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-500/10 p-4 rounded-2xl text-rose-700 dark:text-rose-400 font-mono text-xs font-bold leading-relaxed">
                          {failure.errorMessage || "No error message provided."}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stack Trace</h5>
                        <div className="bg-slate-950 p-6 rounded-2xl text-slate-400 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[300px] noscrollbar">
                          {failure.errorStack || "No stack trace available."}
                        </div>
                      </div>
                    </div>

                    {/* Right: AI Triage */}
                    <div className="col-span-4 space-y-6">
                      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                          <span className="material-symbols-outlined text-4xl">psychology</span>
                        </div>
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-4">AI Triage Classification</h5>
                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed mb-4">
                          {failure.aiTriageReason?.split('|')[0] || "Waiting for AI analysis..."}
                        </p>
                        <hr className="border-slate-100 dark:border-slate-800 my-4" />
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Suggested Fix</h5>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic italic">
                          {failure.aiTriageReason?.split('|')[1] || "Manual investigation recommended."}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         <button className="py-3 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl active:scale-95 transition-all">Rerun Test</button>
                         <button className="py-3 bg-slate-950 dark:bg-slate-50 text-white dark:text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-xl active:scale-95 transition-all">Mark Fixed</button>
                      </div>

                      {/* Mini Trend */}
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stability History (Last 10)</h5>
                        <div className="flex gap-1.5 h-1.5 w-full">
                           {[1,1,1,0,1,1,0,1,0,0].map((s, i) => (
                             <div key={i} className={`flex-1 rounded-full ${s === 1 ? 'bg-emerald-500/30' : 'bg-rose-500'}`} />
                           ))}
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-widest mt-2">Latest Failure Duration: {failure.duration || 0}ms</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )) : (
          <div className="py-32 text-center space-y-4">
             <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <span className="material-symbols-outlined text-3xl">check_circle</span>
             </div>
             <div>
                <h3 className="font-black text-xl font-headline tracking-tighter">No failures detected</h3>
                <p className="text-slate-500 font-bold text-sm">All systems are operational and stable.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
