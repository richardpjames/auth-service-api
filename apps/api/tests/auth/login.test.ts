import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { clearDb } from '../helpers/db.js';
import { createTestUser } from '../helpers/factories.js';

const app = createApp();

describe('login and me', () => {
  beforeEach(async () => {
    await clearDb();
  });

  it('logs in and returns the current user from /api/me', async () => {
    await createTestUser({
      email: 'test@example.com',
      password: 'supersecret123',
      displayName: 'Test User',
    });

    const agent = request.agent(app);

    const loginResponse = await agent.post('/api/login').send({
      email: 'test@example.com',
      password: 'supersecret123',
    });

    expect(loginResponse.status).toBe(200);

    const meResponse = await agent.get('/api/me');

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.email).toBe('test@example.com');
    expect(meResponse.body.displayName).toBe('Test User');
  });

  it('rejects disabled users at login', async () => {
    await createTestUser({
      email: 'disabled@example.com',
      password: 'supersecret123',
      disabledAt: new Date(),
    });

    const response = await request(app).post('/api/login').send({
      email: 'disabled@example.com',
      password: 'supersecret123',
    });

    expect(response.status).toBe(400);
  });
});
