const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$executeRaw`
      INSERT INTO public."User" (id, email, name, role, created_at, updated_at)
      SELECT id, email, email, 'user', created_at, created_at
      FROM auth.users
      ON CONFLICT (email) DO NOTHING;
    `;
    console.log("Successfully synced users from auth.users:", result);
  } catch (e) {
    console.error("Error syncing users:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
