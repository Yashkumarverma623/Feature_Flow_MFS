'use client';

import { useEffect, useState } from 'react';
import { Settings, Shield, User, Server, Database } from 'lucide-react';

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
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Platform Settings</h1>
        <p className="text-sm text-slate-400 mt-1">User profile details and system architecture configuration</p>
      </div>

      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <User className="h-5 w-5 text-indigo-400" />
          User Profile
        </h2>

        {user && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-slate-500 font-semibold uppercase">Full Name</span>
              <p className="text-sm font-bold text-white">{user.name}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-slate-500 font-semibold uppercase">Email Address</span>
              <p className="text-sm font-bold text-white">{user.email}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-slate-500 font-semibold uppercase">Assigned System Role</span>
              <p className="text-sm font-bold text-indigo-400">{user.role}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-slate-500 font-semibold uppercase">Account ID</span>
              <p className="text-xs font-mono text-slate-400 truncate">{user.id}</p>
            </div>
          </div>
        )}
      </div>

      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Server className="h-5 w-5 text-emerald-400" />
          System Architecture Status
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-slate-500 font-semibold uppercase">Evaluation Engine</span>
            <p className="text-sm font-bold text-emerald-400">MurmurHash3 Deterministic</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-slate-500 font-semibold uppercase">Cache & Fallback</span>
            <p className="text-sm font-bold text-indigo-400">Redis + PostgreSQL Fallback</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-slate-500 font-semibold uppercase">Live Updates</span>
            <p className="text-sm font-bold text-purple-400">Server-Sent Events (SSE)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
