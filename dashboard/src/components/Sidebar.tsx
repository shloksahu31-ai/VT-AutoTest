"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { group: "Live Ops", items: [
    { name: "Live Run", icon: "monitoring", href: "/live", isLive: true },
    { name: "Overview", icon: "grid_view", href: "/" },
  ]},
  { group: "Test Management", items: [
    { name: "Run Control", icon: "play_arrow", href: "/runs" },
    { name: "Suite Builder", icon: "layers", href: "/suites" },
  ]},
  { group: "Quality", items: [
    { name: "AI Quality", icon: "auto_awesome", href: "/ai-quality" },
    { name: "Failures", icon: "warning", href: "/failures" },
    { name: "Flakiness", icon: "query_stats", href: "/flakiness" },
  ]},
  { group: "Release", items: [
    { name: "Release Gate", icon: "verified", href: "/gate" },
    { name: "Coverage", icon: "check_circle", href: "/coverage" },
  ]},
];

export function Sidebar() {
  const pathname = usePathname();
  const [isAnyRunActive, setIsAnyRunActive] = useState(false);

  useEffect(() => {
    const checkActiveRuns = async () => {
      try {
        const res = await fetch("/api/runs?status=running&limit=1");
        const data = await res.json();
        setIsAnyRunActive(data.total > 0);
      } catch (e) {
        // ignore
      }
    };
    checkActiveRuns();
    const interval = setInterval(checkActiveRuns, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside suppressHydrationWarning className="fixed left-0 top-0 bottom-0 z-40 w-[192px] h-screen flex flex-col bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all overflow-hidden">
      {/* Brand Header */}
      <div className="px-6 py-8">
        <h1 className="text-lg font-black tracking-tighter text-slate-900 dark:text-white leading-tight">
          Vacancy Wizard
        </h1>
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mt-0.5 opacity-100">
          AI QA Suite
        </p>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 px-3 space-y-7 overflow-y-auto noscrollbar py-2">
        {navItems.map((group) => (
          <div key={group.group} className="space-y-2">
            <p className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 opacity-60">
              {group.group}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group relative",
                      isActive 
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold shadow-md shadow-black/10 dark:shadow-white/5" 
                        : "text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                    )}
                  >
                    <span className={cn(
                      "material-symbols-outlined text-[20px] shrink-0",
                      isActive && "text-emerald-400 dark:text-emerald-600"
                    )}>
                      {item.icon}
                    </span>
                    <span className="text-[13px] font-semibold truncate">
                      {item.name}
                    </span>
                    {item.isLive && isAnyRunActive && (
                      <span className="pulse-dot ml-auto" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Action Footer */}
      <div className="px-6 py-8 bg-slate-100/50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 space-y-4">
        <button className="w-full bg-emerald-600 dark:bg-emerald-500 hover:opacity-90 text-white py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-emerald-900/20">
          Trigger Run
        </button>
        <div className="space-y-2">
          <Link href="/settings" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 text-[11px] font-bold uppercase tracking-wider transition-colors">
            <span className="material-symbols-outlined text-sm">settings</span> Settings
          </Link>
          <Link href="/support" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 text-[11px] font-bold uppercase tracking-wider transition-colors">
            <span className="material-symbols-outlined text-sm">help</span> Support
          </Link>
        </div>
      </div>
    </aside>
  );
}
