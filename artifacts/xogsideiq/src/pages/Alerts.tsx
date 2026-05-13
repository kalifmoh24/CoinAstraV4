import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Plus, Trash2, CheckCircle2, Clock, AlertTriangle, Zap,
  TrendingUp, TrendingDown, BarChart2, X, Activity, Waves,
  ChevronRight,
} from "lucide-react";

type AlertStatus = "ACTIVE" | "TRIGGERED" | "ALL";
type AlertTab = "all" | "price" | "whale" | "ai" | "portfolio";

const ALERTS = [
  { id: 1, type: "price", coin: "BTC", title: "BTC reaches $70,000", desc: "Price alert: Bitcoin at or above $70,000", status: "ACTIVE", created: "2d ago", icon: TrendingUp, color: "#f7931a", priority: "HIGH" },
  { id: 2, type: "ai", coin: "SOL", title: "SOL signal: STRONG BUY", desc: "AI confidence crossed 90% threshold", status: "TRIGGERED", created: "4h ago", icon: Zap, color: "#26a69a", priority: "HIGH" },
  { id: 3, type: "whale", coin: "ETH", title: "Large ETH transfer detected", desc: "$27M ETH moved from Coinbase to cold wallet", status: "TRIGGERED", created: "5h ago", icon: Waves, color: "#0ea5e9", priority: "MEDIUM" },
  { id: 4, type: "price", coin: "LINK", title: "LINK drops below $14", desc: "Price alert: Chainlink at or below $14.00", status: "ACTIVE", created: "1w ago", icon: TrendingDown, color: "#2962ff", priority: "MEDIUM" },
  { id: 5, type: "portfolio", coin: "ALL", title: "Portfolio PnL > $5,000", desc: "Portfolio unrealized gain exceeds $5,000", status: "ACTIVE", created: "3d ago", icon: BarChart2, color: "#7c3aed", priority: "LOW" },
  { id: 6, type: "ai", coin: "RNDR", title: "RNDR momentum spike", desc: "AI momentum score exceeded 80", status: "TRIGGERED", created: "12h ago", icon: Activity, color: "#7c3aed", priority: "MEDIUM" },
  { id: 7, type: "whale", coin: "BTC", title: "BTC whale accumulation", desc: "3+ large wallets accumulating simultaneously", status: "ACTIVE", created: "6d ago", icon: Waves, color: "#0ea5e9", priority: "HIGH" },
  { id: 8, type: "price", coin: "ETH", title: "ETH breaks $3,500", desc: "Price alert: Ethereum at or above $3,500", status: "ACTIVE", created: "4d ago", icon: TrendingUp, color: "#627EEA", priority: "MEDIUM" },
  { id: 9, type: "ai", coin: "DOGE", title: "DOGE bearish signal", desc: "AI sentiment dropped to BEARISH", status: "TRIGGERED", created: "1d ago", icon: AlertTriangle, color: "#ef5350", priority: "LOW" },
  { id: 10, type: "portfolio", coin: "ALL", title: "Portfolio drawdown >5%", desc: "Portfolio dropped more than 5% in 24h", status: "ACTIVE", created: "2w ago", icon: BarChart2, color: "#ef5350", priority: "HIGH" },
];

const ALERT_TYPE_COLORS: Record<string, { color: string; label: string }> = {
  price:     { color: "#f7931a", label: "Price" },
  whale:     { color: "#0ea5e9", label: "Whale" },
  ai:        { color: "#7c3aed", label: "AI" },
  portfolio: { color: "#26a69a", label: "Portfolio" },
};

const PRIORITY_COLORS: Record<string, string> = { HIGH: "#ef5350", MEDIUM: "#f7931a", LOW: "#5a6072" };

