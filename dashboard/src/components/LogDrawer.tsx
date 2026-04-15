"use client";

import React from 'react';
import { Loader2, Terminal, X, Lock } from 'lucide-react';
import ObsidianCard from './ObsidianCard';

interface LogDrawerProps {
  logs: string;
  isExecuting: boolean;
  onClose: () => void;
  title: string;
}

export default function LogDrawer({ logs, isExecuting, onClose, title }: LogDrawerProps) {
  if (!logs && !isExecuting) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-6 bg-black/60 backdrop-blur-md animate-fluid pointer-events-none">
      <div className="w-full max-w-5xl pointer-events-auto h-[70vh]">
        <ObsidianCard className="flex flex-col h-full border-indigo-500/20 bg-black/80 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/2">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Terminal size={18} />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm tracking-tight">{title}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isExecuting ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`} />
                  <span className="text-[10px] text-text-muted uppercase font-bold tracking-widest">
                    {isExecuting ? 'Live Stream' : 'Session Terminated'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              {isExecuting && (
                <div className="flex items-center gap-2 text-[11px] text-indigo-400 font-mono font-medium animate-pulse">
                  <Loader2 size={12} className="animate-spin" />
                  SYNCING TELEMETRY...
                </div>
              )}
              
              <button 
                onClick={onClose}
                disabled={isExecuting}
                className={`group flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-[11px] uppercase tracking-widest border border-white/5
                  ${isExecuting 
                    ? 'bg-white/2 text-white/20 cursor-not-allowed' 
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/10'}`}
              >
                {isExecuting ? <Lock size={12} /> : <X size={12} />}
                {isExecuting ? 'System Locked' : 'Close Terminal'}
              </button>
            </div>
          </div>

          {/* Log Output */}
          <div className="flex-1 p-6 font-mono text-[13px] text-indigo-300/80 overflow-y-auto whitespace-pre-wrap selection:bg-indigo-500/30 selection:text-white scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <div className="space-y-1">
              {logs.split('\n').map((line, i) => (
                <div key={i} className="flex gap-4 group">
                  <span className="text-white/10 select-none w-8 text-right shrink-0">{i + 1}</span>
                  <span className="group-hover:text-white/90 transition-colors">{line}</span>
                </div>
              ))}
              {isExecuting && (
                <div className="flex gap-4 animate-pulse">
                  <span className="text-white/10 select-none w-8 text-right shrink-0">_</span>
                  <div className="w-2 h-4 bg-indigo-500/50 mt-0.5 self-start" />
                </div>
              )}
            </div>
          </div>

          {/* Footer Status */}
          <div className="px-6 py-3 border-t border-white/5 bg-black/40 flex justify-between items-center bg-white/1">
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-mono">
                <span className="text-white/20">SIZE:</span>
                {(logs.length / 1024).toFixed(1)} KB
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-mono">
                <span className="text-white/20">ENV:</span>
                PRODUCTION-STABILIZED
              </div>
            </div>
            <div className="text-[10px] text-white/20 font-mono tracking-wider italic">
              VACATURE WIZARD 2.0 // HIGH-GLOW OBSIDIAN TERMINAL
            </div>
          </div>
        </ObsidianCard>
      </div>
    </div>
  );
}
