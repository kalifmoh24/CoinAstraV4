import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  LayoutGrid, TrendingUp, TrendingDown, Activity, Flame,
  Layers, Sparkles, Zap, BarChart3, DollarSign, Gauge,
  ZoomIn, ZoomOut, RotateCcw, Crosshair, Maximize2, Brain, Waves,
} from "lucide-react";
import { useAllCoins } from "@/hooks/use-all-coins";
import type { CoinMarket } from "@/hooks/use-all-coins";

/* ────────────────────────────────────────────────────────────────────────────
 * Sector taxonomy — extends the bgSync coin universe with category metadata
 * ──────────────────────────────────────────────────────────────────────────── */

const COIN_SECTOR: Record<string, string> = {
  bitcoin: "Layer 1", ethereum: "Layer 1", solana: "Layer 1", binancecoin: "Layer 1",
  ripple: "Layer 1", cardano: "Layer 1", "avalanche-2": "Layer 1", polkadot: "Layer 1",
  near: "Layer 1", tron: "Layer 1", cosmos: "Layer 1", toncoin: "Layer 1",
  aptos: "Layer 1", sui: "Layer 1", algorand: "Layer 1", hedera: "Layer 1",
  arbitrum: "Layer 2", optimism: "Layer 2", "matic-network": "Layer 2",
  starknet: "Layer 2", mantle: "Layer 2", "immutable-x": "Layer 2", base: "Layer 2",
  blast: "Layer 2", "zksync-id": "Layer 2",
  uniswap: "DeFi", aave: "DeFi", chainlink: "DeFi", maker: "DeFi",
  "compound-governance-token": "DeFi", "curve-dao-token": "DeFi",
  "synthetix-network-token": "DeFi", "injective-protocol": "DeFi",
  gmx: "DeFi", pendle: "DeFi", dydx: "DeFi", balancer: "DeFi",
  "1inch": "DeFi", "pancakeswap-token": "DeFi", "jito-governance-token": "DeFi",
  ondo: "DeFi", lido: "DeFi", "ether-fi": "DeFi", "rocket-pool": "DeFi",
  dogecoin: "Meme", "shiba-inu": "Meme", pepe: "Meme", bonk: "Meme",
  floki: "Meme", dogwifhat: "Meme", "mog-coin": "Meme", brett: "Meme",
  "book-of-meme": "Meme", popcat: "Meme", "neiro-on-eth": "Meme", giga: "Meme",
  "render-token": "AI", "fetch-ai": "AI", singularitynet: "AI",
  "ocean-protocol": "AI", bittensor: "AI", "worldcoin-wld": "AI",
  "akash-network": "AI", "the-graph": "AI", "near-protocol": "AI",
  "ai16z": "AI", "virtuals-protocol": "AI", "ai-rig-complex": "AI",
  "the-sandbox": "Gaming", "axie-infinity": "Gaming", decentraland: "Gaming",
  gala: "Gaming", illuvium: "Gaming", ronin: "Gaming", "pixels": "Gaming",
  beam: "Gaming", "echelon-prime": "Gaming",
  "ondo-finance": "RWA", maple: "RWA", centrifuge: "RWA", "mantra-dao": "RWA",
  "pendle-finance": "RWA",
  helium: "DePIN", iotex: "DePIN", flux: "DePIN", hivemapper: "DePIN",
  "render-network": "DePIN", "filecoin": "DePIN",
  tether: "Stables", "usd-coin": "Stables", dai: "Stables",
  "binance-usd": "Stables", "true-usd": "Stables", "first-digital-usd": "Stables",
  "ethena-usde": "Stables", "frax": "Stables",
};

interface SectorMeta { color: string; glowColor: string; icon: typeof Layers; }
const SECTOR_META: Record<string, SectorMeta> = {
  "Layer 1": { color: "#26a69a", glowColor: "rgba(38,166,154,0.5)", icon: Layers },
  "Layer 2": { color: "#0ea5e9", glowColor: "rgba(14,165,233,0.5)", icon: Zap },
  "DeFi":    { color: "#7c3aed", glowColor: "rgba(124,58,237,0.5)", icon: DollarSign },
  "AI":      { color: "#a78bfa", glowColor: "rgba(167,139,250,0.5)", icon: Sparkles },
  "Meme":    { color: "#f59e0b", glowColor: "rgba(245,158,11,0.5)", icon: Flame },
  "Gaming":  { color: "#f97316", glowColor: "rgba(249,115,22,0.5)", icon: Activity },
  "RWA":     { color: "#10b981", glowColor: "rgba(16,185,129,0.5)", icon: BarChart3 },
  "DePIN":   { color: "#ec4899", glowColor: "rgba(236,72,153,0.5)", icon: Gauge },
  "Stables": { color: "#5a6072", glowColor: "rgba(90,96,114,0.3)", icon: Layers },
  "Other":   { color: "#4d7fff", glowColor: "rgba(77,127,255,0.4)", icon: LayoutGrid },
};

function sectorOf(coin: CoinMarket): string {
  return COIN_SECTOR[coin.id] ?? "Other";
}

/* ────────────────────────────────────────────────────────────────────────────
 * Modes & sizing
 * ──────────────────────────────────────────────────────────────────────────── */

