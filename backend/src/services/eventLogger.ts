import { query } from '../db/connection';

interface EvaluationEvent {
  environmentId: string;
  featureFlagId: string;
  userKey: string;
  variant: string;
}

let eventBuffer: EvaluationEvent[] = [];
let flushTimer: NodeJS.Timeout | null = null;

export function logEvaluationEventAsync(event: EvaluationEvent) {
  eventBuffer.push(event);

  if (eventBuffer.length >= 100) {
    flushEvents();
  } else if (!flushTimer) {
    flushTimer = setTimeout(flushEvents, 100);
  }
}

async function flushEvents() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (eventBuffer.length === 0) return;

  const eventsToFlush = eventBuffer;
  eventBuffer = [];

  try {
    const values: any[] = [];
    const valueTuples: string[] = [];

    eventsToFlush.forEach((e, idx) => {
      const baseIdx = idx * 4;
      valueTuples.push(`($${baseIdx + 1}, $${baseIdx + 2}, $${baseIdx + 3}, $${baseIdx + 4})`);
      values.push(e.environmentId, e.featureFlagId, e.userKey, e.variant);
    });

    const sql = `INSERT INTO evaluation_events (environment_id, feature_flag_id, user_key, variant) VALUES ${valueTuples.join(', ')}`;
    await query(sql, values);
  } catch (error: any) {
    console.error('[EventLogger Flush Failed]', error.message);
  }
}
