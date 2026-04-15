import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { clearDb } from '../helpers/db.js';

const app = createApp();

describe('register', () => {
  beforeEach(async () => {
    await clearDb();
  });

  it('creates a user successfully', async () => {
    const response = await request(app).post('/api/users').send({
      email: 'test@example.com',
      password: 'supersecret123',
      displayName: 'Test User',
    });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('test@example.com');
    expect(response.body.user.displayName).toBe('Test User');
  });

  it('rejects duplicate email addresses', async () => {
    await request(app).post('/api/users').send({
      email: 'test@example.com',
      password: 'supersecret123',
      displayName: 'Test User',
    });

    const response = await request(app).post('/api/users').send({
      email: 'test@example.com',
      password: 'supersecret123',
      displayName: 'Another User',
    });

    expect(response.status).toBe(409);
  });

  it('rejects invalid email addresses', async () => {
    const response = await request(app).post('/api/users').send({
      email: 'testexample.com',
      password: 'supersecret123',
      displayName: 'Test User',
    });

    expect(response.status).toBe(400);
  });

  it('rejects missing fields', async () => {
    const response = await request(app).post('/api/users').send({
      email: 'test@example.com',
      password: '',
      displayName: 'Test User',
    });

    expect(response.status).toBe(400);
  });
});
