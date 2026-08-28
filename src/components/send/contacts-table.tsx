"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { EmailComposer } from "@/components/send/email-composer";
import { MessageView } from "@/components/received/message-view";

export function ContactsTable() {
  const searchParams = useSearchParams();
  const currentIndustry = searchParams.get("industry") || "";

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [designation, setDesignation] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>({ contacts: [], total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [selectedThreadContact, setSelectedThreadContact] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchContacts = useCallback(async (manualRefresh = false) => {
    if (manualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      if (search) params.set("search", search);
      if (filter) params.set("filter", filter);
      if (currentIndustry) params.set("industry", currentIndustry);
      if (designation) params.set("designation", designation);

      const res = await fetch(`/api/contacts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch (err) {
      toast.error("Failed to load contacts");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [page, search, filter, currentIndustry, designation]);

  useEffect(() => {
    // Reset page when filters change
    setPage(1);
  }, [search, filter, currentIndustry, designation]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchContacts]);

  useEffect(() => {
    const handleRefresh = () => fetchContacts(true);
    window.addEventListener("refresh-contacts", handleRefresh);
    return () => window.removeEventListener("refresh-contacts", handleRefresh);
  }, [fetchContacts]);

  // Construct a dummy message object so MessageView can fetch the thread
  const threadMessage = selectedThreadContact?.conversations?.[0] ? {
    conversation_id: selectedThreadContact.conversations[0].id,
    contact_id: selectedThreadContact.id,
    subject: selectedThreadContact.conversations[0].subject,
  } : null;

  return (
    <div className="flex flex-col h-full">
      <EmailComposer 
        contact={selectedContact} 
        isOpen={!!selectedContact} 
        onClose={() => setSelectedContact(null)} 
      />
      <MessageView
        message={threadMessage}
        isOpen={!!threadMessage}
        onClose={() => setSelectedThreadContact(null)}
      />
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4 flex-1">
          <Input 
            placeholder="Search contacts..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-[200px]"
          />
          <Input 
            placeholder="Designation (e.g. CXO, Director)..." 
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            className="max-w-[250px]"
          />
          <Select value={filter} onValueChange={(v) => setFilter(v || "all")}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="not_sent">Not Sent</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => fetchContacts(true)} disabled={isRefreshing || isLoading}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Designation</TableHead>
              {currentIndustry === "" && <TableHead>Industry</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell className="h-24 text-center" colSpan={currentIndustry === "" ? 7 : 6}>
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : data.contacts.length === 0 ? (
              <TableRow>
                <TableCell className="font-medium text-muted-foreground text-center h-24" colSpan={currentIndustry === "" ? 7 : 6}>
                  No contacts found. Upload a file to get started.
                </TableCell>
              </TableRow>
            ) : (
              data.contacts.map((c: any) => (
                <TableRow key={c.id} className={c.send_status === "Sent" ? "bg-emerald-50/50 hover:bg-emerald-100/50" : ""}>
                  <TableCell className="font-medium">{c.email}</TableCell>
                  <TableCell>{[c.first_name, c.last_name].filter(Boolean).join(" ") || "-"}</TableCell>
                  <TableCell>{c.company || "-"}</TableCell>
                  <TableCell>{c.job_title || "-"}</TableCell>
                  {currentIndustry === "" && <TableCell>{c.industry || "-"}</TableCell>}
                  <TableCell>
                    <Badge 
                      variant={c.send_status === "Sent" ? "default" : c.send_status === "Failed" ? "destructive" : "outline"} 
                      className={`rounded-none ${c.send_status === "Sent" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}`}
                    >
                      {c.send_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {(c.send_status === "Sent" || c.send_status === "Replied") ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setSelectedThreadContact(c)} disabled={!c.conversations?.length}>
                            View
                          </Button>
                          <Button variant="default" size="sm" onClick={() => setSelectedContact(c)}>
                            Follow up
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => setSelectedContact(c)}>
                          Send
                        </Button>
                      )}
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
          Showing {data.total > 0 ? (page - 1) * 40 + 1 : 0}–{Math.min(page * 40, data.total)} of {data.total} contacts
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
