"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TestCase {
  id: string;
  name: string;
  file: string;
  status: "Passed" | "Failed" | "Skipped";
  priority: "Critical" | "High" | "Medium" | "Low";
  coverage: number;
}

export default function SuiteBuilderPage() {
  const [testCases, setTestCases] = useState<TestCase[]>([
    { id: "TC-4092", name: "User Authentication Flow", file: "auth.spec.ts", status: "Passed", priority: "Critical", coverage: 98 },
    { id: "TC-1283", name: "Global Search Performance", file: "search.spec.ts", status: "Passed", priority: "Medium", coverage: 82 },
    { id: "TC-8821", name: "Payment Gateway Re-try Logic", file: "payment.spec.ts", status: "Failed", priority: "Critical", coverage: 100 },
    { id: "TC-5502", name: "Dark Mode Color Compliance", file: "visual.spec.ts", status: "Skipped", priority: "Low", coverage: 45 },
    { id: "TC-3329", name: "Profile Image Upload API", file: "profile.spec.ts", status: "Passed", priority: "Medium", coverage: 91 },
    { id: "TC-9912", name: "Intake Form Validation", file: "intake.spec.ts", status: "Passed", priority: "High", coverage: 88 },
  ]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [suiteName, setSuiteName] = useState("Nightly Production Smoke");

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectedTests = testCases.filter(tc => selectedIds.has(tc.id));
  const estTime = selectedIds.size * 4; // 4 mins per test avg

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter font-headline text-slate-900 dark:text-white mb-2">Build New Suite</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em]">Workspace / Environment: Production-Stage</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setSelectedIds(new Set())}
            className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
          >
            Clear Selection
          </button>
          <button className="px-6 py-3 rounded-xl bg-slate-950 dark:bg-slate-50 text-white dark:text-slate-950 font-black text-sm shadow-xl transition-all flex items-center gap-2 active:scale-95">
            <span className="material-symbols-outlined text-[18px]">save</span>
            Save Custom Suite
          </button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8 relative items-start">
        {/* Left: Test Case Explorer */}
        <section className="col-span-8 space-y-6">
          <div className="glass-panel p-4 rounded-2xl flex items-center gap-4 border-slate-200/50 dark:border-slate-800/50">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">filter_list</span>
              <input 
                type="text" 
                className="w-full bg-slate-100/50 dark:bg-slate-800/50 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Filter by name, tag or ID..."
              />
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 cursor-pointer">
                Status: Passed <span className="material-symbols-outlined text-[14px]">expand_more</span>
              </span>
              <span className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 cursor-pointer">
                Priority: All <span className="material-symbols-outlined text-[14px]">expand_more</span>
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/50 rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
            <table className="w-full text-left border-spacing-0">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                  <th className="p-4 w-12 border-b border-slate-200/50 dark:border-slate-800/50"><input type="checkbox" className="rounded-lg text-emerald-600 focus:ring-emerald-500" /></th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-200/50 dark:border-slate-800/50 font-headline">Test Case</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-200/50 dark:border-slate-800/50 font-headline">Last Run</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-200/50 dark:border-slate-800/50 font-headline">Priority</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-200/50 dark:border-slate-800/50 text-right font-headline">Coverage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {testCases.map((tc) => (
                  <tr key={tc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer" onClick={() => toggleSelect(tc.id)}>
                    <td className="p-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(tc.id)} 
                        onChange={() => {}} 
                        className="rounded-lg text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700 bg-transparent" 
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white leading-none mb-1">{tc.name}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ID: {tc.id} • {tc.file}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        tc.status === "Passed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                        tc.status === "Failed" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" :
                        "bg-slate-100 text-slate-500"
                      }`}>
                        {tc.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`flex items-center gap-1 text-[11px] font-black uppercase tracking-tight ${
                        tc.priority === "Critical" ? "text-rose-500" : tc.priority === "High" ? "text-amber-500" : "text-slate-400"
                      }`}>
                        <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {tc.priority === "Critical" ? "priority_high" : "low_priority"}
                        </span>
                        {tc.priority}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono text-xs font-black text-slate-500">{tc.coverage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right: Current Suite / Cart */}
        <section className="col-span-4 sticky top-24 h-fit">
          <div className="glass-panel border-4 border-slate-200/10 dark:border-slate-800/10 rounded-[2rem] overflow-hidden shadow-2xl">
            <div className="p-8 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 relative">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 opacity-20 blur-3xl -mr-16 -mt-16" />
               <div className="flex justify-between items-center mb-6 relative z-10">
                  <h3 className="text-xl font-black font-headline tracking-tighter">Suite Summary</h3>
                  <span className="px-2.5 py-1 rounded-lg bg-white/10 dark:bg-black/10 text-[10px] font-mono font-bold tracking-widest">SW-992</span>
               </div>
               <div className="grid grid-cols-2 gap-4 relative z-10">
                  <div className="bg-white/5 dark:bg-black/5 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Selected</p>
                    <p className="text-3xl font-black font-headline tracking-tighter">{selectedIds.size.toString().padStart(2, '0')}</p>
                  </div>
                  <div className="bg-white/5 dark:bg-black/5 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Est. Time</p>
                    <p className="text-3xl font-black font-headline tracking-tighter">{estTime}m</p>
                  </div>
               </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Suite Content</span>
                <button className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Sort</button>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto noscrollbar">
                <AnimatePresence>
                  {selectedTests.map((tc) => (
                    <motion.div 
                      key={tc.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl group transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                        <span className="material-symbols-outlined text-[20px]">
                          {tc.name.includes("Auth") ? "security" : tc.name.includes("Search") ? "search" : "science"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black tracking-tight truncate">{tc.name}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{tc.priority} • Regression</p>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleSelect(tc.id); }}
                        className="opacity-0 group-hover:opacity-100 p-2 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-xl transition-all active:scale-90"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {selectedIds.size === 0 && (
                  <div className="py-12 text-center text-slate-400 font-bold italic text-xs">
                    No tests selected. Click items on the left to add them to your suite.
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 border-dashed space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Suite Name</label>
                  <input 
                    type="text" 
                    value={suiteName}
                    onChange={(e) => setSuiteName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 text-sm font-black focus:ring-2 focus:ring-emerald-500/20 outline-none placeholder:text-slate-400"
                  />
                </div>
                <button className="w-full py-5 rounded-2xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-white font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-3 shadow-2xl shadow-emerald-900/20 hover:scale-[1.02] active:scale-95 transition-all">
                   Deploy Custom Suite
                   <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
                </button>
                <p className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-60">This will trigger a webhook to the CI/CD pipeline</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
