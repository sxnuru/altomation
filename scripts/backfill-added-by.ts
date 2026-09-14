import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const OWNER_EMAIL = "shaban@antilineartech.com";

  const user = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });

  if (!user) {
    console.error(`User ${OWNER_EMAIL} not found in the database.`);
    console.log("Existing users:");
    const users = await prisma.user.findMany({ select: { email: true } });
    users.forEach(u => console.log(" -", u.email));
    process.exit(1);
  }

  console.log(`Found user: ${user.email} (id: ${user.id})`);

  // Backfill contacts with no added_by_id
  const { count: contactCount } = await prisma.contact.updateMany({
    where: { added_by_id: null },
    data: { added_by_id: user.id },
  });

  // Backfill import batches with no added_by_id
  const { count: batchCount } = await prisma.importBatch.updateMany({
    where: { added_by_id: null },
    data: { added_by_id: user.id },
  });

  console.log(`✅ Updated ${contactCount} contacts and ${batchCount} import batches → added_by = ${OWNER_EMAIL}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
