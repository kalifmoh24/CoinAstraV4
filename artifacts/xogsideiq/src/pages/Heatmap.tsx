import React, { useState } from "react";
import { motion } from "framer-motion";
import { LayoutGrid, TrendingUp, TrendingDown, RefreshCw, ChevronDown } from "lucide-react";

type View = "24h" | "7d" | "30d";
type SectorView = "all" | "defi" | "layer1" | "layer2" | "meme" | "ai" | "rwa";

const COINS = [
  { coin: "BTC",   name: "Bitcoin",       mcap: 1_326_000, ch24: 2.4,  ch7d: 4.8,  ch30d: 18.2, sector: "layer1", size: 9 },
  { coin: "ETH",   name: "Ethereum",      mcap: 390_000,   ch24: 1.8,  ch7d: 6.2,  ch30d: 14.1, sector: "layer1", size: 7 },
  { coin: "SOL",   name: "Solana",        mcap: 82_000,    ch24: 5.2,  ch7d: 18.4, ch30d: 42.1, sector: "layer1", size: 5 },
  { coin: "BNB",   name: "BNB Chain",     mcap: 78_000,    ch24: 0.8,  ch7d: 2.1,  ch30d: 8.4,  sector: "layer1", size: 5 },
  { coin: "AVAX",  name: "Avalanche",     mcap: 15_000,    ch24: 1.2,  ch7d: 4.4,  ch30d: 12.8, sector: "layer1", size: 4 },
  { coin: "DOT",   name: "Polkadot",      mcap: 8_400,     ch24: -0.8, ch7d: 1.2,  ch30d: 3.1,  sector: "layer1", size: 3 },
  { coin: "ADA",   name: "Cardano",       mcap: 12_000,    ch24: -1.2, ch7d: -2.4, ch30d: -4.8, sector: "layer1", size: 4 },
  { coin: "UNI",   name: "Uniswap",       mcap: 5_800,     ch24: 2.1,  ch7d: 8.4,  ch30d: 22.1, sector: "defi",   size: 3 },
  { coin: "AAVE",  name: "Aave",          mcap: 3_200,     ch24: 1.8,  ch7d: 9.2,  ch30d: 28.4, sector: "defi",   size: 3 },
  { coin: "LINK",  name: "Chainlink",     mcap: 9_100,     ch24: 4.3,  ch7d: 12.1, ch30d: 31.2, sector: "defi",   size: 4 },
  { coin: "ARB",   name: "Arbitrum",      mcap: 2_800,     ch24: 0.6,  ch7d: 3.1,  ch30d: 9.4,  sector: "layer2", size: 3 },
  { coin: "OP",    name: "Optimism",      mcap: 2_100,     ch24: 1.2,  ch7d: 4.8,  ch30d: 14.2, sector: "layer2", size: 2 },
  { coin: "MATIC", name: "Polygon",       mcap: 5_100,     ch24: -0.4, ch7d: 2.2,  ch30d: 6.8,  sector: "layer2", size: 3 },
  { coin: "SUI",   name: "SUI",           mcap: 2_100,     ch24: 12.4, ch7d: 28.7, ch30d: 82.4, sector: "layer1", size: 3 },
  { coin: "DOGE",  name: "Dogecoin",      mcap: 21_000,    ch24: -2.1, ch7d: -4.8, ch30d: -8.2, sector: "meme",   size: 5 },
  { coin: "SHIB",  name: "Shiba Inu",     mcap: 8_200,     ch24: -1.4, ch7d: -3.2, ch30d: -6.1, sector: "meme",   size: 4 },
  { coin: "PEPE",  name: "Pepe",          mcap: 4_800,     ch24: 0.8,  ch7d: 2.4,  ch30d: 18.4, sector: "meme",   size: 3 },
  { coin: "BONK",  name: "Bonk",          mcap: 1_900,     ch24: 14.8, ch7d: 42.1, ch30d: 124.8, sector: "meme",  size: 2 },
  { coin: "WIF",   name: "dogwifhat",     mcap: 2_840,     ch24: 7.6,  ch7d: 19.8, ch30d: 64.2, sector: "meme",   size: 3 },
  { coin: "RNDR",  name: "Render",        mcap: 3_400,     ch24: 3.1,  ch7d: 9.8,  ch30d: 28.4, sector: "ai",     size: 3 },
  { coin: "FET",   name: "Fetch.ai",      mcap: 2_100,     ch24: 4.2,  ch7d: 11.4, ch30d: 34.8, sector: "ai",     size: 2 },
  { coin: "AGIX",  name: "SingularityNET",mcap: 1_200,     ch24: 2.8,  ch7d: 8.2,  ch30d: 22.1, sector: "ai",     size: 2 },
  { coin: "ONDO",  name: "Ondo",          mcap: 1_800,     ch24: 3.4,  ch7d: 12.4, ch30d: 38.2, sector: "rwa",    size: 2 },
  { coin: "INJ",   name: "Injective",     mcap: 2_300,     ch24: 2.9,  ch7d: 7.4,  ch30d: 21.8, sector: "defi",   size: 3 },
  { coin: "CRV",   name: "Curve",         mcap: 840,       ch24: 1.2,  ch7d: 3.4,  ch30d: 8.2,  sector: "defi",   size: 2 },
  { coin: "GMX",   name: "GMX",           mcap: 420,       ch24: 2.1,  ch7d: 6.8,  ch30d: 18.4, sector: "defi",   size: 1 },
  { coin: "JTO",   name: "Jito",          mcap: 420,       ch24: 8.9,  ch7d: 21.3, ch30d: 64.8, sector: "defi",   size: 2 },
  { coin: "PENDLE",name: "Pendle",        mcap: 520,       ch24: 4.8,  ch7d: 16.9, ch30d: 48.2, sector: "defi",   size: 2 },
];

