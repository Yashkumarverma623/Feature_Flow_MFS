import { Response } from 'express';
import { z } from 'zod';
import { query } from '../../db/connection';
import { AuthenticatedRequest } from '../../middleware/auth';
import { deleteCache } from '../../services/redis';
import { broadcastSseEvent } from '../sse/sse.controller';
import { logAuditRecord } from '../audit/audit.controller';

const targetRuleSchema = z.object({
  attribute: z.string().min(1),
  operator: z.enum(['equals', 'not_equals', 'contains', 'in']),
  value: z.string(),
});

const variantSchema = z.object({
  key: z.string().min(1),
  description: z.string().optional(),
  weight: z.number().min(0).max(100),
});

const createFlagSchema = z.object({
  environmentId: z.string().uuid(),
  key: z.string().min(2).regex(/^[a-z0-9_-]+$/i, 'Key must contain only letters, numbers, hyphens, and underscores'),
  name: z.string().min(2),
  description: z.string().optional(),
  type: z.enum(['BOOLEAN', 'MULTIVARIATE']),
  enabled: z.boolean().default(false),
  rolloutPercentage: z.number().min(0).max(100).default(0),
  targetRules: z.array(targetRuleSchema).optional().default([]),
  variants: z.array(variantSchema).optional().default([]),
});

