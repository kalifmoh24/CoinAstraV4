import React from "react";
import { Link, useLocation } from "wouter";
import {
  Activity, LayoutDashboard, BarChart2, Compass, BookOpen, Briefcase, TrendingUp,
  Sun, Moon,
} from "lucide-react";
import { MobileNav } from "@/components/mobile-nav";
import { NotificationCenter } from "@/components/notification-center";
import { GlobalTicker } from "@/components/global-ticker";
import { useTheme } from "@/components/theme-provider";

const NAV_ITEMS = [
  { path: "/",           label: "Dashboard",  icon: LayoutDashboard },
  { path: "/markets",    label: "Markets",    icon: BarChart2 },
  { path: "/research",   label: "Research",   icon: Compass },
  { path: "/narratives", label: "Narratives", icon: BookOpen },
  { path: "/signals",    label: "Signals",    icon: TrendingUp },
  { path: "/portfolio",  label: "Portfolio",  icon: Briefcase },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const isDark = theme !== "light";

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Global live market ticker */}
      <GlobalTicker />

      {/* Main header */}
      <header className="h-10 flex items-center px-3 border-b border-border bg-card shrink-0 gap-3">
        <Link href="/" className="flex items-center gap-1.5 text-primary font-bold text-sm tracking-tight shrink-0">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#2962ff,#7c3aed)", boxShadow: "0 0 10px rgba(41,98,255,0.35)" }}>
            <Activity className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="hidden sm:inline">CoinAstra</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const isActive =
              location === item.path ||
              (item.path !== "/" && location.startsWith(item.path));
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
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

        {/* Mobile: page label */}
        <div className="md:hidden flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs font-bold text-foreground truncate">
            {NAV_ITEMS.find(n =>
              location === n.path || (n.path !== "/" && location.startsWith(n.path))
            )?.label ?? "CoinAstra"}
          </span>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1 ml-auto shrink-0">
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-secondary"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            style={{ color: "#5a6072" }}
          >
            {isDark
              ? <Sun className="h-3.5 w-3.5" />
              : <Moon className="h-3.5 w-3.5" />}
          </button>
          <NotificationCenter />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-3 md:p-4 pb-24 md:pb-4">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}
