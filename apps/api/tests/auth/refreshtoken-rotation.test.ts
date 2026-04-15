import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { clearDb } from '../helpers/db.js';
import { createTestClientApp, createTestUser } from '../helpers/factories.js';

const app = createApp();

describe('refresh token rotation', () => {
  beforeEach(async () => {
    await clearDb();
  });

  it('rotates the refresh token and rejects reuse of the old one', async () => {
    await createTestUser({
      email: 'refresh-user@example.com',
      password: 'supersecret123',
      displayName: 'Refresh User',
    });

    await createTestClientApp({
      clientId: 'blog-client',
      clientSecret: 'super-client-secret',
      redirectUri: 'http://localhost:3001/callback',
      name: 'Blog Client',
    });

    const agent = request.agent(app);

    const loginResponse = await agent.post('/api/login').send({
      email: 'refresh-user@example.com',
      password: 'supersecret123',
    });

    expect(loginResponse.status).toBe(200);

    const authorizeResponse = await agent.get('/api/authorize').query({
      client_id: 'blog-client',
      redirect_uri: 'http://localhost:3001/callback',
      response_type: 'code',
      scope: 'openid',
      state: 'refresh-state',
    });

    expect(authorizeResponse.status).toBe(302);

    const redirectLocation = authorizeResponse.headers.location;
    expect(redirectLocation).toBeTruthy();

    const url = new URL(redirectLocation);
    const code = url.searchParams.get('code');

    expect(code).toBeTruthy();

    const tokenResponse = await request(app).post('/api/token').send({
      grant_type: 'authorization_code',
      code,
      client_id: 'blog-client',
      client_secret: 'super-client-secret',
      redirect_uri: 'http://localhost:3001/callback',
    });

    expect(tokenResponse.status).toBe(200);
    expect(tokenResponse.body.refresh_token).toBeTruthy();
    expect(tokenResponse.body.access_token).toBeTruthy();
    expect(tokenResponse.body.id_token).toBeTruthy();

    const originalRefreshToken = tokenResponse.body.refresh_token;

    const refreshResponse = await request(app).post('/api/token').send({
      grant_type: 'refresh_token',
      refresh_token: originalRefreshToken,
      client_id: 'blog-client',
      client_secret: 'super-client-secret',
    });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.access_token).toBeTruthy();
    expect(refreshResponse.body.id_token).toBeTruthy();
    expect(refreshResponse.body.refresh_token).toBeTruthy();
    expect(refreshResponse.body.refresh_token).not.toBe(originalRefreshToken);

    const rotatedRefreshToken = refreshResponse.body.refresh_token;

    const reuseOldRefreshTokenResponse = await request(app)
      .post('/api/token')
      .send({
        grant_type: 'refresh_token',
        refresh_token: originalRefreshToken,
        client_id: 'blog-client',
        client_secret: 'super-client-secret',
      });

    expect(reuseOldRefreshTokenResponse.status).toBe(400);
    expect(reuseOldRefreshTokenResponse.body.message).toBe(
      'Invalid Refresh Token',
    );

    const secondRefreshResponse = await request(app).post('/api/token').send({
      grant_type: 'refresh_token',
      refresh_token: rotatedRefreshToken,
      client_id: 'blog-client',
      client_secret: 'super-client-secret',
    });

    expect(secondRefreshResponse.status).toBe(200);
    expect(secondRefreshResponse.body.refresh_token).toBeTruthy();
    expect(secondRefreshResponse.body.refresh_token).not.toBe(
      rotatedRefreshToken,
    );
  });
});
