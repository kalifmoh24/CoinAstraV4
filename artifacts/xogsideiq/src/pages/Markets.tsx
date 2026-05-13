import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Search, RefreshCw, ArrowUp, ArrowDown, ArrowUpDown,
  ChevronLeft, ChevronRight, Star, Globe, BarChart2,
  Activity, List, LayoutGrid, TrendingUp, Zap, Flame,
  LayoutDashboard, Compass, BookOpen, Briefcase, Bell, X,
  DollarSign, Percent, AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  sparkline_in_7d?: { price: number[] };
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
}

interface GlobalData {
  active_cryptocurrencies: number;
  total_market_cap: { usd: number };
  total_volume: { usd: number };
  market_cap_percentage: { btc: number; eth: number };
  market_cap_change_percentage_24h_usd: number;
  markets: number;
}

type SortKey = "rank" | "price" | "ch1h" | "ch24h" | "ch7d" | "mcap" | "vol";
type SortDir = "asc" | "desc";
type ViewMode = "table" | "cards";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: Record<string, string[]> = {
  All: [],
  DeFi: [
    "uniswap", "aave", "maker", "compound-coin", "curve-dao-token",
    "synthetix", "yearn-finance", "sushi", "balancer", "1inch",
    "pancakeswap-token", "convex-finance", "lido-dao", "frax-share",
  ],
  "Layer 1": [
    "bitcoin", "ethereum", "solana", "avalanche-2", "cardano", "polkadot",
    "cosmos", "near", "algorand", "tron", "fantom", "aptos", "sui",
  ],
  "Layer 2": [
    "matic-network", "arbitrum", "optimism", "loopring", "metis-token",
    "immutable-x", "base", "zksync", "starknet",
  ],
  Meme: [
    "dogecoin", "shiba-inu", "pepe", "floki", "bonk",
    "baby-doge-coin", "dogelon-mars", "kishu-inu",
  ],
  AI: [
    "fetch-ai", "singularitynet", "ocean-protocol", "render-token",
    "worldcoin-wld", "bittensor", "akash-network", "cortex",
  ],
  Gaming: [
    "axie-infinity", "the-sandbox", "decentraland", "gala", "illuvium",
    "immutable-x", "gods-unchained", "alien-worlds",
  ],
  Stablecoins: [
    "tether", "usd-coin", "binance-usd", "dai", "true-usd",
    "frax", "usdd", "pax-dollar",
  ],
};

const NAV = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/markets", label: "Markets", icon: BarChart2 },
  { path: "/research", label: "Research", icon: Compass },
  { path: "/narratives", label: "Narratives", icon: BookOpen },
  { path: "/signals", label: "Signals", icon: TrendingUp },
  { path: "/portfolio", label: "Portfolio", icon: Briefcase },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(n: number): string {
  if (!n) return "$0.00";
  if (n >= 1000) return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 1) return "$" + n.toFixed(4);
  if (n >= 0.01) return "$" + n.toFixed(6);
  return "$" + n.toPrecision(4);
}

function fmtLarge(n: number): string {
  if (!n) return "$—";
  if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  return "$" + n.toLocaleString("en-US");
}

