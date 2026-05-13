import React from "react";
import { Link, useLocation } from "wouter";
import { Activity, LayoutDashboard, BarChart2, Compass, BookOpen, Briefcase, TrendingUp } from "lucide-react";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/markets", label: "Markets", icon: BarChart2 },
  { path: "/research", label: "Research", icon: Compass },
  { path: "/narratives", label: "Narratives", icon: BookOpen },
  { path: "/signals", label: "Signals", icon: TrendingUp },
  { path: "/portfolio", label: "Portfolio", icon: Briefcase },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <header className="h-9 flex items-center px-3 border-b border-border bg-card shrink-0 gap-4">
        <Link href="/" className="flex items-center gap-1.5 text-primary font-bold text-sm tracking-tight">
          <Activity className="h-4 w-4" />
          <span>XogsideIQ</span>
        </Link>
        <nav className="flex items-center gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="h-3 w-3" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="flex-1 overflow-y-auto p-4">
        {children}
      </main>
    </div>
  );
}
