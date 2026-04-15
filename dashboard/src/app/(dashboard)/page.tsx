"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });
const AreaChart = dynamic(() => import("recharts").then(m => m.AreaChart), { ssr: false });
const Area = dynamic(() => import("recharts").then(m => m.Area), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
import { MetricCard } from "@/components/metric-card";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

const data = [
  { name: "Day 1", rate: 85 },
  { name: "Day 3", rate: 88 },
  { name: "Day 5", rate: 82 },
  { name: "Day 7", rate: 94 },
  { name: "Day 9", rate: 91 },
  { name: "Day 11", rate: 96 },
  { name: "Today", rate: 94 },
];

export default function OverviewPage() {
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [activeFailures, setActiveFailures] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    passRate: "94%",
    runsToday: 12,
    aiAvg: 8.8,
    regressions: 3,
    fixTime: "4.2h"
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [runsRes, failuresRes, schedulesRes] = await Promise.all([
          fetch("/api/runs?limit=6"),
          fetch("/api/failures?limit=3"),
          fetch("/api/schedules?limit=3"),
        ]);
        
        const [runsData, failuresData, schedulesData] = await Promise.all([
          runsRes.json(),
          failuresRes.json(),
          schedulesRes.json(),
        ]);

        setRecentRuns(runsData.runs || []);
        setActiveFailures(failuresData || []);
        setSchedules(schedulesData || []);
      } catch (e) {
        console.error("Failed to fetch dashboard data:", e);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Metrics Section */}
      <section className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <MetricCard label="Pass Rate (7d)" value={stats.passRate} icon="trending_up" trend={{ value: "+2%", isUp: true }} color="emerald" />
        <MetricCard label="Runs Today" value={stats.runsToday} icon="play_circle" color="slate" />
        <MetricCard label="AI Quality Avg" value={stats.aiAvg} icon="psychology" color="emerald" />
        <MetricCard label="Open Regressions" value={stats.regressions} icon="bug_report" color="rose" />
        <MetricCard label="Mean Fix Time" value={stats.fixTime} icon="timer" color="slate" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Trend & Recent Runs */}
        <div className="lg:col-span-2 space-y-8">
          {/* Chart Section */}
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-panel p-8 rounded-3xl shadow-sm"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="text-lg font-black font-headline tracking-tighter">14-day Pass Rate Trend</h4>
                <p className="text-xs text-slate-500 font-medium">Stability across all automated suites</p>
              </div>
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Staging</span>
                </div>
              </div>
            </div>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} 
                    dy={10}
                  />
                  <YAxis 
                    hide 
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: "16px", 
                      border: "none", 
                      boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)",
                      fontSize: "12px",
                      fontWeight: "700"
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="rate" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorRate)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Recent Runs */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-8 rounded-3xl shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-black font-headline tracking-tighter">Recent Runs</h4>
              <button className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hover:opacity-70 transition-opacity">View All History</button>
            </div>
            <div className="space-y-3">
              {recentRuns.length > 0 ? recentRuns.map((run) => (
                <div key={run.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-800/50 hover:border-emerald-500/30 transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className={`w-2.5 h-2.5 rounded-full ${run.status === "passed" ? "bg-emerald-500" : run.status === "failed" ? "bg-rose-500" : "bg-slate-400 shadow-pulse"}`}></div>
                    <div>
                      <p className="text-sm font-black tracking-tight">{run.suite?.name || "Manual Run"}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        {formatDistanceToNow(new Date(run.startedAt))} ago • {run.duration}s
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none">
                      {run.context}
                    </span>
                    <span className="material-symbols-outlined text-slate-400 group-hover:translate-x-1 transition-transform">chevron_right</span>
                  </div>
                </div>
              )) : (
                <p className="text-center py-8 text-slate-400 font-bold">No recent runs found.</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Column: Schedules & Health */}
        <div className="space-y-8">
          {/* Upcoming Schedules */}
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-950 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 opacity-10 blur-3xl group-hover:opacity-20 transition-opacity" />
            <h4 className="text-lg font-black font-headline tracking-tighter mb-6 relative z-10">Upcoming Schedules</h4>
            <div className="space-y-4 relative z-10">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="flex items-center justify-between border-l-2 border-emerald-400/50 pl-4 py-1">
                  <div>
                    <p className="text-sm font-black tracking-tight">{schedule.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Next: {schedule.cronExpression}</p>
                  </div>
                  <span className="text-[10px] font-black font-mono bg-white/10 px-2.5 py-1 rounded-lg">LIVE</span>
                </div>
              ))}
              {schedules.length === 0 && <p className="text-xs text-slate-500 font-bold">No active schedules.</p>}
            </div>
          </motion.div>

          {/* Suite Health Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-8 rounded-3xl shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Suite Health Grid</h4>
              <span className="material-symbols-outlined text-slate-400 text-sm">grid_view</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {["Auth", "Intake", "Vacancy", "AI Core", "Pay", "Admin", "Mob", "Search"].map((suite, i) => (
                <div key={suite} className="flex flex-col items-center gap-1 group">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${i === 2 ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : i === 5 ? 'bg-slate-200 dark:bg-slate-800' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'}`}>
                    <span className="material-symbols-outlined text-[16px] text-white">
                      {i === 2 ? 'close' : i === 5 ? 'pause' : 'check'}
                    </span>
                  </div>
                  <span className="text-[8px] font-black text-center uppercase tracking-tighter opacity-60 group-hover:opacity-100 transition-opacity">
                    {suite}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Active Failures */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-8 rounded-3xl shadow-sm border-rose-500/10"
          >
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-rose-500 text-[20px]">report_problem</span>
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Active Failures</h4>
            </div>
            <div className="space-y-4">
              {activeFailures.length > 0 ? activeFailures.map((failure) => (
                <div key={failure.id} className="p-4 rounded-2xl border-l-4 border-rose-500 bg-rose-50/50 dark:bg-rose-900/10 group cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-xs font-black truncate pr-2 tracking-tight">{failure.name}</p>
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-[8px] font-black text-white uppercase tracking-widest">{failure.category || "FAIL"}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1">{failure.errorMessage || "No error message"}</p>
                </div>
              )) : (
                <p className="text-xs text-slate-400 font-bold text-center py-4">No active failures detected.</p>
              )}
            </div>
            <button className="w-full mt-6 py-3 text-[11px] font-black uppercase tracking-[0.15em] text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-xl transition-all active:scale-95">
              Review All Failures
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
