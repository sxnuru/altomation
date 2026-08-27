"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EmailComposerProps {
  contact: any;
  isOpen: boolean;
  onClose: () => void;
}

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function EmailComposer({ contact, isOpen, onClose }: EmailComposerProps) {
  const [fromEmail, setFromEmail] = useState("faraz@antilineartech.com");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and body are required");
      return;
    }
    
    setIsSending(true);
    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contact.id,
          fromEmail,
          subject,
          body
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send email");

      toast.success("Email sent successfully");
      window.dispatchEvent(new Event("refresh-contacts"));
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  if (!contact) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] rounded-none">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>From</Label>
              <Select value={fromEmail} onValueChange={(v) => setFromEmail(v || "faraz@antilineartech.com")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="faraz@antilineartech.com">faraz@antilineartech.com</SelectItem>
                  <SelectItem value="hello@antilineartech.com">hello@antilineartech.com</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>To</Label>
              <Input disabled value={contact.email} className="bg-muted" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Subject</Label>
            <Input 
              placeholder="Enter subject" 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Message</Label>
            <Textarea 
              placeholder="Hi {{first_name}}," 
              className="min-h-[200px]"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Available variables: {"{{first_name}}"}, {"{{last_name}}"}, {"{{company}}"}, {"{{email}}"}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>Cancel</Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
