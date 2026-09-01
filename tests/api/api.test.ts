import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../backend/src/app';

describe('FeatureFlow API Integration Test Suite', () => {
  let authToken: string;
  let projectId: string;
  let envId: string;
  let apiKey: string;
  let flagId: string;
  let experimentId: string;

  const testUser = {
    email: `test_dev_${Date.now()}@example.com`,
    name: 'Dev Engineer',
    password: 'password123',
    role: 'OWNER',
  };

  it('1. Register a new user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);
    authToken = res.body.token;
  });

  it('2. Login user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('3. Create a new Project', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Mobile App', key: `mobile_app_${Date.now()}` });

    expect(res.status).toBe(201);
    expect(res.body.project.id).toBeDefined();
    expect(res.body.environments).toHaveLength(3); // DEVELOPMENT, STAGING, PRODUCTION

    projectId = res.body.project.id;
    const prodEnv = res.body.environments.find((e: any) => e.name === 'PRODUCTION');
    expect(prodEnv).toBeDefined();
    envId = prodEnv.id;
    apiKey = prodEnv.apiKey;
  });

  it('4. Create a Feature Flag', async () => {
    const res = await request(app)
      .post('/api/v1/flags')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        environmentId: envId,
        key: 'new_checkout',
        name: 'New Checkout Experience',
        type: 'MULTIVARIATE',
        enabled: true,
        rolloutPercentage: 50,
        targetRules: [
          { attribute: 'country', operator: 'equals', value: 'IN' }
        ],
        variants: [
          { key: 'control', weight: 50 },
          { key: 'treatment', weight: 50 }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.flag.id).toBeDefined();
    flagId = res.body.flag.id;
  });

  it('5. Evaluate Flag via Evaluation API with API Key authentication', async () => {
    const res = await request(app)
      .get('/api/v1/evaluate/new_checkout')
      .set('Authorization', `Bearer ${apiKey}`)
      .set('X-User-Key', 'user_771');

    expect(res.status).toBe(200);
    expect(res.body.flagKey).toBe('new_checkout');
    expect(res.body.enabled).toBeDefined();
    expect(res.body.variant).toBeDefined();
  });

  it('6. Targeting Rule Evaluation Check', async () => {
    const res = await request(app)
      .get('/api/v1/evaluate/new_checkout?country=IN')
      .set('Authorization', `Bearer ${apiKey}`)
      .set('X-User-Key', 'user_outside_rollout_999');

    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(true);
  });

  it('7. Create an Experiment for the Feature Flag', async () => {
    const res = await request(app)
      .post('/api/v1/experiments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        featureFlagId: flagId,
        name: 'Checkout v2 Conversion Test',
        primaryMetric: 'purchase_completed'
      });

    expect(res.status).toBe(201);
    expect(res.body.experiment.id).toBeDefined();
    experimentId = res.body.experiment.id;
  });

  it('8. Start Experiment & Record Conversion Event', async () => {
    // Start experiment
    await request(app)
      .patch(`/api/v1/experiments/${experimentId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'RUNNING' });

    // Record conversion event
    const eventRes = await request(app)
      .post(`/api/v1/experiments/${experimentId}/events`)
      .send({ userKey: 'user_771', event: 'purchase_completed' });

    expect(eventRes.status).toBe(201);
    expect(eventRes.body.recorded).toBe(true);
  });

  it('9. Verify Audit History Logs', async () => {
    const res = await request(app)
      .get(`/api/v1/audit?projectId=${projectId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
