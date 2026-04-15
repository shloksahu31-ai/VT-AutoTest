"use client";

import React from 'react';

interface ObsidianCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

const ObsidianCard: React.FC<ObsidianCardProps> = ({ children, className = '', glow = true }) => {
  return (
    <div className={`
      relative overflow-hidden
      bg-surface/80 backdrop-blur-md
      border border-white/5 ring-1 ring-white/5
      rounded-[--radius-xl]
      transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]
      hover:ring-primary/40 hover:border-primary/20
      hover:shadow-[--shadow-primary-glow]
      hover:-translate-y-1
      group
      ${className}
    `}>
      {glow && (
        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_12px_var(--primary)] animate-pulse" />
        </div>
      )}
      
      {/* Dynamic Background Glow */}
      <div className="absolute inset-0 bg-radial-gradient(circle_at_top_left,var(--primary-glow),transparent_70%) opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>

  );
};

export default ObsidianCard;
