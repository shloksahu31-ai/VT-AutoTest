"use client";

import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: string;
  trend?: {
    value: string;
    isUp: boolean;
  };
  color?: "emerald" | "rose" | "slate" | "amber";
}

export function MetricCard({ label, value, icon, trend, color = "slate" }: MetricCardProps) {
  const colorClasses = {
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10",
    rose: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/10",
    slate: "text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/10",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10",
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="glass-panel p-6 rounded-2xl shadow-sm border-slate-200/50 dark:border-slate-800/50 flex flex-col justify-between group transition-all"
    >
      <div className="flex justify-between items-start mb-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <div className={cn("p-2 rounded-xl scale-90 group-hover:scale-100 transition-transform", colorClasses[color])}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <h3 className="text-4xl font-headline font-black text-slate-950 dark:text-white tracking-tighter">
          {value}
        </h3>
        {trend && (
          <div className={cn(
            "flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full",
            trend.isUp ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" : "text-rose-600 bg-rose-50 dark:bg-rose-900/20"
          )}>
            <span className="material-symbols-outlined text-[14px]">
              {trend.isUp ? "trending_up" : "trending_down"}
            </span>
            {trend.value}
          </div>
        )}
      </div>
    </motion.div>
  );
}
