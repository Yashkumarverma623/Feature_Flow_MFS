'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Flag, LogOut, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchApi } from '../lib/api';

export default function Navbar({ currentProjectId }: { currentProjectId?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState<string>('User');
  const [userRole, setUserRole] = useState<string>('MEMBER');
  const [projectName, setProjectName] = useState<string>('');

  useEffect(() => {
    const rawUser = localStorage.getItem('token');
    if (!rawUser && pathname !== '/login' && pathname !== '/register') {
      router.push('/login');
      return;
    }
    const rawUserData = localStorage.getItem('user');
    if (rawUserData) {
      try {
        const u = JSON.parse(rawUserData);
        setUserName(u.name || u.email);
        setUserRole(u.role || 'MEMBER');
      } catch {}
    }
  }, [pathname, router]);

  useEffect(() => {
    if (currentProjectId) {
      fetchApi(`/projects/${currentProjectId}`)
        .then((res) => {
          if (res?.data?.name) {
            setProjectName(res.data.name);
          }
        })
        .catch(() => {});
    }
  }, [currentProjectId]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (pathname === '/login' || pathname === '/register') return null;

  const globalTabs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Projects', href: '/projects' },
    { label: 'Settings', href: '/settings' },
  ];

  const projectTabs = currentProjectId
    ? [
        { label: 'Overview', href: `/projects/${currentProjectId}` },
        { label: 'Feature Flags', href: `/projects/${currentProjectId}/flags` },
        { label: 'Experiments', href: `/projects/${currentProjectId}/experiments` },
        { label: 'Environments', href: `/projects/${currentProjectId}/environments` },
        { label: 'Audit History', href: `/projects/${currentProjectId}/audit` },
      ]
    : [];

  return (
    <header className="sticky top-0 z-40 bg-zinc-950 border-b border-zinc-800 text-xs">
      <div className="mx-auto max-w-7xl px-4 h-12 flex items-center justify-between">
        {/* Brand & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 text-zinc-100 hover:text-white font-semibold tracking-tight">
            <div className="h-6 w-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <Flag className="h-3.5 w-3.5 text-zinc-200" />
            </div>
            <span>FeatureFlow</span>
          </Link>

          {currentProjectId && (
            <div className="flex items-center gap-2 text-zinc-500">
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="font-mono text-zinc-300 font-medium">{projectName || 'Project'}</span>
            </div>
          )}

          <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
            v1.0
          </span>
        </div>

        {/* Global Navigation Tabs (when no project selected) */}
        {!currentProjectId && (
          <nav className="flex items-center gap-1">
            {globalTabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-3 py-1 rounded transition-colors ${
                    isActive
                      ? 'bg-zinc-800 text-white font-medium border border-zinc-700/60'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* User Account Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2 py-1 rounded bg-zinc-900/60 border border-zinc-800/80">
            <div className="h-5 w-5 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-300">
              {userName.substring(0, 1).toUpperCase()}
            </div>
            <span className="text-zinc-300 font-medium max-w-[120px] truncate">{userName}</span>
            <span className="text-[9px] font-mono uppercase bg-zinc-800 text-zinc-400 px-1 rounded">
              {userRole}
            </span>
          </div>

          <button
            onClick={handleLogout}
            title="Logout"
            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 rounded border border-zinc-800 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Project Sub-navigation Tabs (when in project view) */}
      {currentProjectId && (
        <div className="bg-zinc-950/80 border-t border-zinc-800/60 px-4">
          <div className="mx-auto max-w-7xl flex items-center gap-6 overflow-x-auto">
            {projectTabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-zinc-200 text-white'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
