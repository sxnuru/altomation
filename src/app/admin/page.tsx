"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const COLORS = {
  Sent: "#10b981", // emerald-500
  Replied: "#3b82f6", // blue-500
  Failed: "#ef4444", // red-500
};

export default function AdminDashboard() {
  const [data, setData] = useState<{ userStats: any[], historicalData: any[], recentMessages: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
        if (res.status === 401) {
          router.push("/admin/login");
          return;
        }
        if (!res.ok) throw new Error("Failed to load stats");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        toast.error(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">Monitor email sending activity across your team.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={async () => {
            await fetch("/api/admin/logout", { method: "POST" });
            router.push("/admin/login");
          }}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Email Output by User</CardTitle>
            <CardDescription>Total emails sent by each team member</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.userStats} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Bar dataKey="sent" name="Sent" stackId="a" fill={COLORS.Sent} radius={[0, 0, 4, 4]} />
                <Bar dataKey="replied" name="Replied" stackId="a" fill={COLORS.Replied} />
                <Bar dataKey="failed" name="Failed" stackId="a" fill={COLORS.Failed} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Overview</CardTitle>
            <CardDescription>Summary of sending statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Daily</TableHead>
                  <TableHead className="text-right">Weekly</TableHead>
                  <TableHead className="text-right">Monthly</TableHead>
                  <TableHead className="text-right text-muted-foreground">Total Sent</TableHead>
                  <TableHead className="text-right text-muted-foreground">Replied</TableHead>
                  <TableHead className="text-right text-muted-foreground">Failed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.userStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No activity yet.
                    </TableCell>
                  </TableRow>
                )}
                {data.userStats.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{user.dailySent}</TableCell>
                    <TableCell className="text-right font-mono">{user.weeklySent}</TableCell>
                    <TableCell className="text-right font-mono">{user.monthlySent}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{user.sent}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{user.replied}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{user.failed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historical Email Output (Last 30 Days)</CardTitle>
          <CardDescription>Total sent emails across the entire team per day</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px]">
          {data.historicalData && data.historicalData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.historicalData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" name="Emails Sent" fill={COLORS.Sent} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No historical data for the last 30 days.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest emails sent across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Sent By</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentMessages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No emails sent yet.
                  </TableCell>
                </TableRow>
              )}
              {data.recentMessages.map((msg: any) => (
                <TableRow key={msg.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                        {(msg.user?.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{msg.user?.name || "System"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{[msg.contact?.first_name, msg.contact?.last_name].filter(Boolean).join(" ") || "-"}</div>
                    <div className="text-xs text-muted-foreground">{msg.to_email}</div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={msg.subject}>
                    {msg.subject || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={msg.status === "Sent" ? "default" : msg.status === "Failed" ? "destructive" : "outline"}
                      className={msg.status === "Sent" ? "bg-emerald-500 hover:bg-emerald-600" : ""}
                    >
                      {msg.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
