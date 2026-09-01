'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FlaskConical, Plus, X, ArrowRight, Play, Pause, CheckCircle2 } from 'lucide-react';
import { fetchApi } from '../../../../lib/api';

export default function ExperimentsListPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [featureFlagId, setFeatureFlagId] = useState('');
  const [primaryMetric, setPrimaryMetric] = useState('');
  const [error, setError] = useState('');

  const { data: flagsData } = useQuery({
    queryKey: ['flags', projectId],
    queryFn: () => fetchApi('/flags'),
  });

  const { data: envsData } = useQuery({
    queryKey: ['environments', projectId],
    queryFn: () => fetchApi(`/projects/${projectId}/environments`),
  });

  const { data: expData, isLoading } = useQuery({
    queryKey: ['experiments', projectId],
    queryFn: () => fetchApi(`/experiments?projectId=${projectId}`),
  });

  const environments = envsData?.data || [];
  const projectEnvIds = new Set(environments.map((e: any) => e.id));
  const projectFlags = (flagsData?.data || []).filter((f: any) => projectEnvIds.has(f.environment_id));
  const experiments = expData?.data || [];

  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      fetchApi('/experiments', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiments'] });
      setShowModal(false);
      setName('');
      setPrimaryMetric('');
      setError('');
    },
    onError: (err: any) => setError(err.message || 'Failed to create experiment'),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!featureFlagId && projectFlags.length > 0) {
      setError('Please select a feature flag');
      return;
    }
    createMutation.mutate({
      featureFlagId: featureFlagId || projectFlags[0]?.id,
      name,
      primaryMetric,
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Experiments</h1>
          <p className="text-sm text-slate-400 mt-1">Run A/B experiments and measure feature conversions</p>
        </div>

        <button
          onClick={() => {
            if (projectFlags.length > 0) setFeatureFlagId(projectFlags[0].id);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/30 transition-all self-start"
        >
          <Plus className="h-4 w-4" />
          <span>New Experiment</span>
        </button>
      </div>

      {isLoading ? (
        <div className="glass-card p-12 rounded-2xl text-center text-slate-500 text-sm">Loading experiments...</div>
      ) : experiments.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl text-center space-y-4 border border-slate-800">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <FlaskConical className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-white">No Experiments Running</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">Create an experiment attached to a feature flag to measure conversion metrics.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {experiments.map((exp: any) => (
            <Link
              key={exp.id}
              href={`/projects/${projectId}/experiments/${exp.id}`}
              className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-indigo-500/50 block group transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg text-white group-hover:text-indigo-400 transition-colors">{exp.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">Flag: <span className="font-mono text-indigo-300">{exp.feature_flag_key}</span></p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                  exp.status === 'RUNNING'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : exp.status === 'PAUSED'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {exp.status}
                </span>
              </div>

              <div className="mt-8 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-4">
                <span>Metric: <strong className="text-slate-200">{exp.primary_metric}</strong></span>
                <span className="text-indigo-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  View Results <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Experiment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Create New Experiment</h2>
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
                <label className="text-xs font-medium text-slate-300">Experiment Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Checkout V2 Conversion Test"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Target Feature Flag</label>
                <select
                  value={featureFlagId}
                  onChange={(e) => setFeatureFlagId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {projectFlags.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.name} ({f.key})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Primary Conversion Metric Event</label>
                <input
                  type="text"
                  required
                  value={primaryMetric}
                  onChange={(e) => setPrimaryMetric(e.target.value)}
                  placeholder="purchase_completed"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                />
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
                  {createMutation.isPending ? 'Creating...' : 'Create Experiment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
