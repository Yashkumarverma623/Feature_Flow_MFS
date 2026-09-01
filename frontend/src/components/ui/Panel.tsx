import React from 'react';

export interface PanelProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Panel({ children, className = '', title, subtitle, action }: PanelProps) {
  return (
    <div className={`bg-zinc-950 border border-zinc-800/80 rounded-md overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/30">
          <div>
            {title && <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">{title}</h3>}
            {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
