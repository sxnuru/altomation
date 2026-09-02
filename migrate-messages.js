const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const email = 'shaban@antilineartech.com';
    let user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      console.log(`User ${email} not found in public.User. Let's try to sync from auth.users...`);
      await prisma.$executeRaw`
        INSERT INTO public."User" (id, email, name, role, created_at, updated_at)
        SELECT id, email, email, 'user', created_at, created_at
        FROM auth.users
        WHERE email = ${email}
        ON CONFLICT (email) DO NOTHING;
      `;
      user = await prisma.user.findUnique({ where: { email } });
    }

    if (!user) {
      console.log(`User ${email} still not found. Did you create this user in Supabase Auth?`);
      return;
    }

    console.log(`Found user ${email} with ID: ${user.id}`);
    
    const result = await prisma.message.updateMany({
      data: { user_id: user.id }
    });

    console.log(`Successfully assigned ${result.count} messages to ${email}`);
  } catch (e) {
    console.error("Error updating messages:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
