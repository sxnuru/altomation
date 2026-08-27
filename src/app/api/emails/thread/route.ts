import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    const messages = await prisma.message.findMany({
      where: { conversation_id: conversationId },
      orderBy: { created_at: "asc" },
      include: { contact: true }
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Fetch thread error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
