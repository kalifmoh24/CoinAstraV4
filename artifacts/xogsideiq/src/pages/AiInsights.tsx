import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Brain, TrendingUp, TrendingDown, Zap, Shield, AlertTriangle,
  ArrowUp, ArrowDown, ChevronRight, RefreshCw, Clock, Star, BarChart2,
  Activity, Eye, Target, Flame, CheckCircle2,
} from "lucide-react";

const AI_PREDICTIONS = [
  { coin: "BTC", name: "Bitcoin", bull: 68, bear: 32, signal: "BUY", conf: 87, sentiment: "BULLISH", momentum: 72, smart: "ACC", price: "$67,482", ch24: "+2.4%", pos: true },
  { coin: "ETH", name: "Ethereum", bull: 61, bear: 39, signal: "BUY", conf: 79, sentiment: "BULLISH", momentum: 58, smart: "ACC", price: "$3,248", ch24: "+1.8%", pos: true },
  { coin: "SOL", name: "Solana", bull: 73, bear: 27, signal: "STRONG BUY", conf: 91, sentiment: "VERY BULLISH", momentum: 85, smart: "ACC", price: "$178", ch24: "+5.2%", pos: true },
  { coin: "RNDR", name: "Render", bull: 66, bear: 34, signal: "BUY", conf: 82, sentiment: "BULLISH", momentum: 64, smart: "ACC", price: "$8.45", ch24: "+3.1%", pos: true },
  { coin: "ARB", name: "Arbitrum", bull: 55, bear: 45, signal: "WATCH", conf: 61, sentiment: "NEUTRAL", momentum: 28, smart: "NEU", price: "$1.12", ch24: "+0.6%", pos: true },
  { coin: "AVAX", name: "Avalanche", bull: 59, bear: 41, signal: "WATCH", conf: 67, sentiment: "NEUTRAL", momentum: 41, smart: "NEU", price: "$38.20", ch24: "+1.2%", pos: true },
  { coin: "LINK", name: "Chainlink", bull: 70, bear: 30, signal: "BUY", conf: 84, sentiment: "BULLISH", momentum: 68, smart: "ACC", price: "$15.60", ch24: "+4.3%", pos: true },
  { coin: "DOGE", name: "Dogecoin", bull: 44, bear: 56, signal: "SELL", conf: 58, sentiment: "BEARISH", momentum: -18, smart: "DIS", price: "$0.148", ch24: "-2.1%", pos: false },
  { coin: "PEPE", name: "Pepe", bull: 52, bear: 48, signal: "WATCH", conf: 54, sentiment: "NEUTRAL", momentum: 12, smart: "NEU", price: "$0.0000118", ch24: "+0.8%", pos: true },
  { coin: "INJ", name: "Injective", bull: 63, bear: 37, signal: "BUY", conf: 76, sentiment: "BULLISH", momentum: 55, smart: "ACC", price: "$24.80", ch24: "+2.9%", pos: true },
];

const AI_ALERTS = [
  { type: "opportunity", icon: Zap, color: "#26a69a", title: "SOL breakout detected", desc: "Momentum score hit 85 — 7-day high. Smart money accumulating.", time: "2m ago", badge: "OPPORTUNITY" },
  { type: "whale", icon: Eye, color: "#f7931a", title: "Large BTC wallet buying", desc: "Wallet 0x3a8f...d92c added 42 BTC in last 3 hours. Pattern: accumulation.", time: "8m ago", badge: "WHALE" },
  { type: "signal", icon: Target, color: "#2962ff", title: "LINK momentum surge", desc: "AI confidence jumped from 71% → 84%. Volume 3.2× 30d average.", time: "14m ago", badge: "SIGNAL" },
  { type: "risk", icon: AlertTriangle, color: "#ef5350", title: "DOGE distribution pattern", desc: "Smart money distributing. Confidence dropped 12 pts in 24h.", time: "23m ago", badge: "RISK" },
  { type: "narrative", icon: Flame, color: "#7c3aed", title: "AI narrative gaining momentum", desc: "AI sector up 8.4% in 7 days. RNDR, FET, AGIX all showing strength.", time: "31m ago", badge: "NARRATIVE" },
  { type: "opportunity", icon: CheckCircle2, color: "#26a69a", title: "ETH accumulation zone", desc: "Price at 0.618 Fib support. Historical accuracy: 78% bullish continuation.", time: "45m ago", badge: "OPPORTUNITY" },
];

