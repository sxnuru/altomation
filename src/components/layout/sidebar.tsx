"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Send, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentIndustry = searchParams.get("industry");
  const [industries, setIndustries] = useState<string[]>([]);

  useEffect(() => {
    const fetchIndustries = async () => {
      try {
        const res = await fetch("/api/industries");
        if (res.ok) {
          const data = await res.json();
          setIndustries(data);
        }
      } catch (error) {
        console.error("Failed to fetch industries:", error);
      }
    };

    fetchIndustries();

    // Listen for contacts refresh to update industries list if new ones are added
    const handleRefresh = () => fetchIndustries();
    window.addEventListener("refresh-contacts", handleRefresh);
    return () => window.removeEventListener("refresh-contacts", handleRefresh);
  }, []);

  const sendActive = pathname === "/send" || pathname === "/";

  return (
    <div className="flex h-full w-64 flex-col border-r bg-white">
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="grid items-start px-4 text-sm font-medium gap-1">
          <Link
            href="/send"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-foreground transition-all hover:bg-muted",
              sendActive && !currentIndustry ? "bg-muted font-semibold" : "text-muted-foreground"
            )}
          >
            <Send className="h-4 w-4" />
            All Contacts
          </Link>

          {industries.length > 0 && (
            <div className="mt-4 mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Industries
            </div>
          )}

          {industries.map((industry) => (
            <Link
              key={industry}
              href={`/send?industry=${encodeURIComponent(industry)}`}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-foreground transition-all hover:bg-muted",
                currentIndustry === industry ? "bg-muted font-semibold" : "text-muted-foreground"
              )}
            >
              <Briefcase className="h-4 w-4" />
              {industry}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
