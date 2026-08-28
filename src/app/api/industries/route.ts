import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const industries = await prisma.contact.findMany({
      where: {
        industry: { not: null }
      },
      select: {
        industry: true
      },
      distinct: ['industry'],
      orderBy: {
        industry: 'asc'
      }
    });

    const uniqueIndustries = industries
      .map(i => i.industry)
      .filter((v, i, a) => v && a.indexOf(v) === i); // Ensure valid non-null strings

    return NextResponse.json(uniqueIndustries);
  } catch (error) {
    console.error("Fetch industries error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