const NARRATIVES = [
  { name: "Artificial Intelligence", score: 91, ch7d: "+12.4%", pos: true, color: "#7c3aed", coins: ["RNDR","FET","AGIX","OCEAN"] },
  { name: "DePIN", score: 84, ch7d: "+8.7%", pos: true, color: "#2962ff", coins: ["HNT","IOTX","WIFI","POKT"] },
  { name: "Real World Assets", score: 78, ch7d: "+6.2%", pos: true, color: "#f7931a", coins: ["ONDO","MPL","CFG","RIO"] },
  { name: "Layer 2", score: 72, ch7d: "+3.1%", pos: true, color: "#26a69a", coins: ["ARB","OP","MATIC","ZKSYNC"] },
  { name: "Meme Coins", score: 61, ch7d: "-1.8%", pos: false, color: "#ef5350", coins: ["DOGE","SHIB","PEPE","BONK"] },
  { name: "DeFi", score: 58, ch7d: "+1.4%", pos: true, color: "#26a69a", coins: ["UNI","AAVE","CRV","GMX"] },
];

const TOP_PICKS = [
  { coin: "SOL", score: 94, reason: "Network dominance expanding. NFT volume ↑ 34%. DeFi TVL ATH.", signal: "STRONG BUY" },
  { coin: "LINK", score: 88, reason: "CCIP adoption accelerating. 14 new integrations this week.", signal: "BUY" },
  { coin: "RNDR", score: 85, reason: "AI narrative leader. GPU network utilization at 94%.", signal: "BUY" },
  { coin: "BTC", score: 82, reason: "ETF inflows resuming. Halving cycle historically bullish.", signal: "BUY" },
];

const SIGNAL_COLORS: Record<string, string> = {
  "STRONG BUY": "#26a69a", BUY: "#26a69a", WATCH: "#f7931a", SELL: "#ef5350", "STRONG SELL": "#ef5350",
};

function ConfBar({ bull, bear }: { bull: number; bear: number }) {
  return (
    <div className="flex items-center gap-1 w-full">
      <span className="text-[9px] font-mono tabular-nums" style={{ color: "#26a69a", width: 26 }}>{bull}%</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div className="h-full rounded-l-full" style={{ width: `${bull}%`, background: "linear-gradient(90deg,#26a69a,#4dd0c5)" }} />
        <div className="h-full rounded-r-full" style={{ width: `${bear}%`, background: "linear-gradient(90deg,#ef5350,#ff8a80)" }} />
      </div>
      <span className="text-[9px] font-mono tabular-nums" style={{ color: "#ef5350", width: 26, textAlign: "right" }}>{bear}%</span>
    </div>
  );
}

