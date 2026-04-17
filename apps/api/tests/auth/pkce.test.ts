import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { createPkceCodeChallenge } from '../../src/lib/auth.js';
import { clearDb } from '../helpers/db.js';
import { createTestClientApp, createTestUser } from '../helpers/factories.js';

const app = createApp();

async function loginAs(email: string, password: string) {
  const agent = request.agent(app);

  const loginResponse = await agent.post('/api/login').send({
    email,
    password,
  });

  expect(loginResponse.status).toBe(200);

  return agent;
}

async function authorizeForCode(
  agent: ReturnType<typeof request.agent>,
  options: {
    clientId: string;
    redirectUri: string;
    state?: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
  },
) {
  const response = await agent.get('/api/authorize').query({
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    response_type: 'code',
    scope: 'openid',
    state: options.state ?? 'abc123',
    code_challenge: options.codeChallenge,
    code_challenge_method: options.codeChallengeMethod,
  });

  return response;
}

describe('oauth pkce flow', () => {
  beforeEach(async () => {
    await clearDb();
  });

  it('public client with PKCE succeeds', async () => {
    await createTestUser({
      email: 'pkce-user@example.com',
      password: 'supersecret123',
      displayName: 'PKCE User',
    });

    await createTestClientApp({
      clientId: 'public-blog-client',
      redirectUri: 'http://localhost:3001/callback',
      name: 'Public Blog Client',
      isPublic: true,
    });

    const agent = await loginAs('pkce-user@example.com', 'supersecret123');
    const codeVerifier = 'public-client-verifier-1234567890';
    const codeChallenge = createPkceCodeChallenge(codeVerifier);

    const authorizeResponse = await authorizeForCode(agent, {
      clientId: 'public-blog-client',
      redirectUri: 'http://localhost:3001/callback',
      codeChallenge,
      codeChallengeMethod: 'S256',
    });

    expect(authorizeResponse.status).toBe(302);

    const code = new URL(authorizeResponse.headers.location).searchParams.get(
      'code',
    );

    expect(code).toBeTruthy();

    const tokenResponse = await request(app).post('/api/token').send({
      grant_type: 'authorization_code',
      code,
      client_id: 'public-blog-client',
      redirect_uri: 'http://localhost:3001/callback',
      code_verifier: codeVerifier,
    });

    expect(tokenResponse.status).toBe(200);
    expect(tokenResponse.body.access_token).toBeTruthy();
    expect(tokenResponse.body.id_token).toBeTruthy();
    expect(tokenResponse.body.refresh_token).toBeTruthy();
    expect(tokenResponse.body.token_type).toBe('Bearer');
    expect(tokenResponse.body.expires_in).toBe(900);
  });

  it('public client without code_challenge fails at /authorize', async () => {
    await createTestUser({
      email: 'pkce-user@example.com',
      password: 'supersecret123',
      displayName: 'PKCE User',
    });

    await createTestClientApp({
      clientId: 'public-blog-client',
      redirectUri: 'http://localhost:3001/callback',
      name: 'Public Blog Client',
      isPublic: true,
    });

    const agent = await loginAs('pkce-user@example.com', 'supersecret123');

    const authorizeResponse = await authorizeForCode(agent, {
      clientId: 'public-blog-client',
      redirectUri: 'http://localhost:3001/callback',
    });

    expect(authorizeResponse.status).toBe(400);
    expect(authorizeResponse.body.message).toBe(
      'PKCE is required for public clients',
    );
  });

  it('public client with wrong code_verifier fails at /token', async () => {
    await createTestUser({
      email: 'pkce-user@example.com',
      password: 'supersecret123',
      displayName: 'PKCE User',
    });

    await createTestClientApp({
      clientId: 'public-blog-client',
      redirectUri: 'http://localhost:3001/callback',
      name: 'Public Blog Client',
      isPublic: true,
    });

    const agent = await loginAs('pkce-user@example.com', 'supersecret123');
    const codeVerifier = 'correct-verifier-1234567890';
    const codeChallenge = createPkceCodeChallenge(codeVerifier);

    const authorizeResponse = await authorizeForCode(agent, {
      clientId: 'public-blog-client',
      redirectUri: 'http://localhost:3001/callback',
      codeChallenge,
      codeChallengeMethod: 'S256',
    });

    const code = new URL(authorizeResponse.headers.location).searchParams.get(
      'code',
    );

    const tokenResponse = await request(app).post('/api/token').send({
      grant_type: 'authorization_code',
      code,
      client_id: 'public-blog-client',
      redirect_uri: 'http://localhost:3001/callback',
      code_verifier: 'wrong-verifier-1234567890',
    });

    expect(tokenResponse.status).toBe(400);
    expect(tokenResponse.body.message).toBe('Invalid code_verifier');
  });

  it('public client with reused auth code still fails', async () => {
    await createTestUser({
      email: 'pkce-user@example.com',
      password: 'supersecret123',
      displayName: 'PKCE User',
    });

    await createTestClientApp({
      clientId: 'public-blog-client',
      redirectUri: 'http://localhost:3001/callback',
      name: 'Public Blog Client',
      isPublic: true,
    });

    const agent = await loginAs('pkce-user@example.com', 'supersecret123');
    const codeVerifier = 'reused-code-verifier-1234567890';
    const codeChallenge = createPkceCodeChallenge(codeVerifier);

    const authorizeResponse = await authorizeForCode(agent, {
      clientId: 'public-blog-client',
      redirectUri: 'http://localhost:3001/callback',
      codeChallenge,
      codeChallengeMethod: 'S256',
    });

    const code = new URL(authorizeResponse.headers.location).searchParams.get(
      'code',
    );

    const firstTokenResponse = await request(app).post('/api/token').send({
      grant_type: 'authorization_code',
      code,
      client_id: 'public-blog-client',
      redirect_uri: 'http://localhost:3001/callback',
      code_verifier: codeVerifier,
    });

    expect(firstTokenResponse.status).toBe(200);

    const secondTokenResponse = await request(app).post('/api/token').send({
      grant_type: 'authorization_code',
      code,
      client_id: 'public-blog-client',
      redirect_uri: 'http://localhost:3001/callback',
      code_verifier: codeVerifier,
    });

    expect(secondTokenResponse.status).toBe(400);
    expect(secondTokenResponse.body.message).toBe('Invalid Grant');
  });

  it('confidential client can still work as before', async () => {
    await createTestUser({
      email: 'oauth-user@example.com',
      password: 'supersecret123',
      displayName: 'OAuth User',
    });

    await createTestClientApp({
      clientId: 'confidential-blog-client',
      clientSecret: 'super-client-secret',
      redirectUri: 'http://localhost:3001/callback',
      name: 'Confidential Blog Client',
    });

    const agent = await loginAs('oauth-user@example.com', 'supersecret123');

    const authorizeResponse = await authorizeForCode(agent, {
      clientId: 'confidential-blog-client',
      redirectUri: 'http://localhost:3001/callback',
    });

    expect(authorizeResponse.status).toBe(302);

    const code = new URL(authorizeResponse.headers.location).searchParams.get(
      'code',
    );

    const tokenResponse = await request(app).post('/api/token').send({
      grant_type: 'authorization_code',
      code,
      client_id: 'confidential-blog-client',
      client_secret: 'super-client-secret',
      redirect_uri: 'http://localhost:3001/callback',
    });

    expect(tokenResponse.status).toBe(200);
    expect(tokenResponse.body.access_token).toBeTruthy();
    expect(tokenResponse.body.id_token).toBeTruthy();
    expect(tokenResponse.body.refresh_token).toBeTruthy();
  });

  it('confidential client with PKCE also works', async () => {
    await createTestUser({
      email: 'oauth-user@example.com',
      password: 'supersecret123',
      displayName: 'OAuth User',
    });

    await createTestClientApp({
      clientId: 'confidential-blog-client',
      clientSecret: 'super-client-secret',
      redirectUri: 'http://localhost:3001/callback',
      name: 'Confidential Blog Client',
    });

    const agent = await loginAs('oauth-user@example.com', 'supersecret123');
    const codeVerifier = 'confidential-client-verifier-1234567890';
    const codeChallenge = createPkceCodeChallenge(codeVerifier);

    const authorizeResponse = await authorizeForCode(agent, {
      clientId: 'confidential-blog-client',
      redirectUri: 'http://localhost:3001/callback',
      codeChallenge,
      codeChallengeMethod: 'S256',
    });

    expect(authorizeResponse.status).toBe(302);

    const code = new URL(authorizeResponse.headers.location).searchParams.get(
      'code',
    );

    const tokenResponse = await request(app).post('/api/token').send({
      grant_type: 'authorization_code',
      code,
      client_id: 'confidential-blog-client',
      client_secret: 'super-client-secret',
      redirect_uri: 'http://localhost:3001/callback',
      code_verifier: codeVerifier,
    });

    expect(tokenResponse.status).toBe(200);
    expect(tokenResponse.body.access_token).toBeTruthy();
    expect(tokenResponse.body.id_token).toBeTruthy();
    expect(tokenResponse.body.refresh_token).toBeTruthy();
  });
});
