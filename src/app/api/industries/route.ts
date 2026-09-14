import { NextResponse } from "next/server";
import prisma, { withRetry } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await withRetry(() =>
      prisma.$queryRaw<{ industry: string; count: bigint }[]>`
        SELECT c.industry, COUNT(m.id) AS count
        FROM "Contact" c
        LEFT JOIN "Message" m
          ON c.id = m.contact_id AND m.direction = 'sent' AND m.status IN ('Sent', 'Replied')
        WHERE c.industry IS NOT NULL
        GROUP BY c.industry
        ORDER BY c.industry ASC
      `
    );

    const response = NextResponse.json(
      stats.map(s => ({ name: s.industry, sentCount: Number(s.count) }))
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Fetch industries error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