export const createFlag = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = createFlagSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid feature flag configuration', details: parseResult.error.errors },
      });
    }

    const { environmentId, key, name, description, type, enabled, rolloutPercentage, targetRules, variants } = parseResult.data;

    // Validate multivariate weights sum if MULTIVARIATE
    if (type === 'MULTIVARIATE' && variants.length > 0) {
      const sumWeight = variants.reduce((acc, v) => acc + v.weight, 0);
      if (Math.abs(sumWeight - 100) > 0.1) {
        return res.status(400).json({
          error: { code: 'INVALID_VARIANT_WEIGHTS', message: 'Multivariate variant weights must sum to 100%' },
        });
      }
    }

    // Check duplicate key in environment
    const existing = await query('SELECT id FROM feature_flags WHERE environment_id = $1 AND key = $2', [environmentId, key]);
    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: { code: 'DUPLICATE_FLAG_KEY', message: 'Feature flag key already exists in this environment' },
      });
    }

    // Get project_id for audit logs
    const envRes = await query('SELECT project_id FROM environments WHERE id = $1', [environmentId]);
    const projectId = envRes.rows[0]?.project_id;

    // Insert flag
    const flagResult = await query(
      `INSERT INTO feature_flags (environment_id, key, name, description, type, enabled, rollout_percentage)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [environmentId, key, name, description || '', type, enabled, rolloutPercentage]
    );

    const flag = flagResult.rows[0];

    // Insert target rules
    for (const rule of targetRules) {
      await query(
        `INSERT INTO target_rules (feature_flag_id, attribute, operator, value)
         VALUES ($1, $2, $3, $4)`,
        [flag.id, rule.attribute, rule.operator, rule.value]
      );
    }

    // Insert variants
    for (const v of variants) {
      await query(
        `INSERT INTO variants (feature_flag_id, key, description, weight)
         VALUES ($1, $2, $3, $4)`,
        [flag.id, v.key, v.description || '', v.weight]
      );
    }

    // Invalidate Redis Cache & Broadcast SSE
    await deleteCache(`flag:env:${environmentId}:key:${key}`);
    broadcastSseEvent('FLAG_CREATED', { flagId: flag.id, key, environmentId });

    await logAuditRecord({
      userId: req.user?.id,
      projectId,
      action: 'FLAG_CREATED',
      resourceType: 'FEATURE_FLAG',
      resourceId: flag.id,
      metadata: { key, name, enabled, rolloutPercentage },
    });

    return res.status(201).json({ flag, targetRules, variants });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
};

export const listFlags = async (req: AuthenticatedRequest, res: Response) => {
  const { environmentId } = req.query;
  try {
    let sql = `
      SELECT ff.*, 
        e.name as environment_name,
        p.id as project_id, p.name as project_name,
        COALESCE(eval_count.total, 0)::int as evaluation_count
      FROM feature_flags ff
      JOIN environments e ON ff.environment_id = e.id
      JOIN projects p ON e.project_id = p.id
      LEFT JOIN (
        SELECT feature_flag_id, COUNT(*)::int as total
        FROM evaluation_events
        GROUP BY feature_flag_id
      ) eval_count ON eval_count.feature_flag_id = ff.id
    `;
    const params: any[] = [];

    if (environmentId) {
      sql += ` WHERE ff.environment_id = $1`;
      params.push(environmentId);
    }

    sql += ` ORDER BY ff.updated_at DESC`;

    const result = await query(sql, params);
    return res.json({ data: result.rows });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
};

export const getFlagDetail = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const flagRes = await query(
      `SELECT ff.*, e.name as environment_name, e.project_id 
       FROM feature_flags ff 
       JOIN environments e ON ff.environment_id = e.id 
       WHERE ff.id = $1`,
      [id]
    );

    if (flagRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'FLAG_NOT_FOUND', message: 'Feature flag does not exist' } });
    }

    const flag = flagRes.rows[0];
    const rulesRes = await query('SELECT * FROM target_rules WHERE feature_flag_id = $1', [id]);
    const variantsRes = await query('SELECT * FROM variants WHERE feature_flag_id = $1 ORDER BY weight DESC', [id]);
    const evalCountRes = await query('SELECT COUNT(*)::int as count FROM evaluation_events WHERE feature_flag_id = $1', [id]);

    return res.json({
      flag,
      targetRules: rulesRes.rows,
      variants: variantsRes.rows,
      evaluationCount: evalCountRes.rows[0]?.count || 0,
    });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
};

export const updateFlag = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const flagRes = await query('SELECT * FROM feature_flags WHERE id = $1', [id]);
    if (flagRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'FLAG_NOT_FOUND', message: 'Feature flag does not exist' } });
    }
    const currentFlag = flagRes.rows[0];

    const { name, description, enabled, rolloutPercentage, targetRules, variants } = req.body;

    const envRes = await query('SELECT project_id FROM environments WHERE id = $1', [currentFlag.environment_id]);
    const projectId = envRes.rows[0]?.project_id;

    let updatedEnabled = currentFlag.enabled;
    if (typeof enabled === 'boolean') updatedEnabled = enabled;

    let updatedRollout = currentFlag.rollout_percentage;
    if (typeof rolloutPercentage === 'number') updatedRollout = Math.min(100, Math.max(0, rolloutPercentage));

    // Update flag basic details
    const updatedRes = await query(
      `UPDATE feature_flags 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           enabled = $3,
           rollout_percentage = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [name || null, description !== undefined ? description : null, updatedEnabled, updatedRollout, id]
    );

    // Update target rules if provided
    if (Array.isArray(targetRules)) {
      await query('DELETE FROM target_rules WHERE feature_flag_id = $1', [id]);
      for (const rule of targetRules) {
        await query(
          `INSERT INTO target_rules (feature_flag_id, attribute, operator, value) VALUES ($1, $2, $3, $4)`,
          [id, rule.attribute, rule.operator, rule.value]
        );
      }
    }

    // Update variants if provided
    if (Array.isArray(variants)) {
      await query('DELETE FROM variants WHERE feature_flag_id = $1', [id]);
      for (const v of variants) {
        await query(
          `INSERT INTO variants (feature_flag_id, key, description, weight) VALUES ($1, $2, $3, $4)`,
          [id, v.key, v.description || '', v.weight]
        );
      }
    }

    // Invalidate Redis Cache & Broadcast SSE
    await deleteCache(`flag:env:${currentFlag.environment_id}:key:${currentFlag.key}`);
    broadcastSseEvent('FLAG_UPDATED', { flagId: id, key: currentFlag.key, enabled: updatedEnabled, rolloutPercentage: updatedRollout });

    await logAuditRecord({
      userId: req.user?.id,
      projectId,
      action: 'FLAG_UPDATED',
      resourceType: 'FEATURE_FLAG',
      resourceId: id,
      metadata: { key: currentFlag.key, enabled: updatedEnabled, rolloutPercentage: updatedRollout },
    });

    return res.json({ flag: updatedRes.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
};

export const toggleFlagStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'enabled field must be boolean' } });
  }

  try {
    const flagRes = await query('SELECT * FROM feature_flags WHERE id = $1', [id]);
    if (flagRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'FLAG_NOT_FOUND', message: 'Feature flag does not exist' } });
    }
    const currentFlag = flagRes.rows[0];

    const envRes = await query('SELECT project_id FROM environments WHERE id = $1', [currentFlag.environment_id]);
    const projectId = envRes.rows[0]?.project_id;

    const updatedRes = await query(
      `UPDATE feature_flags SET enabled = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [enabled, id]
    );

    // Invalidate Cache & Broadcast SSE
    await deleteCache(`flag:env:${currentFlag.environment_id}:key:${currentFlag.key}`);
    broadcastSseEvent('FLAG_UPDATED', { flagId: id, key: currentFlag.key, enabled });

    await logAuditRecord({
      userId: req.user?.id,
      projectId,
      action: enabled ? 'FLAG_ENABLED' : 'FLAG_DISABLED',
      resourceType: 'FEATURE_FLAG',
      resourceId: id,
      metadata: { key: currentFlag.key, enabled },
    });

    return res.json({ flag: updatedRes.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
};

export const deleteFlag = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const flagRes = await query('SELECT * FROM feature_flags WHERE id = $1', [id]);
    if (flagRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'FLAG_NOT_FOUND', message: 'Feature flag does not exist' } });
    }
    const currentFlag = flagRes.rows[0];

    const envRes = await query('SELECT project_id FROM environments WHERE id = $1', [currentFlag.environment_id]);
    const projectId = envRes.rows[0]?.project_id;

    await query('DELETE FROM feature_flags WHERE id = $1', [id]);

    // Invalidate Cache & Broadcast SSE
    await deleteCache(`flag:env:${currentFlag.environment_id}:key:${currentFlag.key}`);
    broadcastSseEvent('FLAG_DELETED', { flagId: id, key: currentFlag.key, environmentId: currentFlag.environment_id });

    await logAuditRecord({
      userId: req.user?.id,
      projectId,
      action: 'FLAG_DELETED',
      resourceType: 'FEATURE_FLAG',
      resourceId: id,
      metadata: { key: currentFlag.key },
    });

    return res.json({ message: 'Feature flag deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
};