export default function AiInsights() {
  const [activeTab, setActiveTab] = useState<"predictions" | "alerts" | "picks">("predictions");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#7c3aed,#2962ff)", boxShadow: "0 0 16px rgba(124,58,237,0.4)" }}>
              <Brain className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-[22px] font-black tracking-tight"
              style={{ background: "linear-gradient(130deg,#fff 0%,#c4b5fd 50%,#7c3aed 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              AI Intelligence Center
            </h1>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
              style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.3)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] animate-pulse" /> LIVE AI
            </span>
          </div>
          <p className="text-[12px]" style={{ color: "#5a6072" }}>
            AI-powered market analysis across 500+ tokens · Updated every 60s
          </p>
        </div>
        <button onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-[11px] font-semibold transition-all hover:bg-white/5"
          style={{ color: "#5a6072", border: "1px solid rgba(255,255,255,0.07)" }}>
          <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "AI Market Sentiment", value: "BULLISH", sub: "68% of coins", color: "#26a69a", icon: TrendingUp },
          { label: "Smart Money Flow", value: "ACCUMULATING", sub: "↑ $2.1B inflow", color: "#2962ff", icon: Zap },
          { label: "AI Opportunities", value: "23 Signals", sub: "18 BUY · 5 WATCH", color: "#7c3aed", icon: Target },
          { label: "Risk Level", value: "MODERATE", sub: "VIX: 24.3", color: "#f7931a", icon: Shield },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl p-4"
            style={{ background: "rgba(13,17,26,0.85)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#4a5068" }}>{card.label}</span>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: `${card.color}18` }}>
                <card.icon className="h-3 w-3" style={{ color: card.color }} />
              </div>
            </div>
            <div className="text-[15px] font-black" style={{ color: card.color }}>{card.value}</div>
            <div className="text-[10px] mt-0.5" style={{ color: "#5a6072" }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left: Predictions + Alerts */}
        <div className="lg:col-span-2 space-y-4">

          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl"
            style={{ background: "rgba(10,14,22,0.8)", border: "1px solid rgba(255,255,255,0.06)", display: "inline-flex" }}>
            {(["predictions", "alerts", "picks"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all"
                style={{
                  background: activeTab === tab ? "rgba(124,58,237,0.2)" : "transparent",
                  color: activeTab === tab ? "#a78bfa" : "#5a6072",
                  border: activeTab === tab ? "1px solid rgba(124,58,237,0.3)" : "1px solid transparent",
                }}>
                {tab === "predictions" ? "AI Predictions" : tab === "alerts" ? "AI Alerts" : "Top Picks"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "predictions" && (
              <motion.div key="pred" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: "rgba(10,14,22,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5" style={{ color: "#7c3aed" }} />
                      <span className="text-[12px] font-bold text-white">AI Market Predictions</span>
                    </div>
                    <span className="text-[10px]" style={{ color: "#3a4058" }}>{AI_PREDICTIONS.length} coins analyzed</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full" style={{ minWidth: 640 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          {["Coin","Signal","Conf.","Bull vs Bear","Momentum","Smart $","24h"].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wider" style={{ color: "#3a4058" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {AI_PREDICTIONS.map((row, i) => (
                          <motion.tr key={row.coin}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.03 }}
                            className="transition-colors cursor-pointer"
                            style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                            onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(124,58,237,0.04)"}
                            onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}>
                            <td className="px-3 py-3">
                              <div className="font-bold text-[12px] text-white">{row.coin}</div>
                              <div className="text-[9px]" style={{ color: "#4a5068" }}>{row.name}</div>
                            </td>
                            <td className="px-3 py-3">
                              <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold"
                                style={{ background: `${SIGNAL_COLORS[row.signal]}18`, color: SIGNAL_COLORS[row.signal], border: `1px solid ${SIGNAL_COLORS[row.signal]}30` }}>
                                {row.signal}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1">
                                <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                  <div className="h-full rounded-full" style={{ width: `${row.conf}%`, background: `linear-gradient(90deg,#7c3aed,#a78bfa)` }} />
                                </div>
                                <span className="text-[10px] font-mono" style={{ color: "#a78bfa" }}>{row.conf}%</span>
                              </div>
                            </td>
                            <td className="px-3 py-3" style={{ minWidth: 140 }}>
                              <ConfBar bull={row.bull} bear={row.bear} />
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1">
                                {row.momentum > 0
                                  ? <ArrowUp className="h-3 w-3" style={{ color: "#26a69a" }} />
                                  : <ArrowDown className="h-3 w-3" style={{ color: "#ef5350" }} />}
                                <span className="text-[10px] font-mono tabular-nums"
                                  style={{ color: row.momentum > 0 ? "#26a69a" : "#ef5350" }}>
                                  {Math.abs(row.momentum)}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <span className="text-[10px] font-semibold"
                                style={{ color: row.smart === "ACC" ? "#26a69a" : row.smart === "DIS" ? "#ef5350" : "#5a6072" }}>
                                {row.smart === "ACC" ? "Accum." : row.smart === "DIS" ? "Distrib." : "Neutral"}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <span className="text-[11px] font-bold tabular-nums font-mono"
                                style={{ color: row.pos ? "#26a69a" : "#ef5350" }}>{row.ch24}</span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "alerts" && (
              <motion.div key="alerts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="space-y-2">
                {AI_ALERTS.map((alert, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-2xl p-4 flex items-start gap-3"
                    style={{ background: "rgba(13,17,26,0.85)", border: `1px solid ${alert.color}20` }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${alert.color}18` }}>
                      <alert.icon className="h-4 w-4" style={{ color: alert.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-[12px] font-bold text-white">{alert.title}</span>
                        <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black tracking-wider"
                          style={{ background: `${alert.color}18`, color: alert.color }}>{alert.badge}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{ color: "#787b86" }}>{alert.desc}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" style={{ color: "#3a4058" }}>
                      <Clock className="h-3 w-3" />
                      <span className="text-[9px] font-mono">{alert.time}</span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {activeTab === "picks" && (
              <motion.div key="picks" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TOP_PICKS.map((pick, i) => (
                  <motion.div key={pick.coin} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.07 }}
                    className="rounded-2xl p-4"
                    style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(38,166,154,0.2)", boxShadow: "0 0 24px rgba(38,166,154,0.06)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4" style={{ color: "#f7931a", fill: "#f7931a" }} />
                        <span className="text-[16px] font-black text-white">{pick.coin}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold"
                        style={{ background: "rgba(38,166,154,0.15)", color: "#26a69a", border: "1px solid rgba(38,166,154,0.3)" }}>
                        {pick.signal}
                      </span>
                    </div>
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] uppercase tracking-wider" style={{ color: "#4a5068" }}>AI Score</span>
                        <span className="text-[12px] font-black" style={{ color: "#26a69a" }}>{pick.score}/100</span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <motion.div className="h-full rounded-full"
                          initial={{ width: 0 }} animate={{ width: `${pick.score}%` }}
                          transition={{ duration: 0.8, delay: i * 0.1 }}
                          style={{ background: "linear-gradient(90deg,#26a69a,#4dd0c5)" }} />
                      </div>
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: "#787b86" }}>{pick.reason}</p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Narrative Strength */}
        <div className="space-y-4">
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Flame className="h-3.5 w-3.5" style={{ color: "#7c3aed" }} />
              <span className="text-[12px] font-bold text-white">Narrative Strength</span>
            </div>
            <div className="space-y-3">
              {NARRATIVES.map((n, i) => (
                <div key={n.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold" style={{ color: "#d1d4dc" }}>{n.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono" style={{ color: n.pos ? "#26a69a" : "#ef5350" }}>{n.ch7d}</span>
                      <span className="text-[10px] font-black" style={{ color: n.color }}>{n.score}</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <motion.div className="h-full rounded-full"
                      initial={{ width: 0 }} animate={{ width: `${n.score}%` }}
                      transition={{ duration: 0.7, delay: i * 0.08 }}
                      style={{ background: `linear-gradient(90deg,${n.color},${n.color}88)` }} />
                  </div>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {n.coins.map(c => (
                      <span key={c} className="text-[8px] px-1.5 py-0.5 rounded-md font-mono"
                        style={{ background: `${n.color}12`, color: n.color }}>{c}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Anomaly Detector */}
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-3.5 w-3.5" style={{ color: "#ef5350" }} />
              <span className="text-[12px] font-bold text-white">Anomaly Detection</span>
            </div>
            <div className="space-y-2">
              {[
                { coin: "SOL", type: "Volume spike 4.8×", color: "#f7931a" },
                { coin: "LINK", type: "Unusual buy pressure", color: "#26a69a" },
                { coin: "PEPE", type: "Social volume spike", color: "#7c3aed" },
                { coin: "BTC", type: "Exchange outflow ↑", color: "#26a69a" },
                { coin: "ARB", type: "TVL drop detected", color: "#ef5350" },
              ].map((a) => (
                <div key={a.coin} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-[10px] font-black text-white font-mono">{a.coin}</span>
                    <span className="text-[10px]" style={{ color: "#787b86" }}>{a.type}</span>
                  </div>
                  <div className="w-2 h-2 rounded-full" style={{ background: a.color }} />
                </div>
              ))}
            </div>
          </div>

          {/* AI Engine Status */}
          <div className="rounded-2xl p-4"
            style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.12),rgba(41,98,255,0.08))", border: "1px solid rgba(124,58,237,0.2)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-3.5 w-3.5" style={{ color: "#a78bfa" }} />
              <span className="text-[12px] font-bold text-white">AI Engine Status</span>
            </div>
            <div className="space-y-2">
              {[
                { label: "Sentiment Engine", value: "Active", color: "#26a69a" },
                { label: "Momentum Model", value: "Processing", color: "#f7931a" },
                { label: "Smart Money AI", value: "Active", color: "#26a69a" },
                { label: "Narrative AI", value: "Active", color: "#26a69a" },
                { label: "Risk Model", value: "Active", color: "#26a69a" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: "#787b86" }}>{s.label}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: s.color }} />
                    <span className="text-[9px] font-semibold" style={{ color: s.color }}>{s.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
