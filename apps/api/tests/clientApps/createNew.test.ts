import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { clearDb } from '../helpers/db.js';
import { createTestUser, createTestClientApp } from '../helpers/factories.js';

const app = createApp();

describe('POST /api/clientapps', () => {
  beforeEach(async () => {
    await clearDb();
  });

  async function loginAs(email: string, password: string) {
    const agent = request.agent(app);

    const loginResponse = await agent.post('/api/login').send({
      email,
      password,
    });

    expect(loginResponse.status).toBe(200);

    return agent;
  }

  it('rejects requests from non-admin users', async () => {
    await createTestUser({
      email: 'user@example.com',
      password: 'supersecret123',
      displayName: 'Normal User',
      admin: false,
    });

    const agent = await loginAs('user@example.com', 'supersecret123');

    const response = await agent.post('/api/clientapps').send({
      name: 'Blog Client',
      clientId: 'blog-client',
      clientSecret: 'super-client-secret',
      redirectUri: 'http://localhost:3001/callback',
    });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Admin access required');
  });

  it('rejects when name is not provided', async () => {
    await createTestUser({
      email: 'admin@example.com',
      password: 'supersecret123',
      displayName: 'Admin User',
      admin: true,
    });

    const agent = await loginAs('admin@example.com', 'supersecret123');

    const response = await agent.post('/api/clientapps').send({
      clientId: 'blog-client',
      clientSecret: 'super-client-secret',
      redirectUri: 'http://localhost:3001/callback',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      'Please check your inputs and try again',
    );
    expect(response.body.errors.name).toBeTruthy();
  });

  it('rejects when clientId is not provided', async () => {
    await createTestUser({
      email: 'admin@example.com',
      password: 'supersecret123',
      displayName: 'Admin User',
      admin: true,
    });

    const agent = await loginAs('admin@example.com', 'supersecret123');

    const response = await agent.post('/api/clientapps').send({
      name: 'Blog Client',
      clientSecret: 'super-client-secret',
      redirectUri: 'http://localhost:3001/callback',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      'Please check your inputs and try again',
    );
    expect(response.body.errors.clientId).toBeTruthy();
  });

  it('rejects when clientSecret is not provided', async () => {
    await createTestUser({
      email: 'admin@example.com',
      password: 'supersecret123',
      displayName: 'Admin User',
      admin: true,
    });

    const agent = await loginAs('admin@example.com', 'supersecret123');

    const response = await agent.post('/api/clientapps').send({
      name: 'Blog Client',
      clientId: 'blog-client',
      redirectUri: 'http://localhost:3001/callback',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      'Please check your inputs and try again',
    );
    expect(response.body.errors.clientSecret).toBeTruthy();
  });

  it('rejects when redirectUri is not provided', async () => {
    await createTestUser({
      email: 'admin@example.com',
      password: 'supersecret123',
      displayName: 'Admin User',
      admin: true,
    });

    const agent = await loginAs('admin@example.com', 'supersecret123');

    const response = await agent.post('/api/clientapps').send({
      name: 'Blog Client',
      clientId: 'blog-client',
      clientSecret: 'super-client-secret',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      'Please check your inputs and try again',
    );
    expect(response.body.errors.redirectUri).toBeTruthy();
  });

  it('rejects when redirectUri is not a valid URL', async () => {
    await createTestUser({
      email: 'admin@example.com',
      password: 'supersecret123',
      displayName: 'Admin User',
      admin: true,
    });

    const agent = await loginAs('admin@example.com', 'supersecret123');

    const response = await agent.post('/api/clientapps').send({
      name: 'Blog Client',
      clientId: 'blog-client',
      clientSecret: 'super-client-secret',
      redirectUri: 'not-a-valid-url',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      'Please check your inputs and try again',
    );
    expect(response.body.errors.redirectUri).toBeTruthy();
  });

  it('rejects when a client app with that clientId already exists', async () => {
    await createTestUser({
      email: 'admin@example.com',
      password: 'supersecret123',
      displayName: 'Admin User',
      admin: true,
    });

    await createTestClientApp({
      clientId: 'blog-client',
      clientSecret: 'super-client-secret',
      redirectUri: 'http://localhost:3001/callback',
      name: 'Existing Blog Client',
    });

    const agent = await loginAs('admin@example.com', 'supersecret123');

    const response = await agent.post('/api/clientapps').send({
      name: 'Duplicate Blog Client',
      clientId: 'blog-client',
      clientSecret: 'another-secret',
      redirectUri: 'http://localhost:3001/callback',
    });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(
      'A client app with that client ID already exists',
    );
  });

  it('creates a client app successfully in the happy path', async () => {
    await createTestUser({
      email: 'admin@example.com',
      password: 'supersecret123',
      displayName: 'Admin User',
      admin: true,
    });

    const agent = await loginAs('admin@example.com', 'supersecret123');

    const response = await agent.post('/api/clientapps').send({
      name: 'Blog Client',
      clientId: 'blog-client',
      clientSecret: 'super-client-secret',
      redirectUri: 'http://localhost:3001/callback',
    });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Client App created successfully');
    expect(response.body.clientApp).toBeTruthy();
    expect(response.body.clientApp.name).toBe('Blog Client');
    expect(response.body.clientApp.clientId).toBe('blog-client');
    expect(response.body.clientApp.redirectUri).toBe(
      'http://localhost:3001/callback',
    );
    expect(response.body.clientApp.clientSecret).toBeUndefined();
  });
});
