import { Response } from 'express';
import crypto from 'crypto';
import { query } from '../../db/connection';
import { AuthenticatedRequest } from '../../middleware/auth';
import { logAuditRecord } from '../audit/audit.controller';
import { generateApiKey } from '../projects/projects.controller';

export const listEnvironments = async (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.params;
  try {
    const result = await query(
      `SELECT id, project_id, name, created_at, updated_at FROM environments WHERE project_id = $1 ORDER BY name ASC`,
      [projectId]
    );
    return res.json({ data: result.rows });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
};

export const regenerateApiKey = async (req: AuthenticatedRequest, res: Response) => {
  const { envId } = req.params;
  try {
    // Fetch environment and project key
    const envRes = await query(
      `SELECT e.*, p.key as project_key 
       FROM environments e 
       JOIN projects p ON e.project_id = p.id 
       WHERE e.id = $1`,
      [envId]
    );

    if (envRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'ENVIRONMENT_NOT_FOUND', message: 'Environment not found' } });
    }

    const env = envRes.rows[0];
    const { rawKey, hash } = generateApiKey(env.name, env.project_key);

    await query(
      `UPDATE environments SET api_key_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [hash, envId]
    );

    await logAuditRecord({
      userId: req.user?.id,
      projectId: env.project_id,
      action: 'API_KEY_REGENERATED',
      resourceType: 'ENVIRONMENT',
      resourceId: envId,
      metadata: { environmentName: env.name },
    });

    return res.json({
      environmentId: envId,
      environmentName: env.name,
      apiKey: rawKey, // Raw secret shown ONLY once
      message: 'Store this API Key securely. It will not be shown again.',
    });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
};

export const revokeApiKey = async (req: AuthenticatedRequest, res: Response) => {
  const { envId } = req.params;
  try {
    const envRes = await query(`SELECT project_id, name FROM environments WHERE id = $1`, [envId]);
    if (envRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'ENVIRONMENT_NOT_FOUND', message: 'Environment not found' } });
    }

    const env = envRes.rows[0];
    const dummyRevokedHash = crypto.createHash('sha256').update(`revoked_${Date.now()}_${Math.random()}`).digest('hex');

    await query(
      `UPDATE environments SET api_key_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [dummyRevokedHash, envId]
    );

    await logAuditRecord({
      userId: req.user?.id,
      projectId: env.project_id,
      action: 'API_KEY_REVOKED',
      resourceType: 'ENVIRONMENT',
      resourceId: envId,
      metadata: { environmentName: env.name },
    });

    return res.json({ message: 'API Key revoked successfully.' });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
};
