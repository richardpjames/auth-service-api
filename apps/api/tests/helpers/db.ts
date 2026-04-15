import { prisma } from '../../src/db/prisma.js';

export async function clearDb() {
  await prisma.refreshToken.deleteMany();
  await prisma.authCode.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.clientApp.deleteMany();
  await prisma.user.deleteMany();
}
