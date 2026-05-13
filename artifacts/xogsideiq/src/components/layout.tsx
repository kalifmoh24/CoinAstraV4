import React from "react";
import { Link, useLocation } from "wouter";
import {
  Activity, LayoutDashboard, BarChart2, Compass, BookOpen, Briefcase, TrendingUp,
} from "lucide-react";
import { MobileNav } from "@/components/mobile-nav";

const NAV_ITEMS = [
  { path: "/",          label: "Dashboard",  icon: LayoutDashboard },
  { path: "/markets",   label: "Markets",    icon: BarChart2 },
  { path: "/research",  label: "Research",   icon: Compass },
  { path: "/narratives",label: "Narratives", icon: BookOpen },
  { path: "/signals",   label: "Signals",    icon: TrendingUp },
  { path: "/portfolio", label: "Portfolio",  icon: Briefcase },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Desktop / Tablet top nav */}
      <header className="h-10 flex items-center px-3 border-b border-border bg-card shrink-0 gap-4">
        <Link href="/" className="flex items-center gap-1.5 text-primary font-bold text-sm tracking-tight shrink-0">
          <Activity className="h-4 w-4" />
          <span className="hidden sm:inline">XogsideIQ</span>
        </Link>
        <nav className="hidden md:flex items-center gap-0.5 flex-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const isActive =
              location === item.path ||
              (item.path !== "/" && location.startsWith(item.path));
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
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
        {/* Mobile: show logo + page title only */}
        <div className="md:hidden flex items-center gap-2 flex-1">
          <span className="text-xs font-bold text-foreground">
            {NAV_ITEMS.find(n => location === n.path || (n.path !== "/" && location.startsWith(n.path)))?.label ?? "XogsideIQ"}
          </span>
        </div>
      </header>

      {/* Main content — add pb-20 on mobile to account for bottom nav */}
      <main className="flex-1 overflow-y-auto p-3 md:p-4 pb-24 md:pb-4">
        {children}
      </main>

      {/* Mobile bottom nav — only visible on < md */}
      <MobileNav />
    </div>
  );
}
