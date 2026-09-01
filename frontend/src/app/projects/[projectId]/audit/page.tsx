'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { ShieldAlert, User, Clock, Tag } from 'lucide-react';
import { fetchApi } from '../../../../lib/api';

export default function AuditLogsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const { data, isLoading } = useQuery({
    queryKey: ['audit', projectId],
    queryFn: () => fetchApi(`/audit?projectId=${projectId}`),
  });

  const auditLogs = data?.data || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Audit Log History</h1>
        <p className="text-sm text-slate-400 mt-1">Append-only audit record of project changes, flag mutations, and environment updates</p>
      </div>

      {isLoading ? (
        <div className="glass-card p-12 rounded-2xl text-center text-slate-500 text-sm">Loading audit logs...</div>
      ) : auditLogs.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl text-center text-slate-500 text-sm border border-slate-800">
          No audit history recorded for this project yet.
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Actor</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Resource</th>
                  <th className="p-4">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {auditLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-4 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-4 font-semibold text-white">
                      {log.user_name || 'System / Service'}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300 font-mono">
                      {log.resource_type}
                    </td>
                    <td className="p-4 font-mono text-[11px] text-slate-400 max-w-xs truncate">
                      {JSON.stringify(log.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
