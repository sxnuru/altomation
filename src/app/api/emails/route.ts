import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = 40;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { direction: "received" },
        include: { contact: true },
        orderBy: { received_at: "desc" },
        skip,
        take: limit,
      }),
      prisma.message.count({ where: { direction: "received" } })
    ]);

    return NextResponse.json({
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error("Fetch inbox error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
