import { Suspense } from "react";
import { FileUpload } from "@/components/send/file-upload";
import { ContactsTable } from "@/components/send/contacts-table";
import { AnalyticsDashboard } from "@/components/send/analytics-dashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SendPage() {
  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Send Dashboard</h2>
        <p className="text-muted-foreground">
          Manage your email campaigns and track analytics.
        </p>
      </div>

      <Tabs defaultValue="contacts" className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          <div className="w-[300px]">
            <FileUpload />
          </div>
        </div>
        
        <TabsContent value="contacts" className="flex-1 min-h-0 mt-4 data-[state=active]:flex flex-col border border-border bg-white">
          <Suspense fallback={<div>Loading contacts...</div>}>
            <ContactsTable />
          </Suspense>
        </TabsContent>

        <TabsContent value="analytics" className="flex-1 min-h-0 mt-4 overflow-y-auto">
          <AnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
