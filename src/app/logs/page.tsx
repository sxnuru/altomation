import { BouncesTable } from "@/components/logs/bounces-table";

export default function LogsPage() {
  return (
    <div className="max-w-[1200px] mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Delivery Logs</h1>
        <p className="text-muted-foreground mt-2 max-w-[600px]">
          Monitor your outbound email health. Bounced and failed emails are recorded here with detailed error reports to help you keep your mailing list clean.
        </p>
      </div>

      <BouncesTable />
    </div>
  );
}
