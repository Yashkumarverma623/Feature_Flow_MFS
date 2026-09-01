import { Request, Response } from 'express';
import { query } from '../../db/connection';
import { AuthenticatedRequest } from '../../middleware/auth';

export async function logAuditRecord({
  userId,
  projectId,
  action,
  resourceType,
  resourceId,
  metadata = {},
}: {
  userId?: string | null;
  projectId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, any>;
}) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, project_id, action, resource_type, resource_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId || null, projectId || null, action, resourceType, resourceId || null, JSON.stringify(metadata)]
    );
  } catch (error) {
    console.error('[Audit Logger Error]', error);
  }
}

export const getAuditLogs = async (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.query;
  try {
    let sql = `
      SELECT a.*, u.name as user_name, u.email as user_email 
      FROM audit_logs a 
      LEFT JOIN users u ON a.user_id = u.id
    `;
    const params: any[] = [];

    if (projectId) {
      sql += ` WHERE a.project_id = $1`;
      params.push(projectId);
    }

    sql += ` ORDER BY a.created_at DESC LIMIT 100`;

    const result = await query(sql, params);
    return res.json({ data: result.rows });
  } catch (error: any) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
};
