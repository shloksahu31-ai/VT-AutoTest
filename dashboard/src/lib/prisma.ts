import { neon } from '@neondatabase/serverless';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('CRITICAL: DATABASE_URL is missing');
    throw new Error('DATABASE_URL is missing');
  }
  
  console.log('--- INITIALIZING OBSIDIAN DB ENGINE (HTTP MODE) ---');
  
  try {
    // Force HTTP transport for maximum stability on Windows dev environments
    const sql = neon(url);
    const adapter = new PrismaNeonHTTP(sql);
    
    return new PrismaClient({ 
      adapter,
      log: ['error', 'warn']
    } as any);
  } catch (e) {
    console.error('ENGINE INITIALIZATION FAILURE:', e);
    throw e;
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
