"use client";

import { useEffect, useState } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

// Predefined colors for different industries to keep charts consistent
const COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", 
  "#8b5cf6", "#ec4899", "#14b8a6", "#6366f1"
];

export function AnalyticsDashboard() {
  const [data, setData] = useState<{
    approachedContacts: number;
    dailySent: number;
    weeklySent: number;
    monthlySent: number;
    industryStats: any[];
    timeSeriesData: any[];
    emailCountsData: any[];
    emailCountKeys: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/analytics");
        if (!res.ok) throw new Error("Failed to load analytics data");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        toast.error(err.message || "An error occurred fetching analytics");
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  // Extract unique industries from the time series data for the LineChart
  const uniqueIndustries = new Set<string>();
  data.industryStats.forEach(stat => uniqueIndustries.add(stat.name));
  const industriesList = Array.from(uniqueIndustries);

  return (
    <div className="space-y-6">
      {/* Sent Email Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Approached Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.approachedContacts}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique contacts that received an email</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Sent Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{data.dailySent}</div>
            <p className="text-xs text-blue-500 mt-1">9:00 AM – 9:00 PM today</p>
          </CardContent>
        </Card>

        <Card className="border-violet-200 bg-violet-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-violet-600">Sent This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-700">{data.weeklySent}</div>
            <p className="text-xs text-violet-500 mt-1">Monday – Sunday (current week)</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600">Sent This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{data.monthlySent}</div>
            <p className="text-xs text-emerald-500 mt-1">1st – last day of current month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Total Emails Sent by Industry</CardTitle>
            <CardDescription>Total volume of emails sent per industry</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            {data.industryStats && data.industryStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.industryStats} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} angle={-15} textAnchor="end" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="sentCount" name="Emails Sent" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No industry data available.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Emails Sent Over Time (Last 30 Days)</CardTitle>
          <CardDescription>Tracking daily sent volume across industries</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px]">
          {data.timeSeriesData && data.timeSeriesData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.timeSeriesData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
                {industriesList.map((industry, index) => (
                  <Line 
                    key={industry} 
                    type="monotone" 
                    dataKey={industry} 
                    name={industry} 
                    stroke={COLORS[index % COLORS.length]} 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No timeline data available.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contacts by Emails Sent (per Industry)</CardTitle>
          <CardDescription>Number of contacts that received 1, 2, 3+ emails in each industry</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px]">
          {data.emailCountsData && data.emailCountsData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.emailCountsData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="industry" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} angle={-15} textAnchor="end" />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                {data.emailCountKeys.map((key, index) => (
                  <Bar 
                    key={key} 
                    dataKey={key} 
                    name={key} 
                    stackId="a" 
                    fill={COLORS[index % COLORS.length]} 
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No data available.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
