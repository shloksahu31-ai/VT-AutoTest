"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export default function RunsPage() {
  const [activeTab, setActiveTab] = useState<"history" | "schedules">("history");
  const [runs, setRuns] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [runsRes, schedulesRes] = await Promise.all([
          fetch("/api/runs?limit=20"),
          fetch("/api/schedules")
        ]);

        if (!runsRes.ok || !schedulesRes.ok) {
          throw new Error("Failed to fetch data from API");
        }

        const [runsData, schedulesData] = await Promise.all([
          runsRes.json().catch(() => ({ runs: [] })),
          schedulesRes.json().catch(() => [])
        ]);

        setRuns(runsData.runs || []);
        setSchedules(schedulesData || []);
      } catch (e) {
        console.error("Data fetch error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [activeTab]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Hero Section / Quick Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
        <div>
          <h2 className="text-4xl font-black font-headline text-slate-900 dark:text-white tracking-tighter leading-none mb-2">Run Control</h2>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em]">Manage & Schedule Execution Cycles</p>
        </div>
        <div className="flex gap-3">
          {["Quick Smoke", "Daily Full Regression", "New Feature Check"].map((action, i) => (
            <button 
              key={action}
              className="flex flex-col items-start p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-md transition-all group border border-slate-200 dark:border-slate-800 active:scale-95"
            >
              <span className="text-[10px] uppercase tracking-tighter text-slate-400 font-black mb-1">Shortcut</span>
              <span className={`font-black text-sm ${i === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"}`}>{action}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Controls */}
      <div className="flex items-center gap-8 border-b border-slate-200/50 dark:border-slate-800/50">
        <button 
          onClick={() => setActiveTab("history")}
          className={`pb-4 font-headline text-lg font-black transition-all relative ${activeTab === "history" ? "text-slate-900 dark:text-white" : "text-slate-400 opacity-50"}`}
        >
          Execution History
          {activeTab === "history" && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-full" />}
        </button>
        <button 
          onClick={() => setActiveTab("schedules")}
          className={`pb-4 font-headline text-lg font-black transition-all relative ${activeTab === "schedules" ? "text-slate-900 dark:text-white" : "text-slate-400 opacity-50"}`}
        >
          Scheduled Runs
          {activeTab === "schedules" && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-full" />}
        </button>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        {activeTab === "history" ? (
          <div className="space-y-6">
             {/* Filter Bar */}
             <div className="p-1 px-4 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl flex flex-wrap items-center gap-4 border border-slate-200/50 dark:border-slate-800/50 h-14">
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-black uppercase text-slate-400">Suite:</span>
                   <select className="bg-transparent text-sm font-bold border-none focus:ring-0 outline-none pr-4">
                      <option>All Suites</option>
                      <option>User Auth</option>
                   </select>
                </div>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-black uppercase text-slate-400">Status:</span>
                   <select className="bg-transparent text-sm font-bold border-none focus:ring-0 outline-none pr-4">
                      <option>All Status</option>
                      <option>Passed</option>
                      <option>Failed</option>
                   </select>
                </div>
                <div className="ml-auto flex items-center gap-2">
                   <button className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                      <span className="material-symbols-outlined">filter_list</span>
                   </button>
                   <button className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-emerald-900/20 active:scale-95">Apply</button>
                </div>
             </div>

             {/* Runs Table */}
             <div className="bg-white dark:bg-slate-900/50 rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead>
                    <tr className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] bg-slate-50/50 dark:bg-slate-800/30">
                      <th className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/50">Run ID / Name</th>
                      <th className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/50 text-center">Status</th>
                      <th className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/50">Env</th>
                      <th className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/50">Suite</th>
                      <th className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/50">Duration</th>
                      <th className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/50">Triggered By</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {runs.map((run) => (
                      <tr key={run.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                        <td className="px-6 py-5 border-b border-slate-200/30 dark:border-slate-800/20">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 dark:text-white tracking-tight">#{run.id.slice(-6)}</span>
                            <span className="text-[11px] text-slate-500 font-medium line-clamp-1">{run.name || "Test Execution"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 border-b border-slate-200/30 dark:border-slate-800/20 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            run.status === 'passed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            run.status === 'failed' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                            'bg-slate-100 text-slate-700 animate-pulse'
                          }`}>
                            {run.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 border-b border-slate-200/30 dark:border-slate-800/20 font-bold text-slate-700 dark:text-slate-300">
                          {run.environment}
                        </td>
                        <td className="px-6 py-5 border-b border-slate-200/30 dark:border-slate-800/20 text-slate-500 font-medium italic">
                          {run.suite?.name || "Manual"}
                        </td>
                        <td className="px-6 py-5 border-b border-slate-200/30 dark:border-slate-800/20 font-mono text-[11px] font-bold">
                          {run.duration}s
                        </td>
                        <td className="px-6 py-5 border-b border-slate-200/30 dark:border-slate-800/20">
                           <div className="flex items-center gap-2">
                             <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${run.triggeredBy}`} className="w-5 h-5 rounded-full" />
                             <span className="text-[11px] font-black uppercase tracking-tight text-slate-500">{run.triggeredBy}</span>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="glass-panel p-6 rounded-3xl flex items-center justify-between border border-slate-200/50 dark:border-slate-800/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <span className="material-symbols-outlined text-2xl">update</span>
                  </div>
                  <div>
                    <h4 className="font-black font-headline tracking-tight">{schedule.name}</h4>
                    <p className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">{schedule.cronExpression}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${schedule.isActive ? "text-emerald-600" : "text-slate-400"}`}>
                    {schedule.isActive ? "Active" : "Paused"}
                  </span>
                  <button className={`w-10 h-6 rounded-full transition-all flex items-center px-1 ${schedule.isActive ? "bg-emerald-600 justify-end" : "bg-slate-200 dark:bg-slate-800 justify-start"}`}>
                    <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                  </button>
                </div>
              </div>
            ))}
            <button className="p-6 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2 hover:border-emerald-500/50 transition-colors group">
              <span className="material-symbols-outlined text-slate-400 group-hover:text-emerald-500">add_circle</span>
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Create New Schedule</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
