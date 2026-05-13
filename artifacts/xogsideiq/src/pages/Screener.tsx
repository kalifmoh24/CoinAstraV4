import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine, Filter, Zap, TrendingUp, TrendingDown, ArrowUp, ArrowDown,
  RefreshCw, Star, BarChart2, Activity, ChevronDown, ChevronUp,
  Flame, Target, Shield, Eye,
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

const ALL_COINS = [
  { coin: "SOL", name: "Solana", price: 178.32, ch24: 5.2, ch7d: 18.4, mcap: 82_000_000_000, vol: 4_200_000_000, aiScore: 94, signal: "STRONG BUY", volumeSpike: 4.8, momentum: 85, chain: "Solana", risk: "LOW", smartMoney: "ACC", conf: 91 },
  { coin: "LINK", name: "Chainlink", price: 15.60, ch24: 4.3, ch7d: 12.1, mcap: 9_100_000_000, vol: 920_000_000, aiScore: 88, signal: "BUY", volumeSpike: 3.2, momentum: 68, chain: "Ethereum", risk: "LOW", smartMoney: "ACC", conf: 84 },
  { coin: "RNDR", name: "Render", price: 8.45, ch24: 3.1, ch7d: 9.8, mcap: 3_400_000_000, vol: 380_000_000, aiScore: 85, signal: "BUY", volumeSpike: 2.9, momentum: 64, chain: "Solana", risk: "MEDIUM", smartMoney: "ACC", conf: 82 },
  { coin: "SUI", name: "SUI", price: 1.84, ch24: 12.4, ch7d: 28.7, mcap: 2_100_000_000, vol: 620_000_000, aiScore: 91, signal: "STRONG BUY", volumeSpike: 6.1, momentum: 92, chain: "SUI", risk: "MEDIUM", smartMoney: "ACC", conf: 88 },
  { coin: "JTO", name: "Jito", price: 3.12, ch24: 8.9, ch7d: 21.3, mcap: 420_000_000, vol: 142_000_000, aiScore: 82, signal: "BUY", volumeSpike: 5.4, momentum: 76, chain: "Solana", risk: "MEDIUM", smartMoney: "ACC", conf: 79 },
  { coin: "STRK", name: "Starknet", price: 0.84, ch24: 6.7, ch7d: 14.2, mcap: 680_000_000, vol: 198_000_000, aiScore: 78, signal: "BUY", volumeSpike: 2.7, momentum: 58, chain: "Ethereum", risk: "HIGH", smartMoney: "NEU", conf: 72 },
  { coin: "PENDLE", name: "Pendle", price: 5.12, ch24: 4.8, ch7d: 16.9, mcap: 520_000_000, vol: 88_000_000, aiScore: 80, signal: "BUY", volumeSpike: 2.2, momentum: 61, chain: "Ethereum", risk: "MEDIUM", smartMoney: "ACC", conf: 77 },
  { coin: "W", name: "Wormhole", price: 0.48, ch24: 9.2, ch7d: 24.1, mcap: 480_000_000, vol: 168_000_000, aiScore: 76, signal: "BUY", volumeSpike: 3.8, momentum: 71, chain: "Solana", risk: "HIGH", smartMoney: "NEU", conf: 70 },
  { coin: "DOGE", name: "Dogecoin", price: 0.148, ch24: -2.1, ch7d: -4.8, mcap: 21_000_000_000, vol: 1_800_000_000, aiScore: 42, signal: "SELL", volumeSpike: 0.8, momentum: -18, chain: "Other", risk: "HIGH", smartMoney: "DIS", conf: 58 },
  { coin: "INJ", name: "Injective", price: 24.80, ch24: 2.9, ch7d: 7.4, mcap: 2_300_000_000, vol: 280_000_000, aiScore: 76, signal: "BUY", volumeSpike: 2.1, momentum: 55, chain: "Ethereum", risk: "MEDIUM", smartMoney: "ACC", conf: 76 },
  { coin: "BONK", name: "Bonk", price: 0.0000288, ch24: 14.8, ch7d: 42.1, mcap: 1_900_000_000, vol: 840_000_000, aiScore: 68, signal: "WATCH", volumeSpike: 8.2, momentum: 88, chain: "Solana", risk: "HIGH", smartMoney: "NEU", conf: 62 },
  { coin: "WIF", name: "dogwifhat", price: 2.84, ch24: 7.6, ch7d: 19.8, mcap: 2_840_000_000, vol: 620_000_000, aiScore: 70, signal: "WATCH", volumeSpike: 4.4, momentum: 72, chain: "Solana", risk: "HIGH", smartMoney: "NEU", conf: 65 },
];

