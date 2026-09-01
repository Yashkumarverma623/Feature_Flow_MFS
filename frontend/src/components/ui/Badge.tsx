import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'amber' | 'zinc' | 'rose' | 'blue';
  dot?: boolean;
  className?: string;
}

export function Badge({ children, variant = 'zinc', dot = true, className = '' }: BadgeProps) {
  const styles = {
    emerald: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
    amber: 'bg-amber-950/40 text-amber-400 border-amber-800/40',
    zinc: 'bg-zinc-900 text-zinc-400 border-zinc-800',
    rose: 'bg-rose-950/40 text-rose-400 border-rose-800/40',
    blue: 'bg-blue-950/40 text-blue-400 border-blue-800/40',
  };

  const dots = {
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    zinc: 'bg-zinc-400',
    rose: 'bg-rose-400',
    blue: 'bg-blue-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono tracking-tight border ${styles[variant]} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dots[variant]}`} />}
      {children}
    </span>
  );
}
