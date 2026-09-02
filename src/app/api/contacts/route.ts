import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = 40;
    const skip = (page - 1) * limit;
    
    const search = searchParams.get("search") || "";
    const filter = searchParams.get("filter") || "all";

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { first_name: { contains: search, mode: "insensitive" } },
        { last_name: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
      ];
    }

    const industry = searchParams.get("industry") || "";
    if (industry && industry !== "all") {
      where.industry = { equals: industry, mode: "insensitive" };
    }

    const designation = searchParams.get("designation") || "";
    if (designation && designation !== "all") {
      where.job_title = { contains: designation, mode: "insensitive" };
    }

    const location = searchParams.get("location") || "";
    if (location && location !== "all") {
      where.location = { contains: location, mode: "insensitive" };
    }

    if (filter !== "all") {
      where.send_status = filter === "not_sent" ? "Not Sent" :
                          filter === "sent" ? "Sent" :
                          filter === "failed" ? "Failed" : 
                          filter === "bounced" ? "Bounced" : undefined;
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: { 
          conversations: true,
          messages: {
            where: { direction: "sent", status: { in: ["Sent", "Replied"] } },
            orderBy: { sent_at: "desc" },
            take: 1,
            select: { sent_at: true }
          },
          _count: {
            select: {
              messages: { where: { direction: "sent", status: { in: ["Sent", "Replied"] } } }
            }
          }
        }
      }),
      prisma.contact.count({ where })
    ]);

    return NextResponse.json({
      contacts,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error("Fetch contacts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, first_name, last_name, company, job_title, industry, location, phone, website } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const existing = await prisma.contact.findFirst({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Contact with this email already exists" }, { status: 400 });
    }

    const contact = await prisma.contact.create({
      data: {
        email,
        first_name,
        last_name,
        company,
        job_title,
        industry,
        location,
        phone,
        website
      }
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error("Create contact error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
