"use client";

import { useEffect, useState } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import { MetricCard } from "@/components/metric-card";
import { motion } from "framer-motion";

const trendData = [
  { name: "14 Oct", score: 8.2 },
  { name: "16 Oct", score: 8.5 },
  { name: "18 Oct", score: 8.4 },
  { name: "20 Oct", score: 8.9 },
  { name: "22 Oct", score: 8.7 },
  { name: "24 Oct", score: 9.1 },
  { name: "26 Oct", score: 8.8 },
  { name: "28 Oct", score: 9.2 },
  { name: "Today", score: 8.9 },
];

const dimensionData = [
  { name: "Language Naturalness", score: 94 },
  { name: "Role Consistency", score: 88 },
  { name: "Tone & Branding", score: 91 },
  { name: "Section Completeness", score: 99 },
  { name: "Hallucination Score", score: 100 },
  { name: "Market Alignment", score: 82 },
];

export default function AiQualityPage() {
  const [driftInfo, setDriftInfo] = useState({
    driftDetected: true,
    affectedDimensions: ["Market Alignment"],
    severity: "Nominal",
    recommendation: "High-fidelity alignment detected. Drift remains stable at +0.2%."
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* AI Insight Banner */}
      <motion.section 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 to-emerald-950 relative overflow-hidden flex items-center justify-between border border-white/5"
      >
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
            <span className="material-symbols-outlined text-4xl animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
          <div>
            <h2 className="text-white font-black font-headline text-2xl tracking-tighter">AI Insight: Drift Detection</h2>
            <p className="text-emerald-400/80 text-sm font-bold mt-1 uppercase tracking-widest">{driftInfo.recommendation}</p>
          </div>
        </div>
        <div className="relative z-10">
          <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-2xl shadow-emerald-900/40">
            Download Report
          </button>
        </div>
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/carbon-fibre.png')" }} />
      </motion.section>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard label="Avg Score (7d)" value="8.9" icon="trending_up" trend={{ value: "+0.4", isUp: true }} color="emerald" />
        <MetricCard label="Hallucinations" value="0" icon="verified" color="emerald" />
        <MetricCard label="Injections Blocked" value="14" icon="shield" color="slate" />
        <MetricCard label="Dataset Drift" value="+0.2" icon="warning" color="rose" />
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Quality Trend */}
        <div className="col-span-8 bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800/50">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="font-black font-headline text-xl tracking-tighter text-slate-900 dark:text-white">14-day Quality Score Trend</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Stability across all LLM nodes</p>
            </div>
            <div className="flex gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">GPT-4o Integration</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                 <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} domain={[7, 10]} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: "20px", 
                    border: "none", 
                    boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)",
                    fontSize: "12px",
                    fontWeight: "900"
                  }} 
                />
                <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={4} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dimension Breakdown */}
        <div className="col-span-4 glass-panel p-8 rounded-[2.5rem] flex flex-col border border-slate-200/50 dark:border-slate-800/50">
          <h3 className="font-black font-headline text-xl tracking-tighter mb-8 text-slate-900 dark:text-white">Dimension Performance</h3>
          <div className="space-y-6 flex-1">
            {dimensionData.map((dim) => (
              <div key={dim.name} className="space-y-2">
                <div className="flex justify-between text-[11px] font-black uppercase text-slate-500 tracking-widest">
                  <span className="line-clamp-1">{dim.name}</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{dim.score}%</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${dim.score}%` }}
                    className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Injection Test Matrix */}
        <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800/50">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black font-headline text-xl tracking-tighter text-slate-900 dark:text-white">Injection Test Matrix</h3>
            <button className="text-[10px] font-black uppercase text-emerald-600 tracking-widest flex items-center gap-1">
              View All <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </button>
          </div>
          <div className="overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="pb-4">Vector Type</th>
                  <th className="pb-4">Risk Level</th>
                  <th className="pb-4">Status</th>
                  <th className="pb-4">Blocked</th>
                </tr>
              </thead>
              <tbody className="text-xs font-bold divide-y divide-slate-50 dark:divide-slate-800/50">
                {[
                  { name: "Prompt Leakage", risk: "CRITICAL", status: "Defended", count: 6 },
                  { name: "System Hijack", risk: "HIGH", status: "Defended", count: 4 },
                  { name: "PII Exfiltration", risk: "Medium", status: "Defended", count: 3 },
                  { name: "Output Manipulation", risk: "Low", status: "Defended", count: 1 },
                ].map((row) => (
                  <tr key={row.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 text-slate-900 dark:text-white">{row.name}</td>
                    <td className="py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        row.risk === "CRITICAL" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" :
                        row.risk === "HIGH" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                        "bg-slate-100 text-slate-500"
                      }`}>{row.risk}</span>
                    </td>
                    <td className="py-4 text-emerald-600 font-black">Defended</td>
                    <td className="py-4 text-slate-400">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Golden Dataset Preview */}
        <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800/50">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black font-headline text-xl tracking-tighter text-slate-900 dark:text-white">Golden Dataset Preview</h3>
            <button className="text-[10px] font-black uppercase text-emerald-600 tracking-widest flex items-center gap-1">
              Edit Golden Set <span className="material-symbols-outlined text-[14px]">settings</span>
            </button>
          </div>
          <div className="space-y-4">
            {[1, 2].map((i) => (
               <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border-l-4 border-emerald-500 group cursor-pointer hover:bg-slate-100 transition-all">
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Case ID: GD-82{i}</span>
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{96+i}% Match</span>
                  </div>
                  <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {i === 1 ? "Vacancy generation for 'Senior Frontend Engineer' must include React, TypeScript and 5+ years experience as mandatory fields." : "Intake form scenario for 'Accountant' should trigger the financial compliance assessment module."}
                  </p>
               </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
