import { FileUpload } from "@/components/send/file-upload";
import { ContactsTable } from "@/components/send/contacts-table";

export default function SendPage() {
  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Send</h2>
        <p className="text-muted-foreground">
          Upload contacts and send personalized emails.
        </p>
      </div>

      <FileUpload />
      
      <div className="flex-1 min-h-0 bg-white border border-border">
        <ContactsTable />
      </div>
    </div>
  );
}
