"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MetricCard } from "@/components/metric-card";

interface LogLine {
  message: string;
  level: "info" | "pass" | "fail" | "warn";
  timestamp: string;
}

function LiveRunContent() {
  const searchParams = useSearchParams();
  const [runId, setRunId] = useState<string | null>(searchParams.get("runId"));
  const [activeRuns, setActiveRuns] = useState<any[]>([]);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [status, setStatus] = useState<any>({
    progress: 0,
    passed: 0,
    failed: 0,
    total: 0,
    eta: "--",
    status: "idle"
  });
  const logEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch active runs if no runId is specified
  useEffect(() => {
    if (!runId) {
      const fetchActive = async () => {
        try {
          const res = await fetch("/api/runs?status=running&limit=5");
          const data = await res.json();
          setActiveRuns(data.runs || []);
          if (data.runs?.length > 0) {
            setRunId(data.runs[0].id);
          }
        } catch (e) {
          console.error("Failed to fetch active runs:", e);
        }
      };
      fetchActive();
    }
  }, [runId]);

  // 2. Connect to SSE stream
  useEffect(() => {
    if (!runId) return;

    setLogs([]);
    const eventSource = new EventSource(`/api/runs/${runId}/stream`);

    eventSource.addEventListener("log:line", (e: any) => {
      const data = JSON.parse(e.data);
      setLogs((prev) => [...prev, data].slice(-200));
    });

    eventSource.addEventListener("run:progress", (e: any) => {
      const data = JSON.parse(e.data);
      setStatus((prev: any) => ({ ...prev, ...data, progress: Math.round((data.completed / data.total) * 100) || 0 }));
    });

    eventSource.addEventListener("run:complete", (e: any) => {
      const data = JSON.parse(e.data);
      setStatus((prev: any) => ({ ...prev, status: "complete" }));
    });

    eventSource.onerror = () => {
      console.warn("SSE connection error, closing...");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [runId]);

  // 3. Scroll to bottom of logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (!runId && activeRuns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center animate-pulse">
          <span className="material-symbols-outlined text-4xl text-slate-400">sensors_off</span>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black font-headline tracking-tighter text-slate-900 dark:text-white">No Active Runs</h2>
          <p className="text-slate-500 font-bold text-sm mt-2">Trigger a new test run to see live monitoring.</p>
        </div>
        <button className="btn-primary">Trigger Run</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label="Overall Progress" value={`${status.progress}%`} icon="track_changes" color="emerald" />
        <MetricCard label="Passed" value={status.passed} icon="check_circle" color="emerald" />
        <MetricCard label="Failed" value={status.failed} icon="cancel" color="rose" />
        <MetricCard label="Est. Wait Time" value={status.eta} icon="timer" color="slate" />
      </section>

      <div className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-1">Live Execution</h4>
            <p className="text-xl font-black font-headline tracking-tighter text-slate-900 dark:text-white">
              {status.status === "complete" ? "Execution Finished" : `Running Build #${runId?.slice(-6)}`}
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black font-headline text-slate-900 dark:text-white">{status.progress}%</span>
          </div>
        </div>
        <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${status.progress}%` }}
            className="h-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Log Stream</h4>
            <div className="flex items-center gap-2">
              <span className="pulse-dot" />
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Live</span>
            </div>
          </div>
          <div className="bg-slate-950 rounded-3xl p-6 h-[500px] overflow-y-auto border border-slate-800 font-mono text-[13px] leading-relaxed relative noscrollbar">
            <div className="space-y-1.5">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-4 group">
                  <span className="text-slate-700 shrink-0 select-none">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className={clsx(
                    "break-all",
                    log.level === "pass" && "text-emerald-400 font-bold",
                    log.level === "fail" && "text-rose-400 font-bold",
                    log.level === "warn" && "text-amber-400",
                    log.level === "info" && "text-slate-300"
                  )}>
                    {log.message}
                  </span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
            {logs.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-700 font-bold uppercase tracking-widest">
                Waiting for events...
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="px-2">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Currently Running</h4>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((_, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-panel p-4 rounded-2xl flex items-center justify-between group cursor-wait border-slate-200/50 dark:border-slate-800/50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center animate-pulse">
                    <span className="material-symbols-outlined text-slate-400 text-sm">settings</span>
                  </div>
                  <div>
                    <p className="text-sm font-black tracking-tight line-clamp-1 text-slate-900 dark:text-white">Spec: Feature Check #{8842 + i}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Elapsed: 00:04:{12 + i}</p>
                  </div>
                </div>
                <div className="w-1 h-8 rounded-full bg-emerald-500/20 group-hover:bg-emerald-500 transition-colors" />
              </motion.div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-black p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden group border border-white/5">
             <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-emerald-500 opacity-10 blur-3xl rounded-full" />
             <h4 className="text-lg font-black font-headline tracking-tighter mb-2">Build Controls</h4>
             <p className="text-xs text-slate-400 font-bold mb-6">Safe abort will gracefully terminate all running threads.</p>
             <button className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-xl transition-all active:scale-95 shadow-xl shadow-rose-900/20">
               Stop Active Run
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LiveRunPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh] text-slate-500 font-bold uppercase tracking-widest animate-pulse">Initializing Live Stream...</div>}>
      <LiveRunContent />
    </Suspense>
  );
}

function clsx(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
