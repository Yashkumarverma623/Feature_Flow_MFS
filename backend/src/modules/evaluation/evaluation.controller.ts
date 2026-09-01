import { Request, Response } from 'express';
import crypto from 'crypto';
import { query } from '../../db/connection';
import { getCache, setCache } from '../../services/redis';
import { evaluateFlag, FeatureFlagConfig } from '../../services/rollout';
import { logEvaluationEventAsync } from '../../services/eventLogger';

export const evaluateFlagEndpoint = async (req: Request, res: Response) => {
  const { flagKey } = req.params;
  const authHeader = req.headers.authorization;
  const userKeyHeader = req.headers['x-user-key'] || req.query.userKey || req.query.user_key;

  const requestId = req.headers['x-request-id'] as string || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Step 1: Validate Environment API Key
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'INVALID_API_KEY',
        message: 'Missing or malformed Authorization header. Use Bearer <environment-api-key>',
        requestId,
      },
    });
  }

  const rawApiKey = authHeader.substring(7).trim();
  if (!rawApiKey) {
    return res.status(401).json({
      error: {
        code: 'INVALID_API_KEY',
        message: 'Environment API key is required',
        requestId,
      },
    });
  }

  // Step 2: Validate User Key
  if (!userKeyHeader || typeof userKeyHeader !== 'string' || userKeyHeader.trim() === '') {
    return res.status(400).json({
      error: {
        code: 'MISSING_USER_KEY',
        message: 'X-User-Key header is required for evaluation',
        requestId,
      },
    });
  }

  const userKey = userKeyHeader.trim();

  // Hash raw key to lookup environment
  const apiKeyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');

  try {
    const envCacheKey = `env:hash:${apiKeyHash}`;
    let environment = await getCache<{ id: string; project_id: string; name: string }>(envCacheKey);

    if (!environment) {
      // Lookup environment by hash from DB on cache miss
      const envRes = await query('SELECT id, project_id, name FROM environments WHERE api_key_hash = $1', [apiKeyHash]);
      if (envRes.rows.length === 0) {
        return res.status(401).json({
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid or revoked environment API key',
            requestId,
          },
        });
      }
      environment = envRes.rows[0];
      await setCache(envCacheKey, environment, 600);
    }

    if (!environment) {
      return res.status(401).json({
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid or revoked environment API key',
          requestId,
        },
      });
    }

    const cacheKey = `flag:env:${environment.id}:key:${flagKey}`;

    // Step 3: Check Redis Cache (with graceful Postgres fallback)
    let flagConfig: FeatureFlagConfig | null = await getCache<FeatureFlagConfig>(cacheKey);

    if (!flagConfig) {
      // Cache miss -> Query Postgres
      const flagDbRes = await query(
        `SELECT id, environment_id, key, type, enabled, rollout_percentage 
         FROM feature_flags 
         WHERE environment_id = $1 AND key = $2`,
        [environment.id, flagKey]
      );

      if (flagDbRes.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: 'FLAG_NOT_FOUND',
            message: `Feature flag '${flagKey}' does not exist in environment '${environment.name}'`,
            requestId,
          },
        });
      }

      const flagRow = flagDbRes.rows[0];

      // Fetch target rules
      const rulesRes = await query(
        'SELECT attribute, operator, value FROM target_rules WHERE feature_flag_id = $1',
        [flagRow.id]
      );

      // Fetch variants
      const variantsRes = await query(
        'SELECT key, description, weight FROM variants WHERE feature_flag_id = $1 ORDER BY weight DESC',
        [flagRow.id]
      );

      flagConfig = {
        id: flagRow.id,
        key: flagRow.key,
        type: flagRow.type,
        enabled: flagRow.enabled,
        rollout_percentage: flagRow.rollout_percentage,
        target_rules: rulesRes.rows,
        variants: variantsRes.rows,
      };

      // Cache flag config for 5 minutes
      await setCache(cacheKey, flagConfig, 300);
    }

    // Step 4: Parse user attributes from request query or body
    let userAttributes: Record<string, any> = {};
    if (req.method === 'POST' && req.body && typeof req.body === 'object') {
      userAttributes = { ...req.body };
    } else {
      // Extract from query params excluding standard system keys
      const { userKey: _uk, user_key: _uk2, ...restQuery } = req.query;
      userAttributes = { ...restQuery };
    }

    // Step 5: Deterministic Evaluation
    const decision = evaluateFlag(flagConfig, userKey, userAttributes);

    // Step 6: Asynchronous Evaluation Event Logging (Batched)
    logEvaluationEventAsync({
      environmentId: environment.id,
      featureFlagId: flagConfig.id,
      userKey,
      variant: decision.variant,
    });

    // Step 7: Return evaluation response format
    return res.json({
      flagKey: decision.flagKey,
      enabled: decision.enabled,
      variant: decision.variant,
    });
  } catch (error: any) {
    console.error('[Evaluation Engine Error]', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during feature flag evaluation',
        requestId,
      },
    });
  }
};
