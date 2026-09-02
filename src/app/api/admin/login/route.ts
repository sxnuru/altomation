import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    
    if (username === "admin" && password === "admin@123alt") {
      const cookieStore = await cookies();
      cookieStore.set("admin_auth", "true", { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 // 1 day
      });
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
