"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Send, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  const routes = [
    {
      label: "Send",
      icon: Send,
      href: "/send",
      active: pathname === "/send" || pathname === "/",
    },
    {
      label: "Received",
      icon: Inbox,
      href: "/received",
      active: pathname === "/received",
    },
  ];

  return (
    <div className="flex h-full w-64 flex-col border-r bg-white">
      <div className="flex h-14 items-center border-b px-6">
        <h1 className="text-lg font-bold tracking-tight">Outreach</h1>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="grid items-start px-4 text-sm font-medium">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-foreground transition-all hover:bg-muted",
                route.active ? "bg-muted font-semibold" : "text-muted-foreground"
              )}
            >
              <route.icon className="h-4 w-4" />
              {route.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
