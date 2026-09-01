'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { fetchApi } from '../../../../lib/api';
import { Badge } from '../../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../../components/ui/Table';

export default function AuditLogsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const { data, isLoading } = useQuery({
    queryKey: ['audit', projectId],
    queryFn: () => fetchApi(`/audit?projectId=${projectId}`),
  });

  const auditLogs = data?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-zinc-800/80">
        <h1 className="text-base font-semibold text-zinc-100 tracking-tight">Audit Log Stream</h1>
        <p className="text-xs text-zinc-400 mt-0.5">Append-only system record of configuration mutations and security actions</p>
      </div>

      {isLoading ? (
        <div className="p-8 border border-zinc-800 rounded-md text-center text-zinc-500 text-xs font-mono">
          Loading audit logs...
        </div>
      ) : auditLogs.length === 0 ? (
        <div className="p-8 border border-zinc-800 rounded-md text-center text-zinc-500 text-xs font-mono bg-zinc-950">
          No audit entries recorded for this workspace yet.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Payload Metadata</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {auditLogs.map((log: any) => (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-zinc-400 whitespace-nowrap text-[11px]">
                  {new Date(log.created_at).toLocaleString()}
                </TableCell>

                <TableCell className="font-semibold text-zinc-200">
                  {log.user_name || 'System / Service'}
                </TableCell>

                <TableCell>
                  <Badge variant="zinc">{log.action}</Badge>
                </TableCell>

                <TableCell className="font-mono text-zinc-400 text-[11px]">
                  {log.resource_type}
                </TableCell>

                <TableCell className="font-mono text-[11px] text-zinc-500 max-w-sm truncate">
                  {JSON.stringify(log.metadata)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
