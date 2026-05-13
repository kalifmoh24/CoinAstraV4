import React from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, BarChart2, Cpu, TrendingUp, Briefcase } from "lucide-react";

const TABS = [
  { path: "/",          icon: LayoutDashboard, label: "Home" },
  { path: "/markets",   icon: BarChart2,        label: "Markets" },
  { path: "/research",  icon: Cpu,              label: "AI" },
  { path: "/signals",   icon: TrendingUp,       label: "Signals" },
  { path: "/portfolio", icon: Briefcase,        label: "Portfolio" },
];

export function MobileNav() {
  const [location] = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 pointer-events-none">
      <div className="pointer-events-auto" style={{ paddingBottom: "env(safe-area-inset-bottom, 6px)" }}>
        <div
          className="mx-3 mb-2 rounded-3xl"
          style={{
            background: "rgba(6,9,18,0.96)",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            border: "1px solid rgba(255,255,255,0.09)",
            boxShadow: "0 8px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(41,98,255,0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          <div className="flex items-center justify-around px-2 py-2">
            {TABS.map(tab => {
              const isActive =
                location === tab.path ||
                (tab.path !== "/" && location.startsWith(tab.path));
              return (
                <Link
                  key={tab.path}
                  href={tab.path}
                  className="flex flex-col items-center gap-0.5 relative select-none"
                  style={{ minWidth: 52 }}
                >
                  <div className="relative flex items-center justify-center" style={{ width: 44, height: 36 }}>
                    {isActive && (
                      <motion.div
                        layoutId="mobile-nav-pill"
                        className="absolute inset-0 rounded-2xl"
                        style={{
                          background: "linear-gradient(135deg, rgba(41,98,255,0.25), rgba(124,58,237,0.15))",
                          boxShadow: "0 0 20px rgba(41,98,255,0.35), 0 0 40px rgba(41,98,255,0.1)",
                          border: "1px solid rgba(77,127,255,0.3)",
                        }}
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                    <motion.div
                      animate={{ scale: isActive ? 1.12 : 1, y: isActive ? -1 : 0 }}
                      transition={{ type: "spring", stiffness: 450, damping: 28 }}
                      className="relative z-10"
                    >
                      <tab.icon
                        size={17}
                        style={{
                          color: isActive ? "#6196ff" : "#374060",
                          filter: isActive ? "drop-shadow(0 0 8px rgba(41,98,255,0.7))" : "none",
                          transition: "color 0.2s, filter 0.2s",
                        }}
                      />
                    </motion.div>
                  </div>

                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        exit={{ opacity: 0, scaleX: 0 }}
                        className="absolute -top-1 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full"
                        style={{
                          background: "linear-gradient(90deg, transparent, #4d7fff, transparent)",
                          boxShadow: "0 0 8px rgba(77,127,255,0.8)",
                        }}
                      />
                    )}
                  </AnimatePresence>

                  <motion.span
                    animate={{ color: isActive ? "#6196ff" : "#374060" }}
                    transition={{ duration: 0.2 }}
                    className="text-[9px] font-bold tracking-wide"
                  >
                    {tab.label}
                  </motion.span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
