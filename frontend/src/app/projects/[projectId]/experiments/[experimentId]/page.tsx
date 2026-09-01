'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { FlaskConical, Play, Pause, CheckCircle2, Users, Target, TrendingUp, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fetchApi } from '../../../../../lib/api';

export default function ExperimentAnalyticsPage() {
  const params = useParams();
  const experimentId = params.experimentId as string;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['experiment', experimentId],
    queryFn: () => fetchApi(`/experiments/${experimentId}/analytics`),
    refetchInterval: 5000, // Auto-refresh analytics every 5s
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      fetchApi(`/experiments/${experimentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiment', experimentId] });
      queryClient.invalidateQueries({ queryKey: ['experiments'] });
    },
  });

  if (isLoading) {
    return <div className="glass-card p-12 rounded-2xl text-center text-slate-500 text-sm">Loading experiment analytics...</div>;
  }

  const experiment = data?.experiment;
  const variants = data?.variants || [];
  const totalParticipants = data?.totalParticipants || 0;
  const totalConversions = data?.totalConversions || 0;
  const overallRate = data?.overallConversionRate || 0;

  if (!experiment) {
    return <div className="glass-card p-12 rounded-2xl text-center text-rose-400 text-sm">Experiment not found</div>;
  }

  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#3b82f6'];

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white tracking-tight">{experiment.name}</h1>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
              experiment.status === 'RUNNING'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : experiment.status === 'PAUSED'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              {experiment.status}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Flag: <span className="font-mono text-indigo-300 font-semibold">{experiment.flag_key}</span> • Primary Metric: <span className="font-mono text-indigo-300 font-semibold">{experiment.primary_metric}</span>
          </p>
        </div>

        {/* Status Transition Buttons */}
        <div className="flex items-center gap-2">
          {experiment.status !== 'RUNNING' && (
            <button
              onClick={() => statusMutation.mutate('RUNNING')}
              disabled={statusMutation.isPending}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Start Test</span>
            </button>
          )}

          {experiment.status === 'RUNNING' && (
            <button
              onClick={() => statusMutation.mutate('PAUSED')}
              disabled={statusMutation.isPending}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-lg shadow-amber-600/30 transition-all flex items-center gap-1.5"
            >
              <Pause className="h-3.5 w-3.5" />
              <span>Pause</span>
            </button>
          )}

          {experiment.status !== 'COMPLETED' && (
            <button
              onClick={() => statusMutation.mutate('COMPLETED')}
              disabled={statusMutation.isPending}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />
              <span>Complete</span>
            </button>
          )}
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Participants</span>
            <Users className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{totalParticipants}</div>
          <p className="text-xs text-slate-500">Unique user evaluation keys</p>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Total Conversions</span>
            <Target className="h-5 w-5 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{totalConversions}</div>
          <p className="text-xs text-slate-500">Recorded metric events</p>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Overall Conversion Rate</span>
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">{overallRate}%</div>
          <p className="text-xs text-slate-500">Aggregated conversion metric</p>
        </div>
      </div>

      {/* Chart & Table Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recharts Conversion Rate Bar Chart */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-indigo-400" />
            Variant Conversion Rate Comparison (%)
          </h2>

          <div className="h-64 w-full pt-4">
            {variants.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No evaluation data recorded for variants yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={variants} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="variant" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: '#818cf8' }}
                  />
                  <Bar dataKey="conversionRate" radius={[8, 8, 0, 0]}>
                    {variants.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Variant Breakdown Table */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white">Variant Performance Matrix</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                <tr>
                  <th className="p-3">Variant</th>
                  <th className="p-3">Users</th>
                  <th className="p-3">Conversions</th>
                  <th className="p-3 text-right">Conversion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {variants.map((v: any) => (
                  <tr key={v.variant} className="hover:bg-slate-900/40">
                    <td className="p-3 font-mono font-bold text-white">{v.variant}</td>
                    <td className="p-3 text-slate-300 font-mono">{v.users}</td>
                    <td className="p-3 text-slate-300 font-mono">{v.conversions}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400">
                      {v.conversionRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
