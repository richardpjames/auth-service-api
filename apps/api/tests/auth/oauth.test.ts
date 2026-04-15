import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { clearDb } from '../helpers/db.js';
import { createTestClientApp, createTestUser } from '../helpers/factories.js';

const app = createApp();

describe('oauth authorization code flow', () => {
  beforeEach(async () => {
    await clearDb();
  });

  it('issues an auth code and exchanges it for tokens', async () => {
    await createTestUser({
      email: 'blog-user@example.com',
      password: 'supersecret123',
      displayName: 'Blog User',
    });

    await createTestClientApp({
      clientId: 'blog-client',
      clientSecret: 'super-client-secret',
      redirectUri: 'http://localhost:3001/callback',
      name: 'Blog Client',
    });

    const agent = request.agent(app);

    const loginResponse = await agent.post('/api/login').send({
      email: 'blog-user@example.com',
      password: 'supersecret123',
    });

    expect(loginResponse.status).toBe(200);

    const authorizeResponse = await agent.get('/api/authorize').query({
      client_id: 'blog-client',
      redirect_uri: 'http://localhost:3001/callback',
      response_type: 'code',
      scope: 'openid',
      state: 'abc123',
    });

    expect(authorizeResponse.status).toBe(302);
    expect(authorizeResponse.headers.location).toBeTruthy();

    const redirectLocation = authorizeResponse.headers.location;
    const url = new URL(redirectLocation);

    expect(url.origin + url.pathname).toBe('http://localhost:3001/callback');
    expect(url.searchParams.get('state')).toBe('abc123');

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
    expect(tokenResponse.body.access_token).toBeTruthy();
    expect(tokenResponse.body.id_token).toBeTruthy();
    expect(tokenResponse.body.refresh_token).toBeTruthy();
    expect(tokenResponse.body.token_type).toBe('Bearer');
    expect(tokenResponse.body.expires_in).toBe(900);
  });
});
