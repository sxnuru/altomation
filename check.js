const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const events = await prisma.webhookEvent.findMany({
    orderBy: { created_at: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(events, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
