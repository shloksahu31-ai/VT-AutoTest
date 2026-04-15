"use client";

import { motion } from "framer-motion";

export default function ReportsPage() {
  const reports = [
    { id: "REP-001", name: "Daily Regression Summary", date: "2026-04-04", status: "passed", accuracy: "98%" },
    { id: "REP-002", name: "User Auth Lifecycle Audit", date: "2026-04-03", status: "passed", accuracy: "100%" },
    { id: "REP-003", name: "Recruitment Advisor Drift", date: "2026-04-02", status: "failed", accuracy: "82%" },
    { id: "REP-004", name: "Smoke Test - Production", date: "2026-04-01", status: "passed", accuracy: "100%" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-black font-headline text-slate-900 dark:text-white tracking-tighter leading-none">Execution Reports</h2>
        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em]">Automated analysis & release gates</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <div key={report.id} className="glass-panel p-8 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 hover:shadow-xl transition-all group active:scale-[0.98] cursor-pointer">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{report.id}</span>
                <h4 className="text-xl font-black font-headline text-slate-900 dark:text-white mt-1">{report.name}</h4>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                report.status === 'passed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30'
              }`}>
                {report.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-6">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">calendar_month</span>
                {report.date}
              </span>
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">verified</span>
                Accuracy: {report.accuracy}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
