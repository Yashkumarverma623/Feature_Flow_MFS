'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Flag, KeyRound, FlaskConical, Shield, ArrowRight } from 'lucide-react';
import { fetchApi } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Panel } from '../../../components/ui/Panel';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const { data: projData, isLoading: loadingProj } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchApi(`/projects/${projectId}`),
  });

  const { data: envsData } = useQuery({
    queryKey: ['environments', projectId],
    queryFn: () => fetchApi(`/projects/${projectId}/environments`),
  });

  const project = projData?.project;
  const environments = envsData?.data || [];

  if (loadingProj) {
    return (
      <div className="p-8 border border-zinc-800 rounded-md text-center text-zinc-500 text-xs font-mono">
        Loading project workspace...
      </div>
    );
  }

  if (!project) {
    return (
      <Panel className="text-center py-8">
        <p className="text-rose-400 text-xs font-mono">Project not found or access denied.</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-semibold text-zinc-100 tracking-tight">{project.name}</h1>
            <Badge variant="zinc">{project.key}</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">Workspace control plane for flags, environments, and experiments</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/projects/${projectId}/flags`}>
            <Button size="sm" icon={<Flag className="h-3.5 w-3.5" />}>
              Manage Feature Flags
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Navigation Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Link
          href={`/projects/${projectId}/flags`}
          className="group bg-zinc-950 border border-zinc-800 hover:border-zinc-700 p-4 rounded-md transition-all block"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-200">
            <span>Feature Flags</span>
            <Flag className="h-4 w-4 text-zinc-400 group-hover:text-white" />
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">Targeted rollouts, boolean & multivariate flags</p>
        </Link>

        <Link
          href={`/projects/${projectId}/experiments`}
          className="group bg-zinc-950 border border-zinc-800 hover:border-zinc-700 p-4 rounded-md transition-all block"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-200">
            <span>Experiments</span>
            <FlaskConical className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">A/B testing, conversion tracking & metrics</p>
        </Link>

        <Link
          href={`/projects/${projectId}/environments`}
          className="group bg-zinc-950 border border-zinc-800 hover:border-zinc-700 p-4 rounded-md transition-all block"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-200">
            <span>Environments</span>
            <KeyRound className="h-4 w-4 text-zinc-400 group-hover:text-white" />
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">API key management for DEV, STAGING, PROD</p>
        </Link>

        <Link
          href={`/projects/${projectId}/audit`}
          className="group bg-zinc-950 border border-zinc-800 hover:border-zinc-700 p-4 rounded-md transition-all block"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-200">
            <span>Audit History</span>
            <Shield className="h-4 w-4 text-zinc-400 group-hover:text-white" />
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">Append-only system activity log</p>
        </Link>
      </div>

      {/* Environments Status Table */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Configured Environments</h2>
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Environment</TableHead>
              <TableHead>API Key Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {environments.map((env: any) => (
              <TableRow key={env.id}>
                <TableCell className="font-semibold text-zinc-200">
                  <Badge
                    variant={env.name === 'PRODUCTION' ? 'emerald' : env.name === 'STAGING' ? 'amber' : 'zinc'}
                  >
                    {env.name}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-zinc-400 text-[11px]">API Key Configured</TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/projects/${projectId}/environments`}
                    className="text-xs text-zinc-300 hover:text-white font-medium inline-flex items-center gap-1"
                  >
                    <span>Manage Keys</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
