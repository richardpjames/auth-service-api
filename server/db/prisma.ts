// Set up prisma to connect to MariaDB (or MySQL)
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// Connect to the database and set up prisma
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
// Create the prisma client and allow export
export const prisma = new PrismaClient({ adapter });
