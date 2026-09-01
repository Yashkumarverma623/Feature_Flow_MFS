'use client';

import { useEffect, useState } from 'react';
import { Badge } from '../../components/ui/Badge';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      try {
        setUser(JSON.parse(rawUser));
      } catch {}
    }
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-4 border-b border-zinc-800/80">
        <h1 className="text-base font-semibold text-zinc-100 tracking-tight">Platform Settings</h1>
        <p className="text-xs text-zinc-400 mt-0.5">User profile preferences and system architecture specs</p>
      </div>

      {/* Profile Section */}
      <div className="space-y-4 pb-6 border-b border-zinc-800/60">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">User Profile</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Current session credentials and permission role</p>
        </div>

        {user && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded bg-zinc-900 border border-zinc-800 space-y-1">
              <span className="text-zinc-500 text-[10px] uppercase font-mono">Full Name</span>
              <p className="text-xs font-semibold text-zinc-100">{user.name}</p>
            </div>

            <div className="p-3 rounded bg-zinc-900 border border-zinc-800 space-y-1">
              <span className="text-zinc-500 text-[10px] uppercase font-mono">Email Address</span>
              <p className="text-xs font-semibold text-zinc-100">{user.email}</p>
            </div>

            <div className="p-3 rounded bg-zinc-900 border border-zinc-800 space-y-1">
              <span className="text-zinc-500 text-[10px] uppercase font-mono">System Role</span>
              <div className="pt-0.5">
                <Badge variant="zinc">{user.role}</Badge>
              </div>
            </div>

            <div className="p-3 rounded bg-zinc-900 border border-zinc-800 space-y-1">
              <span className="text-zinc-500 text-[10px] uppercase font-mono">User ID</span>
              <p className="text-[11px] font-mono text-zinc-400 truncate">{user.id}</p>
            </div>
          </div>
        )}
      </div>

      {/* Architecture Specs Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">System Architecture Specifications</h2>
          <p className="text-xs text-zinc-500 mt-0.5">FeatureFlow evaluation engine runtime state</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded bg-zinc-900 border border-zinc-800 space-y-1">
            <span className="text-zinc-500 text-[10px] uppercase font-mono">Evaluation Engine</span>
            <p className="text-xs font-semibold text-zinc-200">MurmurHash3 Deterministic</p>
          </div>

          <div className="p-3 rounded bg-zinc-900 border border-zinc-800 space-y-1">
            <span className="text-zinc-500 text-[10px] uppercase font-mono">Cache & Fallback</span>
            <p className="text-xs font-semibold text-zinc-200">Redis + Postgres Fallback</p>
          </div>

          <div className="p-3 rounded bg-zinc-900 border border-zinc-800 space-y-1">
            <span className="text-zinc-500 text-[10px] uppercase font-mono">Live Updates</span>
            <p className="text-xs font-semibold text-zinc-200">Server-Sent Events (SSE)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
