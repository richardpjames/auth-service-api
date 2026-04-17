import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { clearDb } from '../helpers/db.js';
import { createTestUser } from '../helpers/factories.js';

const app = createApp();

describe('forgotten password', () => {
  beforeEach(async () => {
    await clearDb();
  });

  it('returns success when an email is provided and email sending is suppressed', async () => {
    await createTestUser({
      email: 'test@example.com',
      password: 'supersecret123',
      displayName: 'Test User',
    });

    const response = await request(app).post('/api/forgottenpassword').send({
      email: 'test@example.com',
      suppressEmail: true,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Reset email sent.' });
  });

  it('rejects requests without an email', async () => {
    const response = await request(app).post('/api/forgottenpassword').send({
      suppressEmail: true,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Email is required.' });
  });
});
