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
import { AddContactModal } from "@/components/send/add-contact-modal";
import { MessageView } from "@/components/received/message-view";
import { formatDistanceToNow } from "date-fns";
import { Plus } from "lucide-react";

const DEFAULT_COLUMNS = [
  { id: "email", label: "Email" },
  { id: "name", label: "Name" },
  { id: "company", label: "Company" },
  { id: "designation", label: "Designation" },
  { id: "location", label: "Location" },
  { id: "industry", label: "Industry" },
  { id: "sent_count", label: "Emails Sent" },
  { id: "last_sent", label: "Last Sent" },
  { id: "status", label: "Status" },
];

export function ContactsTable() {
  const searchParams = useSearchParams();
  const currentIndustry = searchParams.get("industry") || "";

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [designation, setDesignation] = useState("");
  const [location, setLocation] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>({ contacts: [], total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [selectedThreadContact, setSelectedThreadContact] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);

  // Column Reordering State
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [dragDirection, setDragDirection] = useState<"left" | "right">("left");

  // Column Resizing State
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizingCol, setResizingCol] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("contactsTableColumns");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure validity
        const valid = parsed.every((col: any) => DEFAULT_COLUMNS.some(d => d.id === col.id)) && parsed.length === DEFAULT_COLUMNS.length;
        if (valid) {
          setColumns(parsed);
        }
      } catch {}
    }
    const savedWidths = localStorage.getItem("contactsTableColumnWidths");
    if (savedWidths) {
      try {
        setColumnWidths(JSON.parse(savedWidths));
      } catch {}
    }
  }, []);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if ((e.target as HTMLElement).classList.contains("resizer")) {
      e.preventDefault();
      return;
    }
    setDraggedColId(id);
    e.dataTransfer.effectAllowed = "move";
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.add("opacity-50");
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedColId(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.remove("opacity-50");
    }
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!draggedColId || draggedColId === targetId) {
      setDragOverColId(null);
      return;
    }
    
    setDragOverColId(targetId);
    
    const draggedIdx = columns.findIndex(c => c.id === draggedColId);
    const targetIdx = columns.findIndex(c => c.id === targetId);
    setDragDirection(targetIdx > draggedIdx ? "right" : "left");
  };

  const handleDragLeave = () => {
    setDragOverColId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverColId(null);
    if (!draggedColId || draggedColId === targetId) return;

    const oldIndex = columns.findIndex(c => c.id === draggedColId);
    const newIndex = columns.findIndex(c => c.id === targetId);
    if (oldIndex === -1 || newIndex === -1) return;

    const newCols = [...columns];
    const [removed] = newCols.splice(oldIndex, 1);
    newCols.splice(newIndex, 0, removed);
    
    setColumns(newCols);
    localStorage.setItem("contactsTableColumns", JSON.stringify(newCols));
  };

  const handleResizeStart = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingCol(id);
    setStartX(e.clientX);
    const th = (e.currentTarget as HTMLElement).closest("th");
    setStartWidth(th?.getBoundingClientRect().width || 150);
  };

  useEffect(() => {
    if (!resizingCol) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diffX = e.clientX - startX;
      const newWidth = Math.max(50, startWidth + diffX);
      setColumnWidths(prev => {
        const updated = { ...prev, [resizingCol]: newWidth };
        localStorage.setItem("contactsTableColumnWidths", JSON.stringify(updated));
        return updated;
      });
    };

    const handleMouseUp = () => {
      setResizingCol(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingCol, startX, startWidth]);


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
      if (location) params.set("location", location);

      const res = await fetch(`/api/contacts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load contacts");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [page, search, filter, currentIndustry, designation, location]);

  useEffect(() => {
    setPage(1);
  }, [search, filter, currentIndustry, designation, location]);

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

  const threadMessage = selectedThreadContact?.conversations?.[0] ? {
    conversation_id: selectedThreadContact.conversations[0].id,
    contact_id: selectedThreadContact.id,
    subject: selectedThreadContact.conversations[0].subject,
  } : null;

  return (
    <div className="flex flex-col h-full">
      <AddContactModal 
        isOpen={isAddContactOpen}
        onClose={() => setIsAddContactOpen(false)}
      />
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
            className="max-w-[200px]"
          />
          <Input 
            placeholder="Location..." 
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="max-w-[150px]"
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
              <SelectItem value="bounced">Bounced</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => fetchContacts(true)} disabled={isRefreshing || isLoading}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => setIsAddContactOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Contact
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => {
                if (col.id === "industry" && currentIndustry !== "") return null;
                
                const isDragOver = dragOverColId === col.id;
                const borderClass = isDragOver 
                  ? dragDirection === "right" 
                    ? "border-r-4 border-r-blue-500" 
                    : "border-l-4 border-l-blue-500"
                  : "";

                return (
                  <TableHead 
                    key={col.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, col.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, col.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, col.id)}
                    className={`relative cursor-grab active:cursor-grabbing select-none hover:bg-muted/50 transition-all ${draggedColId === col.id ? "opacity-30 bg-muted" : ""} ${borderClass}`}
                    title="Drag to reorder"
                    style={{ width: columnWidths[col.id] ? `${columnWidths[col.id]}px` : "auto", minWidth: columnWidths[col.id] ? `${columnWidths[col.id]}px` : "150px" }}
                  >
                    <div className="flex items-center w-full h-full overflow-hidden whitespace-nowrap">
                      {col.label}
                    </div>
                    {/* Resizer */}
                    <div
                      onMouseDown={(e) => handleResizeStart(e, col.id)}
                      className="resizer absolute right-0 top-0 bottom-0 w-[5px] cursor-col-resize hover:bg-primary/50 bg-transparent z-10 touch-none"
                    />
                  </TableHead>
                );
              })}
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell className="h-24 text-center" colSpan={currentIndustry === "" ? columns.length + 1 : columns.length}>
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : data.contacts.length === 0 ? (
              <TableRow>
                <TableCell className="font-medium text-muted-foreground text-center h-24" colSpan={currentIndustry === "" ? columns.length + 1 : columns.length}>
                  No contacts found. Upload a file to get started.
                </TableCell>
              </TableRow>
            ) : (
              data.contacts.map((c: any) => (
                <TableRow key={c.id} className={c.send_status === "Sent" ? "bg-emerald-50/50 hover:bg-emerald-100/50" : ""}>
                  {columns.map((col) => {
                    if (col.id === "industry" && currentIndustry !== "") return null;
                    
                    let content = null;
                    if (col.id === "email") content = c.email;
                    else if (col.id === "name") content = [c.first_name, c.last_name].filter(Boolean).join(" ") || "-";
                    else if (col.id === "company") content = c.company || "-";
                    else if (col.id === "designation") content = c.job_title || "-";
                    else if (col.id === "location") content = c.location || "-";
                    else if (col.id === "industry") content = c.industry || "-";
                    else if (col.id === "sent_count") {
                      content = (
                        <Badge variant="secondary" className="font-mono">
                          {c._count?.messages || 0}
                        </Badge>
                      );
                    }
                    else if (col.id === "last_sent") {
                      const lastMsg = c.messages?.[0];
                      if (lastMsg?.sent_at) {
                        content = <span className="text-muted-foreground">{formatDistanceToNow(new Date(lastMsg.sent_at), { addSuffix: true })}</span>;
                      } else {
                        content = "-";
                      }
                    }
                    else if (col.id === "status") {
                      content = (
                        <Badge 
                          variant={c.send_status === "Sent" ? "default" : (c.send_status === "Failed" || c.send_status === "Bounced") ? "destructive" : "outline"} 
                          className={`rounded-none ${c.send_status === "Sent" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}`}
                        >
                          {c.send_status}
                        </Badge>
                      );
                    }

                    return (
                      <TableCell 
                        key={col.id} 
                        className={col.id === "email" ? "font-medium break-words whitespace-normal" : "break-words whitespace-normal"}
                        style={{ width: columnWidths[col.id] ? `${columnWidths[col.id]}px` : "auto", minWidth: columnWidths[col.id] ? `${columnWidths[col.id]}px` : "150px", maxWidth: columnWidths[col.id] ? `${columnWidths[col.id]}px` : "none" }}
                      >
                        {content}
                      </TableCell>
                    );
                  })}
                  
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {(c.send_status === "Sent" || c.send_status === "Replied" || c.send_status === "Failed" || c.send_status === "Bounced") ? (
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
