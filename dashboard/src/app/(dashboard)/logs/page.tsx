"use client";

import { motion } from "framer-motion";

export default function LogsPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-black font-headline text-slate-900 dark:text-white tracking-tighter leading-none">Logs Explorer</h2>
        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em]">Real-time execution telemetry</p>
      </div>

      <div className="glass-panel rounded-3xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50 min-h-[600px] flex flex-col">
        <div className="bg-slate-900 px-6 py-3 flex items-center justify-between">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
          </div>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">streaming_logs_v1.0</span>
        </div>
        <div className="flex-1 bg-slate-950 p-6 font-mono text-xs text-slate-300 space-y-2 overflow-y-auto">
          <p className="text-emerald-400">[SYSTEM] Initializing Vacature Tovenaar QA Engine...</p>
          <p className="text-slate-500">2026-04-05 11:32:01 - INFO - Loading Playwright browser context</p>
          <p className="text-slate-500">2026-04-05 11:32:03 - INFO - Authenticating with UAT environment</p>
          <p className="text-blue-400">[NETWORK] GET /api/v1/vacancies - 200 OK (142ms)</p>
          <p className="text-slate-500">2026-04-05 11:32:05 - DEBUG - Selector found: input[name="job_title"]</p>
          <p className="text-slate-500">2026-04-05 11:32:06 - DEBUG - Typing: "Senior Full Stack Developer"</p>
          <p className="text-emerald-400">[AI] Analyzing job description for recruitment drift...</p>
          <p className="animate-pulse cursor-default text-emerald-400/50">_</p>
        </div>
      </div>
    </div>
  );
}
