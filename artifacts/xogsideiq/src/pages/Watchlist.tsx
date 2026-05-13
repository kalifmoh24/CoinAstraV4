import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, Plus, Trash2, Bell, BellOff, TrendingUp, TrendingDown,
  ArrowUp, ArrowDown, BarChart2, Zap, Target, Eye, ChevronRight,
  Search, X,
} from "lucide-react";

function fmtPrice(n: number) {
  if (n >= 1) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(7)}`;
}
function fmtLarge(n: number) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${(n / 1e3).toFixed(0)}K`;
}

const WATCHLIST = [
  { coin: "BTC", name: "Bitcoin", price: 67482.50, ch24: 2.4, ch7d: 4.8, mcap: 1_326_000_000_000, vol: 42_000_000_000, aiScore: 82, signal: "BUY", alertOn: true, addedAt: "3d ago", target: 72000 },
  { coin: "ETH", name: "Ethereum", price: 3248.75, ch24: 1.8, ch7d: 6.2, mcap: 390_000_000_000, vol: 18_200_000_000, aiScore: 79, signal: "BUY", alertOn: true, addedAt: "5d ago", target: 3800 },
  { coin: "SOL", name: "Solana", price: 178.32, ch24: 5.2, ch7d: 18.4, mcap: 82_000_000_000, vol: 4_200_000_000, aiScore: 94, signal: "STRONG BUY", alertOn: false, addedAt: "1w ago", target: 220 },
  { coin: "LINK", name: "Chainlink", price: 15.60, ch24: 4.3, ch7d: 12.1, mcap: 9_100_000_000, vol: 920_000_000, aiScore: 88, signal: "BUY", alertOn: true, addedAt: "2w ago", target: 20 },
  { coin: "RNDR", name: "Render", price: 8.45, ch24: 3.1, ch7d: 9.8, mcap: 3_400_000_000, vol: 380_000_000, aiScore: 85, signal: "BUY", alertOn: false, addedAt: "3w ago", target: 12 },
  { coin: "SUI", name: "SUI", price: 1.84, ch24: 12.4, ch7d: 28.7, mcap: 2_100_000_000, vol: 620_000_000, aiScore: 91, signal: "STRONG BUY", alertOn: true, addedAt: "4d ago", target: 2.5 },
  { coin: "INJ", name: "Injective", price: 24.80, ch24: 2.9, ch7d: 7.4, mcap: 2_300_000_000, vol: 280_000_000, aiScore: 76, signal: "BUY", alertOn: false, addedAt: "1mo ago", target: 35 },
  { coin: "PENDLE", name: "Pendle", price: 5.12, ch24: 4.8, ch7d: 16.9, mcap: 520_000_000, vol: 88_000_000, aiScore: 80, signal: "BUY", alertOn: true, addedAt: "1mo ago", target: 7.5 },
];

const ALERTS_PREVIEW = [
  { coin: "BTC", type: "Price Alert", desc: "Alert when BTC reaches $70,000", status: "ACTIVE", color: "#f7931a" },
  { coin: "ETH", type: "Whale Alert", desc: "Large ETH transfer detected", status: "TRIGGERED", color: "#26a69a" },
  { coin: "SOL", type: "AI Signal", desc: "AI signal changed to STRONG BUY", status: "TRIGGERED", color: "#7c3aed" },
  { coin: "LINK", type: "Price Alert", desc: "Alert when LINK drops below $14", status: "ACTIVE", color: "#f7931a" },
];

const SIGNAL_COLORS: Record<string, string> = {
  "STRONG BUY": "#26a69a", BUY: "#26a69a", WATCH: "#f7931a", SELL: "#ef5350",
};

