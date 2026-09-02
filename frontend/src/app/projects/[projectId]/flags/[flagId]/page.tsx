'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Save, Trash2, Plus, X, AlertTriangle } from 'lucide-react';
import { fetchApi } from '../../../../../lib/api';
import { Button } from '../../../../../components/ui/Button';
import { Input } from '../../../../../components/ui/Input';
import { Select } from '../../../../../components/ui/Select';
import { Badge } from '../../../../../components/ui/Badge';
import { Panel } from '../../../../../components/ui/Panel';
import { Modal } from '../../../../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../../../components/ui/Table';

export default function FlagDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const flagId = params.flagId as string;
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [rolloutPercentage, setRolloutPercentage] = useState(0);
  const [targetRules, setTargetRules] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: flagData, isLoading } = useQuery({
    queryKey: ['flag', flagId],
    queryFn: () => fetchApi(`/flags/${flagId}`),
  });

  useEffect(() => {
    if (flagData?.flag) {
      setName(flagData.flag.name);
      setDescription(flagData.flag.description || '');
      setEnabled(flagData.flag.enabled);
      setRolloutPercentage(flagData.flag.rollout_percentage);
      setTargetRules(flagData.targetRules || []);
      setVariants(flagData.variants || []);
    }
  }, [flagData]);

  const updateMutation = useMutation({
    mutationFn: (payload: any) =>
      fetchApi(`/flags/${flagId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flag', flagId] });
      queryClient.invalidateQueries({ queryKey: ['flags'] });
      setSuccess('Flag configuration saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err: any) => setError(err.message || 'Failed to update flag'),
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      fetchApi(`/flags/${flagId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flags'] });
      router.push(`/projects/${projectId}/flags`);
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate multivariate weights sum
    if (flagData?.flag?.type === 'MULTIVARIATE' && variants.length > 0) {
      const sumWeight = variants.reduce((acc, v) => acc + Number(v.weight), 0);
      if (Math.abs(sumWeight - 100) > 0.1) {
        setError(`Variant weights must sum to 100%. Current sum: ${sumWeight}%`);
        return;
      }
    }

    updateMutation.mutate({
      name,
      description,
      enabled,
      rolloutPercentage,
      targetRules,
      variants,
    });
  };

  const addRule = () => {
    setTargetRules([...targetRules, { attribute: 'country', operator: 'equals', value: 'IN' }]);
  };

  const removeRule = (index: number) => {
    setTargetRules(targetRules.filter((_, i) => i !== index));
  };

  const addVariant = () => {
    setVariants([...variants, { key: `variant_${variants.length + 1}`, description: '', weight: 0 }]);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="p-8 border border-zinc-800 rounded-md text-center text-zinc-500 text-xs font-mono">
        Loading flag configuration...
      </div>
    );
  }

  const flag = flagData?.flag;
  if (!flag) {
    return (
      <Panel className="text-center py-8">
        <p className="text-rose-400 text-xs font-mono">Feature flag not found.</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-semibold text-zinc-100 tracking-tight">{flag.name}</h1>
            <Badge variant="zinc">{flag.key}</Badge>
            <Badge variant={flag.enabled ? 'emerald' : 'zinc'}>{flag.enabled ? 'Enabled' : 'Disabled'}</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Scope: <span className="font-mono text-zinc-300">{flag.environment_name}</span> • Type:{' '}
            <span className="font-mono text-zinc-300">{flag.type}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)} icon={<Trash2 className="h-3.5 w-3.5" />}>
            Delete Flag
          </Button>

          <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} icon={<Save className="h-3.5 w-3.5" />}>
            {updateMutation.isPending ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs font-mono">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs font-mono">
          {success}
        </div>
      )}

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Flag Controls & Rollout */}
        <div className="space-y-4">
          <Panel title="Flag Controls">
            <div className="space-y-4">
              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 rounded bg-zinc-900 border border-zinc-800">
                <div>
                  <span className="text-xs font-semibold text-zinc-200">Flag Status</span>
                  <p className="text-[11px] text-zinc-500">Enable or disable serving rules</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    enabled ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      enabled ? 'translate-x-4.5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Rollout Percentage Section */}
              <div className="space-y-2 p-3 rounded bg-zinc-900 border border-zinc-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-200">
                    Rollout percentage (0% - 100%) using deterministic MurmurHash3 evaluation
                  </span>
                  <span className="font-mono font-bold text-zinc-100">{rolloutPercentage}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={rolloutPercentage}
                  onChange={(e) => setRolloutPercentage(Number(e.target.value))}
                  className="w-full accent-zinc-200 cursor-pointer"
                />
              </div>

              {/* Metadata Inputs */}
              <Input label="Name" type="text" value={name} onChange={(e) => setName(e.target.value)} />

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-400">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="p-3 rounded bg-zinc-900 border border-zinc-800/80 text-xs space-y-1">
                <span className="text-zinc-400 text-[11px]">Total Runtime Evaluations</span>
                <p className="text-lg font-mono font-bold text-zinc-100">{flagData?.evaluationCount || 0}</p>
              </div>
            </div>
          </Panel>
        </div>

        {/* Right Column: Targeting Rules & Variants */}
        <div className="lg:col-span-2 space-y-6">
          {/* Targeting Rules Panel */}
          <Panel
            title="Targeting Rules"
            subtitle="Override default rollout for specific user attributes"
            action={
              <Button variant="secondary" size="sm" onClick={addRule} icon={<Plus className="h-3 w-3" />}>
                Add Rule
              </Button>
            }
          >
            {targetRules.length === 0 ? (
              <div className="p-4 rounded bg-zinc-900/60 border border-zinc-800 text-center text-xs text-zinc-500">
                No targeting rules configured. All user evaluations will follow standard rollout percentage.
              </div>
            ) : (
              <div className="space-y-2">
                {targetRules.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 rounded bg-zinc-900 border border-zinc-800">
                    <Input
                      placeholder="Attribute (e.g. country)"
                      mono
                      value={rule.attribute}
                      onChange={(e) => {
                        const updated = [...targetRules];
                        updated[idx].attribute = e.target.value;
                        setTargetRules(updated);
                      }}
                    />

                    <div className="w-36 shrink-0">
                      <Select
                        value={rule.operator}
                        onChange={(e) => {
                          const updated = [...targetRules];
                          updated[idx].operator = e.target.value;
                          setTargetRules(updated);
                        }}
                        options={[
                          { label: 'equals', value: 'equals' },
                          { label: 'not_equals', value: 'not_equals' },
                          { label: 'contains', value: 'contains' },
                          { label: 'in (list)', value: 'in' },
                        ]}
                      />
                    </div>

                    <Input
                      placeholder="Value (e.g. IN)"
                      mono
                      value={rule.value}
                      onChange={(e) => {
                        const updated = [...targetRules];
                        updated[idx].value = e.target.value;
                        setTargetRules(updated);
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => removeRule(idx)}
                      className="text-zinc-500 hover:text-rose-400 p-1.5 rounded hover:bg-zinc-800 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Multivariate Variants Panel */}
          {flag.type === 'MULTIVARIATE' && (
            <Panel
              title="Multivariate Variants Allocation"
              subtitle="Variant distribution weights (Sum must equal 100%)"
              action={
                <Button variant="secondary" size="sm" onClick={addVariant} icon={<Plus className="h-3 w-3" />}>
                  Add Variant
                </Button>
              }
            >
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>Variant Key</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Weight (%)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {variants.map((variant, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input
                          mono
                          placeholder="e.g. treatment_a"
                          value={variant.key}
                          onChange={(e) => {
                            const updated = [...variants];
                            updated[idx].key = e.target.value;
                            setVariants(updated);
                          }}
                        />
                      </TableCell>

                      <TableCell>
                        <Input
                          placeholder="Description..."
                          value={variant.description || ''}
                          onChange={(e) => {
                            const updated = [...variants];
                            updated[idx].description = e.target.value;
                            setVariants(updated);
                          }}
                        />
                      </TableCell>

                      <TableCell className="w-24">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            mono
                            min="0"
                            max="100"
                            value={variant.weight}
                            onChange={(e) => {
                              const updated = [...variants];
                              updated[idx].weight = Number(e.target.value);
                              setVariants(updated);
                            }}
                          />
                          <span className="text-xs text-zinc-500 font-mono">%</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <button
                          type="button"
                          onClick={() => removeVariant(idx)}
                          className="text-zinc-500 hover:text-rose-400 p-1.5 rounded hover:bg-zinc-800 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Panel>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Feature Flag"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Permanently Delete'}
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-3 text-rose-400">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-xs text-zinc-300">
            Are you sure you want to delete flag <span className="font-mono font-bold text-zinc-100">{flag.key}</span>? Applications evaluating this flag key will revert to fallback values.
          </p>
        </div>
      </Modal>
    </div>
  );
}