const SIGNAL_COLORS: Record<string, string> = {
  "STRONG BUY": "#26a69a", BUY: "#26a69a", WATCH: "#f7931a", SELL: "#ef5350", "STRONG SELL": "#ef5350",
};
const RISK_COLORS: Record<string, string> = { LOW: "#26a69a", MEDIUM: "#f7931a", HIGH: "#ef5350" };

type SortKey = "aiScore" | "ch24" | "ch7d" | "volumeSpike" | "momentum" | "conf" | "mcap";

const PRESETS = [
  { id: "vol", label: "Volume Spikes", icon: Activity, color: "#f7931a", desc: "Coins with 2×+ volume surge" },
  { id: "momentum", label: "Momentum", icon: TrendingUp, color: "#26a69a", desc: "High momentum score >60" },
  { id: "meme", label: "Meme Pumps", icon: Flame, color: "#ef5350", desc: "Meme coins with price spike" },
  { id: "smart", label: "Smart Money", icon: Star, color: "#7c3aed", desc: "Smart money accumulating" },
  { id: "gem", label: "AI Gems", icon: Zap, color: "#2962ff", desc: "AI score >80, low cap" },
];

export default function Screener() {
  const [sortKey, setSortKey] = useState<SortKey>("aiScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [minMcap, setMinMcap] = useState(0);
  const [maxRisk, setMaxRisk] = useState<"ALL" | "LOW" | "MEDIUM" | "HIGH">("ALL");
  const [chain, setChain] = useState("ALL");
  const [preset, setPreset] = useState<string | null>(null);
  const [minVolSpike, setMinVolSpike] = useState(0);
  const [scanning, setScanning] = useState(false);

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  };

  const filtered = useMemo(() => {
    let list = [...ALL_COINS];
    if (maxRisk !== "ALL") {
      const levels = { LOW: ["LOW"], MEDIUM: ["LOW","MEDIUM"], HIGH: ["LOW","MEDIUM","HIGH"] };
      list = list.filter(c => levels[maxRisk].includes(c.risk));
    }
    if (chain !== "ALL") list = list.filter(c => c.chain === chain);
    if (minVolSpike > 0) list = list.filter(c => c.volumeSpike >= minVolSpike);
    if (preset === "vol") list = list.filter(c => c.volumeSpike >= 3);
    if (preset === "momentum") list = list.filter(c => c.momentum >= 60);
    if (preset === "meme") list = list.filter(c => ["DOGE","SHIB","PEPE","BONK","WIF"].includes(c.coin));
    if (preset === "smart") list = list.filter(c => c.smartMoney === "ACC");
    if (preset === "gem") list = list.filter(c => c.aiScore >= 80 && c.mcap < 5_000_000_000);
    list.sort((a, b) => {
      const diff = (a[sortKey] as number) - (b[sortKey] as number);
      return sortDir === "desc" ? -diff : diff;
    });
    return list;
  }, [sortKey, sortDir, maxRisk, chain, minVolSpike, preset]);

  function SortTH({ label, sk, right }: { label: string; sk: SortKey; right?: boolean }) {
    const active = sortKey === sk;
    return (
      <th className={`px-3 py-2 text-[9px] font-semibold uppercase tracking-wider cursor-pointer select-none ${right ? "text-right" : "text-left"}`}
        style={{ color: active ? "#4d7fff" : "#3a4058" }}
        onClick={() => handleSort(sk)}>
        <div className={`flex items-center gap-0.5 ${right ? "justify-end" : ""}`}>
          {label}
          {active ? (sortDir === "desc" ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronUp className="h-2.5 w-2.5" />) : null}
        </div>
      </th>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#f7931a,#ef5350)", boxShadow: "0 0 16px rgba(247,147,26,0.4)" }}>
              <ScanLine className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-[22px] font-black tracking-tight"
              style={{ background: "linear-gradient(130deg,#fff 0%,#fed7aa 50%,#f7931a 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              AI Screener
            </h1>
          </div>
          <p className="text-[12px]" style={{ color: "#5a6072" }}>
            Find opportunities automatically · {filtered.length} results
          </p>
        </div>
        <button
          className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-[11px] font-semibold transition-all"
          style={{ background: "rgba(247,147,26,0.15)", color: "#f7931a", border: "1px solid rgba(247,147,26,0.3)" }}
          onClick={() => { setScanning(true); setTimeout(() => setScanning(false), 1500); }}>
          <ScanLine className={`h-3 w-3 ${scanning ? "animate-spin" : ""}`} />
          {scanning ? "Scanning..." : "Run Scan"}
        </button>
      </div>

      {/* Preset Strategies */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold" style={{ color: "#4a5068" }}>Presets:</span>
        {PRESETS.map(p => (
          <button key={p.id} onClick={() => setPreset(preset === p.id ? null : p.id)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition-all"
            style={{
              background: preset === p.id ? `${p.color}20` : "rgba(255,255,255,0.04)",
              color: preset === p.id ? p.color : "#5a6072",
              border: preset === p.id ? `1px solid ${p.color}40` : "1px solid rgba(255,255,255,0.06)",
            }}>
            <p.icon className="h-3 w-3" />
            {p.label}
          </button>
        ))}
        {preset && (
          <button onClick={() => setPreset(null)} className="text-[10px] px-2 py-1 rounded-lg transition-all hover:bg-white/5"
            style={{ color: "#5a6072" }}>✕ Clear</button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Filter Panel */}
        <div className="space-y-3">
          <div className="rounded-2xl p-4 space-y-4"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5" style={{ color: "#f7931a" }} />
              <span className="text-[12px] font-bold text-white">Filters</span>
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2" style={{ color: "#4a5068" }}>Chain</label>
              <div className="grid grid-cols-2 gap-1.5">
                {["ALL","Ethereum","Solana","SUI","Other"].map(c => (
                  <button key={c} onClick={() => setChain(c)}
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold transition-all"
                    style={{
                      background: chain === c ? "rgba(247,147,26,0.18)" : "rgba(255,255,255,0.04)",
                      color: chain === c ? "#f7931a" : "#5a6072",
                      border: chain === c ? "1px solid rgba(247,147,26,0.35)" : "1px solid rgba(255,255,255,0.06)",
                    }}>{c}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2" style={{ color: "#4a5068" }}>Max Risk</label>
              <div className="flex flex-col gap-1.5">
                {(["ALL","LOW","MEDIUM","HIGH"] as const).map(r => (
                  <button key={r} onClick={() => setMaxRisk(r)}
                    className="px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all text-left"
                    style={{
                      background: maxRisk === r ? `${RISK_COLORS[r] ?? "#5a6072"}15` : "rgba(255,255,255,0.04)",
                      color: maxRisk === r ? (RISK_COLORS[r] ?? "#d1d4dc") : "#5a6072",
                      border: maxRisk === r ? `1px solid ${RISK_COLORS[r] ?? "#5a6072"}30` : "1px solid rgba(255,255,255,0.06)",
                    }}>
                    {r === "ALL" ? "All Risks" : r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2" style={{ color: "#4a5068" }}>
                Min Volume Spike: {minVolSpike}×
              </label>
              <input type="range" min={0} max={5} step={0.5} value={minVolSpike}
                onChange={e => setMinVolSpike(parseFloat(e.target.value))}
                className="w-full accent-[#f7931a]" />
              <div className="flex justify-between text-[8px]" style={{ color: "#3a4058" }}>
                <span>0×</span><span>5×</span>
              </div>
            </div>

            <button onClick={() => { setChain("ALL"); setMaxRisk("ALL"); setMinVolSpike(0); setPreset(null); }}
              className="w-full py-2 rounded-xl text-[10px] font-semibold transition-all hover:bg-white/5"
              style={{ color: "#5a6072", border: "1px solid rgba(255,255,255,0.07)" }}>
              Reset All Filters
            </button>
          </div>

          {/* Quick Stats */}
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-[11px] font-bold text-white block mb-3">Scan Results</span>
            <div className="space-y-2">
              {[
                { label: "BUY signals", value: filtered.filter(c => c.signal.includes("BUY")).length, color: "#26a69a" },
                { label: "WATCH signals", value: filtered.filter(c => c.signal === "WATCH").length, color: "#f7931a" },
                { label: "SELL signals", value: filtered.filter(c => c.signal === "SELL").length, color: "#ef5350" },
                { label: "Volume spikes", value: filtered.filter(c => c.volumeSpike >= 2).length, color: "#f7931a" },
                { label: "Smart money", value: filtered.filter(c => c.smartMoney === "ACC").length, color: "#7c3aed" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: "#787b86" }}>{s.label}</span>
                  <span className="text-[11px] font-black" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(10,14,22,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: 720 }}>
                <thead>
                  <tr style={{ background: "rgba(8,12,22,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <th className="px-3 py-2.5 text-left text-[9px] font-semibold uppercase tracking-wider" style={{ color: "#3a4058" }}>Coin</th>
                    <th className="px-3 py-2.5 text-left text-[9px] font-semibold uppercase tracking-wider" style={{ color: "#3a4058" }}>Signal</th>
                    <SortTH label="AI Score" sk="aiScore" right />
                    <SortTH label="24h %" sk="ch24" right />
                    <SortTH label="7d %" sk="ch7d" right />
                    <SortTH label="Vol Spike" sk="volumeSpike" right />
                    <SortTH label="Momentum" sk="momentum" right />
                    <SortTH label="Conf." sk="conf" right />
                    <th className="px-3 py-2.5 text-right text-[9px] font-semibold uppercase tracking-wider" style={{ color: "#3a4058" }}>Smart $</th>
                    <th className="px-3 py-2.5 text-right text-[9px] font-semibold uppercase tracking-wider" style={{ color: "#3a4058" }}>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {filtered.map((coin, idx) => (
                      <motion.tr key={coin.coin}
                        layout
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.12, delay: Math.min(idx * 0.02, 0.3) }}
                        className="transition-colors cursor-pointer"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(247,147,26,0.04)"}
                        onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}>
                        <td className="px-3 py-3">
                          <div className="font-black text-[12px] text-white">{coin.coin}</div>
                          <div className="text-[9px]" style={{ color: "#4a5068" }}>{coin.name}</div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold"
                            style={{ background: `${SIGNAL_COLORS[coin.signal]}18`, color: SIGNAL_COLORS[coin.signal], border: `1px solid ${SIGNAL_COLORS[coin.signal]}30` }}>
                            {coin.signal}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                              <div className="h-full rounded-full" style={{ width: `${coin.aiScore}%`, background: "linear-gradient(90deg,#7c3aed,#a78bfa)" }} />
                            </div>
                            <span className="text-[10px] font-black" style={{ color: "#a78bfa" }}>{coin.aiScore}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="text-[11px] font-bold tabular-nums font-mono"
                            style={{ color: coin.ch24 >= 0 ? "#26a69a" : "#ef5350" }}>
                            {coin.ch24 >= 0 ? "+" : ""}{coin.ch24.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="text-[11px] font-bold tabular-nums font-mono"
                            style={{ color: coin.ch7d >= 0 ? "#26a69a" : "#ef5350" }}>
                            {coin.ch7d >= 0 ? "+" : ""}{coin.ch7d.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="text-[11px] font-bold font-mono tabular-nums"
                            style={{ color: coin.volumeSpike >= 3 ? "#f7931a" : coin.volumeSpike >= 2 ? "#d1d4dc" : "#5a6072" }}>
                            {coin.volumeSpike.toFixed(1)}×
                          </span>
                          {coin.volumeSpike >= 3 && <Flame className="inline h-3 w-3 ml-0.5" style={{ color: "#f7931a" }} />}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="text-[10px] font-mono" style={{ color: coin.momentum > 60 ? "#26a69a" : coin.momentum < 0 ? "#ef5350" : "#d1d4dc" }}>
                            {coin.momentum}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="text-[10px] font-mono" style={{ color: "#a78bfa" }}>{coin.conf}%</span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="text-[10px] font-semibold"
                            style={{ color: coin.smartMoney === "ACC" ? "#26a69a" : coin.smartMoney === "DIS" ? "#ef5350" : "#5a6072" }}>
                            {coin.smartMoney === "ACC" ? "Accum." : coin.smartMoney === "DIS" ? "Dist." : "Neutral"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                            style={{ background: `${RISK_COLORS[coin.risk]}15`, color: RISK_COLORS[coin.risk] }}>
                            {coin.risk}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="flex flex-col items-center py-16">
                  <ScanLine className="h-8 w-8 mb-3 opacity-20" style={{ color: "#5a6072" }} />
                  <p className="text-[13px] font-bold text-white mb-1">No coins match filters</p>
                  <button onClick={() => { setChain("ALL"); setMaxRisk("ALL"); setMinVolSpike(0); setPreset(null); }}
                    className="mt-2 px-4 py-1.5 rounded-xl text-[11px]"
                    style={{ background: "rgba(247,147,26,0.15)", color: "#f7931a" }}>Reset Filters</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
