'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, ArrowRight, FolderKanban } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Panel } from '../../components/ui/Panel';
import { Modal } from '../../components/ui/Modal';

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => fetchApi('/projects'),
  });

  const createMutation = useMutation({
    mutationFn: (newProject: { name: string; key: string }) =>
      fetchApi('/projects', {
        method: 'POST',
        body: JSON.stringify(newProject),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowModal(false);
      setName('');
      setKey('');
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create project');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    createMutation.mutate({ name, key });
  };

  const projects = data?.data || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-base font-semibold text-zinc-100 tracking-tight">Project Workspaces</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Organize application feature flags, environments, and experiments</p>
        </div>

        <Button size="sm" onClick={() => setShowModal(true)} icon={<Plus className="h-3.5 w-3.5" />}>
          New Project
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 border border-zinc-800 rounded-md text-center text-zinc-500 text-xs font-mono">
          Loading project workspaces...
        </div>
      ) : projects.length === 0 ? (
        <Panel className="text-center py-12">
          <div className="mx-auto h-8 w-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
            <FolderKanban className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-semibold text-zinc-200">No Projects Configured</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            Create your first workspace to generate environment API keys and feature flags.
          </p>
          <div className="mt-4">
            <Button size="sm" onClick={() => setShowModal(true)}>
              Create Workspace
            </Button>
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project: any) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group bg-zinc-950 border border-zinc-800 hover:border-zinc-700 p-4 rounded-md transition-all block"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xs font-bold text-zinc-100 group-hover:text-white transition-colors">{project.name}</h3>
                  <span className="text-[11px] font-mono text-zinc-500">{project.key}</span>
                </div>
                <Badge variant="zinc">{project.flag_count || 0} Flags</Badge>
              </div>

              <div className="mt-6 pt-3 border-t border-zinc-900 flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span className="text-[11px] text-zinc-500">DEVELOPMENT • STAGING • PROD</span>
                <span className="text-zinc-300 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  Open <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal: Create Project */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Workspace Project"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </>
        }
      >
        {error && (
          <div className="p-3 rounded bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Project Name"
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!key) setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_'));
            }}
            placeholder="e.g. Mobile iOS Application"
          />

          <Input
            label="Project Key (Unique identifier)"
            type="text"
            mono
            required
            value={key}
            onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_'))}
            placeholder="e.g. mobile_ios"
          />
        </form>
      </Modal>
    </div>
  );
}
