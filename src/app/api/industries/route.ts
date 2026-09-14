import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const stats: { industry: string; count: bigint }[] = await prisma.$queryRaw`
      SELECT c.industry, COUNT(m.id) as count
      FROM "Contact" c
      LEFT JOIN "Message" m ON c.id = m.contact_id AND m.direction = 'sent' AND m.status IN ('Sent', 'Replied')
      WHERE c.industry IS NOT NULL
      GROUP BY c.industry
      ORDER BY c.industry ASC
    `;

    const uniqueIndustries = stats.map(s => ({
      name: s.industry,
      sentCount: Number(s.count)
    }));

    const response = NextResponse.json(uniqueIndustries);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Fetch industries error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
