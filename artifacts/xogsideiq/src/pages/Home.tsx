import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, Link } from "wouter";
import {
  useGetToken, getGetTokenQueryKey,
  useGetTokenScores, getGetTokenScoresQueryKey,
  useGetTokenAiResearch, getGetTokenAiResearchQueryKey,
  useGetTokenNews, getGetTokenNewsQueryKey,
  useGetMarketOverview, getGetMarketOverviewQueryKey,
  useGetMarketMovers, getGetMarketMoversQueryKey,
  useListNarratives, getListNarrativesQueryKey,
  useListTokens, getListTokensQueryKey,
} from "@workspace/api-client-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis } from "recharts";
import {
  Star, Plus, ChevronDown, BarChart2, Activity, Maximize2,
  ArrowUpRight, ArrowDownRight, Globe, TrendingUp, Bell, Search,
  Brain, Cpu, Layers, Shield, RefreshCw, Laugh, Gamepad2, Building,
  DollarSign, ChevronRight, ExternalLink, Copy, Zap, BookOpen, Compass,
  Briefcase, LayoutDashboard, Sun, Moon, Twitter, MessageCircle,
  Github, Link2, Code2, Database, Hash, Tag,
} from "lucide-react";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/format";
import { GlobalTicker } from "@/components/global-ticker";
import { NotificationCenter } from "@/components/notification-center";
import { useTheme } from "@/components/theme-provider";
import { useLiveCoins, useGainersLosers, useTrendingCoins, useFearGreedLive, useMemeCoinLive } from "@/hooks/use-market-data";
import { analyzeToken, SIGNAL_COLOR, SIGNAL_BG, SENTIMENT_COLOR } from "@/lib/ai-engine";

const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "D", "W", "M"];
const TOKENS = ["BTC", "ETH", "SOL", "BNB", "MATIC", "ARB", "LINK", "RNDR", "FET"];

const VESTING = [
  { name: "Aptos", symbol: "APT", pct: 42.3, date: "Apr 12" },
  { name: "Immuta...", symbol: "IMX", pct: 38.7, date: "May 8" },
  { name: "Arbitru...", symbol: "ARB", pct: 31.2, date: "May 31" },
  { name: "Optimis...", symbol: "OP", pct: 29.4, date: "May 31" },
  { name: "SUI", symbol: "SUI", pct: 27.1, date: "May 28" },
  { name: "Worldco...", symbol: "WLD", pct: 24.8, date: "Jun 7" },
  { name: "Sei", symbol: "SEI", pct: 23.4, date: "Jun 3" },
  { name: "Starklane...", symbol: "STRK", pct: 21.7, date: "Jun 1" },
  { name: "The Sa...", symbol: "THE", pct: 19.3, date: "Jun 1" },
  { name: "Axie Inf...", symbol: "AXS", pct: 18.6, date: "Jun 9" },
  { name: "dYdX D...", symbol: "DYDX", pct: 16.4, date: "Jun 1" },
  { name: "Aave A...", symbol: "AAVE", pct: 15.2, date: "Jun 3" },
];

const MEME_COINS = [
  { symbol: "BONK", change: 4.7 },
  { symbol: "M", change: -2.4 },
  { symbol: "PEPE", change: 1.8 },
  { symbol: "SHIB", change: 1.3 },
  { symbol: "DOGE", change: 0.7 },
];

const WHALE_TXS = [
  { addr: "0x28C6...a8E1", action: "Bought", amount: "6357 ETH", usd: "$14.83M", time: "2m ago" },
  { addr: "0x7F3B...44C2", action: "Accumulated", amount: "5086 ETH", usd: "$11.86M", time: "18m ago" },
  { addr: "0x1A5E...67F3", action: "Transferred", amount: "3178 ETH", usd: "$7.41M", time: "42m ago" },
  { addr: "0x9D2C...a8A4", action: "Sold", amount: "1907 ETH", usd: "$4.45M", time: "1h ago" },
];

const TOKENOMICS_DATA = [
  { name: "Staking", value: 27.6, color: "#2962ff" },
  { name: "Treasury", value: 17.1, color: "#26a69a" },
  { name: "Burned", value: 12.4, color: "#ef5350" },
  { name: "Ecosystem", value: 18.3, color: "#f7931a" },
  { name: "Other", value: 24.6, color: "#787b86" },
];

const VESTING_BARS = [
  { year: "2024", value: 12.4 },
  { year: "2025", value: 8.2 },
  { year: "2026", value: 5.6 },
  { year: "2027", value: 3.1 },
  { year: "2028", value: 1.8 },
];

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/research", label: "Research", icon: Compass },
  { path: "/narratives", label: "Narratives", icon: BookOpen },
  { path: "/signals", label: "Signals", icon: TrendingUp },
  { path: "/portfolio", label: "Portfolio", icon: Briefcase },
];

function Sparkline({ change, seed = 0 }: { change: number; seed?: number }) {
  const pts = Array.from({ length: 7 }, (_, i) => {
    const trend = ((change / 100) / 6) * i * 30;
    const noise = Math.sin(i * 1.7 + seed) * 5 + Math.cos(i * 2.9 + seed * 0.6) * 3;
    return 14 - trend + noise;
  });
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const norm = pts.map(p => ((p - min) / range) * 26 + 2);
  const path = norm.map((y, i) => `${i === 0 ? "M" : "L"} ${(i / 6) * 74 + 3} ${30 - y}`).join(" ");
  const area = path + " L 77 30 L 3 30 Z";
  const color = change >= 0 ? "#26a69a" : "#ef5350";
  const gid = `sg_${seed}`;
  return (
    <svg viewBox="0 0 80 32" className="w-16 h-8">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TradingViewChart({ symbol }: { symbol: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!ref.current || initialized.current) return;
    initialized.current = true;

    const containerId = `tv_${symbol}_${Math.random().toString(36).slice(2, 7)}`;
    ref.current.id = containerId;

    const init = () => {
      if (ref.current && (window as any).TradingView) {
        ref.current.innerHTML = "";
        new (window as any).TradingView.widget({
          autosize: true,
          symbol: `BINANCE:${symbol}USDT`,
          interval: "D",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "#131722",
          enable_publishing: false,
          hide_top_toolbar: false,
          allow_symbol_change: false,
          container_id: containerId,
          backgroundColor: "#131722",
          gridColor: "rgba(42,46,57,0.5)",
          hide_legend: false,
          save_image: false,
        });
      }
    };

    if ((window as any).TradingView) {
      init();
    } else {
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = init;
      document.head.appendChild(script);
    }

    return () => {
      if (ref.current) ref.current.innerHTML = "";
      initialized.current = false;
    };
  }, [symbol]);

  return <div ref={ref} className="w-full h-full" />;
}

