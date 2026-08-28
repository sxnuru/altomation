"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";

export function BouncesTable() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>({ logs: [], total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLogs = async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      const res = await fetch(`/api/logs/bounces?page=${page}`);
      if (!res.ok) throw new Error("Failed to fetch logs");
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Bounce & Failure Logs
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review detailed logs of emails that were bounced or failed to deliver.
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => fetchLogs(true)} disabled={isRefreshing || isLoading}>
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Recipient</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-1/3">Error Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell className="h-48 text-center" colSpan={5}>
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : data.logs.length === 0 ? (
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground text-center h-48" colSpan={5}>
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-emerald-100 rounded-full">
                        <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      </div>
                      <p>No bounced or failed emails found! Awesome!</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.logs.map((log: any) => (
                  <TableRow key={log.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="font-medium">{log.to_email}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {[log.contact?.first_name, log.contact?.last_name].filter(Boolean).join(" ") || "-"} 
                        {log.contact?.company && ` • ${log.contact.company}`}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={log.subject}>
                      {log.subject || "(No Subject)"}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                      {log.created_at ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true }) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="rounded-none shadow-sm font-semibold tracking-wide uppercase text-[10px]">
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="bg-destructive/10 text-destructive border border-destructive/20 p-2 rounded-md">
                        {log.error_message || "Unknown error occurred"}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
            <div className="text-sm text-muted-foreground">
              Showing page {page} of {data.totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
