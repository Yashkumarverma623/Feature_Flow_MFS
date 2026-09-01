'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { KeyRound, RefreshCw, Trash2, Copy, Check, Eye, X, ShieldAlert } from 'lucide-react';
import { fetchApi } from '../../../../lib/api';

export default function EnvironmentsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();

  const [rawSecret, setRawSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['environments', projectId],
    queryFn: () => fetchApi(`/projects/${projectId}/environments`),
  });

  const regenMutation = useMutation({
    mutationFn: (envId: string) =>
      fetchApi(`/environments/${envId}/regenerate-key`, {
        method: 'POST',
      }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['environments', projectId] });
      setRawSecret(res.apiKey);
    },
    onError: (err: any) => setError(err.message || 'Failed to regenerate key'),
  });

  const revokeMutation = useMutation({
    mutationFn: (envId: string) =>
      fetchApi(`/environments/${envId}/revoke-key`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments', projectId] });
    },
    onError: (err: any) => setError(err.message || 'Failed to revoke key'),
  });

  const copyToClipboard = () => {
    if (rawSecret) {
      navigator.clipboard.writeText(rawSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const environments = data?.data || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Environment API Keys</h1>
        <p className="text-sm text-slate-400 mt-1">Manage SDK authentication keys for DEVELOPMENT, STAGING, and PRODUCTION</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="glass-card p-12 rounded-2xl text-center text-slate-500 text-sm">Loading environments...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {environments.map((env: any) => (
            <div key={env.id} className="glass-card p-6 rounded-2xl border border-slate-800 space-y-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                    env.name === 'PRODUCTION'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : env.name === 'STAGING'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  }`}>
                    {env.name}
                  </span>
                  <KeyRound className="h-5 w-5 text-slate-500" />
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-slate-500">API Key Hash Status</span>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-400 truncate">
                    SHA256 Encrypted Hash Stored
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 gap-2">
                <button
                  onClick={() => revokeMutation.mutate(env.id)}
                  disabled={revokeMutation.isPending}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Revoke</span>
                </button>

                <button
                  onClick={() => regenMutation.mutate(env.id)}
                  disabled={regenMutation.isPending}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-1"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Regenerate Secret</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Raw Secret Reveal Modal */}
      {rawSecret && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-slate-800 space-y-6">
            <div className="flex items-center justify-between text-indigo-400">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-6 w-6" />
                <h2 className="text-xl font-bold text-white">Environment API Key Created</h2>
              </div>
              <button onClick={() => setRawSecret(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
              <strong>IMPORTANT:</strong> Save this raw API secret now. It will <u>never</u> be displayed again.
            </div>

            <div className="relative">
              <input
                type="text"
                readOnly
                value={rawSecret}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3 pr-12 text-sm font-mono text-emerald-400 focus:outline-none"
              />
              <button
                onClick={copyToClipboard}
                className="absolute right-2 top-2 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                title="Copy to Clipboard"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setRawSecret(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
