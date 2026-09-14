import { NextResponse } from "next/server";
import prisma, { withRetry } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-user";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page  = parseInt(searchParams.get("page") || "1", 10);
    const limit = 40;
    const skip  = (page - 1) * limit;

    const search      = searchParams.get("search")      || "";
    const filter      = searchParams.get("filter")      || "all";
    const industry    = searchParams.get("industry")    || "";
    const designation = searchParams.get("designation") || "";
    const location    = searchParams.get("location")    || "";
    const sort        = searchParams.get("sort")        || "created_desc";
    const addedBy     = searchParams.get("addedBy")     || "";
    const sentCountStr = searchParams.get("sentCount");

    const where: any = {};

    if (search) {
      where.OR = [
        { email:      { contains: search, mode: "insensitive" } },
        { first_name: { contains: search, mode: "insensitive" } },
        { last_name:  { contains: search, mode: "insensitive" } },
        { company:    { contains: search, mode: "insensitive" } },
      ];
    }

    if (industry && industry !== "all") {
      where.industry = { equals: industry, mode: "insensitive" };
    }

    if (designation && designation !== "all") {
      where.job_title = { contains: designation, mode: "insensitive" };
    }

    if (location && location !== "all") {
      where.location = { contains: location, mode: "insensitive" };
    }

    if (filter !== "all") {
      where.send_status =
        filter === "not_sent" ? "Not Sent"  :
        filter === "sent"     ? "Sent"      :
        filter === "failed"   ? "Failed"    :
        filter === "bounced"  ? "Bounced"   : undefined;
    }

    if (sentCountStr !== null && sentCountStr !== "") {
      const countNum = parseInt(sentCountStr, 10);
      if (!isNaN(countNum)) {
        if (countNum === 0) {
          where.messages = { none: { direction: "sent", status: { in: ["Sent", "Replied"] } } };
        } else {
          const grouped = await prisma.message.groupBy({
            by: ["contact_id"],
            where: { direction: "sent", status: { in: ["Sent", "Replied"] } },
            _count: { id: true },
            having: { id: { _count: { equals: countNum } } },
          });
          where.id = { in: grouped.map(g => g.contact_id) };
        }
      }
    }

    if (addedBy && addedBy !== "all") {
      const uploader = await prisma.user.findUnique({
        where: { email: addedBy },
        select: { id: true },
      });
      where.added_by_id = uploader ? uploader.id : "__no_match__";
    }

    let orderBy: any = { created_at: "desc" };
    if (sort === "sent_asc")  orderBy = { last_sent_at: { sort: "asc",  nulls: "last" } };
    if (sort === "sent_desc") orderBy = { last_sent_at: { sort: "desc", nulls: "last" } };

    const [contacts, total] = await Promise.all([
      withRetry(() => prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          conversations: true,
          messages: {
            where:   { direction: "sent", status: { in: ["Sent", "Replied"] } },
            orderBy: { sent_at: "desc" },
            take:    1,
            select:  { sent_at: true },
          },
          _count: {
            select: {
              messages: { where: { direction: "sent", status: { in: ["Sent", "Replied"] } } },
            },
          },
          added_by: { select: { email: true } },
        },
      })),
      withRetry(() => prisma.contact.count({ where })),
    ]);

    const response = NextResponse.json({
      contacts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
    response.headers.set("Cache-Control", "no-store");
    return response;

  } catch (error) {
    console.error("Fetch contacts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const [authUser, body] = await Promise.all([getAuthUser(), req.json()]);
    const { email, first_name, last_name, company, job_title, industry, location, phone, website } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const existing = await withRetry(() => prisma.contact.findFirst({ where: { email } }));
    if (existing) {
      return NextResponse.json({ error: "Contact with this email already exists" }, { status: 400 });
    }

    const contact = await withRetry(() => prisma.contact.create({
      data: {
        email,
        first_name,
        last_name,
        company,
        job_title,
        industry,
        location,
        phone,
        website,
        ...(authUser ? { added_by_id: authUser.id } : {}),
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error("Create contact error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
