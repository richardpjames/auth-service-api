import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';
import { hashSecret } from '../../src/lib/auth.js';
import { clearDb } from '../helpers/db.js';
import { createTestUser } from '../helpers/factories.js';

const app = createApp();

describe('reset password', () => {
  beforeEach(async () => {
    await clearDb();
  });

  it('resets a users password with a valid token', async () => {
    const user = await createTestUser({
      email: 'test@example.com',
      password: 'old-password-123',
      displayName: 'Test User',
    });

    const resetToken = 'valid-reset-token';

    await prisma.passwordResetToken.create({
      data: {
        tokenHash: hashSecret(resetToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const response = await request(app).post('/api/resetpassword').send({
      resetToken,
      password: 'new-password-456',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Password Updated.' });

    const loginWithOldPassword = await request(app).post('/api/login').send({
      email: 'test@example.com',
      password: 'old-password-123',
    });

    expect(loginWithOldPassword.status).toBe(400);

    const loginWithNewPassword = await request(app).post('/api/login').send({
      email: 'test@example.com',
      password: 'new-password-456',
    });

    expect(loginWithNewPassword.status).toBe(200);

    const storedToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashSecret(resetToken) },
    });

    expect(storedToken?.usedAt).not.toBeNull();
  });

  it('rejects a token that has already been used', async () => {
    const user = await createTestUser({
      email: 'used@example.com',
      password: 'supersecret123',
      displayName: 'Used Token User',
    });

    const resetToken = 'used-reset-token';

    await prisma.passwordResetToken.create({
      data: {
        tokenHash: hashSecret(resetToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        usedAt: new Date(),
      },
    });

    const response = await request(app).post('/api/resetpassword').send({
      resetToken,
      password: 'new-password-456',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Invalid reset token.' });
  });

  it('rejects requests without a token', async () => {
    const response = await request(app).post('/api/resetpassword').send({
      password: 'new-password-456',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Invalid request.' });
  });

  it('rejects requests without a new password', async () => {
    const response = await request(app).post('/api/resetpassword').send({
      resetToken: 'valid-reset-token',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Invalid request.' });
  });
});
