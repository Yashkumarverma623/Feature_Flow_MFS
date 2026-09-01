import { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../../db/connection';
import { AuthenticatedRequest } from '../../middleware/auth';
import { logAuditRecord } from '../audit/audit.controller';

const createExperimentSchema = z.object({
  featureFlagId: z.string().uuid(),
  name: z.string().min(2),
  primaryMetric: z.string().min(1),
});

export const createExperiment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = createExperimentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid experiment configuration', details: parseResult.error.errors },
      });
    }

    const { featureFlagId, name, primaryMetric } = parseResult.data;

    // Check if flag exists
    const flagRes = await query(
      `SELECT ff.*, e.project_id 
       FROM feature_flags ff 
       JOIN environments e ON ff.environment_id = e.id 
       WHERE ff.id = $1`,
      [featureFlagId]
    );

    if (flagRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'FLAG_NOT_FOUND', message: 'Associated feature flag not found' } });
    }

    const flag = flagRes.rows[0];

    const expResult = await query(
      `INSERT INTO experiments (feature_flag_id, name, status, primary_metric)
       VALUES ($1, $2, 'DRAFT', $3)
       RETURNING *`,
      [featureFlagId, name, primaryMetric]
    );

    const experiment = expResult.rows[0];

    await logAuditRecord({
      userId: req.user?.id,
      projectId: flag.project_id,
      action: 'EXPERIMENT_CREATED',
      resourceType: 'EXPERIMENT',
      resourceId: experiment.id,
      metadata: { name, flagKey: flag.key, primaryMetric },
    });

    return res.status(201).json({ experiment });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
};

export const listExperiments = async (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.query;
  try {
    let sql = `
      SELECT exp.*, 
        ff.key as feature_flag_key, ff.name as feature_flag_name,
        e.name as environment_name, e.project_id
      FROM experiments exp
      JOIN feature_flags ff ON exp.feature_flag_id = ff.id
      JOIN environments e ON ff.environment_id = e.id
    `;
    const params: any[] = [];

    if (projectId) {
      sql += ` WHERE e.project_id = $1`;
      params.push(projectId);
    }

    sql += ` ORDER BY exp.created_at DESC`;

    const result = await query(sql, params);
    return res.json({ data: result.rows });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
};

export const getExperimentDetail = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const expRes = await query(
      `SELECT exp.*, ff.key as feature_flag_key, ff.name as feature_flag_name, e.project_id
       FROM experiments exp
       JOIN feature_flags ff ON exp.feature_flag_id = ff.id
       JOIN environments e ON ff.environment_id = e.id
       WHERE exp.id = $1`,
      [id]
    );

    if (expRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'EXPERIMENT_NOT_FOUND', message: 'Experiment not found' } });
    }

    return res.json({ experiment: expRes.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
};

export const updateExperimentStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `Status must be one of ${validStatuses.join(', ')}` } });
  }

  try {
    const expRes = await query(
      `SELECT exp.*, e.project_id 
       FROM experiments exp 
       JOIN feature_flags ff ON exp.feature_flag_id = ff.id 
       JOIN environments e ON ff.environment_id = e.id 
       WHERE exp.id = $1`,
      [id]
    );

    if (expRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'EXPERIMENT_NOT_FOUND', message: 'Experiment not found' } });
    }

    const exp = expRes.rows[0];

    const updatedRes = await query(
      `UPDATE experiments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, id]
    );

    await logAuditRecord({
      userId: req.user?.id,
      projectId: exp.project_id,
      action: `EXPERIMENT_${status}`,
      resourceType: 'EXPERIMENT',
      resourceId: id,
      metadata: { name: exp.name, previousStatus: exp.status, newStatus: status },
    });

    return res.json({ experiment: updatedRes.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
};

// Event tracking endpoint: POST /api/v1/experiments/{id}/events
export const recordExperimentEvent = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userKey, event, eventName } = req.body;
  const targetEvent = event || eventName;

  if (!userKey || !targetEvent) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'userKey and event name are required' },
    });
  }

  try {
    // Check experiment existence
    const expRes = await query('SELECT id, status FROM experiments WHERE id = $1', [id]);
    if (expRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'EXPERIMENT_NOT_FOUND', message: 'Experiment not found' } });
    }

    const experiment = expRes.rows[0];
    if (experiment.status !== 'RUNNING') {
      return res.status(400).json({
        error: { code: 'EXPERIMENT_NOT_RUNNING', message: `Cannot record events for experiment in ${experiment.status} status` },
      });
    }

    // Deduplicate identical event submissions within 5 seconds for same userKey & event_name
    const dupeCheck = await query(
      `SELECT id FROM experiment_events 
       WHERE experiment_id = $1 AND user_key = $2 AND event_name = $3 
         AND timestamp > NOW() - INTERVAL '5 seconds'`,
      [id, userKey, targetEvent]
    );

    if (dupeCheck.rows.length > 0) {
      return res.status(200).json({ message: 'Duplicate event ignored', recorded: false });
    }

    await query(
      `INSERT INTO experiment_events (experiment_id, user_key, event_name)
       VALUES ($1, $2, $3)`,
      [id, userKey, targetEvent]
    );

    return res.status(201).json({ message: 'Experiment event recorded successfully', recorded: true });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
};

// Experiment Analytics calculation from actual stored data
export const getExperimentAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const expRes = await query(
      `SELECT exp.*, ff.id as flag_id, ff.key as flag_key, ff.type as flag_type 
       FROM experiments exp 
       JOIN feature_flags ff ON exp.feature_flag_id = ff.id 
       WHERE exp.id = $1`,
      [id]
    );

    if (expRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'EXPERIMENT_NOT_FOUND', message: 'Experiment not found' } });
    }

    const experiment = expRes.rows[0];

    // Fetch evaluation events per variant
    const evalsPerVariantRes = await query(
      `SELECT variant, COUNT(DISTINCT user_key)::int as total_users, COUNT(*)::int as total_evaluations
       FROM evaluation_events
       WHERE feature_flag_id = $1
       GROUP BY variant`,
      [experiment.flag_id]
    );

    // Fetch conversions (unique users who triggered primary_metric event)
    const conversionsRes = await query(
      `SELECT ee.variant, COUNT(DISTINCT ee.user_key)::int as conversions
       FROM experiment_events expe
       JOIN evaluation_events ee ON ee.user_key = expe.user_key AND ee.feature_flag_id = $1
       WHERE expe.experiment_id = $2 AND expe.event_name = $3
       GROUP BY ee.variant`,
      [experiment.flag_id, id, experiment.primary_metric]
    );

    const conversionsMap = new Map<string, number>();
    conversionsRes.rows.forEach(r => conversionsMap.set(r.variant, Number(r.conversions)));

    const variantAnalytics = evalsPerVariantRes.rows.map(row => {
      const users = Number(row.total_users);
      const conversions = conversionsMap.get(row.variant) || 0;
      const rate = users > 0 ? Number(((conversions / users) * 100).toFixed(2)) : 0;
      return {
        variant: row.variant,
        users,
        evaluations: Number(row.total_evaluations),
        conversions,
        conversionRate: rate,
      };
    });

    const totalParticipants = variantAnalytics.reduce((acc, v) => acc + v.users, 0);
    const totalConversions = variantAnalytics.reduce((acc, v) => acc + v.conversions, 0);
    const overallConversionRate = totalParticipants > 0 ? Number(((totalConversions / totalParticipants) * 100).toFixed(2)) : 0;

    return res.json({
      experiment,
      totalParticipants,
      totalConversions,
      overallConversionRate,
      variants: variantAnalytics,
    });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
};
