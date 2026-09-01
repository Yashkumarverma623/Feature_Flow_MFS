'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, ChevronRight } from 'lucide-react';
import { fetchApi } from '../../../../lib/api';
import { useSseLiveUpdates } from '../../../../lib/useSse';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Badge } from '../../../../components/ui/Badge';
import { Modal } from '../../../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../../components/ui/Table';

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-base font-semibold text-zinc-100 tracking-tight">Feature Flags</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Runtime control plane for feature rollouts and targeting rules</p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            if (environments.length > 0) setEnvironmentId(environments[0].id);
            setShowModal(true);
          }}
          icon={<Plus className="h-3.5 w-3.5" />}
        >
          Create Flag
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-zinc-950 p-3 rounded-md border border-zinc-800 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by flag name or key..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 pl-9 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
          >
            <option value="ALL">All Environments</option>
            {environments.map((e: any) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
          >
            <option value="ALL">All Types</option>
            <option value="BOOLEAN">Boolean</option>
            <option value="MULTIVARIATE">Multivariate</option>
          </select>
        </div>
      </div>

      {/* Flags List Table */}
      {isLoading ? (
        <div className="p-8 border border-zinc-800 rounded-md text-center text-zinc-500 text-xs font-mono">
          Loading feature flags...
        </div>
      ) : filteredFlags.length === 0 ? (
        <div className="p-8 border border-zinc-800 rounded-md text-center space-y-2 bg-zinc-950">
          <h3 className="text-xs font-semibold text-zinc-200">No Feature Flags Configured</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">Create a feature flag to evaluate rollouts dynamically in your application.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Flag & Key</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Rollout</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Evaluations</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {filteredFlags.map((flag: any) => (
              <TableRow key={flag.id}>
                <TableCell>
                  <Link href={`/projects/${projectId}/flags/${flag.id}`} className="block group">
                    <div className="font-semibold text-zinc-100 text-xs group-hover:text-white transition-colors">{flag.name}</div>
                    <div className="font-mono text-[11px] text-zinc-500">{flag.key}</div>
                  </Link>
                </TableCell>

                <TableCell>
                  <Badge variant="zinc">{flag.environment_name}</Badge>
                </TableCell>

                <TableCell>
                  <button
                    onClick={() => toggleMutation.mutate({ id: flag.id, enabled: !flag.enabled })}
                    className="focus:outline-none"
                  >
                    <Badge variant={flag.enabled ? 'emerald' : 'zinc'}>
                      {flag.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </button>
                </TableCell>

                <TableCell className="font-mono text-zinc-300 font-semibold">
                  {flag.rollout_percentage}%
                </TableCell>

                <TableCell>
                  <span className="font-mono text-[10px] uppercase text-zinc-400 px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded">
                    {flag.type}
                  </span>
                </TableCell>

                <TableCell className="font-mono text-zinc-400">
                  {flag.evaluation_count || 0}
                </TableCell>

                <TableCell className="text-right">
                  <Link
                    href={`/projects/${projectId}/flags/${flag.id}`}
                    className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white font-medium"
                  >
                    <span>Configure</span>
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Flag Creation Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Feature Flag"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Save Flag'}
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
          <Select
            label="Environment"
            value={environmentId}
            onChange={(e) => setEnvironmentId(e.target.value)}
            options={environments.map((e: any) => ({ label: e.name, value: e.id }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Flag Name"
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!key) setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_'));
              }}
              placeholder="e.g. Checkout V2"
            />

            <Input
              label="Flag Key"
              type="text"
              mono
              required
              value={key}
              onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_'))}
              placeholder="e.g. checkout_v2"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-400">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of feature release..."
              rows={2}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              options={[
                { label: 'Boolean (On / Off)', value: 'BOOLEAN' },
                { label: 'Multivariate (Weighted Variants)', value: 'MULTIVARIATE' },
              ]}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-400">
                Initial Rollout % ({rolloutPercentage}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={rolloutPercentage}
                onChange={(e) => setRolloutPercentage(Number(e.target.value))}
                className="w-full accent-zinc-200 mt-2"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="enabledCheck"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-3.5 w-3.5 rounded accent-zinc-200 bg-zinc-900 border-zinc-800"
            />
            <label htmlFor="enabledCheck" className="text-xs text-zinc-300">
              Enable flag immediately upon creation
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
}
