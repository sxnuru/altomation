"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  isCollapsed?: boolean;
}

export function ThemeToggle({ isCollapsed }: ThemeToggleProps) {
  const { setTheme, theme } = useTheme()

  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full flex items-center justify-start gap-3 text-muted-foreground hover:text-foreground",
        isCollapsed && "justify-center px-0"
      )}
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      title="Toggle Theme"
    >
      <Sun className="h-4 w-4 shrink-0 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 shrink-0 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      {!isCollapsed && <span>Toggle Theme</span>}
    </Button>
  )
}
