import { PrismaClient, Prisma } from '@prisma/client'

// ---------------------------------------------------------------------------
// Retry helper — wraps any Prisma call and retries on P2024 pool timeouts
// ---------------------------------------------------------------------------
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 300,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isPoolTimeout =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2024';
      if (isPoolTimeout && attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, delayMs * attempt));
        continue;
      }
      throw err;
    }
  }
  throw new Error('withRetry: unreachable');
}

// ---------------------------------------------------------------------------
// Singleton Prisma client — safe for Next.js hot-reload in development
// ---------------------------------------------------------------------------
declare const globalThis: {
  prismaGlobal: PrismaClient;
} & typeof global;

const prisma: PrismaClient =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : [],
  });

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;

export default prisma;
