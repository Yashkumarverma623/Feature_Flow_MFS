'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, ArrowUpRight, FolderKanban, Shield, Zap, FlaskConical, Layers } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { useSseLiveUpdates } from '../../lib/useSse';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Panel } from '../../components/ui/Panel';

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-base font-semibold text-zinc-100 tracking-tight">Platform Dashboard</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Control plane status across all projects and release pipelines</p>
        </div>

        <Link href="/projects">
          <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />}>
            New Project
          </Button>
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Panel className="!p-3.5">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Projects</span>
            <FolderKanban className="h-4 w-4 text-zinc-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-zinc-100">
            {loadingProjects ? '...' : projects.length}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Active workspaces</p>
        </Panel>

        <Panel className="!p-3.5">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Active Flags</span>
            <Zap className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-zinc-100">
            {loadingFlags ? '...' : `${activeFlagsCount} / ${flags.length}`}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Evaluated at runtime</p>
        </Panel>

        <Panel className="!p-3.5">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Running Experiments</span>
            <FlaskConical className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-zinc-100">
            {loadingExperiments ? '...' : runningExperimentsCount}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">A/B tests collecting data</p>
        </Panel>

        <Panel className="!p-3.5">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Environments</span>
            <Layers className="h-4 w-4 text-zinc-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-zinc-100">
            {projects.length * 3}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">DEV, STAGING, PROD</p>
        </Panel>
      </div>

      {/* Main Grid: Projects & Live Audit Syslog Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Projects</h2>
            <Link href="/projects" className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1">
              <span>View all</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {loadingProjects ? (
            <div className="p-6 rounded-md border border-zinc-800 text-center text-zinc-500 text-xs font-mono">
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <Panel className="text-center py-8">
              <p className="text-zinc-400 text-xs">No projects configured in workspace.</p>
              <div className="mt-3">
                <Link href="/projects">
                  <Button size="sm">Create First Project</Button>
                </Link>
              </div>
            </Panel>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {projects.map((project: any) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="group bg-zinc-950 border border-zinc-800 hover:border-zinc-700 p-4 rounded-md transition-all block"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-100 group-hover:text-white transition-colors">{project.name}</h3>
                      <span className="text-[11px] font-mono text-zinc-500">{project.key}</span>
                    </div>
                    <Badge variant="zinc">{project.flag_count || 0} flags</Badge>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-zinc-900 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                    <span>3 ENVS</span>
                    <span className="text-zinc-400 group-hover:translate-x-0.5 transition-transform">Manage →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Live Audit Activity Stream (Syslog Style) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-zinc-400" />
              Activity Stream
            </h2>
            <Badge variant="emerald">SSE Live</Badge>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-md p-3 max-h-[380px] overflow-y-auto space-y-2.5 font-mono text-[11px]">
            {auditLogs.length === 0 ? (
              <p className="text-zinc-600 text-center py-6">No recent system events logged.</p>
            ) : (
              auditLogs.slice(0, 10).map((log: any) => (
                <div key={log.id} className="pb-2 border-b border-zinc-900 last:border-0 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300 font-semibold">{log.action}</span>
                    <span className="text-zinc-600 text-[10px]">{new Date(log.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-zinc-500 text-[10px] truncate">
                    actor=<span className="text-zinc-400">{log.user_name || 'System'}</span> type={<span className="text-zinc-400">{log.resource_type}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
