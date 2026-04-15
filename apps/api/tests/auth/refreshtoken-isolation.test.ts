import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { clearDb } from '../helpers/db.js';
import { createTestClientApp, createTestUser } from '../helpers/factories.js';

const app = createApp();

describe('refresh token client isolation', () => {
  beforeEach(async () => {
    await clearDb();
  });

  it('rejects using a refresh token from one client with another client', async () => {
    await createTestUser({
      email: 'client-isolation@example.com',
      password: 'supersecret123',
      displayName: 'Client Isolation User',
    });

    await createTestClientApp({
      clientId: 'blog-client',
      clientSecret: 'blog-secret',
      redirectUri: 'http://localhost:3001/callback',
      name: 'Blog Client',
    });

    await createTestClientApp({
      clientId: 'admin-client',
      clientSecret: 'admin-secret',
      redirectUri: 'http://localhost:3002/callback',
      name: 'Admin Client',
    });

    const agent = request.agent(app);

    const loginResponse = await agent.post('/api/login').send({
      email: 'client-isolation@example.com',
      password: 'supersecret123',
    });

    expect(loginResponse.status).toBe(200);

    const authorizeResponse = await agent.get('/api/authorize').query({
      client_id: 'blog-client',
      redirect_uri: 'http://localhost:3001/callback',
      response_type: 'code',
      scope: 'openid',
      state: 'client-isolation-state',
    });

    expect(authorizeResponse.status).toBe(302);
    expect(authorizeResponse.headers.location).toBeTruthy();

    const redirectLocation = authorizeResponse.headers.location;
    const url = new URL(redirectLocation);
    const code = url.searchParams.get('code');

    expect(code).toBeTruthy();

    const tokenResponse = await request(app).post('/api/token').send({
      grant_type: 'authorization_code',
      code,
      client_id: 'blog-client',
      client_secret: 'blog-secret',
      redirect_uri: 'http://localhost:3001/callback',
    });

    expect(tokenResponse.status).toBe(200);
    expect(tokenResponse.body.refresh_token).toBeTruthy();

    const refreshToken = tokenResponse.body.refresh_token;

    const wrongClientRefreshResponse = await request(app)
      .post('/api/token')
      .send({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: 'admin-client',
        client_secret: 'admin-secret',
      });

    expect(wrongClientRefreshResponse.status).toBe(400);
    expect(wrongClientRefreshResponse.body.message).toBe(
      'Invalid Refresh Token',
    );

    const correctClientRefreshResponse = await request(app)
      .post('/api/token')
      .send({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: 'blog-client',
        client_secret: 'blog-secret',
      });

    expect(correctClientRefreshResponse.status).toBe(200);
    expect(correctClientRefreshResponse.body.access_token).toBeTruthy();
    expect(correctClientRefreshResponse.body.refresh_token).toBeTruthy();
  });
});
