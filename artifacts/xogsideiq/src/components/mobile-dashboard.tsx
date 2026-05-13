import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Search, Bell, Sun, Moon, Brain, Cpu, TrendingUp,
  ArrowUpRight, ArrowDownRight, Flame, Laugh, RefreshCw, Zap,
  ChevronRight, BarChart2, Globe,
} from "lucide-react";
import { MobileNav } from "@/components/mobile-nav";
import { NotificationCenter } from "@/components/notification-center";
import { MobileMarketCard, MiniSparkline } from "@/components/mobile-market-card";
import { useTheme } from "@/components/theme-provider";
import {
  useLiveCoins, useGainersLosers, useTrendingCoins,
  useFearGreedLive, useMemeCoinLive,
} from "@/hooks/use-market-data";
import { analyzeToken, SIGNAL_COLOR, SIGNAL_BG, SENTIMENT_COLOR } from "@/lib/ai-engine";
import { useGetMarketOverview, useGetToken, getGetMarketOverviewQueryKey, getGetTokenQueryKey } from "@workspace/api-client-react";

function fmtPrice(p: number): string {
  if (p >= 1000) return "$" + p.toLocaleString("en", { maximumFractionDigits: 0 });
  if (p >= 1)    return "$" + p.toFixed(2);
  if (p >= 0.01) return "$" + p.toFixed(4);
  return "$" + p.toFixed(6);
}

function fmtLarge(n: number): string {
  if (!n) return "—";
  if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9)  return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6)  return "$" + (n / 1e6).toFixed(2) + "M";
  return "$" + n.toLocaleString();
}

function SectionHeader({ title, icon: Icon, iconColor = "#2962ff", badge, linkText, linkHref }: {
  title: string;
  icon?: React.ElementType;
  iconColor?: string;
  badge?: string;
  linkText?: string;
  linkHref?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} style={{ color: iconColor }} />}
        <span className="text-[13px] font-bold text-white">{title}</span>
        {badge && (
          <span
            className="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide"
            style={{ background: "rgba(41,98,255,0.15)", color: "#4d7fff", border: "1px solid rgba(41,98,255,0.2)" }}
          >
            {badge}
          </span>
        )}
      </div>
      {linkText && linkHref && (
        <Link href={linkHref}>
          <span className="flex items-center gap-0.5 text-[11px] text-[#4d7fff]">
            {linkText} <ChevronRight size={11} />
          </span>
        </Link>
      )}
    </div>
  );
}

function SkeletonPulse({ w, h, rounded = "rounded-lg" }: { w: string; h: string; rounded?: string }) {
  return (
    <div
      className={`${w} ${h} ${rounded} animate-pulse`}
      style={{ background: "rgba(255,255,255,0.06)" }}
    />
  );
}

