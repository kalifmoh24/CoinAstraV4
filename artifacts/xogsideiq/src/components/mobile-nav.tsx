import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, BarChart2, Compass, TrendingUp, Briefcase,
} from "lucide-react";

const TABS = [
  { path: "/", icon: LayoutDashboard, label: "Home" },
  { path: "/markets", icon: BarChart2, label: "Markets" },
  { path: "/research", icon: Compass, label: "Research" },
  { path: "/signals", icon: TrendingUp, label: "Signals" },
  { path: "/portfolio", icon: Briefcase, label: "Portfolio" },
];

export function MobileNav() {
  const [location] = useLocation();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50"
      style={{
        background: "rgba(7,10,20,0.97)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        paddingBottom: "env(safe-area-inset-bottom, 6px)",
      }}
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-1">
        {TABS.map(tab => {
          const isActive =
            location === tab.path ||
            (tab.path !== "/" && location.startsWith(tab.path));
          return (
            <Link key={tab.path} href={tab.path} className="flex flex-col items-center gap-0.5 min-w-[52px] relative py-0.5">
              {isActive && (
                <div
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, #2962ff, transparent)",
                  }}
                />
              )}
              <div
                className="w-12 h-9 rounded-2xl flex items-center justify-center transition-all duration-200"
                style={{
                  background: isActive
                    ? "rgba(41,98,255,0.18)"
                    : "transparent",
                  boxShadow: isActive
                    ? "0 0 18px rgba(41,98,255,0.28)"
                    : "none",
                }}
              >
                <tab.icon
                  className="h-[18px] w-[18px] transition-colors duration-200"
                  style={{ color: isActive ? "#4d7fff" : "#3a4058" }}
                />
              </div>
              <span
                className="text-[9px] font-bold tracking-wide transition-colors duration-200"
                style={{ color: isActive ? "#4d7fff" : "#3a4058" }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