type SizeMode  = "mcap" | "volume" | "volatility" | "ai_score" | "dominance" | "trending";
type ViewMode  = "1h" | "24h" | "7d";
type CountMode = 50 | 100 | 200 | 500;

const SIZE_MODES: { id: SizeMode; label: string; icon: typeof BarChart3 }[] = [
  { id: "mcap",       label: "Market Cap", icon: DollarSign },
  { id: "volume",     label: "Volume 24h", icon: BarChart3 },
  { id: "volatility", label: "Volatility", icon: Activity   },
  { id: "dominance",  label: "Dominance",  icon: Crosshair  },
  { id: "trending",   label: "Trending",   icon: Flame      },
  { id: "ai_score",   label: "AI Score",   icon: Sparkles   },
];

const SECTORS_ORDER = [
  "All", "Trending", "Smart Money", "Whale Activity",
  "Solana Eco", "Ethereum Eco",
  "Layer 1", "Layer 2", "DeFi", "AI",
  "Meme", "Gaming", "RWA", "DePIN", "Stables", "Other",
];

/* Ecosystem groupings (hand-curated, expandable) */
const SOLANA_ECO = new Set<string>([
  "solana", "jito-governance-token", "raydium", "bonk", "dogwifhat", "popcat",
  "book-of-meme", "jupiter-exchange-solana", "pyth-network", "render-token",
  "helium", "marinade", "tensor", "drift-protocol", "kamino", "io",
]);
const ETHEREUM_ECO = new Set<string>([
  "ethereum", "arbitrum", "optimism", "matic-network", "base", "blast",
  "starknet", "mantle", "lido", "uniswap", "aave", "chainlink", "maker",
  "ether-fi", "rocket-pool", "ondo", "pendle", "gmx", "dydx",
]);

/* ────────────────────────────────────────────────────────────────────────────
 * Treemap layout — squarified slice-and-dice
 * ──────────────────────────────────────────────────────────────────────────── */

interface TileIn  { id: string; value: number; coin: CoinMarket; pct: number; }
interface TileOut extends TileIn { x: number; y: number; w: number; h: number; }

function buildTreemap(items: TileIn[], x: number, y: number, w: number, h: number): TileOut[] {
  // Stop subdividing once the region is too small to be meaningful
  if (items.length === 0 || w < 2 || h < 2) return [];
  if (items.length === 1) return [{ ...items[0], x, y, w, h }];

  const total = items.reduce((s, it) => s + it.value, 0) || 1;
  let cumul = 0, splitIdx = 0;
  for (let i = 0; i < items.length; i++) {
    cumul += items[i].value;
    if (cumul >= total / 2) { splitIdx = i + 1; break; }
  }
  if (splitIdx === 0)              splitIdx = 1;
  if (splitIdx >= items.length)    splitIdx = items.length - 1;

  const first  = items.slice(0, splitIdx);
  const second = items.slice(splitIdx);
  const firstSum = first.reduce((s, it) => s + it.value, 0);
  // Clamp ratio to (0, 1) so neither partition is zero or larger than parent
  const ratio  = Math.max(0.02, Math.min(0.98, firstSum / total));

  if (w >= h) {
    const w1 = w * ratio;
    const w2 = w - w1;
    return [
      ...buildTreemap(first,  x,      y, w1, h),
      ...buildTreemap(second, x + w1, y, w2, h),
    ];
  }
  const h1 = h * ratio;
  const h2 = h - h1;
  return [
    ...buildTreemap(first,  x, y,      w, h1),
    ...buildTreemap(second, x, y + h1, w, h2),
  ];
}

/* ────────────────────────────────────────────────────────────────────────────
 * Color engine — intensity-scaled gradients with glow
 * ──────────────────────────────────────────────────────────────────────────── */

