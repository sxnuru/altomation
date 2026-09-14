import { NextResponse } from "next/server";
import prisma, { withRetry } from "@/lib/db";

export const dynamic = "force-dynamic";


export async function GET() {
  try {
    const now = new Date();

    // Calendar-based windows (UTC+5 / PKT)
    const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;
    const nowLocal   = new Date(now.getTime() + TZ_OFFSET_MS);
    const localYear  = nowLocal.getUTCFullYear();
    const localMonth = nowLocal.getUTCMonth();
    const localDate  = nowLocal.getUTCDate();
    const localDay   = nowLocal.getUTCDay();

    const dailyStart = new Date(Date.UTC(localYear, localMonth, localDate,  9, 0, 0) - TZ_OFFSET_MS);
    const dailyEnd   = new Date(Date.UTC(localYear, localMonth, localDate, 21, 0, 0) - TZ_OFFSET_MS);

    const daysFromMonday = localDay === 0 ? 6 : localDay - 1;
    const weekStart = new Date(Date.UTC(localYear, localMonth, localDate - daysFromMonday, 0, 0, 0) - TZ_OFFSET_MS);
    const weekEnd   = new Date(Date.UTC(localYear, localMonth, localDate - daysFromMonday + 7, 0, 0, 0) - TZ_OFFSET_MS);

    const monthStart = new Date(Date.UTC(localYear, localMonth,     1, 0, 0, 0) - TZ_OFFSET_MS);
    const monthEnd   = new Date(Date.UTC(localYear, localMonth + 1, 1, 0, 0, 0) - TZ_OFFSET_MS);

    // Single aggregated query for all scalar counts (1 DB round-trip)
    const countsRaw = await withRetry(() => prisma.$queryRaw<[{
      approached: bigint;
      daily: bigint;
      weekly: bigint;
      monthly: bigint;
    }]>`
      SELECT
        COUNT(DISTINCT CASE WHEN m.direction = 'sent' AND m.status IN ('Sent','Replied') THEN m.contact_id END) AS approached,
        COUNT(CASE WHEN m.direction = 'sent' AND m.status IN ('Sent','Replied') AND m.sent_at >= ${dailyStart} AND m.sent_at <= ${dailyEnd} THEN 1 END) AS daily,
        COUNT(CASE WHEN m.direction = 'sent' AND m.status IN ('Sent','Replied') AND m.sent_at >= ${weekStart}  AND m.sent_at <  ${weekEnd}  THEN 1 END) AS weekly,
        COUNT(CASE WHEN m.direction = 'sent' AND m.status IN ('Sent','Replied') AND m.sent_at >= ${monthStart} AND m.sent_at <  ${monthEnd} THEN 1 END) AS monthly
      FROM "Message" m
    `);

    const approachedContacts = Number(countsRaw[0]?.approached ?? 0);
    const dailySent          = Number(countsRaw[0]?.daily      ?? 0);
    const weeklySent         = Number(countsRaw[0]?.weekly     ?? 0);
    const monthlySent        = Number(countsRaw[0]?.monthly    ?? 0);

    // Chart queries in parallel (3 round-trips total instead of 7)
    const [industryStatsRaw, timeSeriesRaw, emailCountsRaw] = await Promise.all([
      withRetry(() => prisma.$queryRaw<{ industry: string; count: bigint }[]>`
        SELECT c.industry, COUNT(m.id) AS count
        FROM "Contact" c
        LEFT JOIN "Message" m
          ON c.id = m.contact_id AND m.direction = 'sent' AND m.status IN ('Sent','Replied')
        WHERE c.industry IS NOT NULL
        GROUP BY c.industry
        ORDER BY count DESC
      `),
      withRetry(() => prisma.$queryRaw<{ date: Date; industry: string; count: bigint }[]>`
        SELECT DATE(m.created_at) AS date, c.industry, COUNT(m.id) AS count
        FROM "Message" m
        JOIN "Contact" c ON m.contact_id = c.id
        WHERE m.direction = 'sent'
          AND m.status IN ('Sent','Replied')
          AND m.created_at >= NOW() - INTERVAL '30 days'
          AND c.industry IS NOT NULL
        GROUP BY DATE(m.created_at), c.industry
        ORDER BY DATE(m.created_at) ASC, c.industry ASC
      `),
      withRetry(() => prisma.$queryRaw<{ industry: string; message_count: bigint; contact_count: number }[]>`
        WITH counts AS (
          SELECT c.industry, c.id, COUNT(m.id) AS message_count
          FROM "Contact" c
          LEFT JOIN "Message" m
            ON c.id = m.contact_id AND m.direction = 'sent' AND m.status IN ('Sent','Replied')
          WHERE c.industry IS NOT NULL
          GROUP BY c.industry, c.id
        )
        SELECT industry, message_count, COUNT(id)::int AS contact_count
        FROM counts
        WHERE message_count > 0
        GROUP BY industry, message_count
        ORDER BY industry, message_count
      `),
    ]);

    // Map industry stats
    const industryStats = industryStatsRaw.map(s => ({
      name: s.industry,
      sentCount: Number(s.count),
    }));

    // Build time-series map (30-day continuous range)
    const datesMap = new Map<string, any>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      datesMap.set(key, { date: key });
    }
    timeSeriesRaw.forEach(row => {
      const key = new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const existing = datesMap.get(key);
      if (existing) existing[row.industry] = Number(row.count);
    });

    // Build email-counts stacked bar map
    const emailCountsMap = new Map<string, any>();
    const uniqueEmailCounts = new Set<string>();
    emailCountsRaw.forEach(row => {
      const n   = Number(row.message_count);
      const key = n + (n === 1 ? " mail" : " mails");
      uniqueEmailCounts.add(key);
      if (!emailCountsMap.has(row.industry)) emailCountsMap.set(row.industry, { industry: row.industry });
      emailCountsMap.get(row.industry)[key] = row.contact_count;
    });
    const emailCountKeys = Array.from(uniqueEmailCounts).sort((a, b) => parseInt(a) - parseInt(b));

    const response = NextResponse.json({
      approachedContacts,
      dailySent,
      weeklySent,
      monthlySent,
      industryStats,
      timeSeriesData: Array.from(datesMap.values()),
      emailCountsData: Array.from(emailCountsMap.values()),
      emailCountKeys,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;

  } catch (error) {
    console.error("Analytics fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
