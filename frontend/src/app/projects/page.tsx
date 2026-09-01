'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { FolderKanban, Plus, X, Layers, ArrowRight } from 'lucide-react';
import { fetchApi } from '../../lib/api';

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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Projects</h1>
          <p className="text-sm text-slate-400 mt-1">Manage project workspaces and flag releases</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/30 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>New Project</span>
        </button>
      </div>

      {isLoading ? (
        <div className="glass-card p-12 rounded-2xl text-center text-slate-500 text-sm">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl text-center space-y-4 border border-slate-800">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <FolderKanban className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-white">No Projects Found</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">Create your first project to start creating feature flags and experiments.</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
          >
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project: any) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-indigo-500/50 block group transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg text-white group-hover:text-indigo-400 transition-colors">{project.name}</h3>
                  <span className="text-xs font-mono text-slate-400">{project.key}</span>
                </div>
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Layers className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-4">
                <span>{project.flag_count || 0} Flags</span>
                <span className="text-indigo-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Open Project <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Create New Project</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Project Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!key) setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_'));
                  }}
                  placeholder="e.g. Mobile App"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Project Key</label>
                <input
                  type="text"
                  name="key"
                  required
                  value={key}
                  onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_'))}
                  placeholder="e.g. mobile_app"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
