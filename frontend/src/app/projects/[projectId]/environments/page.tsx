'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { KeyRound, RefreshCw, Trash2, Copy, Check, ShieldAlert } from 'lucide-react';
import { fetchApi } from '../../../../lib/api';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Badge } from '../../../../components/ui/Badge';
import { Panel } from '../../../../components/ui/Panel';
import { Modal } from '../../../../components/ui/Modal';

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
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-zinc-800/80">
        <h1 className="text-base font-semibold text-zinc-100 tracking-tight">Environment API Keys</h1>
        <p className="text-xs text-zinc-400 mt-0.5">Infrastructure SDK authentication keys for DEVELOPMENT, STAGING, and PRODUCTION</p>
      </div>

      {error && (
        <div className="p-3 rounded bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs font-mono">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="p-8 border border-zinc-800 rounded-md text-center text-zinc-500 text-xs font-mono">
          Loading environments...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {environments.map((env: any) => (
            <Panel
              key={env.id}
              action={
                <Badge
                  variant={env.name === 'PRODUCTION' ? 'emerald' : env.name === 'STAGING' ? 'amber' : 'zinc'}
                >
                  {env.name}
                </Badge>
              }
            >
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[11px] text-zinc-500 font-mono">API Key Status</span>
                  <div className="p-2 rounded bg-zinc-900 border border-zinc-800 font-mono text-[11px] text-zinc-400 truncate">
                    SHA256 Secret Hash Stored
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-900 pt-3 gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => revokeMutation.mutate(env.id)}
                    disabled={revokeMutation.isPending}
                    icon={<Trash2 className="h-3 w-3" />}
                  >
                    Revoke Key
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => regenMutation.mutate(env.id)}
                    disabled={regenMutation.isPending}
                    icon={<RefreshCw className="h-3 w-3" />}
                  >
                    Regenerate Key
                  </Button>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}

      {/* Secret Reveal Modal */}
      <Modal
        isOpen={Boolean(rawSecret)}
        onClose={() => setRawSecret(null)}
        title="Environment Secret Generated"
        footer={
          <Button size="sm" onClick={() => setRawSecret(null)}>
            Done
          </Button>
        }
      >
        <div className="p-3 rounded bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>
            <strong>IMPORTANT:</strong> Copy and store this secret key safely. It will <u>never</u> be shown again.
          </span>
        </div>

        <div className="relative">
          <Input
            mono
            readOnly
            value={rawSecret || ''}
            className="pr-12 text-emerald-400 font-mono font-bold"
          />
          <button
            onClick={copyToClipboard}
            className="absolute right-1.5 top-1.5 p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
            title="Copy Secret"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </Modal>
    </div>
  );
}
