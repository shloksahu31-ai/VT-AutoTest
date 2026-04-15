"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export function LiveLogViewer({ runId, onClose }: { runId: string, onClose: () => void }) {
  const [logs, setLogs] = useState<string>("");
  const [status, setStatus] = useState<"connecting" | "running" | "ended">("connecting");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sse = new EventSource(`/api/logs?runId=${runId}`);
    
    sse.onopen = () => setStatus("running");
    
    sse.onmessage = (event) => {
      const text = JSON.parse(event.data);
      if (text === "[END_STREAM]") {
        setStatus("ended");
        sse.close();
      } else {
        setLogs(prev => prev + text);
      }
    };
    sse.onerror = (e) => {
       setLogs(prev => prev + "\n\n[ERROR] Connection to Execution Stream terminated unexpectedly.\nIf you are on a local dev server and this is the first execution, you must restart your dev server for the API routes to map.");
       setStatus("ended");
       sse.close();
    };

    return () => sse.close();
  }, [runId]);

  useEffect(() => {
    // Auto-scroll to bottom of logs
    if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
           <div className="flex items-center gap-4">
              <span className={`material-symbols-outlined text-[24px] ${status === 'running' ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`}>
                 terminal
              </span>
              <div>
                <h3 className="text-white font-black font-headline tracking-tight">System Core: Execution Output</h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">
                   Session ID: {runId} — {status}
                </p>
              </div>
           </div>
           {status === 'ended' ? (
             <button onClick={onClose} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20 active:scale-95">
               Exit Console
             </button>
           ) : (
             <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-xl">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[10px] uppercase font-black tracking-widest text-emerald-500">Live</span>
             </div>
           )}
        </div>
        
        {/* Log Window */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 font-mono text-[12px] md:text-[13px] leading-relaxed text-slate-300">
          <pre className="whitespace-pre-wrap font-mono">
              {logs.replace(/\x1b\[[0-9;]*m/g, '')}
          </pre>
          <div ref={bottomRef} className="h-4" />
        </div>
      </motion.div>
    </div>
  );
}
