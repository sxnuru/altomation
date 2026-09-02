"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddContactModal({ isOpen, onClose }: AddContactModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    company: "",
    job_title: "",
    industry: "",
    location: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim()) {
      toast.error("Email is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add contact");

      toast.success("Contact added successfully");
      window.dispatchEvent(new Event("refresh-contacts"));
      setFormData({
        email: "",
        first_name: "",
        last_name: "",
        company: "",
        job_title: "",
        industry: "",
        location: ""
      });
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to add contact");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-none">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Email *</Label>
            <Input 
              type="email"
              name="email"
              placeholder="jane@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>First Name</Label>
              <Input 
                name="first_name"
                placeholder="Jane"
                value={formData.first_name}
                onChange={handleChange}
              />
            </div>
            <div className="grid gap-2">
              <Label>Last Name</Label>
              <Input 
                name="last_name"
                placeholder="Doe"
                value={formData.last_name}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Company</Label>
              <Input 
                name="company"
                placeholder="Acme Inc"
                value={formData.company}
                onChange={handleChange}
              />
            </div>
            <div className="grid gap-2">
              <Label>Job Title</Label>
              <Input 
                name="job_title"
                placeholder="CEO"
                value={formData.job_title}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Industry</Label>
              <Input 
                name="industry"
                placeholder="Software"
                value={formData.industry}
                onChange={handleChange}
              />
            </div>
            <div className="grid gap-2">
              <Label>Location</Label>
              <Input 
                name="location"
                placeholder="New York"
                value={formData.location}
                onChange={handleChange}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Contact
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
