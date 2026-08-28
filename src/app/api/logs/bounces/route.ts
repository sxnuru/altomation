import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.message.findMany({
        where: {
          status: { in: ["Bounced", "Failed"] }
        },
        include: {
          contact: {
            select: { first_name: true, last_name: true, company: true }
          }
        },
        orderBy: {
          created_at: "desc"
        },
        skip,
        take: limit
      }),
      prisma.message.count({
        where: {
          status: { in: ["Bounced", "Failed"] }
        }
      })
    ]);

    return NextResponse.json({
      logs,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    console.error("Fetch bounce logs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
