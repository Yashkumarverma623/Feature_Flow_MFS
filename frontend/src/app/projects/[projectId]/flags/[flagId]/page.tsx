'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Flag, Save, Trash2, Plus, X, Sliders, ShieldCheck, Layers, AlertTriangle } from 'lucide-react';
import { fetchApi } from '../../../../../lib/api';

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
    return <div className="glass-card p-12 rounded-2xl text-center text-slate-500 text-sm">Loading flag configuration...</div>;
  }

  const flag = flagData?.flag;
  if (!flag) {
    return <div className="glass-card p-12 rounded-2xl text-center text-rose-400 text-sm">Feature flag not found</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white tracking-tight">{flag.name}</h1>
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {flag.key}
            </span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {flag.type}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">Environment: <span className="text-slate-200 font-semibold">{flag.environment_name}</span></p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-medium text-xs transition-all flex items-center gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </button>

          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            <span>{updateMutation.isPending ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
          {success}
        </div>
      )}

      {/* Main Settings Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Basic Details & Rollout Slider */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="h-5 w-5 text-indigo-400" />
              Flag Controls
            </h2>

            {/* Status Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div>
                <span className="text-sm font-semibold text-white">Flag Status</span>
                <p className="text-xs text-slate-400">Master switch for serving this flag</p>
              </div>
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Rollout Percentage Slider */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Deterministic Rollout</span>
                <span className="font-mono text-sm font-bold text-indigo-400">{rolloutPercentage}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={rolloutPercentage}
                onChange={(e) => setRolloutPercentage(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                MurmurHash3 ensures users consistently fall in range 0–99 without random reshuffling.
              </p>
            </div>

            {/* Metadata inputs */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 space-y-1 text-xs">
              <span className="font-semibold text-slate-300">Total Evaluations</span>
              <p className="text-lg font-mono font-bold text-indigo-400">{flagData?.evaluationCount || 0}</p>
            </div>
          </div>
        </div>

        {/* Right Column: Targeting Rules & Multivariate Variants */}
        <div className="lg:col-span-2 space-y-6">
          {/* Targeting Rules Panel */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-indigo-400" />
                  Targeting Rules
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Override rollout and assign treatment to matching user attributes</p>
              </div>

              <button
                type="button"
                onClick={addRule}
                className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Rule</span>
              </button>
            </div>

            {targetRules.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 text-center text-xs text-slate-500">
                No targeting rules configured. All requests will follow standard deterministic rollout.
              </div>
            ) : (
              <div className="space-y-3">
                {targetRules.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <input
                      type="text"
                      placeholder="Attribute (e.g. country)"
                      value={rule.attribute}
                      onChange={(e) => {
                        const updated = [...targetRules];
                        updated[idx].attribute = e.target.value;
                        setTargetRules(updated);
                      }}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white flex-1 focus:outline-none focus:border-indigo-500"
                    />

                    <select
                      value={rule.operator}
                      onChange={(e) => {
                        const updated = [...targetRules];
                        updated[idx].operator = e.target.value;
                        setTargetRules(updated);
                      }}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="equals">equals</option>
                      <option value="not_equals">not_equals</option>
                      <option value="contains">contains</option>
                      <option value="in">in (list)</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Value (e.g. IN)"
                      value={rule.value}
                      onChange={(e) => {
                        const updated = [...targetRules];
                        updated[idx].value = e.target.value;
                        setTargetRules(updated);
                      }}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white flex-1 focus:outline-none focus:border-indigo-500"
                    />

                    <button
                      type="button"
                      onClick={() => removeRule(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Multivariate Variants Panel */}
          {flag.type === 'MULTIVARIATE' && (
            <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="h-5 w-5 text-purple-400" />
                    Multivariate Variants Allocation
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Configure variant keys and percentage weights (Sum must equal 100%)</p>
                </div>

                <button
                  type="button"
                  onClick={addVariant}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Variant</span>
                </button>
              </div>

              <div className="space-y-3">
                {variants.map((variant, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <input
                      type="text"
                      placeholder="Variant Key (e.g. treatment_a)"
                      value={variant.key}
                      onChange={(e) => {
                        const updated = [...variants];
                        updated[idx].key = e.target.value;
                        setVariants(updated);
                      }}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono flex-1 focus:outline-none focus:border-indigo-500"
                    />

                    <input
                      type="text"
                      placeholder="Description"
                      value={variant.description || ''}
                      onChange={(e) => {
                        const updated = [...variants];
                        updated[idx].description = e.target.value;
                        setVariants(updated);
                      }}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white flex-1 focus:outline-none focus:border-indigo-500"
                    />

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={variant.weight}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[idx].weight = Number(e.target.value);
                          setVariants(updated);
                        }}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono w-20 text-center focus:outline-none focus:border-indigo-500"
                      />
                      <span className="text-xs text-slate-400 font-bold">%</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeVariant(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-white">Delete Feature Flag</h3>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to permanently delete flag <span className="font-mono font-bold text-white">{flag.key}</span>? Applications evaluating this key will no longer receive rules.
            </p>
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
