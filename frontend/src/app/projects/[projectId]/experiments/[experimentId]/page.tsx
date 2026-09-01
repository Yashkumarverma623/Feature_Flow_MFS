'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Play, Pause, CheckCircle2, Users, Target, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fetchApi } from '../../../../../lib/api';
import { Button } from '../../../../../components/ui/Button';
import { Badge } from '../../../../../components/ui/Badge';
import { Panel } from '../../../../../components/ui/Panel';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../../../components/ui/Table';

export default function ExperimentAnalyticsPage() {
  const params = useParams();
  const experimentId = params.experimentId as string;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['experiment', experimentId],
    queryFn: () => fetchApi(`/experiments/${experimentId}/analytics`),
    refetchInterval: 5000,
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
    return (
      <div className="p-8 border border-zinc-800 rounded-md text-center text-zinc-500 text-xs font-mono">
        Loading experiment analytics...
      </div>
    );
  }

  const experiment = data?.experiment;
  const variants = data?.variants || [];
  const totalParticipants = data?.totalParticipants || 0;
  const totalConversions = data?.totalConversions || 0;
  const overallRate = data?.overallConversionRate || 0;

  if (!experiment) {
    return (
      <Panel className="text-center py-8">
        <p className="text-rose-400 text-xs font-mono">Experiment not found.</p>
      </Panel>
    );
  }

  const BAR_COLORS = ['#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8'];

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-semibold text-zinc-100 tracking-tight">{experiment.name}</h1>
            <Badge variant={experiment.status === 'RUNNING' ? 'emerald' : experiment.status === 'PAUSED' ? 'amber' : 'zinc'}>
              {experiment.status}
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5 font-mono">
            Flag Key: <span className="text-zinc-200">{experiment.flag_key}</span> • Metric Event: <span className="text-zinc-200">{experiment.primary_metric}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {experiment.status !== 'RUNNING' && (
            <Button size="sm" onClick={() => statusMutation.mutate('RUNNING')} disabled={statusMutation.isPending} icon={<Play className="h-3 w-3" />}>
              Start Test
            </Button>
          )}

          {experiment.status === 'RUNNING' && (
            <Button variant="secondary" size="sm" onClick={() => statusMutation.mutate('PAUSED')} disabled={statusMutation.isPending} icon={<Pause className="h-3 w-3" />}>
              Pause
            </Button>
          )}

          {experiment.status !== 'COMPLETED' && (
            <Button variant="outline" size="sm" onClick={() => statusMutation.mutate('COMPLETED')} disabled={statusMutation.isPending} icon={<CheckCircle2 className="h-3 w-3" />}>
              Complete
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Panel className="!p-3.5">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Participants</span>
            <Users className="h-4 w-4 text-zinc-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-zinc-100">{totalParticipants}</div>
          <p className="text-[11px] text-zinc-500 mt-1">Unique user evaluation keys</p>
        </Panel>

        <Panel className="!p-3.5">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Total Conversions</span>
            <Target className="h-4 w-4 text-zinc-500" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-zinc-100">{totalConversions}</div>
          <p className="text-[11px] text-zinc-500 mt-1">Recorded metric events</p>
        </Panel>

        <Panel className="!p-3.5">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Conversion Rate</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-emerald-400">{overallRate}%</div>
          <p className="text-[11px] text-zinc-500 mt-1">Aggregated metric rate</p>
        </Panel>
      </div>

      {/* Analytics Chart & Breakdown Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recharts Conversion Rate Bar Chart */}
        <Panel title="Variant Conversion Comparison (%)">
          <div className="h-56 w-full pt-2">
            {variants.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-600 font-mono">
                No variant evaluations recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={variants} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="variant" stroke="#52525b" fontSize={11} fontFamily="monospace" />
                  <YAxis stroke="#52525b" fontSize={11} unit="%" fontFamily="monospace" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '4px', fontSize: '11px' }}
                    itemStyle={{ color: '#fafafa' }}
                  />
                  <Bar dataKey="conversionRate" radius={[2, 2, 0, 0]}>
                    {variants.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        {/* Variant Breakdown Table */}
        <Panel title="Performance Matrix">
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Variant Key</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Conversions</TableHead>
                <TableHead className="text-right">Conversion Rate</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {variants.map((v: any) => (
                <TableRow key={v.variant}>
                  <TableCell className="font-mono font-bold text-zinc-100">{v.variant}</TableCell>
                  <TableCell className="font-mono text-zinc-400">{v.users}</TableCell>
                  <TableCell className="font-mono text-zinc-400">{v.conversions}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-emerald-400">
                    {v.conversionRate}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      </div>
    </div>
  );
}