function pct(v: number) {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function PctChange({ v, className = "" }: { v: number; className?: string }) {
  return (
    <span className={`${v >= 0 ? "bull" : "bear"} ${className}`}>
      {v >= 0 ? "▲" : "▼"} {Math.abs(v).toFixed(2)}%
    </span>
  );
}

function SemiGauge({ value, label, color }: { value: number; label: string; color: string }) {
  const r = 44;
  const cx = 60;
  const cy = 58;
  const startAngle = Math.PI;
  const endAngle = 0;
  const pctVal = value / 100;
  const angle = startAngle + pctVal * (endAngle - startAngle);
  const bgX1 = cx + r * Math.cos(startAngle);
  const bgY1 = cy + r * Math.sin(startAngle);
  const bgX2 = cx + r * Math.cos(endAngle);
  const bgY2 = cy + r * Math.sin(endAngle);
  const vX = cx + r * Math.cos(angle);
  const vY = cy + r * Math.sin(angle);
  const largeArc = pctVal > 0.5 ? 1 : 0;
  const needleAngle = Math.PI + pctVal * Math.PI;
  const needleLen = 34;
  const nx = cx + needleLen * Math.cos(needleAngle);
  const ny = cy + needleLen * Math.sin(needleAngle);

  return (
    <svg viewBox="0 0 120 68" className="w-full max-w-[110px]">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#2a2e39" strokeWidth="10" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${vX} ${vY}`} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#d1d4dc" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="3" fill="#d1d4dc" />
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="15" fontWeight="bold" fill="white">{value}</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize="8" fill="#787b86">{label}</text>
    </svg>
  );
}

export default function Home() {
  const params = useParams();
  const [symbol, setSymbol] = useState(params.symbol?.toUpperCase() || "ETH");
  const [tf, setTf] = useState("D");
  const [aiTab, setAiTab] = useState("ai");
  const [activeNav, setActiveNav] = useState("Overview");
  const [tableFilter, setTableFilter] = useState("All");
  const [tableSearch, setTableSearch] = useState("");

  const { data: token } = useGetToken(symbol, { query: { queryKey: getGetTokenQueryKey(symbol) } });
  const { data: scores } = useGetTokenScores(symbol, { query: { queryKey: getGetTokenScoresQueryKey(symbol) } });
  const { data: aiResearch } = useGetTokenAiResearch(symbol, { query: { queryKey: getGetTokenAiResearchQueryKey(symbol) } });
  const { data: news } = useGetTokenNews(symbol, { query: { queryKey: getGetTokenNewsQueryKey(symbol) } });
  const { data: overview } = useGetMarketOverview({ query: { queryKey: getGetMarketOverviewQueryKey() } });
  const { data: movers } = useGetMarketMovers({ query: { queryKey: getGetMarketMoversQueryKey() } });
  const { data: narratives } = useListNarratives({ query: { queryKey: getListNarrativesQueryKey() } });
  const { data: allTokens } = useListTokens({}, { query: { queryKey: getListTokensQueryKey({}) } });

  const price = token?.price ?? 0;
  const change24h = token?.priceChange24h ?? 0;

  const keyLevels = {
    r1: price * 1.05,
    r2: price * 1.10,
    r3: price * 1.18,
    s1: price * 0.95,
    s2: price * 0.90,
    s3: price * 0.855,
  };

  // ── Real-time CoinGecko data ──────────────────────────────────────────────
  const { data: cgCoins } = useLiveCoins();
  const { gainers: cgGainers, losers: cgLosers } = useGainersLosers(7);
  const { data: trendingData } = useTrendingCoins();
  const { data: fearGreedData } = useFearGreedLive();
  const liveMemeCoins = useMemeCoinLive();

  // AI analysis for selected token (deterministic from real market data)
  const aiAnalysis = useMemo(() => analyzeToken({
    priceChange24h: token?.priceChange24h ?? 0,
    priceChange7d: token?.priceChange7d ?? undefined,
    volume24h: token?.volume24h ?? 0,
    marketCap: token?.marketCap ?? 0,
    price: token?.price ?? 0,
    symbol: token?.symbol ?? symbol,
  }), [token, symbol]);

  // Trending coins list
  const trendingCoins = useMemo(
    () => (trendingData?.coins ?? []).slice(0, 7).map(c => c.item),
    [trendingData]
  );

  // Real Fear & Greed (alternative.me) with fallback to backend
  const fgLive = fearGreedData?.data?.[0];
  const fg = fgLive ? parseInt(fgLive.value) : (overview?.fearGreedIndex ?? 48);
  const fgLabel = fgLive ? fgLive.value_classification : (overview?.fearGreedLabel ?? "Neutral");
  const fgColor = fg < 25 ? "#ef5350" : fg < 45 ? "#f7931a" : fg < 55 ? "#787b86" : fg < 75 ? "#26a69a" : "#26a69a";

  const topNarratives = (narratives ?? []).slice(0, 7).map(n => ({
    name: n.name.length > 15 ? n.name.substring(0, 13) + "..." : n.name,
    perf: n.perf24h,
  }));

  const { theme, setTheme } = useTheme();
  const isDark = theme !== "light";

  return (
    <div className="h-screen flex flex-col overflow-hidden text-[#d1d4dc] bg-[#131722]" style={{ fontSize: "11px" }}>

      {/* ── GLOBAL TICKER ── */}
      <GlobalTicker />

      {/* ── TOP HEADER ── */}
      <div className="h-9 flex items-center border-b border-[#2a2e39] bg-[#1e222d] shrink-0 px-2 gap-1">
        <div className="flex items-center gap-1 text-[#787b86] text-[10px] mr-1">
          <span className="hover:text-white cursor-pointer">All Coins</span>
          <ChevronRight className="h-3 w-3" />
        </div>

        <div className="flex items-center gap-1 border border-[#2a2e39] rounded px-2 h-6 bg-[#131722]">
          <span className="font-bold text-white text-[11px]">{symbol}/USDT</span>
          <Star className="h-3 w-3 text-[#787b86]" />
          <ChevronDown className="h-3 w-3 text-[#787b86]" />
        </div>

        <div className="flex items-center gap-0.5 ml-1">
          {TIMEFRAMES.map(t => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className={`px-1.5 h-5 rounded text-[10px] font-medium transition-colors ${
                tf === t ? "bg-primary text-white" : "text-[#787b86] hover:text-white hover:bg-[#2a2e39]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1">
          {["Candles", "Indicators", "Alert", "Replay", "Save Layout"].map(item => (
            <button key={item} className="hidden lg:block px-2 h-6 rounded text-[10px] text-[#787b86] hover:text-white hover:bg-[#2a2e39] border border-[#2a2e39] transition-colors">
              {item}
            </button>
          ))}
          <button className="px-2 h-6 rounded text-[10px] font-bold text-white bg-primary hover:bg-primary/90 transition-colors flex items-center gap-1">
            <Maximize2 className="h-3 w-3" /> FULLSCREEN
          </button>
          <div className="w-px h-5 mx-0.5 bg-[#2a2e39]" />
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#787b86] hover:text-white hover:bg-[#2a2e39] transition-all"
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
          <NotificationCenter />
        </div>
      </div>

      {/* ── MAIN BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT SIDEBAR ── */}
        <div className="w-48 border-r border-[#2a2e39] bg-[#1e222d] flex flex-col overflow-y-auto shrink-0">
          <div className="p-2 border-b border-[#2a2e39]">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-6 h-6 rounded-full bg-[#2962ff] flex items-center justify-center text-white font-bold text-[9px] shrink-0">
                {symbol.substring(0, 2)}
              </div>
              <div>
                <div className="font-bold text-white text-[11px] leading-tight">{token?.name ?? symbol}</div>
                <div className="text-[#787b86] text-[10px]">{symbol}</div>
              </div>
              <Star className="h-3 w-3 text-[#787b86] ml-auto cursor-pointer hover:text-yellow-400" />
            </div>

            <div className="font-bold text-white text-[20px] leading-tight font-mono">
              {price > 0 ? formatCurrency(price) : "---"}
            </div>
            <div className={`text-[10px] font-medium flex items-center gap-0.5 mb-2 ${change24h >= 0 ? "bull" : "bear"}`}>
              {change24h >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(change24h).toFixed(2)}% (24h)
              <span className="text-[#787b86] ml-0.5">• Market Open</span>
            </div>

            <div className="flex gap-1">
              <button className="flex-1 h-6 rounded text-[9px] font-medium bg-[#2962ff]/20 text-[#2962ff] border border-[#2962ff]/40 hover:bg-[#2962ff]/30 transition-colors">
                ☆ In Watchlist
              </button>
              <button className="flex-1 h-6 rounded text-[9px] font-medium bg-[#26a69a]/20 text-[#26a69a] border border-[#26a69a]/40 hover:bg-[#26a69a]/30 transition-colors">
                + Portfolio
              </button>
            </div>
          </div>

          <div className="p-1.5 border-b border-[#2a2e39] space-y-0.5">
            {[
              { label: "Market Cap",   value: formatCurrency(token?.marketCap),  change: change24h >= 0 ? `+${Math.abs(change24h).toFixed(2)}%` : `-${Math.abs(change24h).toFixed(2)}%`, pos: change24h >= 0 },
              { label: "FDV",          value: formatCurrency(token?.fdv),         change: null, pos: true },
              { label: "24h Vol",      value: formatCurrency(token?.volume24h),   change: null, pos: true },
              { label: "Circ. Supply", value: `${formatNumber(token?.circulatingSupply)} ${symbol}`, change: null, pos: true },
              { label: "Total Supply", value: `${formatNumber(token?.totalSupply ?? token?.circulatingSupply)} ${symbol}`, change: null, pos: true },
              { label: "Max Supply",   value: token?.totalSupply ? `${formatNumber(token.totalSupply)} ${symbol}` : "∞", change: null, pos: true },
              { label: "Treasury",     value: token?.marketCap ? formatCurrency(token.marketCap * 0.087) : "—", change: null, pos: true },
              { label: "Dominance",    value: symbol === "BTC" ? `${overview?.btcDominance?.toFixed(1)}%` : symbol === "ETH" ? "9.95%" : symbol === "SOL" ? "3.2%" : "—", change: null, pos: true },
              { label: "Rank",         value: symbol === "BTC" ? "#1" : symbol === "ETH" ? "#2" : symbol === "SOL" ? "#5" : "—", change: null, pos: true },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between px-0.5 py-0.5 rounded hover:bg-[#2a2e39]/40">
                <span className="text-[#787b86] text-[10px]">{row.label}</span>
                <span className="text-white text-[10px] font-medium flex items-center gap-1">
                  {row.value}
                  {row.change && <span className={`text-[9px] ${row.pos ? "bull" : "bear"}`}>{row.change}</span>}
                </span>
              </div>
            ))}
          </div>

          <div className="p-1 border-b border-[#2a2e39]">
            {["Overview", "Markets", "News", "Tokenomics", "On-Chain", "Holders", "Analytics", "AI Insights", "Widgets", "Alerts"].map(item => (
              <button
                key={item}
                onClick={() => setActiveNav(item)}
                className={`w-full text-left px-2 py-1 rounded text-[10px] transition-colors flex items-center gap-1 ${
                  activeNav === item ? "bg-[#2962ff]/15 text-[#2962ff]" : "text-[#787b86] hover:text-white hover:bg-[#2a2e39]"
                }`}
              >
                {activeNav === item && <div className="w-0.5 h-3 bg-[#2962ff] rounded-full" />}
                {item}
              </button>
            ))}
          </div>

          <div className="p-1.5 border-b border-[#2a2e39]">
            <div className="text-[9px] font-bold uppercase text-[#787b86] tracking-wider mb-1.5 px-0.5">Info</div>
            <div className="space-y-0.5">
              {[
                { label:"Website",     icon:Link2,    href: token?.websiteUrl ?? "#", value: token?.websiteUrl ? new URL(token.websiteUrl.startsWith("http") ? token.websiteUrl : "https://" + token.websiteUrl).hostname : symbol.toLowerCase()+".org" },
                { label:"Explorers",   icon:ExternalLink, href:"#", value:"etherscan.io" },
                { label:"Wallets",     icon:Shield,   href:"#", value:"MetaMask, Ledger" },
                { label:"Community",   icon:MessageCircle, href:"#", value:"Reddit • Telegram" },
                { label:"Source Code", icon:Code2,    href:"#", value:"github.com" },
                { label:"API ID",      icon:Database, href:"#", value:symbol.toLowerCase() },
                { label:"Chains",      icon:Hash,     href:"#", value:token?.chain ?? "Ethereum" },
                { label:"Categories",  icon:Tag,      href:"#", value: token?.narratives?.[0]?.name ?? "Layer 1" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1.5 px-0.5 py-0.5 rounded hover:bg-[#2a2e39]/40 group">
                  <item.icon className="h-3 w-3 shrink-0" style={{ color:"#787b86" }} />
                  <span className="text-[#787b86] text-[9px] shrink-0 w-14">{item.label}</span>
                  <a href={item.href} className="text-[#2962ff] text-[9px] truncate group-hover:underline" title={item.value}>{item.value}</a>
                </div>
              ))}
            </div>
          </div>

          <div className="p-1.5 border-b border-[#2a2e39]">
            <div className="text-[9px] font-bold uppercase text-[#787b86] mb-1 px-0.5">Contracts</div>
            <div className="flex items-center gap-1 px-0.5">
              <span className="text-[#d1d4dc] text-[9px] font-mono">0x2170...f918</span>
              <Copy className="h-2.5 w-2.5 text-[#787b86] cursor-pointer hover:text-white" />
            </div>
          </div>

          {/* ── AI Price Prediction ── */}
          <div className="p-1.5 border-b border-[#2a2e39]">
            <div className="flex items-center gap-1 mb-1.5 px-0.5">
              <Brain className="h-3 w-3 text-[#7c3aed]" />
              <span className="text-[9px] font-bold uppercase text-[#787b86] tracking-wider">AI Price Prediction</span>
            </div>
            <div className="space-y-1 px-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[#787b86]">30-Day Target</span>
                <span className="text-[10px] font-bold text-white font-mono">
                  {price > 0 ? formatCurrency(price * 1.18) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[#787b86]">Bull Case</span>
                <span className="text-[9px] font-bold bull">+{(18 + Math.abs(change24h * 2)).toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[#787b86]">Bear Case</span>
                <span className="text-[9px] font-bold bear">-{(12 + Math.abs(change24h)).toFixed(1)}%</span>
              </div>
              <div className="mt-1">
                <div className="flex justify-between text-[8px] text-[#787b86] mb-0.5">
                  <span>AI Confidence</span><span className="text-white font-bold">{aiAnalysis.confidence}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#2a2e39]">
                  <div className="h-full rounded-full transition-all" style={{ width: `${aiAnalysis.confidence}%`, background:"linear-gradient(90deg,#7c3aed,#2962ff)" }} />
                </div>
              </div>
              <div className="flex items-center justify-between mt-1 mb-0.5">
                <span className="text-[8px] text-[#787b86]">AI Signal</span>
                <span className="px-1.5 py-0.5 rounded text-[7px] font-bold" style={{ background: SIGNAL_BG[aiAnalysis.signal], color: SIGNAL_COLOR[aiAnalysis.signal], border: `1px solid ${SIGNAL_COLOR[aiAnalysis.signal]}50` }}>
                  {aiAnalysis.signal.replace("_", " ")}
                </span>
              </div>
              <div className="flex gap-1 mt-1">
                {(token?.narratives?.slice(0,2) ?? [{ name:"Layer 1" }, { name:"DeFi" }]).map((n: { name: string }) => (
                  <span key={n.name} className="px-1.5 py-0.5 rounded text-[8px] font-semibold"
                    style={{ background:"rgba(41,98,255,0.15)", color:"#4d7fff", border:"1px solid rgba(41,98,255,0.25)" }}>
                    {n.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Social Media ── */}
          <div className="p-1.5 border-b border-[#2a2e39]">
            <div className="text-[9px] font-bold uppercase text-[#787b86] tracking-wider mb-1.5 px-0.5">Social</div>
            <div className="grid grid-cols-2 gap-1 px-0.5">
              {[
                { label:"Twitter", icon:Twitter, color:"#1da1f2", stat:"2.4M", sub:"followers" },
                { label:"Reddit",  icon:MessageCircle, color:"#ff4500", stat:"890K", sub:"members" },
                { label:"Discord", icon:Zap, color:"#5865f2", stat:"320K", sub:"members" },
                { label:"GitHub",  icon:Github, color:"#d1d4dc", stat:"4.8K", sub:"stars" },
              ].map(s => (
                <button key={s.label}
                  className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg hover:bg-[#2a2e39]/60 transition-colors text-left"
                  style={{ border:"1px solid rgba(255,255,255,0.04)" }}>
                  <s.icon className="h-3 w-3 shrink-0" style={{ color:s.color }} />
                  <div>
                    <div className="text-[9px] font-bold text-white leading-none">{s.stat}</div>
                    <div className="text-[8px] text-[#5a6072] leading-none mt-0.5">{s.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-1 mt-auto border-t border-[#2a2e39]">
            <div className="flex gap-0.5">
              {NAV_ITEMS.map(item => (
                <Link key={item.path} href={item.path}>
                  <button className="flex-1 flex flex-col items-center gap-0.5 p-1 rounded text-[#787b86] hover:text-white hover:bg-[#2a2e39] transition-colors">
                    <item.icon className="h-3 w-3" />
                    <span className="text-[8px]">{item.label}</span>
                  </button>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── CENTER + RIGHT ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex flex-1 overflow-hidden">

            {/* CHART + BOTTOM */}
            <div className="flex-1 flex flex-col overflow-y-auto">

              {/* Chart Toolbar */}
              <div className="h-7 flex items-center border-b border-[#2a2e39] bg-[#1e222d] px-2 gap-2 shrink-0">
                <div className="flex items-center gap-1 text-[#787b86] text-[9px]">
                  {["1D", "5D", "1M", "3M", "6M", "YTD", "1Y", "5Y", "All"].map(t => (
                    <button key={t} className="px-1 hover:text-white transition-colors">{t}</button>
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-1">
                  {["Compare", "Indicators", "Templates", "Alert", "Replay"].map(item => (
                    <button key={item} className="px-1.5 h-5 rounded text-[9px] text-[#787b86] hover:text-white hover:bg-[#2a2e39] transition-colors">
                      {item}
                    </button>
                  ))}
                  <button className="px-1.5 h-5 rounded text-[9px] font-medium text-white bg-[#2962ff]/20 border border-[#2962ff]/40">
                    Multi-Chart
                  </button>
                </div>
              </div>

              {/* TradingView Chart */}
              <div className="h-[420px] shrink-0 border-b border-[#2a2e39]">
                <TradingViewChart symbol={symbol} />
              </div>

              {/* ── BOTTOM ANALYTICS PANELS ── */}
              <div className="flex border-b border-[#2a2e39] shrink-0" style={{ minHeight: "200px" }}>

                {/* TOKENOMICS */}
                <div className="w-44 border-r border-[#2a2e39] shrink-0">
                  <div className="panel-header">
                    <span className="panel-title">Tokenomics</span>
                    <span className="panel-link">View All →</span>
                  </div>
                  <div className="p-1.5">
                    <div className="h-24">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={TOKENOMICS_DATA} cx="50%" cy="50%" innerRadius={28} outerRadius={40} paddingAngle={1} dataKey="value">
                            {TOKENOMICS_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-0.5">
                      {TOKENOMICS_DATA.map(d => (
                        <div key={d.name} className="flex items-center justify-between text-[9px]">
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: d.color }} />
                            <span className="text-[#787b86]">{d.name}</span>
                          </div>
                          <span className="text-white font-medium">{d.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-1 pt-1 border-t border-[#2a2e39] text-[9px] text-[#787b86]">
                      Total Supply <span className="text-white">{formatNumber(token?.totalSupply)} {symbol}</span>
                    </div>
                  </div>
                </div>

                {/* VESTING SCHEDULE */}
                <div className="w-44 border-r border-[#2a2e39] shrink-0">
                  <div className="panel-header">
                    <span className="panel-title">Vesting Schedule</span>
                    <span className="panel-link">View Full →</span>
                  </div>
                  <div className="p-1.5">
                    <div className="text-[9px] text-[#787b86] mb-0.5">Next Unlock</div>
                    <div className="text-[11px] font-bold text-white mb-0.5">12.4M {symbol}</div>
                    <div className="text-[9px] text-[#787b86] mb-1">$43.5M (3.8% of supply) in 30 days</div>
                    <div className="h-20">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={VESTING_BARS} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                          <XAxis dataKey="year" tick={{ fontSize: 8, fill: "#787b86" }} axisLine={false} tickLine={false} />
                          <Bar dataKey="value" fill="#2962ff" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* AI ANALYSIS */}
                <div className="w-52 border-r border-[#2a2e39] shrink-0">
                  <div className="panel-header">
                    <span className="panel-title">AI Analysis</span>
                    <span className="panel-link">View Full →</span>
                  </div>
                  <div className="p-1.5 space-y-1.5">
                    <div className="text-[9px] text-[#d1d4dc] leading-relaxed line-clamp-4">
                      {aiResearch?.summary ?? `${token?.name ?? symbol} is a leading smart contract platform with strong developer activity and expanding DeFi ecosystem.`}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(token?.narratives ?? []).slice(0, 3).map(n => (
                        <span key={n.id} className="px-1.5 py-0.5 rounded-sm text-[8px] font-medium bg-[#2962ff]/20 text-[#2962ff] border border-[#2962ff]/30">
                          {n.name}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-[#787b86]">Sentiment</span>
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#787b86]/20 text-[#787b86]">Neutral</span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[9px] mb-0.5">
                        <span className="text-[#787b86]">Narrative Strength</span>
                        <span className="font-bold text-white">{scores?.narrativeMomentumScore ?? 60}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#2a2e39]">
                        <div className="h-full rounded-full bg-[#26a69a]" style={{ width: `${scores?.narrativeMomentumScore ?? 60}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[9px] mb-0.5">
                        <span className="text-[#787b86]">AI Confidence</span>
                        <span className="font-bold text-white">50%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#2a2e39]">
                        <div className="h-full rounded-full bg-[#2962ff]" style={{ width: "50%" }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* NARRATIVE STRENGTH */}
                <div className="w-40 border-r border-[#2a2e39] shrink-0">
                  <div className="panel-header">
                    <span className="panel-title">Narrative Strength</span>
                  </div>
                  <div className="p-1.5">
                    <div className="text-[28px] font-bold text-white leading-none">{scores?.narrativeMomentumScore ?? 60}%</div>
                    <div className="text-[10px] bull font-bold mb-1.5">Strong</div>
                    <div className="space-y-1">
                      {["Reputation", "Regulation", "Gas Fees"].map((label, i) => {
                        const vals = [72, 48, 55];
                        const colors = ["#26a69a", "#ef5350", "#f7931a"];
                        return (
                          <div key={label}>
                            <div className="flex justify-between text-[9px] mb-0.5">
                              <span className="text-[#787b86]">{label}</span>
                              <span style={{ color: colors[i] }}>{vals[i]}%</span>
                            </div>
                            <div className="h-1 rounded-full bg-[#2a2e39]">
                              <div className="h-full rounded-full" style={{ width: `${vals[i]}%`, backgroundColor: colors[i] }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* FEAR & GREED */}
                <div className="w-36 border-r border-[#2a2e39] shrink-0">
                  <div className="panel-header">
                    <span className="panel-title">Fear & Greed Index</span>
                    <span className="panel-link">View All →</span>
                  </div>
                  <div className="p-1.5 flex flex-col items-center">
                    <SemiGauge value={fg} label={fgLabel} color={fgColor} />
                    <div className="text-[10px] font-bold text-white">{fg} — {fgLabel}</div>
                    <div className="text-[9px] text-[#787b86] mt-0.5">Yesterday: {fg - 1}</div>
                    <div className="mt-1 w-full">
                      <div className="flex justify-between text-[8px] text-[#787b86]">
                        <span>Extreme Fear</span>
                        <span>Extreme Greed</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full mt-0.5" style={{ background: "linear-gradient(to right, #ef5350, #f7931a, #787b86, #26a69a)" }} />
                    </div>
                  </div>
                </div>

                {/* EXCHANGE FLOW */}
                <div className="w-44 border-r border-[#2a2e39] shrink-0">
                  <div className="panel-header">
                    <span className="panel-title">Exchange Flow (24h)</span>
                    <span className="panel-link">View All →</span>
                  </div>
                  <div className="p-1.5 space-y-1">
                    {[
                      { label: "Net Inflow", value: "-$14.63M", color: "#ef5350" },
                      { label: "Exchange Inflow", value: "$11.864B", color: "#26a69a" },
                      { label: "Exchange Outflow", value: "$13.347B", color: "#ef5350" },
                    ].map(r => (
                      <div key={r.label} className="flex justify-between items-center">
                        <span className="text-[#787b86] text-[9px]">{r.label}</span>
                        <span className="text-[9px] font-medium" style={{ color: r.color }}>{r.value}</span>
                      </div>
                    ))}
                    <div className="mt-1.5 pt-1 border-t border-[#2a2e39]">
                      <div className="flex flex-wrap gap-0.5">
                        {Array.from({ length: 30 }).map((_, i) => {
                          const colors = ["#26a69a", "#ef5350", "#26a69a", "#26a69a", "#ef5350"];
                          return <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors[i % colors.length], opacity: 0.7 + (i % 3) * 0.1 }} />;
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ON-CHAIN DATA */}
                <div className="flex-1 shrink-0">
                  <div className="panel-header">
                    <span className="panel-title">On-Chain Data</span>
                    <span className="panel-link">View All →</span>
                  </div>
                  <div className="p-1.5 space-y-1">
                    {[
                      { label: "Active Addresses", value: "44,489.4k", change: "+0.1%" },
                      { label: "Transaction Count", value: "118.644M", change: "+0.1%" },
                      { label: "TVL (DeFi)", value: formatCurrency(token?.marketCap ? token.marketCap * 0.012 : 4260000000), change: "+0.1%" },
                      { label: "Gas Price (Gwei)", value: "18.7", change: "-12.4%" },
                    ].map(r => (
                      <div key={r.label} className="flex justify-between items-center">
                        <span className="text-[#787b86] text-[9px]">{r.label}</span>
                        <div className="text-right">
                          <div className="text-[9px] font-medium text-white">{r.value}</div>
                          <div className={`text-[8px] ${r.change.startsWith("+") ? "bull" : "bear"}`}>{r.change}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── AI TERMINAL ── */}
              <div className="shrink-0">
                {/* Tabs */}
                <div className="h-8 flex items-center border-b border-[#2a2e39] bg-[#1e222d] px-2 gap-0.5">
                  {[
                    { id: "ai", label: "AI Terminal", pro: true },
                    { id: "discovery", label: "Discovery" },
                    { id: "onchain", label: "On-Chain" },
                    { id: "intelligence", label: "Intelligence" },
                    { id: "screener", label: "Screener" },
                    { id: "whale", label: "Whale Tracker" },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setAiTab(tab.id)}
                      className={`flex items-center gap-1 px-2.5 h-6 rounded text-[10px] font-medium transition-colors ${
                        aiTab === tab.id ? "bg-[#2962ff]/20 text-[#2962ff] border border-[#2962ff]/40" : "text-[#787b86] hover:text-white hover:bg-[#2a2e39]"
                      }`}
                    >
                      <Zap className="h-2.5 w-2.5" />
                      {tab.label}
                      {tab.pro && <span className="px-0.5 text-[7px] font-bold bg-[#2962ff] text-white rounded-sm ml-0.5">PRO</span>}
                    </button>
                  ))}
                  <button className="ml-auto text-[9px] text-[#2962ff] hover:underline">View Full AI Dashboard →</button>
                </div>

                {/* AI Terminal Content */}
                <div className="flex border-b border-[#2a2e39]">

                  {/* BUY/SELL PROBABILITY */}
                  <div className="w-60 border-r border-[#2a2e39] p-2">
                    <div className="text-[9px] font-bold uppercase text-[#787b86] mb-1.5 flex items-center gap-1">
                      AI BUY/SELL PROBABILITY —
                      <span className="text-white">{symbol}</span>
                      <span className="text-[#2962ff] cursor-pointer ml-1">CLICK FOR DETAILS →</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center shrink-0 transition-all"
                        style={{ borderColor: SIGNAL_COLOR[aiAnalysis.signal], backgroundColor: SIGNAL_BG[aiAnalysis.signal] }}>
                        <div className="text-[18px] font-bold text-white leading-none">{aiAnalysis.bullishProbability}%</div>
                        <div className="text-[8px] font-bold" style={{ color: SIGNAL_COLOR[aiAnalysis.signal] }}>{aiAnalysis.signal.replace("_", " ")}</div>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {[
                          { label: "Bull", value: aiAnalysis.bullishProbability, color: "#26a69a" },
                          { label: "Hold", value: aiAnalysis.holdProbability, color: "#f7931a" },
                          { label: "Bear", value: aiAnalysis.bearishProbability, color: "#ef5350" },
                        ].map(b => (
                          <div key={b.label}>
                            <div className="flex justify-between text-[9px] mb-0.5">
                              <span className="text-[#787b86]">{b.label}</span>
                              <span className="text-white font-medium">{b.value}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-[#2a2e39]">
                              <div className="h-full rounded-full transition-all" style={{ width: `${b.value}%`, backgroundColor: b.color }} />
                            </div>
                          </div>
                        ))}
                        <div className="text-[9px] text-[#787b86]">AI Confidence: <span className="text-white">{aiAnalysis.confidence}%</span></div>
                      </div>
                    </div>
                  </div>

                  {/* AI TREND PREDICTION */}
                  <div className="flex-1 border-r border-[#2a2e39] p-2">
                    <div className="text-[9px] font-bold uppercase text-[#787b86] mb-1.5 flex items-center gap-1">
                      AI TREND PREDICTION — <span className="text-white">{symbol}</span>
                      <span className="text-[#2962ff] cursor-pointer ml-1">CLICK FOR DETAILS →</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {aiAnalysis.timeframes.map(t => {
                        const tColor = t.sentiment === "BULLISH" ? "#26a69a" : t.sentiment === "BEARISH" ? "#ef5350" : "#787b86";
                        return (
                          <div key={t.tf} className="border border-[#2a2e39] rounded p-1.5 text-center">
                            <div className="text-[8px] text-[#787b86] font-bold mb-0.5">{t.tf}</div>
                            <div className="text-[9px] font-bold" style={{ color: tColor }}>{t.sentiment}</div>
                            <div className="h-1 rounded-full bg-[#2a2e39] mt-1">
                              <div className="h-full rounded-full transition-all" style={{ width: `${t.confidence}%`, backgroundColor: tColor }} />
                            </div>
                            <div className="text-[8px] text-[#787b86] mt-0.5">{t.confidence}% conf</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-[9px] text-[#787b86] leading-relaxed">
                      AI signals{" "}
                      <span className="font-semibold" style={{ color: SENTIMENT_COLOR[aiAnalysis.sentiment] }}>
                        {aiAnalysis.sentiment.replace(/_/g, " ")}
                      </span>
                      {" "}for {token?.name ?? symbol} on daily timeframe with{" "}
                      <span className="text-white">{aiAnalysis.confidence}%</span> confidence based on multi-factor technical + on-chain analysis.
                    </div>
                  </div>

                  {/* AI TRADE SETUPS */}
                  <div className="w-72 border-r border-[#2a2e39] p-2">
                    <div className="text-[9px] font-bold uppercase text-[#787b86] mb-1.5">
                      AI TRADE SETUPS
                      <span className="text-[#2962ff] cursor-pointer ml-1">CLICK FOR DETAILS →</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { type: "Long Setup", conf: "Medium Confidence", color: "#26a69a", entry: price * 0.98, sl: price * 0.95, tp1: price * 1.05, tp2: price * 1.12, rr: "1:3.5" },
                        { type: "Short Setup", conf: "Low Confidence", color: "#ef5350", entry: price * 1.02, sl: price * 1.05, tp1: price * 0.95, tp2: price * 0.88, rr: "1:4.0" },
                      ].map(s => (
                        <div key={s.type} className="border border-[#2a2e39] rounded p-1.5">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1">
                              <div className="w-0 h-0" style={{ borderRight: "5px solid transparent", borderLeft: "5px solid transparent", [s.type === "Long Setup" ? "borderBottom" : "borderTop"]: `6px solid ${s.color}` }} />
                              <span className="text-[9px] font-bold" style={{ color: s.color }}>{s.type}</span>
                            </div>
                            <span className="px-1 py-0.5 rounded text-[8px]" style={{ backgroundColor: `${s.color}20`, color: s.color, border: `1px solid ${s.color}40` }}>{s.conf}</span>
                          </div>
                          <div className="grid grid-cols-5 gap-1 text-[8px]">
                            {["Entry", "Stop Loss", "TP1", "TP2", "R:R"].map(h => (
                              <div key={h} className="text-[#787b86]">{h}</div>
                            ))}
                            <div className="text-white font-mono">{formatCurrency(s.entry)}</div>
                            <div className="bear font-mono">{formatCurrency(s.sl)}</div>
                            <div className="bull font-mono">{formatCurrency(s.tp1)}</div>
                            <div className="bull font-mono">{formatCurrency(s.tp2)}</div>
                            <div className="text-white font-mono">{s.rr}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* WHALE TRACKING */}
                  <div className="flex-1 p-2">
                    <div className="text-[9px] font-bold uppercase text-[#787b86] mb-1.5 flex items-center gap-1">
                      WHALE WALLET TRACKING — <span className="text-white">{symbol}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#26a69a] ml-1 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      {WHALE_TXS.map(tx => (
                        <div key={tx.addr} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-[#2a2e39]/50 transition-colors">
                          <span className="text-[#2962ff] font-mono text-[9px] w-24 shrink-0">{tx.addr}</span>
                          <span className={`text-[9px] font-medium w-20 shrink-0 ${tx.action === "Bought" || tx.action === "Accumulated" ? "bull" : tx.action === "Sold" ? "bear" : "text-[#f7931a]"}`}>
                            {tx.action}
                          </span>
                          <span className="text-white text-[9px] flex-1">{tx.amount}</span>
                          <span className="text-[#787b86] text-[9px] w-16 shrink-0">{tx.usd}</span>
                          <span className="text-[#787b86] text-[9px] w-10 shrink-0 text-right">{tx.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── COINGECKO-STYLE TOKEN TABLE ── */}
              {(() => {
                const FILTERS = ["All", "DeFi", "AI", "L1", "L2", "Meme", "RWA", "Gaming"];
                const filtered = (allTokens ?? []).filter(t => {
                  const matchSearch = tableSearch === "" || t.name.toLowerCase().includes(tableSearch.toLowerCase()) || t.symbol.toLowerCase().includes(tableSearch.toLowerCase());
                  const matchFilter = tableFilter === "All" || ((t as any).narratives ?? []).some((n: { name: string }) => n.name.toLowerCase().includes(tableFilter.toLowerCase()));
                  return matchSearch && matchFilter;
                });
                return (
                  <div className="border-t border-[#2a2e39] shrink-0">
                    {/* Table Topbar */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2e39] bg-[#16192a] gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-white">Cryptocurrency Prices by Market Cap</span>
                        <span className="px-1.5 py-0.5 rounded text-[8px] bg-[#2a2e39] text-[#787b86]">{filtered.length} coins</span>
                        <span className="text-[8px] text-[#787b86] flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#26a69a] inline-block animate-pulse" />
                          Updated in real-time
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1 bg-[#2a2e39] rounded px-2 h-6">
                          <Search className="h-3 w-3 text-[#787b86] shrink-0" />
                          <input
                            value={tableSearch}
                            onChange={e => setTableSearch(e.target.value)}
                            className="bg-transparent text-[10px] text-white w-24 outline-none placeholder:text-[#787b86]"
                            placeholder="Search coins..."
                          />
                        </div>
                        <div className="flex items-center gap-0.5 bg-[#2a2e39] rounded p-0.5">
                          {FILTERS.map(f => (
                            <button
                              key={f}
                              onClick={() => setTableFilter(f)}
                              className={`px-2 h-5 rounded text-[9px] font-medium transition-colors ${
                                tableFilter === f
                                  ? "bg-[#2962ff] text-white"
                                  : "text-[#787b86] hover:text-white hover:bg-[#1e222d]"
                              }`}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full" style={{ minWidth: "860px" }}>
                        <thead>
                          <tr className="border-b border-[#2a2e39]" style={{ background: "#16192a" }}>
                            <th className="w-8 pl-3 pr-1 py-2 text-left">
                              <Star className="h-3 w-3 text-[#787b86]" />
                            </th>
                            <th className="w-7 px-1 py-2 text-left text-[9px] font-semibold text-[#787b86]">#</th>
                            <th className="px-2 py-2 text-left text-[9px] font-semibold text-[#787b86]">Coin</th>
                            <th className="px-3 py-2 text-right text-[9px] font-semibold text-[#787b86] cursor-pointer hover:text-white">Price ↕</th>
                            <th className="px-3 py-2 text-right text-[9px] font-semibold text-[#787b86]">1h %</th>
                            <th className="px-3 py-2 text-right text-[9px] font-semibold text-[#787b86] cursor-pointer hover:text-white">24h % ↕</th>
                            <th className="px-3 py-2 text-right text-[9px] font-semibold text-[#787b86]">7d %</th>
                            <th className="px-3 py-2 text-right text-[9px] font-semibold text-[#787b86] cursor-pointer hover:text-white">24h Volume ↕</th>
                            <th className="px-3 py-2 text-right text-[9px] font-semibold text-[#787b86] cursor-pointer hover:text-white">Market Cap ↕</th>
                            <th className="px-3 py-2 text-right text-[9px] font-semibold text-[#787b86]">Circulating Supply</th>
                            <th className="px-3 pr-4 py-2 text-right text-[9px] font-semibold text-[#787b86]">Last 7 Days</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((t, i) => {
                            const c24 = t.priceChange24h ?? 0;
                            const c1h = +(c24 * 0.11 + Math.sin(i * 1.3) * 0.4).toFixed(2);
                            const c7d = +(c24 * 3.1 + Math.cos(i * 2.1) * 2.2).toFixed(2);
                            const supplyPct = (t as any).totalSupply && (t as any).totalSupply > 0 ? Math.min(100, (((t as any).circulatingSupply ?? 0) / (t as any).totalSupply) * 100) : 100;
                            const isSelected = t.symbol === symbol;
                            return (
                              <tr
                                key={t.symbol}
                                onClick={() => setSymbol(t.symbol)}
                                className={`border-b border-[#1a1d26] cursor-pointer transition-colors group ${
                                  isSelected ? "bg-[#2962ff]/8" : "hover:bg-[#1e222d]"
                                }`}
                              >
                                {/* Star */}
                                <td className="pl-3 pr-1 py-2">
                                  <Star className={`h-3 w-3 cursor-pointer transition-colors ${isSelected ? "text-yellow-400 fill-yellow-400" : "text-[#3a3e4a] group-hover:text-[#787b86]"}`} />
                                </td>
                                {/* Rank */}
                                <td className="px-1 py-2 text-[9px] text-[#787b86] font-medium">{i + 1}</td>
                                {/* Coin */}
                                <td className="px-2 py-2">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[8px] shrink-0"
                                      style={{ background: `hsl(${(i * 47) % 360}, 65%, 45%)` }}
                                    >
                                      {t.symbol.substring(0, 2)}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-[10px] font-bold text-white leading-none truncate max-w-[90px]">{t.name}</div>
                                      <div className="text-[8px] text-[#787b86] mt-0.5 font-medium">{t.symbol}</div>
                                    </div>
                                    {((t as any).narratives ?? []).slice(0, 1).map((n: { id: number; name: string }) => (
                                      <span key={n.id} className="px-1 py-0.5 rounded text-[7px] bg-[#2962ff]/12 text-[#4d7fff] border border-[#2962ff]/20 whitespace-nowrap">
                                        {n.name.length > 8 ? n.name.substring(0, 8) + "…" : n.name}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                {/* Price */}
                                <td className="px-3 py-2 text-right font-mono text-[10px] text-white font-semibold tabular-nums">
                                  {formatCurrency(t.price)}
                                </td>
                                {/* 1h % */}
                                <td className={`px-3 py-2 text-right text-[9px] font-semibold tabular-nums ${c1h >= 0 ? "bull" : "bear"}`}>
                                  {c1h >= 0 ? "▲" : "▼"} {Math.abs(c1h).toFixed(2)}%
                                </td>
                                {/* 24h % */}
                                <td className="px-3 py-2 text-right">
                                  <span className={`inline-flex items-center justify-end gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold tabular-nums ${c24 >= 0 ? "bg-[#26a69a]/12 bull" : "bg-[#ef5350]/12 bear"}`}>
                                    {c24 >= 0 ? "▲" : "▼"} {Math.abs(c24).toFixed(2)}%
                                  </span>
                                </td>
                                {/* 7d % */}
                                <td className={`px-3 py-2 text-right text-[9px] font-semibold tabular-nums ${c7d >= 0 ? "bull" : "bear"}`}>
                                  {c7d >= 0 ? "▲" : "▼"} {Math.abs(c7d).toFixed(2)}%
                                </td>
                                {/* 24h Volume */}
                                <td className="px-3 py-2 text-right text-[9px] font-mono text-[#d1d4dc] tabular-nums">
                                  <div>{formatCurrency(t.volume24h)}</div>
                                  <div className="text-[8px] text-[#787b86]">
                                    {t.marketCap && t.volume24h ? ((t.volume24h / t.marketCap) * 100).toFixed(1) + "% of MCap" : "—"}
                                  </div>
                                </td>
                                {/* Market Cap */}
                                <td className="px-3 py-2 text-right text-[9px] font-mono text-[#d1d4dc] tabular-nums">
                                  {formatCurrency(t.marketCap)}
                                </td>
                                {/* Circulating Supply */}
                                <td className="px-3 py-2 text-right min-w-[110px]">
                                  <div className="text-[9px] font-mono text-[#d1d4dc] tabular-nums">
                                    {formatNumber((t as any).circulatingSupply)} {t.symbol}
                                  </div>
                                  <div className="flex items-center gap-1 mt-0.5 justify-end">
                                    <div className="w-14 h-1 rounded-full bg-[#2a2e39] overflow-hidden">
                                      <div
                                        className="h-full rounded-full transition-all"
                                        style={{ width: `${supplyPct}%`, backgroundColor: supplyPct > 80 ? "#26a69a" : supplyPct > 50 ? "#f7931a" : "#2962ff" }}
                                      />
                                    </div>
                                    <span className="text-[8px] text-[#787b86]">{supplyPct.toFixed(0)}%</span>
                                  </div>
                                </td>
                                {/* Sparkline */}
                                <td className="px-3 pr-4 py-2 text-right">
                                  <Sparkline change={c7d} seed={i} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {filtered.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-[#787b86]">
                          <Search className="h-6 w-6 mb-2 opacity-40" />
                          <div className="text-[11px]">No coins match your search</div>
                        </div>
                      )}

                      {/* Table Footer */}
                      <div className="flex items-center justify-between px-3 py-2 border-t border-[#2a2e39] bg-[#16192a]">
                        <span className="text-[9px] text-[#787b86]">
                          Showing {filtered.length} of {allTokens?.length ?? 0} cryptocurrencies
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-[#787b86]">Rows per page:</span>
                          <select className="bg-[#2a2e39] text-[9px] text-white rounded px-1 py-0.5 outline-none border border-[#3a3e4a]">
                            <option>20</option>
                            <option>50</option>
                            <option>100</option>
                          </select>
                          <div className="flex items-center gap-0.5 ml-2">
                            <button className="px-1.5 h-5 rounded text-[9px] text-[#787b86] hover:text-white hover:bg-[#2a2e39] border border-[#2a2e39]">‹</button>
                            <button className="px-1.5 h-5 rounded text-[9px] bg-[#2962ff] text-white">1</button>
                            <button className="px-1.5 h-5 rounded text-[9px] text-[#787b86] hover:text-white hover:bg-[#2a2e39] border border-[#2a2e39]">›</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ── RIGHT PANELS ── */}
            <div className="w-72 border-l border-[#2a2e39] bg-[#1e222d] overflow-y-auto shrink-0">

              {/* AI INSIGHTS + VESTING SCHEDULES */}
              <div className="flex border-b border-[#2a2e39]">

                {/* AI ENGINE */}
                <div className="flex-1 border-r border-[#2a2e39]">
                  <div className="panel-header">
                    <span className="panel-title flex items-center gap-1">
                      <Cpu className="h-2.5 w-2.5 text-[#2962ff]" />
                      AI Engine
                    </span>
                    <span className="panel-link">Details →</span>
                  </div>
                  <div className="p-1.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] text-[#787b86]">Signal</span>
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ background: SIGNAL_BG[aiAnalysis.signal], color: SIGNAL_COLOR[aiAnalysis.signal], border: `1px solid ${SIGNAL_COLOR[aiAnalysis.signal]}60` }}>
                        {aiAnalysis.signal.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div>
                      <div className="flex justify-between text-[8px] mb-0.5">
                        <span className="bull">Bull {aiAnalysis.bullishProbability}%</span>
                        <span className="bear">Bear {aiAnalysis.bearishProbability}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(239,83,80,0.15)" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${aiAnalysis.bullishProbability}%`, background: "linear-gradient(90deg,#26a69a,#4ade80)" }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] text-[#787b86]">Smart $</span>
                      <span className={`text-[8px] font-bold ${aiAnalysis.smartMoney === "ACCUMULATING" ? "bull" : aiAnalysis.smartMoney === "DISTRIBUTING" ? "bear" : "text-[#787b86]"}`}>
                        {aiAnalysis.smartMoney}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] text-[#787b86]">Whale</span>
                      <span className={`text-[8px] font-bold ${aiAnalysis.whaleActivity === "EXTREME" ? "bear" : aiAnalysis.whaleActivity === "HIGH" ? "text-[#f7931a]" : "text-[#787b86]"}`}>
                        {aiAnalysis.whaleActivity}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] text-[#787b86]">Momentum</span>
                      <span className={`text-[8px] font-mono font-bold ${aiAnalysis.momentumScore >= 0 ? "bull" : "bear"}`}>
                        {aiAnalysis.momentumScore >= 0 ? "+" : ""}{aiAnalysis.momentumScore}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] text-[#787b86]">Narrative</span>
                      <span className="text-[8px] font-mono text-white">{aiAnalysis.narrativeStrength}%</span>
                    </div>
                    <div>
                      <div className="flex justify-between text-[8px] mb-0.5">
                        <span className="text-[#787b86]">AI Confidence</span>
                        <span className="text-[#2962ff] font-bold">{aiAnalysis.confidence}%</span>
                      </div>
                      <div className="h-1 rounded-full bg-[#2a2e39]">
                        <div className="h-full rounded-full transition-all" style={{ width: `${aiAnalysis.confidence}%`, background: "linear-gradient(90deg,#7c3aed,#2962ff)" }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* VESTING SCHEDULES (right column header) */}
                <div className="flex-1">
                  <div className="panel-header">
                    <span className="panel-title">Vesting Schedules</span>
                    <span className="panel-link">View All</span>
                  </div>
                  <div>
                    {VESTING.slice(0, 8).map(v => (
                      <div key={v.symbol} className="row-item">
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded-full bg-[#2a2e39] flex items-center justify-center text-[7px] font-bold text-white shrink-0">
                            {v.symbol.substring(0, 2)}
                          </div>
                          <div>
                            <div className="text-[9px] text-[#d1d4dc] leading-none">{v.name}</div>
                            <div className="text-[8px] text-[#787b86]">{v.symbol}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] font-bold bull">{v.pct}%</div>
                          <div className="text-[8px] text-[#787b86]">{v.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* KEY LEVELS */}
              <div className="border-b border-[#2a2e39]">
                <div className="panel-header">
                  <span className="panel-title">Key Levels</span>
                  <span className="panel-link">View All →</span>
                </div>
                <div className="p-1">
                  <div className="text-[9px] font-bold text-[#ef5350] mb-0.5 px-1">RESISTANCE</div>
                  {[["R1", keyLevels.r1], ["R2", keyLevels.r2], ["R3", keyLevels.r3]].map(([k, v]) => (
                    <div key={k as string} className="row-item">
                      <span className="text-[9px] text-[#ef5350] font-mono font-bold">{k}</span>
                      <span className="text-[9px] text-white font-mono">{formatCurrency(v as number)}</span>
                    </div>
                  ))}
                  <div className="text-[9px] font-bold text-[#26a69a] mt-1 mb-0.5 px-1">SUPPORT</div>
                  {[["S1", keyLevels.s1], ["S2", keyLevels.s2], ["S3", keyLevels.s3]].map(([k, v]) => (
                    <div key={k as string} className="row-item">
                      <span className="text-[9px] text-[#26a69a] font-mono font-bold">{k}</span>
                      <span className="text-[9px] text-white font-mono">{formatCurrency(v as number)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* TOP GAINERS */}
              <div className="border-b border-[#2a2e39]">
                <div className="panel-header">
                  <span className="panel-title flex items-center gap-1">
                    <ArrowUpRight className="h-2.5 w-2.5 bull" />
                    Top Gainers <span className="text-[7px] text-[#26a69a] font-normal ml-0.5">LIVE</span>
                  </span>
                  <span className="panel-link">View All →</span>
                </div>
                {(cgGainers.length > 0 ? cgGainers : (movers?.gainers ?? [])).slice(0, 5).map((t: any, i: number) => (
                  <div key={t.id ?? t.symbol} className="row-item cursor-pointer hover:bg-[#2a2e39]/50 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#787b86] text-[9px] w-3">{i + 1}</span>
                      {t.image ? (
                        <img src={t.image} alt={t.symbol} className="w-4 h-4 rounded-full object-cover" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-[#2a2e39] flex items-center justify-center text-[7px] font-bold text-white shrink-0">
                          {(t.symbol ?? "").substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-[9px] font-medium text-white leading-none">{(t.symbol ?? "").toUpperCase()}</div>
                        <div className="text-[7px] text-[#787b86] truncate max-w-[60px]">{t.name ?? ""}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[9px] font-bold bull">+{((t.price_change_percentage_24h ?? t.priceChange24h) ?? 0).toFixed(2)}%</div>
                      {t.current_price && <div className="text-[7px] text-[#787b86]">{formatCurrency(t.current_price)}</div>}
                    </div>
                  </div>
                ))}
              </div>

              {/* TOP LOSERS */}
              <div className="border-b border-[#2a2e39]">
                <div className="panel-header">
                  <span className="panel-title flex items-center gap-1">
                    <ArrowDownRight className="h-2.5 w-2.5 bear" />
                    Top Losers <span className="text-[7px] text-[#ef5350] font-normal ml-0.5">LIVE</span>
                  </span>
                  <span className="panel-link">View All →</span>
                </div>
                {cgLosers.slice(0, 5).map((t, i) => (
                  <div key={t.id} className="row-item cursor-pointer hover:bg-[#2a2e39]/50 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#787b86] text-[9px] w-3">{i + 1}</span>
                      {t.image ? (
                        <img src={t.image} alt={t.symbol} className="w-4 h-4 rounded-full object-cover" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-[#2a2e39] flex items-center justify-center text-[7px] font-bold text-white shrink-0">
                          {t.symbol.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-[9px] font-medium text-white leading-none">{t.symbol.toUpperCase()}</div>
                        <div className="text-[7px] text-[#787b86] truncate max-w-[60px]">{t.name}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[9px] font-bold bear">{t.price_change_percentage_24h.toFixed(2)}%</div>
                      <div className="text-[7px] text-[#787b86]">{formatCurrency(t.current_price)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* TRENDING COINS */}
              <div className="border-b border-[#2a2e39]">
                <div className="panel-header">
                  <span className="panel-title flex items-center gap-1">
                    <TrendingUp className="h-2.5 w-2.5 text-[#f7931a]" />
                    Trending
                  </span>
                  <span className="panel-link">View All →</span>
                </div>
                {trendingCoins.length > 0 ? trendingCoins.slice(0, 5).map((t, i) => (
                  <div key={t.id} className="row-item cursor-pointer hover:bg-[#2a2e39]/50 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#787b86] text-[9px] w-3">{i + 1}</span>
                      <img src={t.thumb} alt={t.symbol} className="w-4 h-4 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      <div className="min-w-0">
                        <div className="text-[9px] font-medium text-white leading-none truncate max-w-[70px]">{t.symbol}</div>
                        <div className="text-[7px] text-[#787b86] truncate max-w-[70px]">{t.name}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-[9px] font-bold ${(t.data?.price_change_percentage_24h?.usd ?? 0) >= 0 ? "bull" : "bear"}`}>
                        {(t.data?.price_change_percentage_24h?.usd ?? 0) >= 0 ? "+" : ""}{(t.data?.price_change_percentage_24h?.usd ?? 0).toFixed(2)}%
                      </div>
                      <div className="text-[7px] text-[#787b86]">#{t.market_cap_rank}</div>
                    </div>
                  </div>
                )) : (
                  <div className="px-2 py-3 text-center text-[9px] text-[#787b86]">Loading trending...</div>
                )}
              </div>

              {/* MARKET OVERVIEW */}
              <div className="border-b border-[#2a2e39]">
                <div className="panel-header">
                  <span className="panel-title">Market Overview</span>
                  <span className="panel-link text-[#ef5350]">✕</span>
                </div>
                <div className="p-1">
                  {[
                    { label: "Total Market Cap", value: formatCurrency(overview?.totalMarketCap), change: "+0.28%" },
                    { label: "24h Volume", value: formatCurrency(overview?.totalVolume24h), change: null },
                    { label: "BTC Dominance", value: `${overview?.btcDominance?.toFixed(1) ?? 58.2}%`, change: "-0.35%" },
                    { label: "ETH Dominance", value: "10.1%", change: "+0.28%" },
                  ].map(r => (
                    <div key={r.label} className="row-item">
                      <span className="text-[#787b86] text-[9px]">{r.label}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-medium text-white">{r.value}</span>
                        {r.change && (
                          <span className={`text-[8px] ${r.change.startsWith("+") ? "bull" : "bear"}`}>{r.change}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI OPPORTUNITIES */}
              <div className="border-b border-[#2a2e39]">
                <div className="panel-header">
                  <span className="panel-title flex items-center gap-1">
                    <Brain className="h-2.5 w-2.5 text-[#7c3aed]" />
                    AI Opportunities
                    <span className="px-1 py-0.5 rounded text-[7px] font-bold bg-[#7c3aed] text-white ml-0.5">PRO</span>
                  </span>
                  <span className="panel-link">View All →</span>
                </div>
                {(cgCoins?.slice(0, 30) ?? []).map(c => ({
                  ...c,
                  ai: analyzeToken({ priceChange24h: c.price_change_percentage_24h, priceChange7d: c.price_change_percentage_7d_in_currency ?? undefined, volume24h: c.total_volume, marketCap: c.market_cap, symbol: c.symbol }),
                })).filter(c => c.ai.signal === "STRONG_BUY" || c.ai.signal === "BUY").slice(0, 4).map((c, i) => (
                  <div key={c.id} className="row-item cursor-pointer hover:bg-[#2a2e39]/50 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#787b86] text-[9px] w-3">{i + 1}</span>
                      {c.image && <img src={c.image} alt={c.symbol} className="w-4 h-4 rounded-full object-cover" />}
                      <div className="min-w-0">
                        <div className="text-[9px] font-medium text-white leading-none">{c.symbol.toUpperCase()}</div>
                        <div className="text-[7px] text-[#787b86] truncate max-w-[55px]">{c.name}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="px-1 py-0.5 rounded text-[7px] font-bold block mb-0.5" style={{ background: SIGNAL_BG[c.ai.signal], color: SIGNAL_COLOR[c.ai.signal] }}>
                        {c.ai.signal.replace(/_/g, " ")}
                      </span>
                      <div className="text-[7px] text-[#787b86]">{c.ai.confidence}% conf</div>
                    </div>
                  </div>
                ))}
                {(cgCoins?.length ?? 0) === 0 && (
                  <div className="px-2 py-3 text-center text-[9px] text-[#787b86]">Loading signals...</div>
                )}
              </div>

              {/* TRENDING NARRATIVES */}
              <div className="border-b border-[#2a2e39]">
                <div className="panel-header">
                  <span className="panel-title">Trending Narratives</span>
                  <span className="panel-link">View All →</span>
                </div>
                {topNarratives.map(n => (
                  <div key={n.name} className="row-item">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#2962ff]" />
                      <span className="text-[9px] text-[#d1d4dc]">{n.name}</span>
                    </div>
                    <span className={`text-[9px] font-bold ${n.perf >= 0 ? "bull" : "bear"}`}>
                      {n.perf >= 0 ? "+" : ""}{n.perf.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>

              {/* MARKET VIEW */}
              <div className="border-b border-[#2a2e39]">
                <div className="panel-header">
                  <span className="panel-title">Market View</span>
                  <span className="panel-link">View All →</span>
                </div>
                <div className="p-1.5 flex gap-3">
                  <div className="flex-1 text-center">
                    <div className="text-[9px] text-[#787b86] mb-0.5">Trending Up (70)</div>
                    <div className="text-[22px] font-bold bull leading-none">210</div>
                    <div className="text-[9px] bull">270%</div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="text-[9px] text-[#787b86] mb-0.5">Trending Down (70)</div>
                    <div className="text-[22px] font-bold bear leading-none">70</div>
                    <div className="text-[9px] bear">70%</div>
                  </div>
                </div>
              </div>

              {/* MEME COINS */}
              <div>
                <div className="panel-header">
                  <span className="panel-title flex items-center gap-1">
                    <Laugh className="h-2.5 w-2.5 text-[#f7931a]" />
                    Meme Coins <span className="text-[7px] text-[#f7931a] font-normal ml-0.5">LIVE</span>
                  </span>
                  <span className="panel-link">View All →</span>
                </div>
                {(liveMemeCoins.length > 0
                  ? liveMemeCoins.map(m => ({ symbol: m.symbol.toUpperCase(), name: m.name, change: m.price_change_percentage_24h, price: m.current_price, image: m.image }))
                  : MEME_COINS.map(m => ({ symbol: m.symbol, name: m.symbol, change: m.change, price: 0, image: undefined as string | undefined }))
                ).map((m, i) => (
                  <div key={m.symbol} className="row-item cursor-pointer hover:bg-[#2a2e39]/50 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#787b86] text-[9px] w-3">{i + 1}</span>
                      {m.image ? (
                        <img src={m.image} alt={m.symbol} className="w-4 h-4 rounded-full object-cover" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-[#2a2e39] flex items-center justify-center text-[7px] font-bold text-white shrink-0">
                          {m.symbol.substring(0, 2)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-[9px] font-medium text-white leading-none">{m.symbol}</div>
                        {m.price > 0 && <div className="text-[7px] text-[#787b86]">{formatCurrency(m.price)}</div>}
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold ${m.change >= 0 ? "bull" : "bear"}`}>
                      {m.change >= 0 ? "+" : ""}{m.change.toFixed(2)}%
                    </span>
                  </div>
                ))}
                <div className="p-1.5 text-center">
                  <span className="text-[9px] text-[#2962ff] cursor-pointer hover:underline">Explore All Meme Coins →</span>
                </div>
              </div>

              {/* VESTING continued */}
              <div className="border-t border-[#2a2e39]">
                <div className="panel-header">
                  <span className="panel-title">More Vesting</span>
                  <span className="panel-link">View All Vesting Schedules →</span>
                </div>
                {VESTING.slice(8).map(v => (
                  <div key={v.symbol} className="row-item">
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded-full bg-[#2a2e39] flex items-center justify-center text-[7px] font-bold text-white shrink-0">
                        {v.symbol.substring(0, 2)}
                      </div>
                      <span className="text-[9px] text-[#d1d4dc]">{v.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-bold bull">{v.pct}%</div>
                      <div className="text-[8px] text-[#787b86]">{v.date}</div>
                    </div>
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
