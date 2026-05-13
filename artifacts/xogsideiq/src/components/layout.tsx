import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity, LayoutDashboard, BarChart2, Compass, BookOpen, Briefcase,
  TrendingUp, Sun, Moon, ChevronLeft, ChevronRight, Globe,
  Brain, Waves, Network, ScanLine, Newspaper, Star, Bell, LayoutGrid,
  GraduationCap, Settings2, User, Sparkles, Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MobileNav } from "@/components/mobile-nav";
import { NotificationCenter } from "@/components/notification-center";
import { GlobalTicker } from "@/components/global-ticker";
import { useTheme } from "@/components/theme-provider";
import { useScreenSize } from "@/hooks/use-screen-size";

const NAV_SECTIONS = [
  {
    label: "MAIN",
    items: [
      { path: "/",          label: "Dashboard",    icon: LayoutDashboard, color: "#2962ff" },
      { path: "/markets",   label: "Markets",      icon: BarChart2,       color: "#26a69a" },
      { path: "/watchlist", label: "Watchlist",    icon: Star,            color: "#f7931a" },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      { path: "/ai-insights",    label: "AI Insights",    icon: Brain,    color: "#7c3aed" },
      { path: "/screener",       label: "AI Screener",    icon: ScanLine, color: "#f7931a" },
      { path: "/whale-tracker",  label: "Whale Tracker",  icon: Waves,    color: "#0ea5e9" },
      { path: "/on-chain",       label: "On-Chain",       icon: Network,  color: "#10b981" },
    ],
  },
  {
    label: "MARKETS",
    items: [
      { path: "/narratives", label: "Narratives",   icon: Sparkles,    color: "#7c3aed" },
      { path: "/news",       label: "News",         icon: Newspaper,   color: "#0ea5e9" },
      { path: "/heatmap",    label: "Heatmap",      icon: LayoutGrid,  color: "#2962ff" },
    ],
  },
  {
    label: "TRADING",
    items: [
      { path: "/signals",    label: "Signals",      icon: Zap,         color: "#26a69a" },
      { path: "/portfolio",  label: "Portfolio",    icon: Briefcase,   color: "#2962ff" },
      { path: "/alerts",     label: "Alerts",       icon: Bell,        color: "#ef5350" },
    ],
  },
  {
    label: "MORE",
    items: [
      { path: "/research",   label: "Research",     icon: Compass,     color: "#7c3aed" },
      { path: "/learn",      label: "Academy",      icon: GraduationCap, color: "#0ea5e9" },
      { path: "/settings",   label: "Settings",     icon: Settings2,   color: "#5a6072" },
      { path: "/profile",    label: "Profile",      icon: User,        color: "#5a6072" },
    ],
  },
];

const ALL_NAV = NAV_SECTIONS.flatMap(s => s.items);

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const isDark = theme !== "light";
  const { isMobile, isTablet, isDesktop } = useScreenSize();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const showSidebar = isTablet || isDesktop;

  const isActive = (path: string) =>
    location === path || (path !== "/" && location.startsWith(path));

  const currentPage = ALL_NAV.find(n => isActive(n.path));

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <GlobalTicker />

      {/* Top Header */}
      <header
        className="h-11 flex items-center px-3 border-b border-border shrink-0 gap-3"
        style={{
          background: isDark ? "rgba(7,10,18,0.98)" : "rgba(245,247,252,0.98)",
          backdropFilter: "blur(20px)",
        }}>
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-6 h-6 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#2962ff,#7c3aed)", boxShadow: "0 0 12px rgba(41,98,255,0.4)" }}>
            <Activity className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="hidden sm:inline text-[14px] font-black tracking-tight">
            Coin<span style={{ color: "#2962ff" }}>Astra</span>
          </span>
        </Link>

        {/* Desktop: scrollable quick nav (compact) */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1 overflow-x-auto scrollbar-none">
          {ALL_NAV.slice(0, 8).map((item) => {
            const active = isActive(item.path);
            return (
              <Link key={item.path} href={item.path}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
                style={{
                  color: active ? item.color : "#5a6072",
                  background: active ? `${item.color}15` : "transparent",
                  boxShadow: active ? `0 0 12px ${item.color}20` : "none",
                }}>
                <item.icon className="h-3 w-3" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile: page label */}
        <div className="md:hidden flex items-center gap-2 flex-1 min-w-0">
          {currentPage && (
            <>
              <currentPage.icon className="h-3.5 w-3.5 shrink-0" style={{ color: currentPage.color }} />
              <span className="text-xs font-bold text-foreground truncate">{currentPage.label}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 ml-auto shrink-0">
          <button onClick={() => setTheme(isDark ? "light" : "dark")}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-secondary"
            style={{ color: "#5a6072" }}>
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
          <NotificationCenter />
        </div>
      </header>

      {/* Main: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        {showSidebar && (
          <motion.aside
            animate={{ width: sidebarCollapsed ? 52 : 192 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="shrink-0 flex flex-col border-r border-border overflow-hidden"
            style={{ background: isDark ? "rgba(7,10,18,0.98)" : "rgba(243,246,252,0.98)" }}>

            <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-none">
              {NAV_SECTIONS.map((section) => (
                <div key={section.label} className="mb-1">
                  {/* Section label */}
                  {!sidebarCollapsed && (
                    <div className="px-3.5 pt-3 pb-1">
                      <span className="text-[8px] font-black tracking-widest uppercase"
                        style={{ color: "#2a2e3a" }}>
                        {section.label}
                      </span>
                    </div>
                  )}
                  {sidebarCollapsed && <div className="h-2" />}

                  {section.items.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <Link key={item.path} href={item.path}>
                        <motion.div
                          className="flex items-center gap-2.5 mx-1.5 my-0.5 px-2.5 py-2 rounded-xl cursor-pointer transition-all"
                          style={{
                            color: active ? item.color : "#5a6072",
                            background: active ? `${item.color}14` : "transparent",
                            border: active ? `1px solid ${item.color}22` : "1px solid transparent",
                          }}
                          whileHover={{ background: active ? `${item.color}14` : "rgba(255,255,255,0.04)" }}
                          whileTap={{ scale: 0.97 }}
                          title={sidebarCollapsed ? item.label : undefined}>
                          <item.icon
                            className="h-3.5 w-3.5 shrink-0"
                            style={{ filter: active ? `drop-shadow(0 0 5px ${item.color}80)` : "none" }} />
                          <AnimatePresence>
                            {!sidebarCollapsed && (
                              <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.12 }}
                                className="text-[11px] font-semibold whitespace-nowrap overflow-hidden">
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* Collapse toggle */}
            <div className="px-1.5 py-2 border-t border-border">
              <button
                onClick={() => setSidebarCollapsed(c => !c)}
                className="w-full flex items-center justify-center py-2 rounded-xl transition-all hover:bg-secondary"
                style={{ color: "#5a6072" }}>
                {sidebarCollapsed
                  ? <ChevronRight className="h-3.5 w-3.5" />
                  : <ChevronLeft className="h-3.5 w-3.5" />}
              </button>
            </div>
          </motion.aside>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
