import React from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "./theme-provider";
import { Activity, LayoutDashboard, Compass, BookOpen, Briefcase, Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/research", label: "Research", icon: Compass },
  { path: "/narratives", label: "Narratives", icon: BookOpen },
  { path: "/signals", label: "Signals", icon: Activity },
  { path: "/portfolio", label: "Portfolio", icon: Briefcase },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2 text-primary font-bold text-2xl tracking-tighter">
            <Activity className="h-6 w-6" />
            <span>XogsideIQ</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors font-medium text-sm ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border mt-auto">
          <div className="flex items-center justify-between p-2 rounded-md bg-secondary text-sm">
            <span className="text-muted-foreground font-medium">Theme</span>
            <div className="flex items-center gap-1">
              <button
                className={`p-1.5 rounded-sm ${theme === 'light' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setTheme("light")}
              >
                <Sun className="h-4 w-4" />
              </button>
              <button
                className={`p-1.5 rounded-sm ${theme === 'dark' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setTheme("dark")}
              >
                <Moon className="h-4 w-4" />
              </button>
              <button
                className={`p-1.5 rounded-sm ${theme === 'system' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setTheme("system")}
              >
                <Monitor className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-[100dvh] overflow-y-auto bg-background">
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
}
