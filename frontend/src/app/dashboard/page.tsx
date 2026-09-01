'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { FolderKanban, Flag, FlaskConical, ShieldAlert, Plus, ArrowUpRight, Activity, Zap } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { useSseLiveUpdates } from '../../lib/useSse';

export default function DashboardPage() {
  // Subscribe to live SSE updates
  useSseLiveUpdates();

  const { data: projectsData, isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => fetchApi('/projects'),
  });

  const { data: flagsData, isLoading: loadingFlags } = useQuery({
    queryKey: ['flags'],
    queryFn: () => fetchApi('/flags'),
  });

  const { data: experimentsData, isLoading: loadingExperiments } = useQuery({
    queryKey: ['experiments'],
    queryFn: () => fetchApi('/experiments'),
  });

  const { data: auditData } = useQuery({
    queryKey: ['audit'],
    queryFn: () => fetchApi('/audit'),
  });

  const projects = projectsData?.data || [];
  const flags = flagsData?.data || [];
  const experiments = experimentsData?.data || [];
  const auditLogs = auditData?.data || [];

  const activeFlagsCount = flags.filter((f: any) => f.enabled).length;
  const runningExperimentsCount = experiments.filter((e: any) => e.status === 'RUNNING').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Platform Overview</h1>
          <p className="text-sm text-slate-400 mt-1">Live metrics across all projects and environment releases</p>
        </div>

        <Link
          href="/projects"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/30 transition-all self-start"
        >
          <Plus className="h-4 w-4" />
          <span>New Project</span>
        </Link>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Projects</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FolderKanban className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">
            {loadingProjects ? '...' : projects.length}
          </div>
          <p className="text-xs text-slate-500">Active development workspaces</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Flags</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Zap className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">
            {loadingFlags ? '...' : `${activeFlagsCount} / ${flags.length}`}
          </div>
          <p className="text-xs text-slate-500">Currently serving traffic</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Running Experiments</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <FlaskConical className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">
            {loadingExperiments ? '...' : runningExperimentsCount}
          </div>
          <p className="text-xs text-slate-500">A/B tests collecting data</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Environments</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">
            {projects.length * 3}
          </div>
          <p className="text-xs text-slate-500">DEV, STAGING, PROD</p>
        </div>
      </div>

      {/* Main Grid: Projects & Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Projects List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-indigo-400" />
              Projects
            </h2>
            <Link href="/projects" className="text-xs font-semibold text-indigo-400 hover:underline flex items-center gap-1">
              View all
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loadingProjects ? (
            <div className="glass-card p-8 rounded-2xl text-center text-slate-500 text-sm">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="glass-card p-8 rounded-2xl text-center space-y-3 border border-slate-800">
              <p className="text-slate-400 text-sm">No projects found yet.</p>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
              >
                Create your first project
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project: any) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="glass-card p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/50 block group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-white group-hover:text-indigo-400 transition-colors">{project.name}</h3>
                      <span className="text-xs font-mono text-slate-400">{project.key}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {project.flag_count || 0} Flags
                    </span>
                  </div>

                  <div className="mt-6 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 pt-3">
                    <span>3 Environments</span>
                    <span className="text-slate-400 group-hover:translate-x-1 transition-transform">Configure →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Live Audit Stream */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
              Live Audit Stream
            </h2>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              SSE Live
            </span>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-slate-800 divide-y divide-slate-800/80 max-h-[420px] overflow-y-auto space-y-3">
            {auditLogs.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-6">No recent audit logs.</p>
            ) : (
              auditLogs.slice(0, 10).map((log: any) => (
                <div key={log.id} className="pt-3 first:pt-0 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-indigo-300">{log.action}</span>
                    <span className="text-[10px] text-slate-500">{new Date(log.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    By <span className="text-slate-200">{log.user_name || 'System'}</span> ({log.resource_type})
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
