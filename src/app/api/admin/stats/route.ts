import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get("admin_auth")?.value !== "true") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setDate(startOfToday.getDate() - 7);
    const thirtyDaysAgo = new Date(startOfToday);
    thirtyDaysAgo.setDate(startOfToday.getDate() - 30);

    // Fetch data concurrently for faster loading
    const [stats, dailyStats, weeklyStats, monthlyStats, historicalRaw, users, recentMessages] = await Promise.all([
      // Total stats
      prisma.message.groupBy({
        by: ['user_id', 'status'],
        _count: { id: true },
      }),
      // Daily Sent
      prisma.message.groupBy({
        by: ['user_id'],
        where: { status: 'Sent', created_at: { gte: startOfToday } },
        _count: { id: true },
      }),
      // Weekly Sent
      prisma.message.groupBy({
        by: ['user_id'],
        where: { status: 'Sent', created_at: { gte: sevenDaysAgo } },
        _count: { id: true },
      }),
      // Monthly Sent
      prisma.message.groupBy({
        by: ['user_id'],
        where: { status: 'Sent', created_at: { gte: thirtyDaysAgo } },
        _count: { id: true },
      }),
      // Historical Data (Last 30 Days)
      prisma.$queryRaw`
        SELECT DATE(created_at) as date, COUNT(id)::int as count
        FROM "Message"
        WHERE status = 'Sent' AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC;
      `,
      // Users
      prisma.user.findMany({
        select: { id: true, email: true, name: true }
      }),
      // Recent Messages
      prisma.message.findMany({
        take: 20,
        orderBy: { created_at: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          contact: { select: { email: true, first_name: true, last_name: true } }
        }
      })
    ]);

    // Format historical data (convert BigInt to Number if necessary)
    const historicalData = (historicalRaw as any[]).map((row: any) => ({
      date: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: Number(row.count)
    }));

    // Aggregate stats by user
    const userStats = users.map(user => {
      const userMessages = stats.filter(s => s.user_id === user.id);
      
      const sentStats = userMessages.find(s => s.status === "Sent");
      const repliedStats = userMessages.find(s => s.status === "Replied");
      const failedStats = userMessages.find(s => s.status === "Failed");
      
      const userDaily = dailyStats.find(s => s.user_id === user.id)?._count.id || 0;
      const userWeekly = weeklyStats.find(s => s.user_id === user.id)?._count.id || 0;
      const userMonthly = monthlyStats.find(s => s.user_id === user.id)?._count.id || 0;

      return {
        id: user.id,
        email: user.email,
        name: user.name || user.email,
        sent: sentStats?._count.id || 0,
        replied: repliedStats?._count.id || 0,
        failed: failedStats?._count.id || 0,
        dailySent: userDaily,
        weeklySent: userWeekly,
        monthlySent: userMonthly
      };
    });

    return NextResponse.json({ userStats, historicalData, recentMessages });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