function MiniSpark({ up }: { up: boolean }) {
  const pts = up
    ? "0,28 10,24 20,20 30,22 40,16 50,12 60,8 70,10 80,4"
    : "0,8 10,12 20,16 30,14 40,20 50,24 60,22 70,28 80,32";
  return (
    <svg width={80} height={36} className="overflow-visible">
      <polyline points={pts} fill="none"
        stroke={up ? "#26a69a" : "#ef5350"} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export default function Watchlist() {
  const [items, setItems] = useState(WATCHLIST);
  const [showAdd, setShowAdd] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [alerts, setAlerts] = useState(ALERTS_PREVIEW.map((a, i) => ({ ...a, id: i })));

  const remove = (coin: string) => setItems(i => i.filter(x => x.coin !== coin));
  const toggleAlert = (coin: string) => setItems(i => i.map(x => x.coin === coin ? { ...x, alertOn: !x.alertOn } : x));

  const totalValue = items.reduce((acc, c) => acc + c.price, 0);
  const bullCount = items.filter(c => c.ch24 >= 0).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#f7931a,#fbbf24)", boxShadow: "0 0 16px rgba(247,147,26,0.4)" }}>
              <Star className="h-4 w-4 text-white" style={{ fill: "white" }} />
            </div>
            <h1 className="text-[22px] font-black tracking-tight"
              style={{ background: "linear-gradient(130deg,#fff 0%,#fde68a 50%,#f7931a 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Watchlist
            </h1>
          </div>
          <p className="text-[12px]" style={{ color: "#5a6072" }}>
            {items.length} coins tracked · {bullCount} bullish today
          </p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-[11px] font-semibold transition-all"
          style={{ background: "rgba(247,147,26,0.18)", color: "#f7931a", border: "1px solid rgba(247,147,26,0.35)" }}>
          <Plus className="h-3.5 w-3.5" /> Add Coin
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Watchlist Coins", value: items.length.toString(), sub: "Tracked assets", color: "#f7931a", icon: Star },
          { label: "Bullish Signals", value: items.filter(c => c.signal.includes("BUY")).length.toString(), sub: "AI buy signals", color: "#26a69a", icon: TrendingUp },
          { label: "Active Alerts", value: items.filter(c => c.alertOn).length.toString(), sub: "Price watchers", color: "#2962ff", icon: Bell },
          { label: "Avg AI Score", value: Math.round(items.reduce((a, c) => a + c.aiScore, 0) / items.length).toString(), sub: "/100 confidence", color: "#7c3aed", icon: Zap },
        ].map(card => (
          <div key={card.label} className="rounded-2xl p-4"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#4a5068" }}>{card.label}</span>
              <card.icon className="h-3.5 w-3.5" style={{ color: card.color, fill: card.color === "#f7931a" ? "#f7931a" : "none" }} />
            </div>
            <div className="text-[20px] font-black" style={{ color: card.color }}>{card.value}</div>
            <div className="text-[10px] mt-0.5" style={{ color: "#5a6072" }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Add coin overlay */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(13,17,26,0.9)", border: "1px solid rgba(247,147,26,0.25)" }}>
            <div className="p-4 flex items-center gap-3">
              <Search className="h-4 w-4 shrink-0" style={{ color: "#5a6072" }} />
              <input autoFocus value={addSearch} onChange={e => setAddSearch(e.target.value)}
                placeholder="Search to add coin (e.g. BTC, Ethereum, SOL...)"
                className="flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-[#3a4058]" />
              <button onClick={() => setShowAdd(false)}><X className="h-4 w-4" style={{ color: "#5a6072" }} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Watchlist Table */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(10,14,22,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-2">
                <Star className="h-3.5 w-3.5" style={{ color: "#f7931a", fill: "#f7931a" }} />
                <span className="text-[12px] font-bold text-white">My Watchlist</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: 600 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    {["Coin", "Price", "24h", "7d", "AI Score", "Signal", "Target", "Alert", ""].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wider" style={{ color: "#3a4058" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((coin, i) => {
                    const targetPct = ((coin.target - coin.price) / coin.price) * 100;
                    return (
                      <motion.tr key={coin.coin} layout
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="transition-colors"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(247,147,26,0.04)"}
                        onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}>
                        <td className="px-3 py-3">
                          <div className="text-[12px] font-black text-white">{coin.coin}</div>
                          <div className="text-[9px]" style={{ color: "#4a5068" }}>{coin.name}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-[12px] font-bold text-white font-mono">{fmtPrice(coin.price)}</div>
                          <div className="text-[9px]" style={{ color: "#3a4058" }}>{coin.addedAt}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-0.5" style={{ color: coin.ch24 >= 0 ? "#26a69a" : "#ef5350" }}>
                            {coin.ch24 >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                            <span className="text-[11px] font-bold tabular-nums">{Math.abs(coin.ch24).toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-[11px] font-bold tabular-nums"
                            style={{ color: coin.ch7d >= 0 ? "#26a69a" : "#ef5350" }}>
                            {coin.ch7d >= 0 ? "+" : ""}{coin.ch7d.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                              <div className="h-full rounded-full" style={{ width: `${coin.aiScore}%`, background: "linear-gradient(90deg,#7c3aed,#a78bfa)" }} />
                            </div>
                            <span className="text-[10px] font-black" style={{ color: "#a78bfa" }}>{coin.aiScore}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold"
                            style={{ background: `${SIGNAL_COLORS[coin.signal]}18`, color: SIGNAL_COLORS[coin.signal], border: `1px solid ${SIGNAL_COLORS[coin.signal]}30` }}>
                            {coin.signal}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-[10px] font-mono text-white">{fmtPrice(coin.target)}</div>
                          <div className="text-[9px]" style={{ color: targetPct >= 0 ? "#26a69a" : "#ef5350" }}>
                            {targetPct >= 0 ? "+" : ""}{targetPct.toFixed(1)}%
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <button onClick={() => toggleAlert(coin.coin)} className="p-1 rounded-lg transition-all hover:bg-white/5">
                            {coin.alertOn
                              ? <Bell className="h-3.5 w-3.5" style={{ color: "#f7931a" }} />
                              : <BellOff className="h-3.5 w-3.5" style={{ color: "#3a4058" }} />}
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <button onClick={() => remove(coin.coin)} className="p-1 rounded-lg transition-all hover:bg-white/5">
                            <Trash2 className="h-3.5 w-3.5" style={{ color: "#3a4058" }} />
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Alerts + Performance */}
        <div className="space-y-4">
          {/* Alert History */}
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-3.5 w-3.5" style={{ color: "#f7931a" }} />
              <span className="text-[12px] font-bold text-white">Recent Alerts</span>
            </div>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className="p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${alert.color}20` }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-black text-white">{alert.coin}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded-md font-semibold"
                        style={{ background: `${alert.color}15`, color: alert.color }}>{alert.type}</span>
                    </div>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-md font-bold"
                      style={{
                        background: alert.status === "TRIGGERED" ? "rgba(38,166,154,0.15)" : "rgba(247,147,26,0.15)",
                        color: alert.status === "TRIGGERED" ? "#26a69a" : "#f7931a",
                      }}>
                      {alert.status}
                    </span>
                  </div>
                  <p className="text-[10px]" style={{ color: "#787b86" }}>{alert.desc}</p>
                </div>
              ))}
            </div>
            <button className="w-full mt-3 py-2 rounded-xl text-[10px] font-semibold transition-all hover:bg-white/5 flex items-center justify-center gap-1"
              style={{ color: "#4d7fff", border: "1px solid rgba(41,98,255,0.2)" }}>
              <Plus className="h-3 w-3" /> Create Alert
            </button>
          </div>

          {/* Watchlist Performance */}
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="h-3.5 w-3.5" style={{ color: "#26a69a" }} />
              <span className="text-[12px] font-bold text-white">Performance 7d</span>
            </div>
            <div className="space-y-2">
              {[...items].sort((a, b) => b.ch7d - a.ch7d).slice(0, 6).map((c) => (
                <div key={c.coin} className="flex items-center gap-3">
                  <span className="text-[11px] font-black text-white w-12">{c.coin}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.abs(c.ch7d) * 3)}%`,
                        background: c.ch7d >= 0 ? "linear-gradient(90deg,#26a69a,#4dd0c5)" : "linear-gradient(90deg,#ef5350,#ff8a80)",
                      }} />
                  </div>
                  <span className="text-[10px] font-bold tabular-nums font-mono w-14 text-right"
                    style={{ color: c.ch7d >= 0 ? "#26a69a" : "#ef5350" }}>
                    {c.ch7d >= 0 ? "+" : ""}{c.ch7d.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
