"use client";

import { useEffect, useState } from "react";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { MetricCard } from "@/components/metric-card";
import { motion } from "framer-motion";

export default function CoveragePage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCoverage() {
      setLoading(true);
      try {
        const res = await fetch("/api/coverage");
        const data = await res.json();
        setData(data || []);
      } catch (e) {
        console.error("Failed to fetch coverage:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchCoverage();
  }, []);

  const overallCoverage = Math.round(data.reduce((acc, d) => acc + d.coverage, 0) / data.length) || 0;
  const totalCases = data.reduce((acc, d) => acc + d.total, 0) || 0;
  const testedCases = data.reduce((acc, d) => acc + d.tested, 0) || 0;

  const pieData = [
    { name: "Tested", value: testedCases, fill: "#10b981" },
    { name: "Untested", value: totalCases - testedCases, fill: "#f1f5f9" }
  ];

  if (process.env.NODE_ENV === 'development') {
    pieData[1].fill = "#1e293b"; // Dark mode adjustment
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter font-headline text-slate-900 dark:text-white mb-2">Platform Coverage</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em]">Automated E2E footprint across Vacancy Wizard modules</p>
        </div>
        <div className="flex gap-2">
           <button className="px-6 py-3 rounded-xl bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-950 font-black text-sm shadow-xl transition-all flex items-center gap-2 active:scale-95">
              <span className="material-symbols-outlined text-[18px]">map</span>
              Platform Map
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard label="Total Coverage" value={`${overallCoverage}%`} icon="analytics" trend={{ value: "+1.2%", isUp: true }} color="emerald" />
        <MetricCard label="Tested Specs" value={testedCases} icon="check_circle" color="emerald" />
        <MetricCard label="Manual Gaps" value={totalCases - testedCases} icon="fluorescent" color="rose" />
        <MetricCard label="Spec Inventory" value={totalCases} icon="inventory_2" color="slate" />
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left: Overall Health Pie */}
        <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800/50 flex flex-col items-center justify-center relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-10">
              <span className="material-symbols-outlined text-6xl">donut_large</span>
           </div>
           <h4 className="text-lg font-black font-headline tracking-tighter mb-8 self-start">Overall Footprint</h4>
           <div className="h-64 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie
                       data={pieData}
                       innerRadius={80}
                       outerRadius={100}
                       paddingAngle={5}
                       dataKey="value"
                       stroke="none"
                    >
                       {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                       ))}
                    </Pie>
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '16px', border: 'none', fontWeight: '900' }} />
                 </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-4xl font-black font-headline tracking-tighter">{overallCoverage}%</span>
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Automated</span>
              </div>
           </div>
           <div className="mt-8 space-y-3 w-full">
              <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-slate-500">
                 <span>Platform Total</span>
                 <span>{totalCases} Elements</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                 <div className="h-full bg-emerald-500" style={{ width: `${overallCoverage}%` }} />
              </div>
           </div>
        </div>

        {/* Right: Domain Breakdown Bar */}
        <div className="col-span-12 lg:col-span-8 glass-panel p-8 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/50 flex flex-col">
           <div className="flex justify-between items-center mb-10">
              <h4 className="text-lg font-black font-headline tracking-tighter">Domain Specific Analytics</h4>
              <div className="flex gap-4 items-center">
                 <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[10px] font-black uppercase text-slate-400">Tested</span></div>
                 <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700"></div><span className="text-[10px] font-black uppercase text-slate-400">Gap</span></div>
              </div>
           </div>
           <div className="flex-1 min-h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis type="number" hide domain={[0, 100]} />
                    <YAxis 
                       dataKey="name" 
                       type="category" 
                       axisLine={false} 
                       tickLine={false}
                       tick={{ fontSize: 11, fontWeight: 900, fill: "#94a3b8" }}
                       width={100}
                    />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '16px', border: 'none', fontWeight: '900' }} />
                    <Bar dataKey="coverage" fill="#10b981" radius={[0, 10, 10, 0]} barSize={24} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* Manual Gap Identification */}
      <section className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800/50">
         <div className="flex justify-between items-center mb-8">
            <div>
               <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Critical Coverage Gaps</h4>
               <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mt-1">Found by Platform Interaction Map Crawler (Manual Interaction Mapping)</p>
            </div>
            <button className="px-4 py-2 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-100 transition-colors">
               Priority Mapping
            </button>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
               { name: "Super Admin Settings Page", risk: "CRITICAL", depth: "2 Layers", icon: "shield" },
               { name: "Multi-tab intake session recovery", risk: "HIGH", depth: "4 Layers", icon: "tab" },
               { name: "Advisor CSV Export Validation", risk: "Medium", depth: "1 Layer", icon: "description" },
            ].map((gap) => (
               <div key={gap.name} className="p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 group cursor-pointer hover:border-rose-500/20 transition-all">
                  <div className="flex justify-between items-start mb-4">
                     <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 text-slate-400 group-hover:text-rose-500 transition-colors shadow-sm">
                        <span className="material-symbols-outlined text-[20px]">{gap.icon}</span>
                     </div>
                     <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                        gap.risk === 'CRITICAL' ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30'
                     }`}>{gap.risk}</span>
                  </div>
                  <h5 className="font-black font-headline text-sm tracking-tight mb-1">{gap.name}</h5>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mapped Depth: {gap.depth}</p>
               </div>
            ))}
         </div>
      </section>
    </div>
  );
}