const SECTORS = [
  { id: "all",    label: "All Coins",   color: "#2962ff" },
  { id: "layer1", label: "Layer 1",     color: "#26a69a" },
  { id: "layer2", label: "Layer 2",     color: "#0ea5e9" },
  { id: "defi",   label: "DeFi",        color: "#7c3aed" },
  { id: "meme",   label: "Meme",        color: "#ef5350" },
  { id: "ai",     label: "AI",          color: "#f7931a" },
  { id: "rwa",    label: "RWA",         color: "#10b981" },
];

function getColor(val: number, maxAbs: number): string {
  const clamped = Math.max(-1, Math.min(1, val / maxAbs));
  if (clamped > 0.6) return "#1a6b5a";
  if (clamped > 0.3) return "#1e8870";
  if (clamped > 0.1) return "#22a984";
  if (clamped > 0) return "#2ab596";
  if (clamped > -0.1) return "#6b2222";
  if (clamped > -0.3) return "#882828";
  if (clamped > -0.6) return "#a83030";
  return "#c43838";
}

function textColor(val: number): string {
  return val >= 0 ? "#a7f3d0" : "#fca5a5";
}

const SECTOR_STATS = [
  { name: "Layer 1", ch24: "+2.1%", ch7d: "+6.4%", pos: true, tvl: "$248B", color: "#26a69a" },
  { name: "DeFi",    ch24: "+2.8%", ch7d: "+9.2%", pos: true, tvl: "$82B",  color: "#7c3aed" },
  { name: "Layer 2", ch24: "+0.5%", ch7d: "+3.4%", pos: true, tvl: "$28B",  color: "#0ea5e9" },
  { name: "AI Coins",ch24: "+3.4%", ch7d: "+11.2%",pos: true, tvl: "$12B",  color: "#f7931a" },
  { name: "Meme",    ch24: "+3.8%", ch7d: "+8.4%", pos: true, tvl: "$38B",  color: "#ef5350" },
  { name: "RWA",     ch24: "+3.4%", ch7d: "+12.4%",pos: true, tvl: "$8B",   color: "#10b981" },
];