function fmtSupply(n: number, sym: string): string {
  if (!n) return "—";
  const s = sym.toUpperCase();
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "T " + s;
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B " + s;
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M " + s;
  return n.toLocaleString("en-US") + " " + s;
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchMarkets(page: number): Promise<CoinMarket[]> {
  const url = [
    "https://api.coingecko.com/api/v3/coins/markets",
    `?vs_currency=usd`,
    `&order=market_cap_desc`,
    `&per_page=100`,
    `&page=${page}`,
    `&sparkline=true`,
    `&price_change_percentage=1h,7d`,
  ].join("");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  return res.json();
}

async function fetchGlobal(): Promise<{ data: GlobalData }> {
  const res = await fetch("https://api.coingecko.com/api/v3/global");
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  return res.json();
}

// ─── MiniSparkline ────────────────────────────────────────────────────────────

function MiniSparkline({ prices, isPos, id }: { prices: number[]; isPos: boolean; id: string }) {
  if (!prices || prices.length < 4) {
    return <div className="w-20 h-8 rounded" style={{ background: "rgba(255,255,255,0.04)" }} />;
  }
  const step = Math.max(1, Math.floor(prices.length / 24));
  const pts = prices.filter((_, i) => i % step === 0).slice(-24);
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const W = 80, H = 32;
  const coords = pts.map((p, i) => [
    (i / (pts.length - 1)) * W,
    H - 2 - ((p - min) / range) * (H - 4),
  ]);
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`).join(" ");
  const area = line + ` L ${W} ${H} L 0 ${H} Z`;
  const color = isPos ? "#26a69a" : "#ef5350";
  const gid = `spk_${id}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-20 h-8" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── ChangeCell ───────────────────────────────────────────────────────────────

function ChangeCell({ v, badge }: { v?: number | null; badge?: boolean }) {
  if (v === undefined || v === null) {
    return <span className="text-[10px] text-[#787b86]">—</span>;
  }
  const isPos = v >= 0;
  const color = isPos ? "#26a69a" : "#ef5350";
  const bg = isPos ? "rgba(38,166,154,0.1)" : "rgba(239,83,80,0.1)";
  return badge ? (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums"
      style={{ color, background: bg, border: `1px solid ${color}30` }}
    >
      {isPos ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
      {Math.abs(v).toFixed(2)}%
    </span>
  ) : (
    <span className="text-[10px] font-semibold tabular-nums" style={{ color }}>
      {isPos ? "+" : ""}{v.toFixed(2)}%
    </span>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color, icon: Icon,
}: { label: string; value: string; sub?: string; color: string; icon: React.ElementType }) {
  const subColor = sub?.startsWith("+") ? "#26a69a" : sub?.startsWith("-") ? "#ef5350" : "#787b86";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 min-w-[150px] rounded-2xl p-4 relative overflow-hidden"
      style={{
        background: "rgba(13,17,26,0.85)",
        backdropFilter: "blur(24px)",
        border: `1px solid ${color}22`,
        boxShadow: `0 0 24px ${color}12, inset 0 1px 0 rgba(255,255,255,0.04)`,
      }}
    >
      <div
        className="absolute top-0 inset-x-0 h-px rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, transparent 0%, ${color}aa 50%, transparent 100%)` }}
      />
      <div
        className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-20 blur-xl"
        style={{ background: color }}
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[9px] font-bold text-[#787b86] uppercase tracking-widest">{label}</span>
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{ background: `${color}18`, border: `1px solid ${color}30` }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color }} />
          </div>
        </div>
        <div className="text-xl font-black text-white font-mono tabular-nums tracking-tight">{value}</div>
        {sub && <div className="text-[9px] mt-1 font-semibold" style={{ color: subColor }}>{sub}</div>}
      </div>
    </motion.div>
  );
}

// ─── SkeletonRows ─────────────────────────────────────────────────────────────

function SkeletonRow({ i }: { i: number }) {
  return (
    <tr
      className="border-b animate-pulse"
      style={{ borderColor: "rgba(255,255,255,0.04)", animationDelay: `${i * 40}ms` }}
    >
      {[12, 8, 140, 80, 60, 60, 60, 90, 90, 100, 80].map((w, j) => (
        <td key={j} className="px-3 py-3.5">
          <div className="h-3 rounded-md" style={{ width: w, background: "rgba(255,255,255,0.06)" }} />
        </td>
      ))}
    </tr>
  );
}

// ─── SortTH ──────────────────────────────────────────────────────────────────

function SortTH({
  label, sk, sortKey, sortDir, onSort, right,
}: {
  label: string;
  sk?: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  right?: boolean;
}) {
  const active = sk && sortKey === sk;
  return (
    <th
      onClick={sk ? () => onSort(sk) : undefined}
      className={`px-3 py-3 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap select-none ${right ? "text-right" : "text-left"} ${sk ? "cursor-pointer" : ""}`}
      style={{ color: active ? "#4d7fff" : "#5a6072" }}
    >
      <div className={`flex items-center gap-1 ${right ? "justify-end" : ""}`}>
        {label}
        {sk && (
          active
            ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-[#4d7fff]" /> : <ArrowDown className="h-3 w-3 text-[#4d7fff]" />)
            : <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </th>
  );
}

// ─── Markets Page ──────────────────────────────────────────────────────────────

export default function Markets() {
  const [location] = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [view, setView] = useState<ViewMode>("table");
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [countdown, setCountdown] = useState(30);

  // ── Data ───────────────────────────────────────────────────────────────────

  const {
    data: coins, isLoading, isError, error, dataUpdatedAt, refetch,
  } = useQuery({
    queryKey: ["cg-markets", page],
    queryFn: () => fetchMarkets(page),
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: 2,
  });

  const { data: globalRaw } = useQuery({
    queryKey: ["cg-global"],
    queryFn: fetchGlobal,
    refetchInterval: 60_000,
    staleTime: 55_000,
  });

  const g = globalRaw?.data;

  // ── Countdown ──────────────────────────────────────────────────────────────

  useEffect(() => {
    setCountdown(30);
    const t = setInterval(() => setCountdown(c => {
      if (c <= 1) { refetch(); return 30; }
      return c - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [dataUpdatedAt]);

  // ── Sort & filter ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!coins) return [];
    let list = [...coins];
    if (category !== "All") {
      const ids = CATEGORIES[category] ?? [];
      list = list.filter(c => ids.includes(c.id));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let av = 0, bv = 0;
      switch (sortKey) {
        case "rank": av = a.market_cap_rank; bv = b.market_cap_rank; break;
        case "price": av = a.current_price; bv = b.current_price; break;
        case "ch1h": av = a.price_change_percentage_1h_in_currency ?? 0; bv = b.price_change_percentage_1h_in_currency ?? 0; break;
        case "ch24h": av = a.price_change_percentage_24h; bv = b.price_change_percentage_24h; break;
        case "ch7d": av = a.price_change_percentage_7d_in_currency ?? 0; bv = b.price_change_percentage_7d_in_currency ?? 0; break;
        case "mcap": av = a.market_cap; bv = b.market_cap; break;
        case "vol": av = a.total_volume; bv = b.total_volume; break;
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return list;
  }, [coins, category, search, sortKey, sortDir]);

  const handleSort = useCallback((k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir(k === "rank" ? "asc" : "desc"); }
  }, [sortKey]);

  const handlePage = (p: number) => {
    setPage(p);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-US", { hour12: false })
    : "--:--:--";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "linear-gradient(150deg, #080c16 0%, #0d1117 60%, #080b13 100%)" }}>

      {/* ── Top Nav ─────────────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-4 h-11 shrink-0 z-50"
        style={{
          background: "rgba(8,12,22,0.9)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #2962ff 0%, #7c3aed 100%)", boxShadow: "0 0 12px rgba(41,98,255,0.4)" }}
            >
              <Activity className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-white font-black text-sm tracking-tight">XogsideIQ</span>
          </Link>
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV.map(item => {
              const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={{
                    color: isActive ? "#4d7fff" : "#5a6072",
                    background: isActive ? "rgba(41,98,255,0.12)" : "transparent",
                    boxShadow: isActive ? "0 0 14px rgba(41,98,255,0.18)" : "none",
                  }}
                >
                  <item.icon className="h-3 w-3" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold"
            style={{ background: "rgba(38,166,154,0.1)", color: "#26a69a", border: "1px solid rgba(38,166,154,0.2)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#26a69a] animate-pulse" />
            LIVE DATA
          </div>
          <button
            onClick={() => refetch()}
            title="Refresh"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/5"
            style={{ color: "#5a6072" }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <Bell className="h-4 w-4 cursor-pointer transition-colors" style={{ color: "#5a6072" }} />
        </div>
      </header>

      {/* ── Scrollable Body ──────────────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-[1700px] mx-auto px-4 md:px-6 py-6">

          {/* ── Hero ────────────────────────────────────────────────────────── */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1
                  className="text-2xl md:text-3xl font-black tracking-tight"
                  style={{
                    background: "linear-gradient(130deg, #ffffff 0%, #a8c0ff 55%, #2962ff 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Crypto Markets
                </h1>
                <div
                  className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest"
                  style={{ background: "rgba(41,98,255,0.15)", color: "#4d7fff", border: "1px solid rgba(41,98,255,0.3)" }}
                >
                  TOP 500
                </div>
              </div>
              <p className="text-[11px]" style={{ color: "#5a6072" }}>
                Real-time prices from CoinGecko &nbsp;·&nbsp; Updated <span className="font-mono text-[#787b86]">{lastUpdated}</span> UTC &nbsp;·&nbsp; Auto-refresh in{" "}
                <span
                  className="font-mono font-bold"
                  style={{ color: countdown <= 5 ? "#ef5350" : countdown <= 10 ? "#f7931a" : "#2962ff" }}
                >
                  {countdown}s
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {g && (
                <>
                  <div className="hidden lg:block text-right">
                    <div className="text-[9px] text-[#5a6072] uppercase tracking-wider">Total Mkt Cap</div>
                    <div className="text-[13px] font-black text-white font-mono">{fmtLarge(g.total_market_cap.usd)}</div>
                  </div>
                  <div
                    className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold"
                    style={{
                      background: g.market_cap_change_percentage_24h_usd >= 0 ? "rgba(38,166,154,0.1)" : "rgba(239,83,80,0.1)",
                      color: g.market_cap_change_percentage_24h_usd >= 0 ? "#26a69a" : "#ef5350",
                      border: `1px solid ${g.market_cap_change_percentage_24h_usd >= 0 ? "rgba(38,166,154,0.25)" : "rgba(239,83,80,0.25)"}`,
                    }}
                  >
                    {g.market_cap_change_percentage_24h_usd >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    {Math.abs(g.market_cap_change_percentage_24h_usd).toFixed(2)}% 24h
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Stat Cards ──────────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-3 mb-6">
            <StatCard
              label="Total Market Cap"
              value={g ? fmtLarge(g.total_market_cap.usd) : "—"}
              sub={g ? `${g.market_cap_change_percentage_24h_usd >= 0 ? "+" : ""}${g.market_cap_change_percentage_24h_usd.toFixed(2)}% in 24h` : undefined}
              color="#2962ff"
              icon={Globe}
            />
            <StatCard
              label="24h Volume"
              value={g ? fmtLarge(g.total_volume.usd) : "—"}
              sub={g ? `${((g.total_volume.usd / g.total_market_cap.usd) * 100).toFixed(1)}% of Market Cap` : undefined}
              color="#26a69a"
              icon={BarChart2}
            />
            <StatCard
              label="BTC Dominance"
              value={g ? `${g.market_cap_percentage.btc.toFixed(1)}%` : "—"}
              color="#f7931a"
              icon={Zap}
            />
            <StatCard
              label="ETH Dominance"
              value={g ? `${g.market_cap_percentage.eth.toFixed(1)}%` : "—"}
              color="#627eea"
              icon={Flame}
            />
            <StatCard
              label="Active Coins"
              value={g ? g.active_cryptocurrencies.toLocaleString() : "—"}
              color="#7c3aed"
              icon={TrendingUp}
            />
          </div>

          {/* ── Filter Bar ──────────────────────────────────────────────────── */}
          <div
            className="rounded-2xl p-3 mb-4"
            style={{
              background: "rgba(13,17,26,0.7)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            {/* Top row: search + controls */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {/* Search */}
              <div
                className="flex items-center gap-2 flex-1 min-w-[180px] rounded-xl px-3 h-9 transition-all"
                style={{ background: "rgba(42,46,57,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <Search className="h-3.5 w-3.5 shrink-0" style={{ color: "#5a6072" }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-[12px] text-white outline-none placeholder:text-[#5a6072]"
                  placeholder="Search name or ticker..."
                />
                {search && (
                  <button onClick={() => setSearch("")}>
                    <X className="h-3 w-3 text-[#787b86] hover:text-white transition-colors" />
                  </button>
                )}
              </div>

              {/* View toggle */}
              <div
                className="flex items-center rounded-xl overflow-hidden"
                style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(19,23,34,0.8)" }}
              >
                {([["table", List, "Table"], ["cards", LayoutGrid, "Cards"]] as const).map(([v, Icon, lbl]) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className="flex items-center gap-1.5 px-3 h-9 text-[10px] font-semibold transition-all"
                    style={{
                      background: view === v ? "rgba(41,98,255,0.2)" : "transparent",
                      color: view === v ? "#4d7fff" : "#5a6072",
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{lbl}</span>
                  </button>
                ))}
              </div>

              {/* Countdown pill */}
              <div
                className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[10px] font-mono font-semibold transition-colors"
                style={{
                  background: "rgba(42,46,57,0.8)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: countdown <= 5 ? "#ef5350" : "#5a6072",
                }}
              >
                <RefreshCw className={`h-3 w-3 ${countdown <= 5 ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh in </span>{countdown}s
              </div>

              {/* Result count */}
              <div className="ml-auto text-[10px] font-mono" style={{ color: "#5a6072" }}>
                {filtered.length > 0 && `${filtered.length} coins`}
              </div>
            </div>

            {/* Category chips */}
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(CATEGORIES).map(cat => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className="px-3 h-7 rounded-full text-[10px] font-semibold transition-all"
                    style={{
                      background: active ? "rgba(41,98,255,0.22)" : "rgba(42,46,57,0.6)",
                      color: active ? "#4d7fff" : "#5a6072",
                      border: `1px solid ${active ? "rgba(41,98,255,0.4)" : "rgba(255,255,255,0.06)"}`,
                      boxShadow: active ? "0 0 12px rgba(41,98,255,0.2)" : "none",
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Error state ─────────────────────────────────────────────────── */}
          {isError && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center rounded-2xl"
              style={{ background: "rgba(13,17,26,0.6)", border: "1px solid rgba(239,83,80,0.2)" }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "rgba(239,83,80,0.12)", border: "1px solid rgba(239,83,80,0.2)" }}
              >
                <AlertCircle className="h-7 w-7 text-[#ef5350]" />
              </div>
              <p className="text-white font-bold text-base mb-1">Market data unavailable</p>
              <p className="text-[12px] mb-1" style={{ color: "#787b86" }}>
                {(error as Error)?.message ?? "CoinGecko API may be rate-limited."}
              </p>
              <p className="text-[11px] mb-5" style={{ color: "#5a6072" }}>Auto-retrying in {countdown}s</p>
              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold transition-all"
                style={{ background: "rgba(41,98,255,0.2)", border: "1px solid rgba(41,98,255,0.4)", color: "#4d7fff" }}
              >
                <RefreshCw className="h-4 w-4" /> Retry Now
              </button>
            </motion.div>
          )}

          {/* ── TABLE VIEW ──────────────────────────────────────────────────── */}
          {!isError && view === "table" && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(10,14,22,0.75)",
                backdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.05)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
              }}
            >
              <div className="overflow-x-auto">
                <table className="w-full" style={{ minWidth: "960px" }}>
                  <thead
                    style={{
                      background: "rgba(8,12,22,0.95)",
                      position: "sticky",
                      top: 0,
                      zIndex: 20,
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      backdropFilter: "blur(20px)",
                    }}
                  >
                    <tr>
                      <th className="pl-4 pr-2 py-3 w-8">
                        <Star className="h-3 w-3" style={{ color: "#3a3e4a" }} />
                      </th>
                      <SortTH label="#" sk="rank" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortTH label="Coin" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortTH label="Price" sk="price" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                      <SortTH label="1h %" sk="ch1h" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                      <SortTH label="24h %" sk="ch24h" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                      <SortTH label="7d %" sk="ch7d" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                      <SortTH label="Market Cap" sk="mcap" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                      <SortTH label="Volume 24h" sk="vol" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                      <SortTH label="Circulating Supply" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                      <SortTH label="7 Days" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading
                      ? Array.from({ length: 25 }).map((_, i) => <SkeletonRow key={i} i={i} />)
                      : filtered.map((coin, idx) => {
                          const is7dPos = (coin.price_change_percentage_7d_in_currency ?? 0) >= 0;
                          const supplyPct = coin.max_supply
                            ? Math.min(100, (coin.circulating_supply / coin.max_supply) * 100)
                            : coin.total_supply
                            ? Math.min(100, (coin.circulating_supply / coin.total_supply) * 100)
                            : 100;
                          const isWatched = watchlist.has(coin.id);
                          return (
                            <motion.tr
                              key={coin.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.12, delay: Math.min(idx * 0.008, 0.3) }}
                              className="group"
                              style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                              onMouseEnter={e => {
                                (e.currentTarget as HTMLTableRowElement).style.background = "rgba(41,98,255,0.04)";
                              }}
                              onMouseLeave={e => {
                                (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
                              }}
                            >
                              {/* Watchlist */}
                              <td className="pl-4 pr-2 py-3.5">
                                <Star
                                  className="h-3.5 w-3.5 cursor-pointer transition-all"
                                  style={{
                                    color: isWatched ? "#f7931a" : "#2a2e3a",
                                    fill: isWatched ? "#f7931a" : "none",
                                  }}
                                  onClick={() => setWatchlist(w => {
                                    const n = new Set(w);
                                    n.has(coin.id) ? n.delete(coin.id) : n.add(coin.id);
                                    return n;
                                  })}
                                />
                              </td>
                              {/* Rank */}
                              <td className="px-3 py-3.5 text-[11px] font-mono tabular-nums" style={{ color: "#5a6072" }}>
                                {coin.market_cap_rank}
                              </td>
                              {/* Coin */}
                              <td className="px-3 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <img
                                    src={coin.image}
                                    alt={coin.name}
                                    className="w-7 h-7 rounded-full shrink-0"
                                    style={{ boxShadow: "0 0 8px rgba(0,0,0,0.4)" }}
                                    loading="lazy"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-[12px] font-bold text-white leading-none truncate max-w-[130px]">
                                      {coin.name}
                                    </div>
                                    <div className="text-[9px] font-semibold uppercase mt-0.5" style={{ color: "#5a6072" }}>
                                      {coin.symbol}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              {/* Price */}
                              <td className="px-3 py-3.5 text-right">
                                <span className="text-[12px] font-bold text-white font-mono tabular-nums">
                                  {fmtPrice(coin.current_price)}
                                </span>
                              </td>
                              {/* 1h */}
                              <td className="px-3 py-3.5 text-right">
                                <ChangeCell v={coin.price_change_percentage_1h_in_currency} />
                              </td>
                              {/* 24h */}
                              <td className="px-3 py-3.5 text-right">
                                <ChangeCell v={coin.price_change_percentage_24h} badge />
                              </td>
                              {/* 7d */}
                              <td className="px-3 py-3.5 text-right">
                                <ChangeCell v={coin.price_change_percentage_7d_in_currency} />
                              </td>
                              {/* Market Cap */}
                              <td className="px-3 py-3.5 text-right">
                                <span className="text-[11px] font-mono text-[#d1d4dc] tabular-nums">
                                  {fmtLarge(coin.market_cap)}
                                </span>
                              </td>
                              {/* Volume */}
                              <td className="px-3 py-3.5 text-right">
                                <div className="text-[11px] font-mono text-[#d1d4dc] tabular-nums">
                                  {fmtLarge(coin.total_volume)}
                                </div>
                                {coin.market_cap > 0 && (
                                  <div className="text-[8px] mt-0.5" style={{ color: "#5a6072" }}>
                                    {((coin.total_volume / coin.market_cap) * 100).toFixed(1)}% of cap
                                  </div>
                                )}
                              </td>
                              {/* Supply */}
                              <td className="px-3 py-3.5 text-right min-w-[130px]">
                                <div className="text-[10px] font-mono text-[#d1d4dc] tabular-nums">
                                  {fmtSupply(coin.circulating_supply, coin.symbol)}
                                </div>
                                <div className="flex items-center justify-end gap-1.5 mt-1">
                                  <div
                                    className="w-16 h-1 rounded-full overflow-hidden"
                                    style={{ background: "rgba(255,255,255,0.07)" }}
                                  >
                                    <div
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{
                                        width: `${supplyPct}%`,
                                        background:
                                          supplyPct > 80 ? "#26a69a" :
                                          supplyPct > 50 ? "#f7931a" :
                                          "#2962ff",
                                      }}
                                    />
                                  </div>
                                  <span className="text-[8px] font-mono tabular-nums" style={{ color: "#5a6072" }}>
                                    {supplyPct.toFixed(0)}%
                                  </span>
                                </div>
                              </td>
                              {/* Sparkline */}
                              <td className="px-3 py-3.5 text-right">
                                <MiniSparkline
                                  prices={coin.sparkline_in_7d?.price ?? []}
                                  isPos={is7dPos}
                                  id={`${coin.id}_${page}`}
                                />
                              </td>
                            </motion.tr>
                          );
                        })
                    }
                  </tbody>
                </table>

                {!isLoading && filtered.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Search className="h-8 w-8 mb-3 opacity-20 text-white" />
                    <p className="text-[13px] font-semibold text-white mb-1">No coins found</p>
                    <p className="text-[11px]" style={{ color: "#5a6072" }}>Try a different search or category</p>
                    <button
                      onClick={() => { setSearch(""); setCategory("All"); }}
                      className="mt-3 px-4 py-1.5 rounded-xl text-[11px] font-medium"
                      style={{ background: "rgba(41,98,255,0.15)", color: "#4d7fff", border: "1px solid rgba(41,98,255,0.3)" }}
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CARD VIEW ───────────────────────────────────────────────────── */}
          {!isError && view === "cards" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
              {isLoading
                ? Array.from({ length: 24 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-2xl h-44 animate-pulse"
                      style={{ background: "rgba(13,17,26,0.6)", animationDelay: `${i * 30}ms` }}
                    />
                  ))
                : filtered.map((coin, idx) => {
                    const is7dPos = (coin.price_change_percentage_7d_in_currency ?? 0) >= 0;
                    const is24hPos = coin.price_change_percentage_24h >= 0;
                    const isWatched = watchlist.has(coin.id);
                    return (
                      <motion.div
                        key={coin.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.18, delay: Math.min(idx * 0.01, 0.4) }}
                        className="rounded-2xl p-4 cursor-pointer group relative overflow-hidden"
                        style={{
                          background: "rgba(13,17,26,0.8)",
                          backdropFilter: "blur(20px)",
                          border: "1px solid rgba(255,255,255,0.05)",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={e => {
                          const el = e.currentTarget as HTMLDivElement;
                          el.style.border = "1px solid rgba(41,98,255,0.35)";
                          el.style.boxShadow = "0 0 24px rgba(41,98,255,0.12), 0 8px 40px rgba(0,0,0,0.4)";
                          el.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={e => {
                          const el = e.currentTarget as HTMLDivElement;
                          el.style.border = "1px solid rgba(255,255,255,0.05)";
                          el.style.boxShadow = "none";
                          el.style.transform = "translateY(0)";
                        }}
                      >
                        {/* Top glow on hover */}
                        <div
                          className="absolute top-0 inset-x-0 h-px rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: "linear-gradient(90deg, transparent 0%, #2962ff88 50%, transparent 100%)" }}
                        />
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <img
                              src={coin.image}
                              alt={coin.name}
                              className="w-8 h-8 rounded-full"
                              loading="lazy"
                              style={{ boxShadow: "0 0 10px rgba(0,0,0,0.5)" }}
                            />
                            <div>
                              <div className="text-[12px] font-bold text-white leading-none truncate max-w-[90px]">{coin.name}</div>
                              <div className="text-[9px] uppercase font-semibold mt-0.5" style={{ color: "#5a6072" }}>{coin.symbol}</div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <span
                              className="text-[8px] font-mono px-1.5 py-0.5 rounded-md"
                              style={{ background: "rgba(255,255,255,0.06)", color: "#5a6072" }}
                            >
                              #{coin.market_cap_rank}
                            </span>
                            <Star
                              className="h-3.5 w-3.5 cursor-pointer transition-all"
                              style={{ color: isWatched ? "#f7931a" : "#2a2e3a", fill: isWatched ? "#f7931a" : "none" }}
                              onClick={() => setWatchlist(w => {
                                const n = new Set(w);
                                n.has(coin.id) ? n.delete(coin.id) : n.add(coin.id);
                                return n;
                              })}
                            />
                          </div>
                        </div>

                        {/* Sparkline */}
                        <div className="my-2">
                          <MiniSparkline
                            prices={coin.sparkline_in_7d?.price ?? []}
                            isPos={is7dPos}
                            id={`card_${coin.id}_${page}`}
                          />
                        </div>

                        {/* Price */}
                        <div className="text-[14px] font-black text-white font-mono tabular-nums tracking-tight">
                          {fmtPrice(coin.current_price)}
                        </div>

                        {/* Changes */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex items-center gap-1 text-[9px] text-[#5a6072]">24h</div>
                          <ChangeCell v={coin.price_change_percentage_24h} badge />
                          <div className="flex items-center gap-1 text-[9px] text-[#5a6072]">7d</div>
                          <ChangeCell v={coin.price_change_percentage_7d_in_currency} />
                        </div>

                        {/* Stats */}
                        <div
                          className="mt-3 pt-2.5 grid grid-cols-2 gap-y-1.5"
                          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                        >
                          <div>
                            <div className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: "#5a6072" }}>Market Cap</div>
                            <div className="text-[10px] font-mono text-[#a0a8bc] mt-0.5">{fmtLarge(coin.market_cap)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: "#5a6072" }}>Volume</div>
                            <div className="text-[10px] font-mono text-[#a0a8bc] mt-0.5">{fmtLarge(coin.total_volume)}</div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
              }

              {!isLoading && filtered.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-16">
                  <Search className="h-8 w-8 mb-3 opacity-20 text-white" />
                  <p className="text-[13px] font-semibold text-white mb-1">No coins found</p>
                  <button
                    onClick={() => { setSearch(""); setCategory("All"); }}
                    className="mt-2 px-4 py-1.5 rounded-xl text-[11px] font-medium"
                    style={{ background: "rgba(41,98,255,0.15)", color: "#4d7fff", border: "1px solid rgba(41,98,255,0.3)" }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Pagination ──────────────────────────────────────────────────── */}
          {!isError && !isLoading && (coins?.length ?? 0) > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-between mt-5 gap-3 px-4 py-3 rounded-2xl"
              style={{ background: "rgba(13,17,26,0.7)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div>
                <p className="text-[11px]" style={{ color: "#5a6072" }}>
                  Page <span className="font-bold text-white">{page}</span> &nbsp;·&nbsp;{" "}
                  Showing <span className="font-bold text-white">{filtered.length}</span> coins
                  {search || category !== "All" ? " (filtered)" : " from top 500"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[11px] font-semibold transition-all disabled:opacity-25"
                  style={{ background: "rgba(42,46,57,0.8)", border: "1px solid rgba(255,255,255,0.07)", color: "#a0a8bc" }}
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(p => (
                    <button
                      key={p}
                      onClick={() => handlePage(p)}
                      className="w-9 h-9 rounded-xl text-[11px] font-bold transition-all"
                      style={{
                        background: page === p ? "rgba(41,98,255,0.25)" : "rgba(42,46,57,0.6)",
                        color: page === p ? "#4d7fff" : "#5a6072",
                        border: page === p ? "1px solid rgba(41,98,255,0.45)" : "1px solid rgba(255,255,255,0.06)",
                        boxShadow: page === p ? "0 0 16px rgba(41,98,255,0.25)" : "none",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handlePage(page + 1)}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[11px] font-semibold transition-all"
                  style={{
                    background: "rgba(41,98,255,0.18)",
                    border: "1px solid rgba(41,98,255,0.35)",
                    color: "#4d7fff",
                    boxShadow: "0 0 14px rgba(41,98,255,0.15)",
                  }}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Footer note */}
          <div className="mt-4 text-center">
            <p className="text-[9px]" style={{ color: "#3a3e4a" }}>
              Market data provided by CoinGecko API · Prices update every 30 seconds · For informational purposes only
            </p>
          </div>
          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}
