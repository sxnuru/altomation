"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname === "/login" || pathname?.startsWith("/mfa-");

  if (isAuthRoute) {
    return <main className="flex-1 h-screen overflow-hidden bg-muted/30">{children}</main>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Suspense fallback={<div className="w-64 border-r bg-white" />}>
        <Sidebar />
      </Suspense>
      <main className="flex-1 overflow-y-auto bg-white p-6 md:p-8 border-l">
        {children}
      </main>
    </div>
  );
}
