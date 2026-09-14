import { NextResponse } from "next/server";
import prisma, { withRetry } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const uploaders = await withRetry(() =>
      prisma.user.findMany({
        select: { email: true },
        orderBy: { email: "asc" },
      })
    );

    return NextResponse.json(uploaders.map(u => u.email));
  } catch (error) {
    console.error("Uploaders fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
