import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const uploaders = await prisma.user.findMany({
      where: {
        added_contacts: { some: {} }
      },
      select: { email: true },
      orderBy: { email: "asc" }
    });

    return NextResponse.json(uploaders.map(u => u.email));
  } catch (error) {
    console.error("Uploaders fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
