import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authenticateJwt, requireRole } from './middleware/auth';
import { authRateLimiter, mutationRateLimiter, evaluationRateLimiter, eventRateLimiter } from './middleware/rateLimiter';
import * as authController from './modules/auth/auth.controller';
import * as projectsController from './modules/projects/projects.controller';
import * as envsController from './modules/environments/environments.controller';
import * as flagsController from './modules/flags/flags.controller';
import * as evalController from './modules/evaluation/evaluation.controller';
import * as expController from './modules/experiments/experiments.controller';
import * as auditController from './modules/audit/audit.controller';
import * as sseController from './modules/sse/sse.controller';

const app = express();

// Security and standard middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Healthcheck
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// --- Authentication Routes ---
app.post('/api/v1/auth/register', authRateLimiter, authController.register);
app.post('/api/v1/auth/login', authRateLimiter, authController.login);
app.get('/api/v1/auth/me', authenticateJwt, authController.getCurrentUser);

// --- Projects Routes ---
app.post('/api/v1/projects', authenticateJwt, requireRole(['OWNER']), projectsController.createProject);
app.get('/api/v1/projects', authenticateJwt, projectsController.listProjects);
app.get('/api/v1/projects/:id', authenticateJwt, projectsController.getProject);
app.patch('/api/v1/projects/:id', authenticateJwt, requireRole(['OWNER']), projectsController.renameProject);
app.delete('/api/v1/projects/:id', authenticateJwt, requireRole(['OWNER']), projectsController.deleteProject);

// --- Environments Routes ---
app.get('/api/v1/projects/:projectId/environments', authenticateJwt, envsController.listEnvironments);
app.post('/api/v1/environments/:envId/regenerate-key', authenticateJwt, requireRole(['OWNER']), envsController.regenerateApiKey);
app.post('/api/v1/environments/:envId/revoke-key', authenticateJwt, requireRole(['OWNER']), envsController.revokeApiKey);

// --- Feature Flags Routes ---
app.post('/api/v1/flags', authenticateJwt, requireRole(['OWNER', 'MEMBER']), mutationRateLimiter, flagsController.createFlag);
app.get('/api/v1/flags', authenticateJwt, flagsController.listFlags);
app.get('/api/v1/flags/:id', authenticateJwt, flagsController.getFlagDetail);
app.put('/api/v1/flags/:id', authenticateJwt, requireRole(['OWNER', 'MEMBER']), mutationRateLimiter, flagsController.updateFlag);
app.patch('/api/v1/flags/:id/toggle', authenticateJwt, requireRole(['OWNER', 'MEMBER']), mutationRateLimiter, flagsController.toggleFlagStatus);
app.delete('/api/v1/flags/:id', authenticateJwt, requireRole(['OWNER', 'MEMBER']), mutationRateLimiter, flagsController.deleteFlag);

// --- Evaluation API (SDK & Apps) ---
app.get('/api/v1/evaluate/:flagKey', evaluationRateLimiter, evalController.evaluateFlagEndpoint);
app.post('/api/v1/evaluate/:flagKey', evaluationRateLimiter, evalController.evaluateFlagEndpoint);

// --- Experiments Routes ---
app.post('/api/v1/experiments', authenticateJwt, requireRole(['OWNER', 'MEMBER']), expController.createExperiment);
app.get('/api/v1/experiments', authenticateJwt, expController.listExperiments);
app.get('/api/v1/experiments/:id', authenticateJwt, expController.getExperimentDetail);
app.patch('/api/v1/experiments/:id/status', authenticateJwt, requireRole(['OWNER', 'MEMBER']), expController.updateExperimentStatus);
app.get('/api/v1/experiments/:id/analytics', authenticateJwt, expController.getExperimentAnalytics);
app.post('/api/v1/experiments/:id/events', eventRateLimiter, expController.recordExperimentEvent);

// --- Audit History Routes ---
app.get('/api/v1/audit', authenticateJwt, auditController.getAuditLogs);

// --- Server-Sent Events (SSE) Route ---
app.get('/api/v1/sse', sseController.handleSseConnection);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred',
      requestId: req.headers['x-request-id'] || `req_${Date.now()}`,
    },
  });
});

export default app;
