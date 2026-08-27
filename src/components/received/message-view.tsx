"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface MessageViewProps {
  message: any;
  isOpen: boolean;
  onClose: () => void;
}

export function MessageView({ message, isOpen, onClose }: MessageViewProps) {
  const [replyBody, setReplyBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [thread, setThread] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && message?.conversation_id) {
      const fetchThread = async () => {
        setIsLoading(true);
        try {
          const res = await fetch(`/api/emails/thread?conversationId=${message.conversation_id}`);
          if (res.ok) {
            const data = await res.json();
            setThread(data.messages);
          }
        } catch (error) {
          console.error(error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchThread();
    }
  }, [isOpen, message]);

  const handleReply = async () => {
    if (!replyBody.trim()) return;

    setIsSending(true);
    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: message.contact_id,
          subject: message.subject.startsWith("Re:") ? message.subject : `Re: ${message.subject}`,
          body: replyBody
        })
      });

      if (!res.ok) throw new Error("Failed to send reply");

      toast.success("Reply sent successfully");
      setReplyBody("");
      onClose();
    } catch (err) {
      toast.error("Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  if (!message) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col rounded-none">
        <DialogHeader>
          <DialogTitle className="truncate">{message.subject || "(No Subject)"}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-4 -mr-4 flex flex-col gap-4 py-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            thread.map((msg, idx) => (
              <div 
                key={msg.id} 
                className={`p-4 border ${msg.direction === "sent" ? "bg-muted/30 ml-8" : "bg-white mr-8"} flex flex-col gap-2`}
              >
                <div className="flex justify-between items-center text-sm text-muted-foreground border-b pb-2 mb-2">
                  <span className="font-medium text-foreground">{msg.from_email}</span>
                  <span>{msg.received_at || msg.sent_at ? formatDistanceToNow(new Date(msg.received_at || msg.sent_at), { addSuffix: true }) : "-"}</span>
                </div>
                <div 
                  className="text-sm prose prose-sm max-w-none" 
                  dangerouslySetInnerHTML={{ __html: msg.html_body || msg.text_body?.replace(/\n/g, "<br>") || "" }} 
                />
              </div>
            ))
          )}
        </div>

        <div className="pt-4 border-t mt-auto flex flex-col gap-2">
          <Textarea 
            placeholder="Type your reply here..." 
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            className="min-h-[100px]"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSending}>Close</Button>
            <Button onClick={handleReply} disabled={isSending || !replyBody.trim()}>
              {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
