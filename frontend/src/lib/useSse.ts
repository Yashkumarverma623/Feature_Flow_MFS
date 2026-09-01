'use client';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export function useSseLiveUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE}/sse`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (['FLAG_UPDATED', 'FLAG_CREATED', 'FLAG_DELETED', 'EXPERIMENT_UPDATED'].includes(data.type)) {
          // Invalidate queries so dashboard and lists automatically refetch fresh data
          queryClient.invalidateQueries({ queryKey: ['flags'] });
          queryClient.invalidateQueries({ queryKey: ['experiments'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['audit'] });
        }
      } catch (err) {
        console.error('[SSE Parse Error]', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [queryClient]);
}
