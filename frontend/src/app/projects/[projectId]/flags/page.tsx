'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Flag, Plus, Search, Filter, ToggleLeft, ToggleRight, X, ArrowUpDown, ChevronRight } from 'lucide-react';
import { fetchApi } from '../../../../lib/api';
import { useSseLiveUpdates } from '../../../../lib/useSse';

export default function FlagsListPage() {
  useSseLiveUpdates();
  const params = useParams();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [envFilter, setEnvFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [showModal, setShowModal] = useState(false);

  // Form states for flag creation
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'BOOLEAN' | 'MULTIVARIATE'>('BOOLEAN');
  const [environmentId, setEnvironmentId] = useState('');
  const [rolloutPercentage, setRolloutPercentage] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState('');

  const { data: envsData } = useQuery({
    queryKey: ['environments', projectId],
    queryFn: () => fetchApi(`/projects/${projectId}/environments`),
  });

  const { data: flagsData, isLoading } = useQuery({
    queryKey: ['flags', projectId],
    queryFn: () => fetchApi(`/flags`),
  });

  const environments = envsData?.data || [];
  const allFlags = flagsData?.data || [];

  // Filter flags belonging to environments of this project
  const projectEnvIds = new Set(environments.map((e: any) => e.id));
  const projectFlags = allFlags.filter((f: any) => projectEnvIds.has(f.environment_id));

  // Search & Filters
  const filteredFlags = projectFlags.filter((f: any) => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase()) || f.key.toLowerCase().includes(search.toLowerCase());
    const matchesEnv = envFilter === 'ALL' || f.environment_id === envFilter;
    const matchesType = typeFilter === 'ALL' || f.type === typeFilter;
    return matchesSearch && matchesEnv && matchesType;
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      fetchApi(`/flags/${id}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flags'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      fetchApi('/flags', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flags'] });
      setShowModal(false);
      setName('');
      setKey('');
      setDescription('');
      setError('');
    },
    onError: (err: any) => setError(err.message || 'Failed to create flag'),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!environmentId && environments.length > 0) {
      setError('Please select an environment');
      return;
    }

    const payload: any = {
      environmentId: environmentId || environments[0]?.id,
      key,
      name,
      description,
      type,
      enabled,
      rolloutPercentage,
      targetRules: [],
      variants: type === 'MULTIVARIATE' ? [
        { key: 'control', weight: 50 },
        { key: 'treatment', weight: 50 }
      ] : []
    };

    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Feature Flags</h1>
          <p className="text-sm text-slate-400 mt-1">Control environment feature flag rollouts and state</p>
        </div>

        <button
          onClick={() => {
            if (environments.length > 0) setEnvironmentId(environments[0].id);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/30 transition-all self-start"
        >
          <Plus className="h-4 w-4" />
          <span>Create Flag</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by flag name or key..."
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Environments</option>
            {environments.map((e: any) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Types</option>
            <option value="BOOLEAN">Boolean</option>
            <option value="MULTIVARIATE">Multivariate</option>
          </select>
        </div>
      </div>

      {/* Flags List Table */}
      {isLoading ? (
        <div className="glass-card p-12 rounded-2xl text-center text-slate-500 text-sm">Loading flags...</div>
      ) : filteredFlags.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl text-center space-y-4 border border-slate-800">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Flag className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-white">No Feature Flags Found</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">Create a feature flag to evaluate rollouts dynamically in your application.</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Flag</th>
                  <th className="p-4">Environment</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Rollout</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Evaluations</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredFlags.map((flag: any) => (
                  <tr key={flag.id} className="hover:bg-slate-900/40 transition-colors group">
                    <td className="p-4">
                      <Link href={`/projects/${projectId}/flags/${flag.id}`} className="block">
                        <div className="font-bold text-white text-sm group-hover:text-indigo-400 transition-colors">{flag.name}</div>
                        <div className="font-mono text-[11px] text-slate-500">{flag.key}</div>
                      </Link>
                    </td>

                    <td className="p-4 font-semibold text-slate-300">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 border border-slate-700">
                        {flag.environment_name}
                      </span>
                    </td>

                    <td className="p-4">
                      <button
                        onClick={() => toggleMutation.mutate({ id: flag.id, enabled: !flag.enabled })}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                          flag.enabled
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/10'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${flag.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                        {flag.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>

                    <td className="p-4 font-mono font-semibold text-slate-200">
                      {flag.rollout_percentage}%
                    </td>

                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {flag.type}
                      </span>
                    </td>

                    <td className="p-4 font-mono text-slate-400">
                      {flag.evaluation_count || 0}
                    </td>

                    <td className="p-4 text-right">
                      <Link
                        href={`/projects/${projectId}/flags/${flag.id}`}
                        className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:underline font-semibold"
                      >
                        Configure <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Flag Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-slate-800 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Create Feature Flag</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Environment</label>
                <select
                  value={environmentId}
                  onChange={(e) => setEnvironmentId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {environments.map((env: any) => (
                    <option key={env.id} value={env.id}>{env.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Flag Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!key) setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_'));
                    }}
                    placeholder="Checkout V2"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Flag Key</label>
                  <input
                    type="text"
                    name="key"
                    required
                    value={key}
                    onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_'))}
                    placeholder="checkout_v2"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional brief summary..."
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="BOOLEAN">Boolean (On / Off)</option>
                    <option value="MULTIVARIATE">Multivariate (Weighted Variants)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Initial Rollout % ({rolloutPercentage}%)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={rolloutPercentage}
                    onChange={(e) => setRolloutPercentage(Number(e.target.value))}
                    className="w-full accent-indigo-500 mt-2"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="enabledCheck"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="h-4 w-4 rounded accent-indigo-600"
                />
                <label htmlFor="enabledCheck" className="text-xs font-semibold text-slate-200">
                  Enable flag immediately upon creation
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
                >
                  {createMutation.isPending ? 'Saving...' : 'Save Flag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
