import { PrismaClient, Prisma } from '@prisma/client'

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 200;

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : [],
  }).$extends({
    query: {
      async $allOperations({ operation, model, args, query }) {
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            return await query(args);
          } catch (err) {
            const isPoolTimeout =
              err instanceof Prisma.PrismaClientKnownRequestError &&
              err.code === 'P2024';
            if (isPoolTimeout && attempt < MAX_RETRIES) {
              await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
              continue;
            }
            throw err;
          }
        }
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

declare const globalThis: {
  prismaGlobal: ExtendedPrismaClient;
} & typeof global;

const prisma: ExtendedPrismaClient =
  globalThis.prismaGlobal ?? createPrismaClient();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