export function MobileDashboard() {
  const { theme, setTheme } = useTheme();
  const isDark = theme !== "light";

  const [moverTab, setMoverTab] = useState<"gainers" | "losers">("gainers");

  const { data: cgCoins, isLoading: coinsLoading, refetch } = useLiveCoins();
  const { gainers, losers } = useGainersLosers(10);
  const { data: trendingData } = useTrendingCoins();
  const { data: fearGreedData } = useFearGreedLive();
  const liveMemeCoins = useMemeCoinLive();
  const { data: overview } = useGetMarketOverview({ query: { queryKey: getGetMarketOverviewQueryKey() } });
  const { data: btcToken } = useGetToken("BTC", { query: { queryKey: getGetTokenQueryKey("BTC") } });

  const fg = fearGreedData?.data?.[0];
  const fgVal = fg ? parseInt(fg.value) : (overview?.fearGreedIndex ?? 50);
  const fgLabel = fg?.value_classification ?? overview?.fearGreedLabel ?? "Neutral";
  const fgColor = fgVal < 25 ? "#ef5350" : fgVal < 45 ? "#f7931a" : fgVal < 55 ? "#787b86" : "#26a69a";

  const btcCoin = useMemo(() => cgCoins?.find(c => c.id === "bitcoin"), [cgCoins]);
  const ethCoin = useMemo(() => cgCoins?.find(c => c.id === "ethereum"), [cgCoins]);

  const aiOpportunities = useMemo(() => {
    if (!cgCoins) return [];
    return cgCoins.slice(0, 30).map(c => ({
      ...c,
      ai: analyzeToken({
        priceChange24h: c.price_change_percentage_24h,
        priceChange7d: c.price_change_percentage_7d_in_currency ?? undefined,
        volume24h: c.total_volume,
        marketCap: c.market_cap,
        symbol: c.symbol,
      }),
    })).filter(c => c.ai.signal === "STRONG_BUY" || c.ai.signal === "BUY").slice(0, 5);
  }, [cgCoins]);

  const btcAi = useMemo(() => analyzeToken({
    priceChange24h: btcCoin?.price_change_percentage_24h ?? 0,
    priceChange7d: btcCoin?.price_change_percentage_7d_in_currency ?? undefined,
    volume24h: btcCoin?.total_volume ?? 0,
    marketCap: btcCoin?.market_cap ?? 0,
    symbol: "BTC",
  }), [btcCoin]);

  const trendingCoins = useMemo(
    () => (trendingData?.coins ?? []).slice(0, 8).map(c => c.item),
    [trendingData]
  );

  const movers = moverTab === "gainers" ? gainers : losers;

  const cardBg = "rgba(255,255,255,0.025)";
  const cardBorder = "rgba(255,255,255,0.07)";

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: isDark ? "#070a12" : "#f0f2f7", color: isDark ? "#d1d4dc" : "#1e222d" }}
    >
      {/* ── MOBILE HEADER ── */}
      <header
        className="shrink-0 flex items-center px-4 gap-3"
        style={{
          height: 56,
          background: isDark ? "rgba(6,9,18,0.97)" : "rgba(240,242,247,0.97)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"}`,
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#2962ff,#7c3aed)", boxShadow: "0 0 14px rgba(41,98,255,0.5)" }}
          >
            <Activity size={14} className="text-white" />
          </div>
          <span className="text-[15px] font-black tracking-tight" style={{ color: isDark ? "white" : "#0d1117" }}>
            Coin<span style={{ color: "#2962ff" }}>Astra</span>
          </span>
        </div>

        {/* Live BTC pill */}
        {btcCoin && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              background: "rgba(41,98,255,0.1)",
              border: "1px solid rgba(41,98,255,0.18)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#26a69a] animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-white">${btcCoin.current_price.toLocaleString("en", { maximumFractionDigits: 0 })}</span>
            <span className="text-[9px] font-bold" style={{ color: btcCoin.price_change_percentage_24h >= 0 ? "#26a69a" : "#ef5350" }}>
              {btcCoin.price_change_percentage_24h >= 0 ? "+" : ""}{btcCoin.price_change_percentage_24h.toFixed(1)}%
            </span>
          </div>
        )}

        {/* Right controls */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
            style={{ background: "rgba(255,255,255,0.05)", color: "#5a6072" }}
          >
            <Search size={14} />
          </button>
          <NotificationCenter />
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
            style={{ background: "rgba(255,255,255,0.05)", color: "#5a6072" }}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      {/* ── SCROLLABLE CONTENT ── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ WebkitOverflowScrolling: "touch", paddingBottom: 96 }}
      >

        {/* ── MARKET STATS SCROLL ── */}
        <div className="px-4 pt-4">
          <div
            className="flex gap-3 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          >
            {/* BTC */}
            {btcCoin ? (
              <StatCard
                label="Bitcoin"
                value={fmtPrice(btcCoin.current_price)}
                change={btcCoin.price_change_percentage_24h}
                sub="BTC"
                icon={<img src={btcCoin.image} alt="BTC" className="w-5 h-5 rounded-full" />}
                isDark={isDark}
              />
            ) : <StatCardSkeleton isDark={isDark} />}

            {/* ETH */}
            {ethCoin ? (
              <StatCard
                label="Ethereum"
                value={fmtPrice(ethCoin.current_price)}
                change={ethCoin.price_change_percentage_24h}
                sub="ETH"
                icon={<img src={ethCoin.image} alt="ETH" className="w-5 h-5 rounded-full" />}
                isDark={isDark}
              />
            ) : <StatCardSkeleton isDark={isDark} />}

            {/* Fear & Greed */}
            <StatCard
              label="Fear & Greed"
              value={fgVal.toString()}
              change={0}
              sub={fgLabel}
              changeColor={fgColor}
              noArrow
              isDark={isDark}
            />

            {/* Market Cap */}
            <StatCard
              label="Market Cap"
              value={fmtLarge(overview?.totalMarketCap ?? 0)}
              change={0}
              sub="Global"
              noArrow
              isDark={isDark}
            />

            {/* BTC Dominance */}
            <StatCard
              label="BTC Dom"
              value={`${overview?.btcDominance?.toFixed(1) ?? "—"}%`}
              change={0}
              sub="Dominance"
              noArrow
              isDark={isDark}
            />
          </div>
        </div>

        {/* ── AI ENGINE CARD ── */}
        <div className="px-4 pt-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl p-4 relative overflow-hidden"
            style={{
              background: isDark
                ? "linear-gradient(135deg, rgba(41,98,255,0.12), rgba(124,58,237,0.08))"
                : "linear-gradient(135deg, rgba(41,98,255,0.08), rgba(124,58,237,0.05))",
              border: "1px solid rgba(41,98,255,0.2)",
              boxShadow: "0 4px 30px rgba(41,98,255,0.1)",
            }}
          >
            {/* Glow */}
            <div
              className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20 pointer-events-none"
              style={{ background: "radial-gradient(circle, #2962ff, transparent)" }}
            />

            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "rgba(41,98,255,0.2)", border: "1px solid rgba(41,98,255,0.3)" }}>
                <Cpu size={13} style={{ color: "#4d7fff" }} />
              </div>
              <span className="text-[13px] font-bold text-white">AI Engine — BTC</span>
              <span
                className="px-1.5 py-0.5 rounded-md text-[9px] font-black ml-auto"
                style={{ background: SIGNAL_BG[btcAi.signal], color: SIGNAL_COLOR[btcAi.signal], border: `1px solid ${SIGNAL_COLOR[btcAi.signal]}50` }}
              >
                {btcAi.signal.replace(/_/g, " ")}
              </span>
            </div>

            {/* Bull/Bear bar */}
            <div className="mb-3">
              <div className="flex justify-between text-[10px] mb-1">
                <span style={{ color: "#26a69a" }}>Bullish {btcAi.bullishProbability}%</span>
                <span style={{ color: "#ef5350" }}>Bearish {btcAi.bearishProbability}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(239,83,80,0.2)" }}>
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${btcAi.bullishProbability}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  style={{ background: "linear-gradient(90deg, #26a69a, #4ade80)" }}
                />
              </div>
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Smart $", value: btcAi.smartMoney === "ACCUMULATING" ? "ACC" : btcAi.smartMoney === "DISTRIBUTING" ? "DIST" : "NEU", color: btcAi.smartMoney === "ACCUMULATING" ? "#26a69a" : btcAi.smartMoney === "DISTRIBUTING" ? "#ef5350" : "#787b86" },
                { label: "Whale", value: btcAi.whaleActivity, color: btcAi.whaleActivity === "EXTREME" ? "#ef5350" : btcAi.whaleActivity === "HIGH" ? "#f7931a" : "#787b86" },
                { label: "Momentum", value: `${btcAi.momentumScore > 0 ? "+" : ""}${btcAi.momentumScore}`, color: btcAi.momentumScore >= 0 ? "#26a69a" : "#ef5350" },
                { label: "Confidence", value: `${btcAi.confidence}%`, color: "#4d7fff" },
              ].map(m => (
                <div key={m.label} className="text-center">
                  <div className="text-[9px] text-[#4a5270] mb-0.5">{m.label}</div>
                  <div className="text-[10px] font-bold" style={{ color: m.color }}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* Timeframes */}
            <div className="flex gap-2 mt-3">
              {btcAi.timeframes.map(t => {
                const tc = t.sentiment === "BULLISH" ? "#26a69a" : t.sentiment === "BEARISH" ? "#ef5350" : "#787b86";
                return (
                  <div key={t.tf} className="flex-1 rounded-xl p-2 text-center" style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${tc}30` }}>
                    <div className="text-[9px] text-[#4a5270] font-bold">{t.tf}</div>
                    <div className="text-[9px] font-bold mt-0.5" style={{ color: tc }}>{t.sentiment}</div>
                    <div className="text-[8px] text-[#4a5270] mt-0.5">{t.confidence}%</div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* ── TOP MOVERS ── */}
        <div className="px-4 pt-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} style={{ color: "#2962ff" }} />
              <span className="text-[13px] font-bold text-white">Top Movers</span>
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold"
                style={{ background: "rgba(38,166,154,0.15)", color: "#26a69a" }}
              >
                <span className="w-1 h-1 rounded-full bg-[#26a69a] animate-pulse" />
                LIVE
              </span>
            </div>
            <Link href="/markets">
              <span className="flex items-center gap-0.5 text-[11px] text-[#4d7fff]">All <ChevronRight size={11} /></span>
            </Link>
          </div>

          {/* Tabs */}
          <div
            className="flex mb-3 p-1 rounded-xl gap-1"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {(["gainers", "losers"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setMoverTab(tab)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all"
                style={{
                  background: moverTab === tab
                    ? tab === "gainers" ? "rgba(38,166,154,0.2)" : "rgba(239,83,80,0.2)"
                    : "transparent",
                  color: moverTab === tab
                    ? tab === "gainers" ? "#26a69a" : "#ef5350"
                    : "#4a5270",
                  border: moverTab === tab
                    ? `1px solid ${tab === "gainers" ? "rgba(38,166,154,0.3)" : "rgba(239,83,80,0.3)"}`
                    : "1px solid transparent",
                }}
              >
                {tab === "gainers" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {tab === "gainers" ? "Gainers" : "Losers"}
              </button>
            ))}
          </div>

          {/* Horizontal scrollable coin cards */}
          <div
            className="flex gap-3 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          >
            {coinsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="shrink-0 w-36 h-32 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
              ))
            ) : movers.slice(0, 8).map((coin, i) => (
              <motion.div
                key={coin.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="shrink-0 w-36 rounded-2xl p-3 cursor-pointer relative overflow-hidden"
                style={{
                  background: cardBg,
                  border: `1px solid ${cardBorder}`,
                  boxShadow: "0 2px 16px rgba(0,0,0,0.2)",
                }}
                whileTap={{ scale: 0.96 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  {coin.image && <img src={coin.image} alt={coin.symbol} className="w-7 h-7 rounded-full" />}
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-white leading-none">{coin.symbol.toUpperCase()}</div>
                    <div className="text-[9px] text-[#4a5270] mt-0.5 truncate">{coin.name}</div>
                  </div>
                </div>
                <div className="mb-1">
                  <MiniSparkline coin={coin} height={30} />
                </div>
                <div className="text-[12px] font-mono font-bold text-white leading-none">{fmtPrice(coin.current_price)}</div>
                <div className="text-[11px] font-bold mt-0.5" style={{ color: coin.price_change_percentage_24h >= 0 ? "#26a69a" : "#ef5350" }}>
                  {coin.price_change_percentage_24h >= 0 ? "+" : ""}{coin.price_change_percentage_24h.toFixed(2)}%
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── TRENDING COINS ── */}
        <div className="px-4 pt-5">
          <SectionHeader title="Trending" icon={Flame} iconColor="#f7931a" badge="HOT" linkText="See all" linkHref="/markets" />
          <div
            className="flex gap-3 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          >
            {trendingCoins.length > 0 ? trendingCoins.map((t, i) => {
              const change = t.data?.price_change_percentage_24h?.usd ?? 0;
              const isPos = change >= 0;
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="shrink-0 w-28 rounded-2xl p-3 text-center cursor-pointer"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
                  whileTap={{ scale: 0.96 }}
                >
                  <img
                    src={t.thumb}
                    alt={t.symbol}
                    className="w-9 h-9 rounded-full mx-auto mb-2 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <div className="text-[10px] font-bold text-white leading-none">{t.symbol.toUpperCase()}</div>
                  <div className="text-[9px] text-[#4a5270] mt-0.5 truncate">{t.name}</div>
                  <div className="text-[10px] font-bold mt-1.5" style={{ color: isPos ? "#26a69a" : "#ef5350" }}>
                    {isPos ? "+" : ""}{change.toFixed(2)}%
                  </div>
                  <div className="text-[9px] text-[#4a5270] mt-0.5">#{t.market_cap_rank}</div>
                </motion.div>
              );
            }) : Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="shrink-0 w-28 h-28 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
            ))}
          </div>
        </div>

        {/* ── AI OPPORTUNITIES ── */}
        <div className="px-4 pt-5">
          <SectionHeader title="AI Opportunities" icon={Brain} iconColor="#7c3aed" badge="PRO" linkText="All signals" linkHref="/signals" />
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
          >
            {(aiOpportunities.length > 0 ? aiOpportunities : Array.from({ length: 4 }).map((_, i) => null)).map((coin, i) =>
              coin ? (
                <motion.div
                  key={coin.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < aiOpportunities.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                >
                  <span className="text-[10px] text-[#4a5270] font-mono w-4">{i + 1}</span>
                  {coin.image && <img src={coin.image} alt={coin.symbol} className="w-8 h-8 rounded-full" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold text-white leading-none">{coin.symbol.toUpperCase()}</div>
                    <div className="text-[9px] text-[#4a5270]">{coin.name}</div>
                  </div>
                  <div className="text-right">
                    <span
                      className="px-2 py-0.5 rounded-md text-[9px] font-black block mb-0.5"
                      style={{ background: SIGNAL_BG[coin.ai.signal], color: SIGNAL_COLOR[coin.ai.signal] }}
                    >
                      {coin.ai.signal.replace(/_/g, " ")}
                    </span>
                    <span className="text-[9px] text-[#4a5270]">{coin.ai.confidence}% conf</span>
                  </div>
                </motion.div>
              ) : (
                <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <SkeletonPulse w="w-8" h="h-8" rounded="rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <SkeletonPulse w="w-20" h="h-3" />
                    <SkeletonPulse w="w-28" h="h-2" />
                  </div>
                  <SkeletonPulse w="w-16" h="h-6" />
                </div>
              )
            )}
            {aiOpportunities.length === 0 && cgCoins === undefined && (
              <div className="px-4 py-6 text-center">
                <div className="text-[11px] text-[#4a5270]">Loading AI signals...</div>
              </div>
            )}
          </div>
        </div>

        {/* ── MEME COINS ── */}
        <div className="px-4 pt-5">
          <SectionHeader title="Meme Coins" icon={Laugh} iconColor="#f7931a" badge="LIVE" linkText="View all" linkHref="/markets" />
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
          >
            {(liveMemeCoins.length > 0 ? liveMemeCoins : []).map((coin, i) => (
              <div
                key={coin.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: i < liveMemeCoins.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
              >
                <span className="text-[10px] text-[#4a5270] font-mono w-4">{i + 1}</span>
                {coin.image && <img src={coin.image} alt={coin.symbol} className="w-8 h-8 rounded-full" />}
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-bold text-white leading-none">{coin.symbol.toUpperCase()}</div>
                  <div className="text-[9px] text-[#4a5270]">{fmtPrice(coin.current_price)}</div>
                </div>
                <div className="shrink-0 mr-2">
                  <MiniSparkline coin={coin} height={24} />
                </div>
                <div className="text-[12px] font-bold shrink-0" style={{ color: coin.price_change_percentage_24h >= 0 ? "#26a69a" : "#ef5350" }}>
                  {coin.price_change_percentage_24h >= 0 ? "+" : ""}{coin.price_change_percentage_24h.toFixed(2)}%
                </div>
              </div>
            ))}
            {liveMemeCoins.length === 0 && (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <SkeletonPulse w="w-8" h="h-8" rounded="rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <SkeletonPulse w="w-16" h="h-3" />
                    <SkeletonPulse w="w-20" h="h-2" />
                  </div>
                  <SkeletonPulse w="w-12" h="h-3" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── MARKET OVERVIEW ── */}
        <div className="px-4 pt-5 pb-4">
          <SectionHeader title="Market Overview" icon={Globe} iconColor="#2962ff" />
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Market Cap", value: fmtLarge(overview?.totalMarketCap ?? 0), icon: BarChart2, color: "#2962ff" },
              { label: "24h Volume", value: fmtLarge(overview?.totalVolume24h ?? 0), icon: Zap, color: "#f7931a" },
              { label: "BTC Dominance", value: `${overview?.btcDominance?.toFixed(1) ?? "—"}%`, icon: Activity, color: "#f7931a" },
              { label: "Fear & Greed", value: `${fgVal} — ${fgLabel}`, icon: Brain, color: fgColor },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl p-4"
                style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: `${item.color}18` }}
                  >
                    <item.icon size={11} style={{ color: item.color }} />
                  </div>
                  <span className="text-[9px] text-[#4a5270]">{item.label}</span>
                </div>
                <div className="text-[13px] font-bold text-white leading-none">{item.value}</div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom nav */}
      <MobileNav />
    </div>
  );
}

