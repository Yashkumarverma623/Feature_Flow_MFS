import React from 'react';

export function Table({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-full overflow-x-auto border border-zinc-800 rounded-md bg-zinc-950 ${className}`}>
      <table className="w-full text-left border-collapse text-xs">{children}</table>
    </div>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-zinc-900/60 border-b border-zinc-800 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
      {children}
    </thead>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-zinc-800/60">{children}</tbody>;
}

export function TableRow({ children, onClick, className = '' }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <tr
      onClick={onClick}
      className={`hover:bg-zinc-900/40 transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  );
}

export function TableHead({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2.5 font-medium text-zinc-400 ${className}`}>{children}</th>;
}

export function TableCell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 text-zinc-300 ${className}`}>{children}</td>;
}
