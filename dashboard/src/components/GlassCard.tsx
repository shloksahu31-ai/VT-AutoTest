import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
}

export default function GlassCard({ children, className = '', animate = true }: GlassCardProps) {
  return (
    <div className={`glass p-6 ${animate ? 'animate-fade-in' : ''} ${className}`}>
      {children}
    </div>
  );
}