function StatCard({
  label, value, change, sub, icon, changeColor, noArrow, isDark,
}: {
  label: string; value: string; change: number; sub: string;
  icon?: React.ReactNode; changeColor?: string; noArrow?: boolean; isDark: boolean;
}) {
  const isPos = change >= 0;
  const chColor = changeColor ?? (isPos ? "#26a69a" : "#ef5350");
  return (
    <div
      className="shrink-0 rounded-2xl p-3"
      style={{
        minWidth: 120,
        background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"}`,
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-[9px] text-[#4a5270] font-medium">{label}</span>
      </div>
      <div className="text-[14px] font-mono font-bold" style={{ color: isDark ? "white" : "#0d1117" }}>
        {value}
      </div>
      <div className="flex items-center gap-1 mt-1">
        {!noArrow && (isPos ? <ArrowUpRight size={9} style={{ color: chColor }} /> : <ArrowDownRight size={9} style={{ color: chColor }} />)}
        <span className="text-[10px] font-bold" style={{ color: chColor }}>
          {noArrow ? sub : `${isPos ? "+" : ""}${Math.abs(change).toFixed(2)}%`}
        </span>
      </div>
      {!noArrow && <div className="text-[9px] text-[#4a5270] mt-0.5">{sub}</div>}
    </div>
  );
}

function StatCardSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div
      className="shrink-0 rounded-2xl p-3 animate-pulse"
      style={{
        minWidth: 120,
        background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
      }}
    >
      <div className="h-2 w-12 rounded bg-white/10 mb-2" />
      <div className="h-4 w-20 rounded bg-white/10 mb-1.5" />
      <div className="h-2 w-10 rounded bg-white/10" />
    </div>
  );
}
