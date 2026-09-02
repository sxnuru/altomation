"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Send, Briefcase, AlertCircle, ChevronLeft, ChevronRight, LayoutDashboard, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentIndustry = searchParams.get("industry");
  const [industries, setIndustries] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const { isAdmin } = await res.json();
          if (isAdmin) setIsAdmin(true);
        }
      } catch (err) {}
    };
    fetchUser();
  }, []);

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
  const inAdminView = pathname?.startsWith("/admin");

  const handleAdminSignOut = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setIsAdmin(false);
    router.push("/admin/login");
  };

  if (inAdminView) {
    return (
      <div className={cn("relative flex h-full flex-col border-r bg-white transition-all duration-300", isCollapsed ? "w-16" : "w-64")}>
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="grid items-start px-2 text-sm font-medium gap-1">
            <Link
              href="/admin"
              title="Admin Dashboard"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-foreground transition-all hover:bg-muted",
                pathname === "/admin" ? "bg-muted font-semibold text-primary" : "text-muted-foreground",
                isCollapsed && "justify-center px-0"
              )}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>Admin Dashboard</span>}
            </Link>
          </nav>
        </div>

        <Button 
          variant="outline" 
          size="icon" 
          className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full shadow-sm z-10 bg-white" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className={cn(
              "w-full flex items-center justify-start gap-3 text-muted-foreground hover:text-foreground",
              isCollapsed && "justify-center px-0"
            )}
            onClick={handleAdminSignOut}
            title="Sign Out"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative flex h-full flex-col border-r bg-white transition-all duration-300", isCollapsed ? "w-16" : "w-64")}>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="grid items-start px-2 text-sm font-medium gap-1">
          <Link
            href="/send"
            title="All Contacts"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-foreground transition-all hover:bg-muted",
              sendActive && !currentIndustry ? "bg-muted font-semibold" : "text-muted-foreground",
              isCollapsed && "justify-center px-0"
            )}
          >
            <Send className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>All Contacts</span>}
          </Link>

          <Link
            href="/logs"
            title="Bounce Logs"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-foreground transition-all hover:bg-muted",
              pathname === "/logs" ? "bg-muted font-semibold text-destructive" : "text-muted-foreground",
              isCollapsed && "justify-center px-0"
            )}
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>Bounce Logs</span>}
          </Link>





          {industries.length > 0 && !isCollapsed && (
            <div className="mt-4 mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Industries
            </div>
          )}
          
          {industries.length > 0 && isCollapsed && (
             <div className="my-2 border-b border-muted"></div>
          )}

          {industries.map((industry) => (
            <Link
              key={industry}
              href={`/send?industry=${encodeURIComponent(industry)}`}
              title={industry}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-foreground transition-all hover:bg-muted",
                currentIndustry === industry ? "bg-muted font-semibold" : "text-muted-foreground",
                isCollapsed && "justify-center px-0"
              )}
            >
              <Briefcase className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="truncate">{industry}</span>}
            </Link>
          ))}
        </nav>
      </div>

      <Button 
        variant="outline" 
        size="icon" 
        className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full shadow-sm z-10 bg-white" 
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className={cn(
            "w-full flex items-center justify-start gap-3 text-muted-foreground hover:text-foreground",
            isCollapsed && "justify-center px-0"
          )}
          onClick={handleSignOut}
          title="Sign Out"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </Button>
      </div>

    </div>
  );
}
