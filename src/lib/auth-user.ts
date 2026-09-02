import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/db";

export async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error("Supabase auth error in getAuthUser:", error);
    return null;
  }
  if (!user) {
    console.log("No session user found in getAuthUser");
    return null;
  }
  
  const email = user.email?.toLowerCase();
  if (!email) {
    console.log("Session user has no email in getAuthUser");
    return null;
  }

  // Sync to database
  console.log("Syncing user to database:", email);
  let dbUser = await prisma.user.findUnique({
    where: { email }
  });

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        id: session.user.id,
        email,
        name: email,
        role: "user"
      }
    });
  }


  return dbUser;
}
