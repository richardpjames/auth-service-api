import argon2 from 'argon2';
import { prisma } from '../../src/db/prisma.js';
import { hashClientSecret } from '../../src/lib/auth.js';

// Creates new users
export async function createTestUser(
  overrides: Partial<{
    email: string;
    password: string;
    displayName: string;
    admin: boolean;
    disabledAt: Date | null;
  }> = {},
) {
  const password = overrides.password ?? 'supersecret123';

  return prisma.user.create({
    data: {
      email: (overrides.email ?? 'test@example.com').toLowerCase(),
      passwordHash: await argon2.hash(password),
      displayName: overrides.displayName ?? 'Test User',
      admin: overrides.admin ?? false,
      disabledAt: overrides.disabledAt ?? null,
    },
  });
}

// Creates new client apps
export async function createTestClientApp(
  overrides: Partial<{
    clientId: string;
    clientSecret: string;
    name: string;
    redirectUri: string;
  }> = {},
) {
  return prisma.clientApp.create({
    data: {
      clientId: (overrides.clientId ?? 'test-client').toLowerCase(),
      clientSecret: hashClientSecret(
        overrides.clientSecret ?? 'super-client-secret',
      ),
      name: overrides.name ?? 'Test Client',
      redirectUri: overrides.redirectUri ?? 'http://localhost:3001/callback',
    },
  });
}
