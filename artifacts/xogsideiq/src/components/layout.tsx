import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity, LayoutDashboard, BarChart2, Compass, BookOpen, Briefcase, TrendingUp,
  Sun, Moon, ChevronLeft, ChevronRight, Globe,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MobileNav } from "@/components/mobile-nav";
import { NotificationCenter } from "@/components/notification-center";
import { GlobalTicker } from "@/components/global-ticker";
import { useTheme } from "@/components/theme-provider";
import { useScreenSize } from "@/hooks/use-screen-size";

const NAV_ITEMS = [
  { path: "/",           label: "Dashboard",  icon: LayoutDashboard, color: "#2962ff" },
  { path: "/markets",    label: "Markets",    icon: BarChart2,        color: "#26a69a" },
  { path: "/research",   label: "Research",   icon: Compass,          color: "#7c3aed" },
  { path: "/narratives", label: "Narratives", icon: BookOpen,         color: "#f7931a" },
  { path: "/signals",    label: "Signals",    icon: TrendingUp,       color: "#26a69a" },
  { path: "/portfolio",  label: "Portfolio",  icon: Briefcase,        color: "#2962ff" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const isDark = theme !== "light";
  const { isTablet, isDesktop } = useScreenSize();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const showTabletSidebar = isTablet || isDesktop;

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Global live market ticker */}
      <GlobalTicker />

      {/* Desktop/Tablet header */}
      <header
        className="h-11 flex items-center px-3 border-b border-border shrink-0 gap-3"
        style={{
          background: isDark ? "rgba(7,10,18,0.98)" : "rgba(245,247,252,0.98)",
          backdropFilter: "blur(20px)",
        }}
      >
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div
            className="w-6 h-6 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#2962ff,#7c3aed)", boxShadow: "0 0 12px rgba(41,98,255,0.4)" }}
          >
            <Activity className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="hidden sm:inline text-[14px] font-black tracking-tight">
            Coin<span style={{ color: "#2962ff" }}>Astra</span>
          </span>
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
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
                style={{
                  color: isActive ? item.color : "#5a6072",
                  background: isActive ? `${item.color}15` : "transparent",
                  boxShadow: isActive ? `0 0 12px ${item.color}20` : "none",
                }}
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
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
          <NotificationCenter />
        </div>
      </header>

      {/* Main layout: tablet sidebar + content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Tablet sidebar */}
        {showTabletSidebar && (
          <motion.aside
            animate={{ width: sidebarCollapsed ? 56 : 180 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="shrink-0 flex flex-col border-r border-border overflow-hidden"
            style={{
              background: isDark ? "rgba(7,10,18,0.98)" : "rgba(245,247,252,0.98)",
            }}
          >
            {/* Sidebar nav */}
            <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  location === item.path ||
                  (item.path !== "/" && location.startsWith(item.path));
                return (
                  <Link key={item.path} href={item.path}>
                    <motion.div
                      className="flex items-center gap-2.5 mx-2 my-0.5 px-2.5 py-2.5 rounded-xl cursor-pointer transition-all"
                      style={{
                        color: isActive ? item.color : "#5a6072",
                        background: isActive ? `${item.color}14` : "transparent",
                        boxShadow: isActive ? `0 0 14px ${item.color}18` : "none",
                        border: isActive ? `1px solid ${item.color}20` : "1px solid transparent",
                      }}
                      whileHover={{ background: isActive ? `${item.color}14` : "rgba(255,255,255,0.04)" }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <item.icon
                        className="h-4 w-4 shrink-0"
                        style={{
                          filter: isActive ? `drop-shadow(0 0 6px ${item.color}80)` : "none",
                        }}
                      />
                      <AnimatePresence>
                        {!sidebarCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.15 }}
                            className="text-[12px] font-semibold whitespace-nowrap overflow-hidden"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </Link>
                );
              })}
            </nav>

            {/* Collapse toggle */}
            <div className="px-2 py-3 border-t border-border">
              <button
                onClick={() => setSidebarCollapsed(c => !c)}
                className="w-full flex items-center justify-center py-2 rounded-xl transition-all hover:bg-secondary"
                style={{ color: "#5a6072" }}
              >
                {sidebarCollapsed
                  ? <ChevronRight className="h-3.5 w-3.5" />
                  : <ChevronLeft className="h-3.5 w-3.5" />}
              </button>
            </div>
          </motion.aside>
        )}

        {/* Content area */}
        <main className="flex-1 overflow-y-auto p-3 md:p-4 pb-24 md:pb-4">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}
