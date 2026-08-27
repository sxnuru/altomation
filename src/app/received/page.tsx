import { InboxList } from "@/components/received/inbox-list";

export default function ReceivedPage() {
  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Received</h2>
        <p className="text-muted-foreground">
          View and reply to incoming messages.
        </p>
      </div>

      <div className="flex-1 min-h-0 bg-white border border-border">
        <InboxList />
      </div>
    </div>
  );
}
