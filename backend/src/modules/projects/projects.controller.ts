import { Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { query } from '../../db/connection';
import { AuthenticatedRequest } from '../../middleware/auth';
import { logAuditRecord } from '../audit/audit.controller';

const createProjectSchema = z.object({
  name: z.string().min(2),
  key: z.string().min(2).regex(/^[a-z0-9_-]+$/i, 'Key must contain only letters, numbers, hyphens, and underscores'),
});

// Utility to generate secure environment API keys
export function generateApiKey(envName: string, projectKey: string): { rawKey: string; hash: string } {
  const secretBytes = crypto.randomBytes(24).toString('hex');
  const rawKey = `ff_${envName.toLowerCase()}_${projectKey}_${secretBytes}`;
  const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
  return { rawKey, hash };
}

export const createProject = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = createProjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid project payload', details: parseResult.error.errors },
      });
    }

    const { name, key } = parseResult.data;

    // Check duplicate key
    const existing = await query('SELECT id FROM projects WHERE key = $1', [key]);
    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: { code: 'PROJECT_EXISTS', message: 'Project key already exists' },
      });
    }

    // Insert project
    const projResult = await query(
      `INSERT INTO projects (name, key) VALUES ($1, $2) RETURNING *`,
      [name, key]
    );
    const project = projResult.rows[0];

    // Automatically provision DEVELOPMENT, STAGING, PRODUCTION environments
    const defaultEnvs = ['DEVELOPMENT', 'STAGING', 'PRODUCTION'];
    const createdEnvs: any[] = [];

    for (const envName of defaultEnvs) {
      const { rawKey, hash } = generateApiKey(envName, key);
      const envRes = await query(
        `INSERT INTO environments (project_id, name, api_key_hash)
         VALUES ($1, $2, $3)
         RETURNING id, project_id, name, created_at`,
        [project.id, envName, hash]
      );

      const envObj = envRes.rows[0];
      // Attach rawKey to return ONCE to user
      createdEnvs.push({
        ...envObj,
        apiKey: rawKey,
      });
    }

    await logAuditRecord({
      userId: req.user?.id,
      projectId: project.id,
      action: 'PROJECT_CREATED',
      resourceType: 'PROJECT',
      resourceId: project.id,
      metadata: { name: project.name, key: project.key },
    });

    return res.status(201).json({
      project,
      environments: createdEnvs,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
};

export const listProjects = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT p.*, 
        COUNT(DISTINCT e.id)::int as environment_count,
        COUNT(DISTINCT ff.id)::int as flag_count
      FROM projects p
      LEFT JOIN environments e ON e.project_id = p.id
      LEFT JOIN feature_flags ff ON ff.environment_id = e.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    return res.json({ data: result.rows });
  } catch (error: any) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
};

export const getProject = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const projResult = await query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projResult.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found' },
      });
    }
    const project = projResult.rows[0];

    const envsResult = await query('SELECT id, project_id, name, created_at FROM environments WHERE project_id = $1', [id]);

    return res.json({
      project,
      environments: envsResult.rows,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
};

export const renameProject = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Valid name required' } });
  }

  try {
    const result = await query(
      `UPDATE projects SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [name.trim(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found' } });
    }

    await logAuditRecord({
      userId: req.user?.id,
      projectId: id,
      action: 'PROJECT_RENAMED',
      resourceType: 'PROJECT',
      resourceId: id,
      metadata: { newName: name },
    });

    return res.json({ project: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
};

export const deleteProject = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found' } });
    }

    await logAuditRecord({
      userId: req.user?.id,
      projectId: id,
      action: 'PROJECT_DELETED',
      resourceType: 'PROJECT',
      resourceId: id,
    });

    return res.json({ message: 'Project deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
};
