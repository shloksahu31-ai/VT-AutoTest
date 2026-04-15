"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const routeTitles: Record<string, string> = {
  "/": "Overview",
  "/live": "Live Run",
  "/runs": "Run Control",
  "/suites": "Suite Builder",
  "/ai-quality": "AI Quality",
  "/failures": "Failures",
  "/flakiness": "Flakiness",
  "/gate": "Release Gate",
  "/coverage": "Coverage",
};

import ThemeToggle from "@/components/ThemeToggle";
import { TriggerRunModal } from "@/components/TriggerRunModal";

export function Topbar() {
  const pathname = usePathname();
  const title = routeTitles[pathname] || "Dashboard";
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);

  return (
    <header className="fixed top-0 right-0 left-[192px] h-16 flex items-center justify-between px-8 z-30 glass-panel shadow-sm shadow-slate-200/50 dark:shadow-none border-b border-slate-200/50 dark:border-slate-800/50">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-black font-headline text-slate-900 dark:text-slate-50 tracking-tighter">
            {title}
          </h2>
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
            Staging
          </span>
        </div>
        
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden lg:block" />

        <div className="hidden lg:flex items-center gap-6 text-[11px] uppercase tracking-[0.15em] font-bold text-slate-500 dark:text-slate-400">
          <Link href="/" className={cn(
            "transition-colors hover:text-emerald-600 dark:hover:text-emerald-400",
            pathname === "/" && "text-emerald-600 dark:text-emerald-400"
          )}>Dashboard</Link>
          <Link href="/logs" className="transition-colors hover:text-emerald-600 dark:hover:text-emerald-400">Logs</Link>
          <Link href="/reports" className="transition-colors hover:text-emerald-600 dark:hover:text-emerald-400">Reports</Link>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative group hidden xl:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
          <input 
            type="text" 
            className="pl-10 pr-4 py-2 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/30 outline-none transition-all w-64 text-slate-900 dark:text-slate-50"
            placeholder="Search test runs, suites..."
          />
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          
          <button 
            onClick={() => setIsAiPanelOpen(true)}
            className="bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-950 px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 hover:opacity-90 shadow-lg shadow-black/10 dark:shadow-white/5 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px] animate-pulse">auto_awesome</span>
            AI Summary
          </button>
          
          <button 
            onClick={() => setIsRunModalOpen(true)}
            className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 hover:opacity-90 shadow-lg shadow-emerald-900/20"
          >
            Trigger Run
          </button>
        </div>

        <TriggerRunModal isOpen={isRunModalOpen} onClose={() => setIsRunModalOpen(false)} />

        <div className="h-2 w-px dark:bg-slate-800" />

        <div className="flex items-center gap-4">
          <button className="text-slate-500 hover:text-emerald-600 transition-colors relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
          </button>
          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBInAHomMlqT7GQfRcCmuLllNQ59I6ubVpbmj9dLZf1xHLtnUhnk2Hu3f6vIj9b1eXgoj5A-cupykkSaspnHPG2JCn1gpptGpVDuKsLGKKoDGZUl44DC8U1oz2fNtmcFBHzDuULq_t72SCS9NrHSiK6sUE8qjFT16ERRZ-5lNzt0-hZ18unQew0M5x3KCFXRUsUgBlTZbCCNTYRRcK4-F7xtcodYMMn4qVehWpzL85FYnvSnKRUyElUY8moOxfKuHLaDvcK7rsr2F3s"
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