function tileVisuals(pct: number): { bg: string; glow: string; border: string; text: string } {
  const clamped = Math.max(-15, Math.min(15, pct));
  const I = Math.abs(clamped) / 15;

  if (clamped >= 0.3) {
    const r = Math.round(10 + 30 * I);
    const g = Math.round(50 + 130 * I);
    const b = Math.round(40 + 30 * I);
    return {
      bg: `linear-gradient(135deg, rgb(${Math.max(0,r-8)},${Math.max(0,g-15)},${Math.max(0,b-5)}) 0%, rgb(${Math.min(255,r+12)},${Math.min(255,g+25)},${Math.min(255,b+8)}) 100%)`,
      glow: I > 0.4 ? `0 0 ${Math.round(20 * I)}px rgba(38,166,154,${(0.25 + 0.25*I).toFixed(2)})` : "none",
      border: `rgba(38,166,154,${(0.15 + 0.35*I).toFixed(2)})`,
      text: "#a7f3d0",
    };
  } else if (clamped <= -0.3) {
    const r = Math.round(50 + 110 * I);
    const g = Math.round(14 + 6 * I);
    const b = Math.round(14 + 6 * I);
    return {
      bg: `linear-gradient(135deg, rgb(${Math.max(0,r-8)},${g},${b}) 0%, rgb(${Math.min(255,r+15)},${g+5},${b+5}) 100%)`,
      glow: I > 0.4 ? `0 0 ${Math.round(20 * I)}px rgba(239,83,80,${(0.25 + 0.25*I).toFixed(2)})` : "none",
      border: `rgba(239,83,80,${(0.15 + 0.35*I).toFixed(2)})`,
      text: "#fca5a5",
    };
  }
  return {
    bg: "linear-gradient(135deg, #161a26 0%, #1c2030 100%)",
    glow: "none",
    border: "rgba(255,255,255,0.05)",
    text: "#8892a4",
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Formatters
 * ──────────────────────────────────────────────────────────────────────────── */

function fmtPct(v: number): string { return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`; }
function fmtPrice(p: number): string {
  if (p >= 1000) return `$${p.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (p >= 1)    return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  if (p >= 0.0001) return `$${p.toFixed(6)}`;
  return `$${p.toExponential(2)}`;
}
function fmtBig(v: number): string {
  if (v >= 1e12) return `$${(v/1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v/1e9).toFixed(2)}B`;
  if (v >= 1e6)  return `$${(v/1e6).toFixed(2)}M`;
  if (v >= 1e3)  return `$${(v/1e3).toFixed(2)}K`;
  return `$${v.toFixed(0)}`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * AI score — deterministic synthesis from real market data
 * ──────────────────────────────────────────────────────────────────────────── */

function aiScore(c: CoinMarket): number {
  const vol = c.total_volume || 0;
  const mcap = c.market_cap || 1;
  const volRatio = Math.min(2, vol / mcap);
  const ch24 = c.price_change_percentage_24h || 0;
  const ch7d = c.price_change_percentage_7d_in_currency ?? ch24;
  // Score 0-100: blends momentum, volume/mcap ratio, and sustained trend
  const momentum = Math.max(-1, Math.min(1, (ch24 + ch7d / 2) / 20));
  const liquidity = Math.min(1, volRatio);
  return Math.round(50 + 35 * momentum + 15 * liquidity);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Mini sparkline (inline SVG, GPU-friendly)
 * ──────────────────────────────────────────────────────────────────────────── */

function Sparkline({ points, color, w, h }: { points: number[]; color: string; w: number; h: number }) {
  if (!points || points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(h - ((p - min) / range) * h).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="absolute bottom-1 right-1 opacity-70 pointer-events-none">
      <path d={path} fill="none" stroke={color} strokeWidth={1.2} />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Tile
 * ──────────────────────────────────────────────────────────────────────────── */

const Tile = React.memo(function Tile({
  tile, onHover, onClick,
}: {
  tile: TileOut;
  onHover: (t: TileOut | null, x: number, y: number) => void;
  onClick: (c: CoinMarket) => void;
}) {
  const { coin, x, y, w, h, pct } = tile;
  const vis = tileVisuals(pct);
  const ai = aiScore(coin);
  const isExtreme = Math.abs(pct) >= 8;

  const area = w * h;
  const showFull   = area > 7000;
  const showMid    = area > 3000;
  const showSym    = area > 1200;
  const showAIChip = area > 9500;

  const fontSym  = Math.max(10, Math.min(22, Math.sqrt(area) / 8));
  const fontPct  = Math.max(8,  Math.min(15, Math.sqrt(area) / 11));
  const fontName = Math.max(7,  Math.min(11, Math.sqrt(area) / 16));

  const sparkColor = pct >= 0 ? "#26a69a" : "#ef5350";
  const sparkW = Math.min(w - 8, 60);
  const sparkH = Math.min(h - 30, 22);

  return (
    <motion.div
      layout
      initial={false}
      animate={isExtreme && showSym ? {
        x, y, width: w, height: h,
        boxShadow: [
          vis.glow || `0 0 0px ${pct >= 0 ? "rgba(38,166,154,0)" : "rgba(239,83,80,0)"}`,
          `0 0 ${Math.min(40, Math.abs(pct) * 2)}px ${pct >= 0 ? "rgba(38,166,154,0.55)" : "rgba(239,83,80,0.55)"}`,
          vis.glow || `0 0 0px ${pct >= 0 ? "rgba(38,166,154,0)" : "rgba(239,83,80,0)"}`,
        ],
      } : { x, y, width: w, height: h }}
      transition={isExtreme && showSym
        ? { x: { type: "spring", stiffness: 180, damping: 26 }, y: { type: "spring", stiffness: 180, damping: 26 }, width: { type: "spring", stiffness: 180, damping: 26 }, height: { type: "spring", stiffness: 180, damping: 26 }, boxShadow: { duration: 1.8, repeat: Infinity, ease: "easeInOut" } }
        : { type: "spring", stiffness: 180, damping: 26, mass: 0.7 }}
      className="absolute cursor-pointer overflow-hidden"
      style={{
        background: vis.bg,
        border: `1px solid ${vis.border}`,
        borderRadius: Math.min(8, Math.max(3, Math.sqrt(area) / 22)),
        boxShadow: vis.glow,
        padding: showFull ? 8 : showMid ? 5 : 3,
        willChange: "transform",
      }}
      whileHover={{ scale: 1.025, zIndex: 20, boxShadow: `${vis.glow}, 0 8px 24px rgba(0,0,0,0.5)` }}
      onMouseEnter={(e) => onHover(tile, e.clientX, e.clientY)}
      onMouseMove={(e) => onHover(tile, e.clientX, e.clientY)}
      onMouseLeave={() => onHover(null, 0, 0)}
      onClick={() => onClick(coin)}
      data-testid={`tile-${coin.symbol}`}
    >
      {/* Glass overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.08) 100%)" }} />

      {/* AI sentiment chip — top right on large tiles */}
      {showAIChip && (
        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md pointer-events-none flex items-center gap-0.5"
          style={{
            background: ai >= 70 ? "rgba(38,166,154,0.22)" : ai >= 40 ? "rgba(255,255,255,0.06)" : "rgba(239,83,80,0.22)",
            border: `1px solid ${ai >= 70 ? "rgba(38,166,154,0.45)" : ai >= 40 ? "rgba(255,255,255,0.12)" : "rgba(239,83,80,0.45)"}`,
            backdropFilter: "blur(6px)",
          }}>
          <Brain size={8} style={{ color: ai >= 70 ? "#26a69a" : ai >= 40 ? "#a78bfa" : "#ef5350" }} />
          <span className="font-mono font-black text-[9px]"
            style={{ color: ai >= 70 ? "#26a69a" : ai >= 40 ? "#a78bfa" : "#ef5350" }}>
            {ai}
          </span>
        </div>
      )}

      {showSym && (
        <div className="relative flex items-start justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {showFull && coin.image && (
              <img src={coin.image} alt="" className="rounded-full flex-shrink-0"
                width={Math.min(18, Math.sqrt(area)/10)} height={Math.min(18, Math.sqrt(area)/10)}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                loading="lazy" />
            )}
            <div className="font-black text-white truncate leading-none tracking-tight"
              style={{ fontSize: fontSym, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
              {coin.symbol.toUpperCase()}
            </div>
          </div>
        </div>
      )}

      {showMid && (
        <div className="relative mt-1">
          <div className="font-mono font-black leading-tight" style={{ fontSize: fontPct, color: vis.text }}>
            {fmtPct(pct)}
          </div>
          {showFull && (
            <div className="font-mono mt-0.5 truncate text-white/80" style={{ fontSize: fontName }}>
              {fmtPrice(coin.current_price)}
            </div>
          )}
        </div>
      )}

      {showFull && coin.sparkline_in_7d?.price && sparkW > 20 && sparkH > 10 && (
        <Sparkline points={coin.sparkline_in_7d.price.slice(-30)} color={sparkColor} w={sparkW} h={sparkH} />
      )}
    </motion.div>
  );
});

/* ────────────────────────────────────────────────────────────────────────────
 * Hover tooltip
 * ──────────────────────────────────────────────────────────────────────────── */

function HoverCard({ tile, x, y, viewportW, viewportH }: { tile: TileOut; x: number; y: number; viewportW: number; viewportH: number }) {
  const { coin, pct } = tile;
  const sector = sectorOf(coin);
  const sm = SECTOR_META[sector];
  const ai = aiScore(coin);
  const sparkPts = coin.sparkline_in_7d?.price?.slice(-48) ?? [];
  const sparkColor = pct >= 0 ? "#26a69a" : "#ef5350";

  const TIP_W = 280, TIP_H = 310, PAD = 8;
  // Clamp horizontally: flip to the left if too close to right edge, but never go off-left
  const rawLeft = x > viewportW - TIP_W - 20 ? x - TIP_W - 10 : x + 14;
  const left    = Math.max(PAD, Math.min(rawLeft, viewportW - TIP_W - PAD));
  // Clamp vertically: keep tooltip within viewport top/bottom
  const top     = Math.max(PAD, Math.min(y - 20, viewportH - TIP_H - PAD));

  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.12 }}
      className="fixed pointer-events-none z-50 rounded-xl p-3 w-[280px] backdrop-blur-xl"
      style={{
        left,
        top,
        background: "rgba(8,12,22,0.92)",
        border: "1px solid rgba(77,127,255,0.25)",
        boxShadow: "0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
      }}
    >
      <div className="flex items-center gap-2 mb-2.5 pb-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {coin.image && <img src={coin.image} alt="" className="w-7 h-7 rounded-full" />}
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-black text-white truncate">{coin.symbol.toUpperCase()}</div>
          <div className="text-[9px] truncate" style={{ color: "#5a6072" }}>{coin.name}</div>
        </div>
        <div className="text-right">
          <div className="font-mono font-black text-[12px]" style={{ color: pct >= 0 ? "#26a69a" : "#ef5350" }}>
            {fmtPct(pct)}
          </div>
        </div>
      </div>
      {/* Mini chart preview */}
      {sparkPts.length >= 2 && (
        <div className="mb-2 rounded-lg overflow-hidden relative"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <Sparkline points={sparkPts} color={sparkColor} w={256} h={56} />
          <div className="absolute top-1 left-1.5 text-[8px] font-black uppercase tracking-widest"
            style={{ color: "#5a6072" }}>7D</div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
        <Row k="Price"  v={fmtPrice(coin.current_price)} />
        <Row k="Rank"   v={`#${coin.market_cap_rank ?? "—"}`} />
        <Row k="Mcap"   v={fmtBig(coin.market_cap)} />
        <Row k="Vol"    v={fmtBig(coin.total_volume)} />
        <Row k="1h"     v={fmtPct(coin.price_change_percentage_1h_in_currency ?? 0)} mono />
        <Row k="24h"    v={fmtPct(coin.price_change_percentage_24h ?? 0)} mono />
        <Row k="7d"     v={fmtPct(coin.price_change_percentage_7d_in_currency ?? 0)} mono />
        <Row k="V/M"    v={`${((coin.total_volume / Math.max(1, coin.market_cap)) * 100).toFixed(1)}%`} mono />
      </div>
      <div className="mt-2.5 pt-2 border-t flex items-center justify-between"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{ background: `${sm.color}22`, color: sm.color, border: `1px solid ${sm.color}33` }}>
          {sector}
        </span>
        <span className="text-[9px] font-bold" style={{ color: ai >= 70 ? "#26a69a" : ai >= 40 ? "#8892a4" : "#ef5350" }}>
          AI {ai}
        </span>
      </div>
    </motion.div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span style={{ color: "#5a6072" }}>{k}</span>
      <span className={`font-bold text-white/90 ${mono ? "font-mono" : ""}`}>{v}</span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Main Heatmap Component
 * ──────────────────────────────────────────────────────────────────────────── */

export default function Heatmap() {
  const [, setLocation] = useLocation();
  const { coins, progress, lastRefreshedAt } = useAllCoins();

  const [sizeMode,    setSizeMode]    = useState<SizeMode>("mcap");
  const [viewMode,    setViewMode]    = useState<ViewMode>("24h");
  const [sector,      setSector]      = useState<string>("All");
  const [countMode,   setCountMode]   = useState<CountMode>(200);
  const [hover, setHover] = useState<{ tile: TileOut; x: number; y: number } | null>(null);
  const hoverRafRef = useRef<number | null>(null);
  const pendingHoverRef = useRef<{ tile: TileOut; x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportH, setViewportH] = useState(typeof window !== "undefined" ? window.innerHeight : 800);
  const [viewportW, setViewportW] = useState(typeof window !== "undefined" ? window.innerWidth  : 1200);
  useEffect(() => {
    const onResize = () => { setViewportW(window.innerWidth); setViewportH(window.innerHeight); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const [{ w: cW, h: cH }, setSize] = useState({ w: 1200, h: 720 });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: Math.max(560, e.contentRect.height) }));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  /* ── Resolve change % for the active time view ──────────────────────────── */
  const pctOf = (c: CoinMarket): number => {
    if (viewMode === "1h") return c.price_change_percentage_1h_in_currency ?? 0;
    if (viewMode === "7d") return c.price_change_percentage_7d_in_currency ?? 0;
    return c.price_change_percentage_24h ?? 0;
  };

  /* ── Filtered universe ──────────────────────────────────────────────────── */
  const universe = useMemo<CoinMarket[]>(() => {
    if (!coins.length) return [];
    let pool = coins.filter(c => c.market_cap > 0);
    const totalMcapAll = coins.reduce((s, c) => s + (c.market_cap || 0), 0) || 1;

    if (sector === "Trending") {
      pool = [...pool].sort((a, b) =>
        Math.abs(b.price_change_percentage_24h ?? 0) - Math.abs(a.price_change_percentage_24h ?? 0)
      );
    } else if (sector === "Smart Money") {
      pool = [...pool].filter(c => aiScore(c) >= 65).sort((a, b) => aiScore(b) - aiScore(a));
    } else if (sector === "Whale Activity") {
      pool = [...pool].sort((a, b) => {
        const ra = (a.total_volume || 0) / Math.max(1, a.market_cap || 1);
        const rb = (b.total_volume || 0) / Math.max(1, b.market_cap || 1);
        return rb - ra;
      });
    } else if (sector === "Solana Eco") {
      pool = pool.filter(c => SOLANA_ECO.has(c.id));
    } else if (sector === "Ethereum Eco") {
      pool = pool.filter(c => ETHEREUM_ECO.has(c.id));
    } else if (sector !== "All") {
      pool = pool.filter(c => sectorOf(c) === sector);
    }

    return pool.slice(0, countMode);
    // totalMcapAll captured in dep below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coins, sector, countMode]);

  const totalMcapAll = useMemo(() => coins.reduce((s, c) => s + (c.market_cap || 0), 0) || 1, [coins]);

  /* ── Treemap input by sizing mode ───────────────────────────────────────── */
  const treemap = useMemo<TileOut[]>(() => {
    if (universe.length === 0 || cW < 100 || cH < 100) return [];

    const items: TileIn[] = universe.map(c => {
      let v = 0;
      if (sizeMode === "mcap")          v = c.market_cap;
      else if (sizeMode === "volume")   v = c.total_volume;
      else if (sizeMode === "volatility") v = Math.abs(c.price_change_percentage_24h ?? 0) * (c.market_cap || 1) / 1e8;
      else if (sizeMode === "dominance") v = (c.market_cap / totalMcapAll) * 1e9;
      else if (sizeMode === "trending") v = Math.abs(c.price_change_percentage_24h ?? 0) * Math.sqrt(c.market_cap || 1);
      else if (sizeMode === "ai_score") v = aiScore(c) * Math.sqrt(c.market_cap || 1);
      return { id: c.id, value: Math.max(1, v), coin: c, pct: pctOf(c) };
    });

    // Sort largest first for stable squarified layout
    items.sort((a, b) => b.value - a.value);
    return buildTreemap(items, 0, 0, cW, cH);
  }, [universe, sizeMode, viewMode, cW, cH, totalMcapAll]);

  /* ── Top analytics ──────────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    if (coins.length === 0) {
      return { totalMcap: 0, totalVol: 0, gainers: 0, losers: 0, btcDom: 0, topSector: "—" as string, topSectorPct: 0 };
    }
    const totalMcap = coins.reduce((s, c) => s + (c.market_cap || 0), 0);
    const totalVol  = coins.reduce((s, c) => s + (c.total_volume || 0), 0);
    const btcMcap   = coins.find(c => c.id === "bitcoin")?.market_cap ?? 0;
    const btcDom    = totalMcap > 0 ? (btcMcap / totalMcap) * 100 : 0;

    const top500 = coins.slice(0, 500);
    const gainers = top500.filter(c => (c.price_change_percentage_24h ?? 0) > 0).length;
    const losers  = top500.filter(c => (c.price_change_percentage_24h ?? 0) < 0).length;

    // Strongest sector by avg 24h pct
    const sectorScores = new Map<string, { sum: number; n: number }>();
    for (const c of top500) {
      const s = sectorOf(c);
      if (s === "Other" || s === "Stables") continue;
      const cur = sectorScores.get(s) ?? { sum: 0, n: 0 };
      cur.sum += c.price_change_percentage_24h ?? 0; cur.n++;
      sectorScores.set(s, cur);
    }
    let topSector = "—", topSectorPct = -Infinity;
    sectorScores.forEach((v, k) => {
      const avg = v.sum / v.n;
      if (avg > topSectorPct) { topSectorPct = avg; topSector = k; }
    });

    return { totalMcap, totalVol, gainers, losers, btcDom, topSector, topSectorPct: topSectorPct === -Infinity ? 0 : topSectorPct };
  }, [coins]);

  // rAF-throttled hover — coalesces 60+ pointer events into one render per frame
  const onHover = useCallback((t: TileOut | null, x: number, y: number) => {
    if (!t) {
      pendingHoverRef.current = null;
      if (hoverRafRef.current != null) { cancelAnimationFrame(hoverRafRef.current); hoverRafRef.current = null; }
      setHover(null);
      return;
    }
    pendingHoverRef.current = { tile: t, x, y };
    if (hoverRafRef.current != null) return;
    hoverRafRef.current = requestAnimationFrame(() => {
      hoverRafRef.current = null;
      const p = pendingHoverRef.current;
      if (p) setHover(p);
    });
  }, []);
  useEffect(() => () => {
    if (hoverRafRef.current != null) cancelAnimationFrame(hoverRafRef.current);
  }, []);

  /* ── Zoom & pan ─────────────────────────────────────────────────────────── */
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const pinchRef = useRef<{ initialDist: number; initialZoom: number } | null>(null);

  const clampZoom = (z: number) => Math.max(1, Math.min(6, z));
  const resetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 4) return;
    e.preventDefault();
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    setZoom(prev => {
      const next = clampZoom(prev * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
      if (next === prev) return prev;
      // Zoom around cursor: keep the world point under cursor fixed
      setPan(p => {
        const worldX = (cx - p.x) / prev;
        const worldY = (cy - p.y) / prev;
        return { x: cx - worldX * next, y: cy - worldY * next };
      });
      return next;
    });
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 1 && !e.shiftKey && !e.altKey) return; // middle / shift / alt
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const onMouseMoveCanvas = useCallback((e: React.MouseEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setPan({ x: d.panX + (e.clientX - d.startX), y: d.panY + (e.clientY - d.startY) });
  }, []);

  const onMouseUpCanvas = useCallback(() => { dragRef.current = null; }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchRef.current = { initialDist: d, initialZoom: zoom };
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      dragRef.current = { startX: t.clientX, startY: t.clientY, panX: pan.x, panY: pan.y };
    }
  }, [pan, zoom]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      setZoom(clampZoom(pinchRef.current.initialZoom * (d / pinchRef.current.initialDist)));
    } else if (e.touches.length === 1 && dragRef.current && zoom > 1) {
      const t = e.touches[0];
      const d = dragRef.current;
      setPan({ x: d.panX + (t.clientX - d.startX), y: d.panY + (t.clientY - d.startY) });
    }
  }, [zoom]);

  const onTouchEnd = useCallback(() => { dragRef.current = null; pinchRef.current = null; }, []);

  const onClick = useCallback((c: CoinMarket) => {
    setLocation(`/coin/${c.id}`);
  }, [setLocation]);

  const liveDot = lastRefreshedAt && Date.now() - lastRefreshedAt < 60_000;

  return (
    <div className="min-h-screen text-white" style={{ background: "#070a12" }}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #2962ff, #4d7fff)", boxShadow: "0 4px 16px rgba(77,127,255,0.3)" }}>
                <LayoutGrid size={15} className="text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Market Heatmap</h1>
              <span className="px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase"
                style={{ background: "rgba(77,127,255,0.15)", color: "#4d7fff", border: "1px solid rgba(77,127,255,0.3)" }}>
                Institutional
              </span>
            </div>
            <p className="text-[12px] font-medium" style={{ color: "#5a6072" }}>
              {coins.length.toLocaleString()} coins indexed · {universe.length} on canvas · auto-refresh 30s
            </p>
          </div>
          <div className="flex items-center gap-2">
            {progress.totalCoins > 0 && progress.pagesLoaded < progress.totalPages && (
              <div className="text-[10px] font-mono" style={{ color: "#5a6072" }}>
                Syncing {progress.totalCoins.toLocaleString()} / {(progress.totalPages * 250).toLocaleString()}
              </div>
            )}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
              style={{ background: "rgba(13,17,26,0.6)", border: "1px solid rgba(38,166,154,0.25)" }}>
              <span className={`w-1.5 h-1.5 rounded-full ${liveDot ? "animate-pulse" : ""}`}
                style={{ background: liveDot ? "#26a69a" : "#5a6072" }} />
              <span className="text-[10px] font-black tracking-wider uppercase" style={{ color: liveDot ? "#26a69a" : "#5a6072" }}>
                {liveDot ? "Live" : "Stale"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Top analytics strip ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
          <StatCard k="Market Cap" v={fmtBig(stats.totalMcap)} accent="#4d7fff" />
          <StatCard k="Volume 24h" v={fmtBig(stats.totalVol)} accent="#a78bfa" />
          <StatCard k="Gainers"    v={`${stats.gainers}`} sub="top 500" accent="#26a69a" />
          <StatCard k="Losers"     v={`${stats.losers}`}  sub="top 500" accent="#ef5350" />
          <StatCard k="BTC Dom"    v={`${stats.btcDom.toFixed(1)}%`} accent="#f7931a" />
          <StatCard k="Hot Sector" v={stats.topSector}
            sub={stats.topSectorPct ? `${fmtPct(stats.topSectorPct)} avg` : undefined}
            accent={SECTOR_META[stats.topSector]?.color ?? "#4d7fff"} />
        </div>

        {/* ── Control bar ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl p-3 mb-3"
          style={{ background: "rgba(13,17,26,0.6)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}>
          <div className="flex flex-wrap items-center gap-3">
            {/* Size mode */}
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-black tracking-widest uppercase mr-1" style={{ color: "#5a6072" }}>Size</span>
              {SIZE_MODES.map(sm => {
                const Icon = sm.icon;
                const active = sizeMode === sm.id;
                return (
                  <button key={sm.id} onClick={() => setSizeMode(sm.id)}
                    data-testid={`size-${sm.id}`}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                    style={{
                      background: active ? "rgba(77,127,255,0.18)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${active ? "rgba(77,127,255,0.45)" : "rgba(255,255,255,0.05)"}`,
                      color: active ? "#4d7fff" : "#8892a4",
                    }}>
                    <Icon size={11} /> {sm.label}
                  </button>
                );
              })}
            </div>

            <div className="w-px h-6" style={{ background: "rgba(255,255,255,0.06)" }} />

            {/* View mode */}
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-black tracking-widest uppercase mr-1" style={{ color: "#5a6072" }}>Window</span>
              {(["1h", "24h", "7d"] as ViewMode[]).map(v => {
                const active = viewMode === v;
                return (
                  <button key={v} onClick={() => setViewMode(v)}
                    data-testid={`view-${v}`}
                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all"
                    style={{
                      background: active ? "rgba(38,166,154,0.18)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${active ? "rgba(38,166,154,0.45)" : "rgba(255,255,255,0.05)"}`,
                      color: active ? "#26a69a" : "#8892a4",
                    }}>
                    {v.toUpperCase()}
                  </button>
                );
              })}
            </div>

            <div className="w-px h-6" style={{ background: "rgba(255,255,255,0.06)" }} />

            {/* Count */}
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-[9px] font-black tracking-widest uppercase mr-1" style={{ color: "#5a6072" }}>Coins</span>
              {([50, 100, 200, 500] as CountMode[]).map(n => {
                const active = countMode === n;
                return (
                  <button key={n} onClick={() => setCountMode(n)}
                    data-testid={`count-${n}`}
                    className="px-2 py-1.5 rounded-lg text-[10px] font-black font-mono transition-all"
                    style={{
                      background: active ? "rgba(167,139,250,0.18)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${active ? "rgba(167,139,250,0.45)" : "rgba(255,255,255,0.05)"}`,
                      color: active ? "#a78bfa" : "#8892a4",
                    }}>
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sector pills */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <span className="text-[9px] font-black tracking-widest uppercase mr-1" style={{ color: "#5a6072" }}>Sector</span>
            {SECTORS_ORDER.map(s => {
              const meta = s === "All" || s === "Trending" ? null : SECTOR_META[s];
              const accent = s === "Trending" ? "#f59e0b" : meta?.color ?? "#4d7fff";
              const active = sector === s;
              const Icon = s === "Trending" ? Flame : meta?.icon;
              return (
                <button key={s} onClick={() => setSector(s)}
                  data-testid={`sector-${s}`}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all"
                  style={{
                    background: active ? `${accent}22` : "rgba(255,255,255,0.02)",
                    border: `1px solid ${active ? `${accent}66` : "rgba(255,255,255,0.05)"}`,
                    color: active ? accent : "#8892a4",
                  }}>
                  {Icon && <Icon size={10} />} {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Heatmap canvas ──────────────────────────────────────────────── */}
        <div
          ref={containerRef}
          className="relative rounded-2xl overflow-hidden"
          style={{
            width: "100%",
            height: "min(78vh, 820px)",
            background: "linear-gradient(180deg, #0a0e18 0%, #050810 100%)",
            border: "1px solid rgba(255,255,255,0.05)",
            boxShadow: "inset 0 0 40px rgba(0,0,0,0.5)",
          }}
        >
          {treemap.length === 0 && coins.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                <Activity size={28} className="text-[#4d7fff]" />
              </motion.div>
              <p className="text-[12px] font-bold" style={{ color: "#5a6072" }}>Loading market data…</p>
            </div>
          )}
          {treemap.length === 0 && coins.length > 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <TrendingDown size={28} className="text-[#5a6072]" />
              <p className="text-[12px] font-bold" style={{ color: "#5a6072" }}>
                No coins match this sector yet
              </p>
            </div>
          )}

          {treemap.map(t => (
            <Tile key={t.id} tile={t} onHover={onHover} onClick={onClick} />
          ))}
        </div>

        {/* ── Legend / AI overlay ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <InfoCard title="Color Engine" icon={Activity}>
            <div className="flex items-center gap-1.5">
              {[-10, -5, -1, 0, 1, 5, 10].map(p => {
                const v = tileVisuals(p);
                return <div key={p} className="flex-1 h-5 rounded" style={{ background: v.bg, border: `1px solid ${v.border}` }} />;
              })}
            </div>
            <div className="flex items-center justify-between text-[9px] font-mono mt-1" style={{ color: "#5a6072" }}>
              <span>-10%</span><span>0%</span><span>+10%</span>
            </div>
          </InfoCard>

          <InfoCard title="Sector Strength" icon={Layers}>
            <div className="space-y-1">
              {Object.entries(SECTOR_META).slice(0, 5).map(([name, meta]) => {
                const Icon = meta.icon;
                return (
                  <div key={name} className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="flex items-center gap-1.5" style={{ color: meta.color }}>
                      <Icon size={10} /> <span className="font-bold">{name}</span>
                    </span>
                    <span className="font-mono font-bold" style={{ color: "#8892a4" }}>
                      {coins.filter(c => sectorOf(c) === name).length}
                    </span>
                  </div>
                );
              })}
            </div>
          </InfoCard>

          <InfoCard title="AI Signals" icon={Sparkles}>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex items-center justify-between">
                <span style={{ color: "#5a6072" }}>Hottest sector</span>
                <span className="font-black" style={{ color: SECTOR_META[stats.topSector]?.color ?? "#fff" }}>
                  {stats.topSector} {fmtPct(stats.topSectorPct)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: "#5a6072" }}>Market breadth</span>
                <span className="font-black font-mono" style={{ color: stats.gainers > stats.losers ? "#26a69a" : "#ef5350" }}>
                  {stats.gainers + stats.losers > 0 ? `${Math.round((stats.gainers / (stats.gainers + stats.losers)) * 100)}%` : "—"} bull
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: "#5a6072" }}>Smart money</span>
                <span className="font-black" style={{ color: stats.btcDom > 55 ? "#f7931a" : "#a78bfa" }}>
                  {stats.btcDom > 55 ? "BTC-led" : "Alt rotation"}
                </span>
              </div>
            </div>
          </InfoCard>
        </div>
      </div>

      {/* ── Hover card (portal-style fixed positioning) ──────────────────── */}
      <AnimatePresence>
        {hover && <HoverCard tile={hover.tile} x={hover.x} y={hover.y} viewportW={viewportW} viewportH={viewportH} />}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Sub-components
 * ──────────────────────────────────────────────────────────────────────────── */

function StatCard({ k, v, sub, accent }: { k: string; v: string; sub?: string; accent: string }) {
  return (
    <div className="rounded-xl px-3 py-2.5 relative overflow-hidden"
      style={{
        background: "rgba(13,17,26,0.7)",
        border: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(8px)",
      }}>
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      <div className="text-[9px] font-black tracking-widest uppercase mb-1" style={{ color: "#5a6072" }}>{k}</div>
      <div className="font-black text-[15px] truncate" style={{ color: accent }}>{v}</div>
      {sub && <div className="text-[9px] font-mono mt-0.5" style={{ color: "#5a6072" }}>{sub}</div>}
    </div>
  );
}

function InfoCard({ title, icon: Icon, children }: { title: string; icon: typeof Activity; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-3"
      style={{ background: "rgba(13,17,26,0.6)", border: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(8px)" }}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={11} className="text-[#4d7fff]" />
        <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: "#8892a4" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}
