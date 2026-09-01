'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Flag, FolderKanban, FlaskConical, Settings, ShieldAlert, LogOut, Layers, KeyRound } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Navbar({ currentProjectId }: { currentProjectId?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState<string>('User');
  const [userRole, setUserRole] = useState<string>('MEMBER');

  useEffect(() => {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        setUserName(u.name || u.email);
        setUserRole(u.role || 'MEMBER');
      } catch {}
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const navLinks = currentProjectId
    ? [
        { label: 'Overview', href: `/projects/${currentProjectId}`, icon: FolderKanban },
        { label: 'Feature Flags', href: `/projects/${currentProjectId}/flags`, icon: Flag },
        { label: 'Experiments', href: `/projects/${currentProjectId}/experiments`, icon: FlaskConical },
        { label: 'Environments', href: `/projects/${currentProjectId}/environments`, icon: KeyRound },
        { label: 'Audit History', href: `/projects/${currentProjectId}/audit`, icon: ShieldAlert },
      ]
    : [
        { label: 'Dashboard', href: '/dashboard', icon: Layers },
        { label: 'Projects', href: '/projects', icon: FolderKanban },
        { label: 'Settings', href: '/settings', icon: Settings },
      ];

  if (pathname === '/login' || pathname === '/register') return null;

  return (
    <nav className="glass-panel sticky top-0 z-50 border-b border-slate-800 px-6 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Flag className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-tight">Feature<span className="gradient-text">Flow</span></span>
            <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">v1.0</span>
          </div>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/90 text-white shadow-sm shadow-indigo-600/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* User Badge & Logout */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-indigo-400 border border-slate-700">
              {userName.substring(0, 2).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-slate-200">{userName}</p>
              <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-400">{userRole}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Logout"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
