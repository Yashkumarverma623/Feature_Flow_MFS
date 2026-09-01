'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, ArrowRight, FlaskConical } from 'lucide-react';
import { fetchApi } from '../../../../lib/api';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Badge } from '../../../../components/ui/Badge';
import { Panel } from '../../../../components/ui/Panel';
import { Modal } from '../../../../components/ui/Modal';

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-base font-semibold text-zinc-100 tracking-tight">A/B Experiments</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Statistical feature experimentation and conversion tracking</p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            if (projectFlags.length > 0) setFeatureFlagId(projectFlags[0].id);
            setShowModal(true);
          }}
          icon={<Plus className="h-3.5 w-3.5" />}
        >
          New Experiment
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 border border-zinc-800 rounded-md text-center text-zinc-500 text-xs font-mono">
          Loading experiments...
        </div>
      ) : experiments.length === 0 ? (
        <Panel className="text-center py-12">
          <div className="mx-auto h-8 w-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400 mb-3">
            <FlaskConical className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-semibold text-zinc-200">No Active Experiments</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            Create an experiment linked to a feature flag to track metric conversions across variant allocations.
          </p>
          <div className="mt-4">
            <Button size="sm" onClick={() => setShowModal(true)}>
              Create Experiment
            </Button>
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {experiments.map((exp: any) => (
            <Link
              key={exp.id}
              href={`/projects/${projectId}/experiments/${exp.id}`}
              className="group bg-zinc-950 border border-zinc-800 hover:border-zinc-700 p-4 rounded-md transition-all block"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xs font-bold text-zinc-100 group-hover:text-white transition-colors">{exp.name}</h3>
                  <p className="text-[11px] font-mono text-zinc-500 mt-1">
                    Flag: <span className="text-zinc-300">{exp.feature_flag_key}</span>
                  </p>
                </div>
                <Badge
                  variant={exp.status === 'RUNNING' ? 'emerald' : exp.status === 'PAUSED' ? 'amber' : 'zinc'}
                >
                  {exp.status}
                </Badge>
              </div>

              <div className="mt-6 pt-3 border-t border-zinc-900 flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span className="text-[11px] text-zinc-500">Metric: <strong className="text-zinc-300 font-normal">{exp.primary_metric}</strong></span>
                <span className="text-zinc-300 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  Analytics <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal: Create Experiment */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create A/B Experiment"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Experiment'}
            </Button>
          </>
        }
      >
        {error && (
          <div className="p-3 rounded bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Experiment Name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Checkout Flow V2 Conversion"
          />

          <Select
            label="Target Feature Flag"
            value={featureFlagId}
            onChange={(e) => setFeatureFlagId(e.target.value)}
            options={projectFlags.map((f: any) => ({ label: `${f.name} (${f.key})`, value: f.id }))}
          />

          <Input
            label="Primary Conversion Metric (Event Key)"
            type="text"
            mono
            required
            value={primaryMetric}
            onChange={(e) => setPrimaryMetric(e.target.value)}
            placeholder="e.g. purchase_completed"
          />
        </form>
      </Modal>
    </div>
  );
}
