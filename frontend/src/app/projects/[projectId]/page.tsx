'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Flag, KeyRound, FlaskConical, ShieldAlert, Layers } from 'lucide-react';
import { fetchApi } from '../../../lib/api';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const { data: projData, isLoading: loadingProj } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchApi(`/projects/${projectId}`),
  });

  const { data: envsData } = useQuery({
    queryKey: ['environments', projectId],
    queryFn: () => fetchApi(`/projects/${projectId}/environments`),
  });

  const project = projData?.project;
  const environments = envsData?.data || [];

  if (loadingProj) {
    return <div className="glass-card p-12 rounded-2xl text-center text-slate-500 text-sm">Loading project...</div>;
  }

  if (!project) {
    return <div className="glass-card p-12 rounded-2xl text-center text-rose-400 text-sm">Project not found</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white tracking-tight">{project.name}</h1>
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {project.key}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">Project workspace dashboard and navigation</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}/flags`}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
          >
            <Flag className="h-4 w-4" />
            <span>Manage Flags</span>
          </Link>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          href={`/projects/${projectId}/flags`}
          className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-indigo-500/50 block group transition-all"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white group-hover:text-indigo-400 transition-colors">Feature Flags</h3>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Flag className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">Configure targeted rollouts and flag states</p>
        </Link>

        <Link
          href={`/projects/${projectId}/experiments`}
          className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-indigo-500/50 block group transition-all"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white group-hover:text-indigo-400 transition-colors">Experiments</h3>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <FlaskConical className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">Run A/B tests and track conversion analytics</p>
        </Link>

        <Link
          href={`/projects/${projectId}/environments`}
          className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-indigo-500/50 block group transition-all"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white group-hover:text-indigo-400 transition-colors">Environments</h3>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <KeyRound className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">Manage API keys for DEV, STAGING, PROD</p>
        </Link>

        <Link
          href={`/projects/${projectId}/audit`}
          className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-indigo-500/50 block group transition-all"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white group-hover:text-indigo-400 transition-colors">Audit History</h3>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">Review append-only project audit logs</p>
        </Link>
      </div>

      {/* Environments Overview Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Project Environments</h2>
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-4">Environment</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {environments.map((env: any) => (
                <tr key={env.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-4 font-bold text-white flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${env.name === 'PRODUCTION' ? 'bg-emerald-400' : env.name === 'STAGING' ? 'bg-amber-400' : 'bg-indigo-400'}`}></span>
                    {env.name}
                  </td>
                  <td className="p-4 text-slate-400 font-mono text-[11px]">API Key Configured</td>
                  <td className="p-4 text-right">
                    <Link
                      href={`/projects/${projectId}/environments`}
                      className="text-xs text-indigo-400 hover:underline font-semibold"
                    >
                      Manage API Key →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
