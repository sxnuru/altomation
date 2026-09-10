import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const now = new Date();
    
    // 1. Total Approached Contacts
    const approachedContacts = await prisma.contact.count({
      where: {
        messages: {
          some: {
            direction: "sent",
            status: { in: ["Sent", "Replied"] }
          }
        }
      }
    });

    // 2. Emails Sent per Industry
    const industryStatsRaw: { industry: string; count: bigint }[] = await prisma.$queryRaw`
      SELECT c.industry, COUNT(m.id) as count
      FROM "Contact" c
      LEFT JOIN "Message" m ON c.id = m.contact_id AND m.direction = 'sent' AND m.status IN ('Sent', 'Replied')
      WHERE c.industry IS NOT NULL
      GROUP BY c.industry
      ORDER BY count DESC
    `;

    const industryStats = industryStatsRaw.map(s => ({
      name: s.industry,
      sentCount: Number(s.count)
    }));

    // 3. Time Series Data (Last 30 Days by Industry)
    const timeSeriesRaw: { date: Date; industry: string; count: bigint }[] = await prisma.$queryRaw`
      SELECT DATE(m.created_at) as date, c.industry, COUNT(m.id) as count
      FROM "Message" m
      JOIN "Contact" c ON m.contact_id = c.id
      WHERE m.direction = 'sent' AND m.status IN ('Sent', 'Replied') AND m.created_at >= NOW() - INTERVAL '30 days' AND c.industry IS NOT NULL
      GROUP BY DATE(m.created_at), c.industry
      ORDER BY DATE(m.created_at) ASC, c.industry ASC
    `;

    // Process time-series data for recharts
    // Recharts expects an array of objects where each object represents a date, 
    // and keys are industries. e.g. { date: 'Jan 1', 'Real Estate': 10, 'IT': 5 }
    const datesMap = new Map<string, any>();
    
    // Initialize dates for the last 30 days to ensure continuous timeline even with 0 counts
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      datesMap.set(dateStr, { date: dateStr });
    }

    timeSeriesRaw.forEach(row => {
      const dateStr = new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (datesMap.has(dateStr)) {
        const existing = datesMap.get(dateStr);
        existing[row.industry] = Number(row.count);
      }
    });

    const timeSeriesData = Array.from(datesMap.values());

    // 4. Contacts by Emails Sent per Industry
    const emailCountsRaw: { industry: string; message_count: bigint; contact_count: number }[] = await prisma.$queryRaw`
      WITH ContactMessageCounts AS (
        SELECT c.industry, c.id, COUNT(m.id) as message_count
        FROM "Contact" c
        LEFT JOIN "Message" m ON c.id = m.contact_id AND m.direction = 'sent' AND m.status IN ('Sent', 'Replied')
        WHERE c.industry IS NOT NULL
        GROUP BY c.industry, c.id
      )
      SELECT industry, message_count, COUNT(id)::int as contact_count
      FROM ContactMessageCounts
      WHERE message_count > 0
      GROUP BY industry, message_count
      ORDER BY industry, message_count;
    `;

    // Process for Recharts Stacked Bar Chart
    const emailCountsMap = new Map<string, any>();
    
    // We also need to collect all unique message_counts so the frontend knows what keys to use for bars
    const uniqueEmailCounts = new Set<string>();

    emailCountsRaw.forEach(row => {
      const industry = row.industry;
      const msgCount = Number(row.message_count);
      const key = msgCount + (msgCount === 1 ? " mail" : " mails");
      
      uniqueEmailCounts.add(key);

      if (!emailCountsMap.has(industry)) {
        emailCountsMap.set(industry, { industry });
      }
      
      const existing = emailCountsMap.get(industry);
      existing[key] = row.contact_count;
    });

    // Sort the keys so they appear in order (1 mail, 2 mails, etc.)
    const emailCountKeys = Array.from(uniqueEmailCounts).sort((a, b) => {
      return parseInt(a) - parseInt(b);
    });

    return NextResponse.json({
      approachedContacts,
      industryStats,
      timeSeriesData,
      emailCountsData: Array.from(emailCountsMap.values()),
      emailCountKeys
    });
  } catch (error) {
    console.error("Analytics fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
