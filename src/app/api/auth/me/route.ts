import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-user";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const user = await getAuthUser();
    const cookieStore = await cookies();
    const isAdmin = cookieStore.get("admin_auth")?.value === "true";
    return NextResponse.json({ user, isAdmin });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
