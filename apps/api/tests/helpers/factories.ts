import argon2 from 'argon2';
import { prisma } from '../../src/db/prisma.js';
import { hashSecret } from '../../src/lib/auth.js';

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
    isPublic: boolean;
  }> = {},
) {
  return prisma.clientApp.create({
    data: {
      clientId: (overrides.clientId ?? 'test-client').toLowerCase(),
      clientSecret: overrides.clientSecret
        ? hashSecret(overrides.clientSecret)
        : overrides.isPublic
          ? null
          : hashSecret('super-client-secret'),
      name: overrides.name ?? 'Test Client',
      redirectUri: overrides.redirectUri ?? 'http://localhost:3001/callback',
      isPublic: overrides.isPublic ?? false,
    },
  });
}
