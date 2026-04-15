"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MetricCard } from "@/components/metric-card";

export default function FlakinessPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFlakiness() {
      setLoading(true);
      try {
        const res = await fetch("/api/flakiness");
        const data = await res.json();
        setRecords(data || []);
      } catch (e) {
        console.error("Failed to fetch flakiness:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchFlakiness();
  }, []);

  // Mock heatmap data
  const heatmap = Array.from({ length: 15 }, (_, i) => ({
    name: `Suite ${i + 1}`,
    days: Array.from({ length: 30 }, () => Math.random() > 0.9 ? "flake" : Math.random() > 0.95 ? "fail" : "pass")
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter font-headline text-slate-900 dark:text-white mb-2">Flakiness Tracker</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em]">Identify unstable tests and environmental noise</p>
        </div>
        <div className="flex gap-2">
           <button className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
              Refresh Analysis
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard label="Avg Flakiness" value="4.2%" icon="query_stats" trend={{ value: "-0.8%", isUp: true }} color="emerald" />
        <MetricCard label="Top Flake" value="TC-8821" icon="warning" color="rose" />
        <MetricCard label="Stability Index" value="95.8" icon="verified" color="slate" />
      </div>

      {/* Heatmap Section */}
      <section className="glass-panel p-8 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/50 shadow-sm overflow-x-auto noscrollbar">
         <div className="flex items-center justify-between mb-8 min-w-[800px]">
           <div>
             <h3 className="font-black font-headline text-xl tracking-tighter text-slate-900 dark:text-white">30-day Stability Heatmap</h3>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Daily pass/fail/flake status across suites</p>
           </div>
           <div className="flex gap-4 items-center">
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500 opacity-60"></div><span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Pass</span></div>
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-amber-500"></div><span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Flaky</span></div>
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-rose-500"></div><span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Fail</span></div>
           </div>
         </div>

         <div className="space-y-4 min-w-[800px]">
           {heatmap.map((row, i) => (
             <div key={i} className="flex items-center gap-4 group">
               <span className="w-20 text-[10px] font-black uppercase tracking-tighter text-slate-400 text-right opacity-60 group-hover:opacity-100 transition-opacity whitespace-nowrap">{row.name}</span>
               <div className="flex-1 flex gap-1 justify-between">
                 {row.days.map((status, day) => (
                   <motion.div 
                     key={day}
                     whileHover={{ scale: 1.2, zIndex: 10 }}
                     className={`h-6 w-full rounded-[4px] cursor-pointer transition-colors shadow-sm ${
                       status === 'pass' ? 'bg-emerald-500 opacity-30 hover:opacity-100' :
                       status === 'flake' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' :
                       'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse'
                     }`}
                     title={`Suite ${i+1} Day ${day+1}: ${status}`}
                   />
                 ))}
               </div>
             </div>
           ))}
         </div>
      </section>

      {/* Flakiness Table */}
      <section className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800/50 overflow-hidden">
         <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
            <h3 className="font-black font-headline text-xl tracking-tighter text-slate-900 dark:text-white">Ranked Flakiness</h3>
            <span className="px-3 py-1 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest rounded-full">ACTION REQUIRED: 4 TESTS</span>
         </div>
         <table className="w-full text-left">
            <thead>
               <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="px-8 py-4">Test Identification</th>
                  <th className="px-8 py-4">Total Runs</th>
                  <th className="px-8 py-4 text-center">Stability</th>
                  <th className="px-8 py-4">Flakiness Rate</th>
                  <th className="px-8 py-4 text-right">Trend Spark</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
               {[
                  { name: "Global Header Search UX", id: "TC-1283", runs: 450, fails: 24, rate: 5.3, score: 94.7 },
                  { name: "Payment Retry Logic", id: "TC-8821", runs: 120, fails: 32, rate: 26.6, score: 73.4 },
                  { name: "Intake Validation Step 2", id: "TC-9912", runs: 280, fails: 12, rate: 4.2, score: 95.8 },
                  { name: "Profile Image Upload API", id: "TC-3329", runs: 310, fails: 8, rate: 2.5, score: 97.5 },
               ].sort((a,b) => b.rate - a.rate).map((test) => (
                  <tr key={test.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group cursor-pointer">
                     <td className="px-8 py-6">
                        <div className="flex flex-col">
                           <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{test.name}</span>
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ID: {test.id}</span>
                        </div>
                     </td>
                     <td className="px-8 py-6 font-mono text-[11px] font-bold text-slate-600 dark:text-slate-400">{test.runs}</td>
                     <td className="px-8 py-6 text-center">
                        <div className="inline-flex items-center gap-2">
                           <span className={`text-[11px] font-black ${test.score > 90 ? 'text-emerald-600' : 'text-rose-500'}`}>{test.score}%</span>
                           <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full ${test.score > 90 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${test.score}%` }} />
                           </div>
                        </div>
                     </td>
                     <td className="px-8 py-6">
                        <span className={`text-xs font-black p-2 rounded-lg ${test.rate > 10 ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30'}`}>
                           {test.rate}% Flake
                        </span>
                     </td>
                     <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-1 h-6">
                           {[1,1,1,0,0,1,1,0,1,1].map((s, i) => (
                              <div key={i} className={`w-1 rounded-full ${s === 1 ? 'bg-emerald-500/30' : 'bg-rose-500'} h-full`} />
                           ))}
                        </div>
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </section>
    </div>
  );
}