export default function Heatmap() {
  const [view, setView] = useState<View>("24h");
  const [sector, setSector] = useState<SectorView>("all");

  const getVal = (c: typeof COINS[0]) =>
    view === "24h" ? c.ch24 : view === "7d" ? c.ch7d : c.ch30d;

  const filtered = sector === "all" ? COINS : COINS.filter(c => c.sector === sector);
  const maxAbs = Math.max(...filtered.map(c => Math.abs(getVal(c))));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#2962ff,#10b981)", boxShadow: "0 0 16px rgba(41,98,255,0.4)" }}>
              <LayoutGrid className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-[22px] font-black tracking-tight"
              style={{ background: "linear-gradient(130deg,#fff 0%,#a5f3fc 50%,#2962ff 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Market Heatmap
            </h1>
          </div>
          <p className="text-[12px]" style={{ color: "#5a6072" }}>
            Visual market overview · Size = market cap · Color = performance
          </p>
        </div>
        {/* Time Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl"
          style={{ background: "rgba(10,14,22,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {(["24h","7d","30d"] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
              style={{
                background: view === v ? "rgba(41,98,255,0.2)" : "transparent",
                color: view === v ? "#4d7fff" : "#5a6072",
                border: view === v ? "1px solid rgba(41,98,255,0.35)" : "1px solid transparent",
              }}>{v}</button>
          ))}
        </div>
      </div>

      {/* Sector Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {SECTORS.map(s => (
          <button key={s.id} onClick={() => setSector(s.id as SectorView)}
            className="px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition-all"
            style={{
              background: sector === s.id ? `${s.color}20` : "rgba(255,255,255,0.04)",
              color: sector === s.id ? s.color : "#5a6072",
              border: sector === s.id ? `1px solid ${s.color}40` : "1px solid rgba(255,255,255,0.06)",
            }}>{s.label}</button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            {["#1a6b5a","#22a984","#2ab596","#6b2222","#a83030","#c43838"].map((c, i) => (
              <div key={i} className="w-8 h-4 rounded-sm" style={{ background: c }} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" style={{ color: "#26a69a" }} />
            <span style={{ color: "#26a69a" }}>Gaining</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingDown className="h-3 w-3" style={{ color: "#ef5350" }} />
            <span style={{ color: "#ef5350" }}>Losing</span>
          </div>
        </div>
        <span className="text-[10px]" style={{ color: "#3a4058" }}>Block size = market cap</span>
      </div>

      {/* Heatmap Grid */}
      <motion.div
        key={`${view}-${sector}`}
        initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl overflow-hidden p-4"
        style={{ background: "rgba(8,12,20,0.95)", border: "1px solid rgba(255,255,255,0.06)", minHeight: 360 }}>
        <div className="flex flex-wrap gap-1.5 content-start">
          {filtered.map((coin, i) => {
            const val = getVal(coin);
            const bg = getColor(val, maxAbs);
            const gridCols = coin.size >= 7 ? "w-40 h-24" : coin.size >= 5 ? "w-28 h-20" : coin.size >= 4 ? "w-24 h-16" : coin.size >= 3 ? "w-20 h-14" : coin.size >= 2 ? "w-16 h-12" : "w-12 h-10";
            return (
              <motion.div key={coin.coin}
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: i * 0.015 }}
                whileHover={{ scale: 1.05, zIndex: 10 }}
                className={`${gridCols} rounded-xl flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group`}
                style={{ background: bg, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "rgba(255,255,255,0.06)" }} />
                <div className="text-center px-1 z-10">
                  <div className={`font-black text-white leading-none ${coin.size >= 5 ? "text-[14px]" : coin.size >= 3 ? "text-[11px]" : "text-[9px]"}`}>
                    {coin.coin}
                  </div>
                  {coin.size >= 3 && (
                    <div className={`font-bold mt-0.5 ${coin.size >= 5 ? "text-[12px]" : "text-[10px]"}`}
                      style={{ color: textColor(val) }}>
                      {val >= 0 ? "+" : ""}{val.toFixed(1)}%
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Sector Performance Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-4"
          style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-4">
            <LayoutGrid className="h-3.5 w-3.5" style={{ color: "#2962ff" }} />
            <span className="text-[12px] font-bold text-white">Sector Rotation ({view})</span>
          </div>
          <div className="space-y-3">
            {SECTOR_STATS.map((s, i) => (
              <div key={s.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-[11px] font-semibold" style={{ color: "#d1d4dc" }}>{s.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px]" style={{ color: "#4a5068" }}>TVL {s.tvl}</span>
                    <span className="text-[10px] font-bold" style={{ color: s.pos ? "#26a69a" : "#ef5350" }}>
                      {view === "24h" ? s.ch24 : s.ch7d}
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <motion.div className="h-full rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.abs(parseFloat(view === "24h" ? s.ch24 : s.ch7d)) * 8)}%` }}
                    transition={{ duration: 0.7, delay: i * 0.08 }}
                    style={{ background: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Movers in view */}
        <div className="rounded-2xl p-4"
          style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-3.5 w-3.5" style={{ color: "#26a69a" }} />
            <span className="text-[12px] font-bold text-white">Top Movers ({view})</span>
          </div>
          <div className="space-y-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#26a69a" }}>🚀 Best</div>
                {[...COINS].sort((a, b) => getVal(b) - getVal(a)).slice(0, 5).map(c => (
                  <div key={c.coin} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    <span className="text-[11px] font-black text-white">{c.coin}</span>
                    <span className="text-[10px] font-bold font-mono" style={{ color: "#26a69a" }}>+{getVal(c).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#ef5350" }}>📉 Worst</div>
                {[...COINS].sort((a, b) => getVal(a) - getVal(b)).slice(0, 5).map(c => (
                  <div key={c.coin} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    <span className="text-[11px] font-black text-white">{c.coin}</span>
                    <span className="text-[10px] font-bold font-mono" style={{ color: "#ef5350" }}>{getVal(c).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