export default function Alerts() {
  const [alerts, setAlerts] = useState(ALERTS);
  const [statusFilter, setStatusFilter] = useState<AlertStatus>("ALL");
  const [typeFilter, setTypeFilter] = useState<AlertTab>("all");
  const [showCreate, setShowCreate] = useState(false);

  const remove = (id: number) => setAlerts(a => a.filter(x => x.id !== id));

  const filtered = alerts
    .filter(a => statusFilter === "ALL" || a.status === statusFilter)
    .filter(a => typeFilter === "all" || a.type === typeFilter);

  const counts = {
    active: alerts.filter(a => a.status === "ACTIVE").length,
    triggered: alerts.filter(a => a.status === "TRIGGERED").length,
    total: alerts.length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#ef5350,#f7931a)", boxShadow: "0 0 16px rgba(239,83,80,0.4)" }}>
              <Bell className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-[22px] font-black tracking-tight"
              style={{ background: "linear-gradient(130deg,#fff 0%,#fca5a5 50%,#ef5350 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Alerts Center
            </h1>
            {counts.triggered > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                style={{ background: "rgba(239,83,80,0.2)", color: "#ef5350", border: "1px solid rgba(239,83,80,0.4)" }}>
                {counts.triggered} NEW
              </span>
            )}
          </div>
          <p className="text-[12px]" style={{ color: "#5a6072" }}>
            {counts.active} active alerts · {counts.triggered} triggered
          </p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-[11px] font-semibold transition-all"
          style={{ background: "rgba(239,83,80,0.15)", color: "#ef5350", border: "1px solid rgba(239,83,80,0.3)" }}>
          <Plus className="h-3.5 w-3.5" /> New Alert
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Active Alerts", value: counts.active, color: "#f7931a", icon: Bell },
          { label: "Triggered Today", value: counts.triggered, color: "#26a69a", icon: CheckCircle2 },
          { label: "Price Alerts", value: alerts.filter(a => a.type === "price").length, color: "#2962ff", icon: TrendingUp },
          { label: "AI Alerts", value: alerts.filter(a => a.type === "ai").length, color: "#7c3aed", icon: Zap },
        ].map(card => (
          <div key={card.label} className="rounded-2xl p-4"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#4a5068" }}>{card.label}</span>
              <card.icon className="h-3.5 w-3.5" style={{ color: card.color }} />
            </div>
            <div className="text-[24px] font-black" style={{ color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Create Alert */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(13,17,26,0.9)", border: "1px solid rgba(239,83,80,0.25)" }}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] font-bold text-white">Create New Alert</span>
                <button onClick={() => setShowCreate(false)}><X className="h-4 w-4" style={{ color: "#5a6072" }} /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "#4a5068" }}>Alert Type</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(ALERT_TYPE_COLORS).map(([k, v]) => (
                      <button key={k} className="py-2 rounded-xl text-[10px] font-semibold transition-all"
                        style={{ background: `${v.color}15`, color: v.color, border: `1px solid ${v.color}30` }}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "#4a5068" }}>Coin / Asset</label>
                  <input placeholder="e.g. BTC, ETH, SOL"
                    className="w-full px-3 py-2 rounded-xl text-[12px] text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "#4a5068" }}>Target Value</label>
                  <input placeholder="e.g. 70000, 3500, 90%"
                    className="w-full px-3 py-2 rounded-xl text-[12px] text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
                </div>
              </div>
              <button className="mt-4 px-5 py-2 rounded-xl text-[11px] font-bold transition-all"
                style={{ background: "rgba(239,83,80,0.2)", color: "#ef5350", border: "1px solid rgba(239,83,80,0.35)" }}>
                Create Alert
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Alert List */}
        <div className="lg:col-span-2 space-y-3">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              {(["ALL", "ACTIVE", "TRIGGERED"] as AlertStatus[]).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                  style={{
                    background: statusFilter === s ? "rgba(255,255,255,0.08)" : "transparent",
                    color: statusFilter === s ? "#d1d4dc" : "#5a6072",
                    border: statusFilter === s ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent",
                  }}>{s === "ALL" ? "All" : s === "ACTIVE" ? "Active" : "Triggered"}</button>
              ))}
            </div>
            <div className="h-4 w-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="flex items-center gap-1 flex-wrap">
              {(["all","price","whale","ai","portfolio"] as AlertTab[]).map(t => (
                <button key={t} onClick={() => setTypeFilter(t)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold capitalize transition-all"
                  style={{
                    background: typeFilter === t ? `${ALERT_TYPE_COLORS[t]?.color ?? "#5a6072"}15` : "transparent",
                    color: typeFilter === t ? (ALERT_TYPE_COLORS[t]?.color ?? "#d1d4dc") : "#5a6072",
                    border: typeFilter === t ? `1px solid ${ALERT_TYPE_COLORS[t]?.color ?? "#5a6072"}30` : "1px solid transparent",
                  }}>
                  {t === "all" ? "All Types" : ALERT_TYPE_COLORS[t]?.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filtered.map((alert, i) => (
                <motion.div key={alert.id}
                  layout
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-2xl p-4 flex items-start gap-3"
                  style={{
                    background: alert.status === "TRIGGERED" ? `${alert.color}08` : "rgba(13,17,26,0.85)",
                    border: `1px solid ${alert.status === "TRIGGERED" ? alert.color + "25" : "rgba(255,255,255,0.06)"}`,
                  }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${alert.color}18` }}>
                    <alert.icon className="h-4 w-4" style={{ color: alert.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-[12px] font-bold text-white">{alert.title}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded-md font-black"
                        style={{ background: `${ALERT_TYPE_COLORS[alert.type]?.color ?? "#5a6072"}15`, color: ALERT_TYPE_COLORS[alert.type]?.color ?? "#5a6072" }}>
                        {ALERT_TYPE_COLORS[alert.type]?.label}
                      </span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded-md font-bold"
                        style={{ background: `${PRIORITY_COLORS[alert.priority]}15`, color: PRIORITY_COLORS[alert.priority] }}>
                        {alert.priority}
                      </span>
                    </div>
                    <p className="text-[11px]" style={{ color: "#787b86" }}>{alert.desc}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-2.5 w-2.5" style={{ color: "#3a4058" }} />
                      <span className="text-[9px] font-mono" style={{ color: "#3a4058" }}>{alert.created}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold"
                      style={{
                        background: alert.status === "TRIGGERED" ? "rgba(38,166,154,0.15)" : "rgba(247,147,26,0.12)",
                        color: alert.status === "TRIGGERED" ? "#26a69a" : "#f7931a",
                        border: `1px solid ${alert.status === "TRIGGERED" ? "rgba(38,166,154,0.3)" : "rgba(247,147,26,0.25)"}`,
                      }}>
                      {alert.status}
                    </span>
                    <button onClick={() => remove(alert.id)} className="p-1.5 rounded-lg transition-all hover:bg-white/5">
                      <Trash2 className="h-3 w-3" style={{ color: "#3a4058" }} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center py-16">
                <Bell className="h-8 w-8 mb-3 opacity-20" style={{ color: "#5a6072" }} />
                <p className="text-[13px] font-bold text-white mb-1">No alerts found</p>
                <p className="text-[11px]" style={{ color: "#5a6072" }}>Change filters or create a new alert</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Alert Types + Tips */}
        <div className="space-y-4">
          {/* Alert Type Breakdown */}
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="h-3.5 w-3.5" style={{ color: "#ef5350" }} />
              <span className="text-[12px] font-bold text-white">Alert Breakdown</span>
            </div>
            <div className="space-y-3">
              {Object.entries(ALERT_TYPE_COLORS).map(([type, meta]) => {
                const count = alerts.filter(a => a.type === type).length;
                const triggered = alerts.filter(a => a.type === type && a.status === "TRIGGERED").length;
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold" style={{ color: "#d1d4dc" }}>{meta.label} Alerts</span>
                      <div className="flex items-center gap-1.5">
                        {triggered > 0 && (
                          <span className="text-[8px] px-1 py-0.5 rounded font-bold" style={{ background: "rgba(38,166,154,0.15)", color: "#26a69a" }}>{triggered} hit</span>
                        )}
                        <span className="text-[11px] font-black" style={{ color: meta.color }}>{count}</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full" style={{ width: `${(count / alerts.length) * 100}%`, background: meta.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-2xl p-4"
            style={{ background: "linear-gradient(135deg,rgba(239,83,80,0.08),rgba(247,147,26,0.06))", border: "1px solid rgba(239,83,80,0.15)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-3.5 w-3.5" style={{ color: "#f7931a" }} />
              <span className="text-[12px] font-bold text-white">Alert Tips</span>
            </div>
            <div className="space-y-2">
              {[
                "Set price alerts at key technical levels (support/resistance)",
                "AI alerts fire when confidence crosses 85%",
                "Whale alerts trigger on movements >$1M",
                "Portfolio alerts help manage risk automatically",
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "#f7931a" }} />
                  <p className="text-[10px] leading-relaxed" style={{ color: "#787b86" }}>{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
