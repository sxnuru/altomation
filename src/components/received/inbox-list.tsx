"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

import { MessageView } from "@/components/received/message-view";

export function InboxList() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>({ messages: [], total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMessages = useCallback(async (manualRefresh = false) => {
    if (manualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const res = await fetch(`/api/emails?page=${page}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch (err) {
      toast.error("Failed to load inbox");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [page]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return (
    <div className="flex flex-col h-full">
      <MessageView 
        message={selectedMessage} 
        isOpen={!!selectedMessage} 
        onClose={() => setSelectedMessage(null)} 
      />
      <div className="flex items-center justify-end p-4 border-b">
        <Button variant="outline" size="sm" onClick={() => fetchMessages(true)} disabled={isRefreshing || isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh Inbox
        </Button>
      </div>
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Received</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell className="h-24 text-center" colSpan={4}>
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : data.messages.length === 0 ? (
              <TableRow>
                <TableCell className="font-medium text-muted-foreground text-center h-24" colSpan={4}>
                  No received messages.
                </TableCell>
              </TableRow>
            ) : (
              data.messages.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    {m.contact?.first_name ? `${m.contact.first_name} ${m.contact.last_name} <${m.from_email}>` : m.from_email}
                  </TableCell>
                  <TableCell>{m.subject || "(No Subject)"}</TableCell>
                  <TableCell>{m.received_at ? formatDistanceToNow(new Date(m.received_at), { addSuffix: true }) : "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedMessage(m)}>
                        View Thread
                      </Button>
                      <Button variant="default" size="sm" onClick={() => setSelectedMessage(m)}>
                        Follow Up
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between p-4 border-t">
        <p className="text-sm text-muted-foreground">
          Showing {data.total > 0 ? (page - 1) * 40 + 1 : 0}–{Math.min(page * 40, data.total)} of {data.total} messages
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
          <span className="text-sm font-medium px-2">{page}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= data.totalPages}>Next</Button>
        </div>
      </div>
    </div>
  );
}
