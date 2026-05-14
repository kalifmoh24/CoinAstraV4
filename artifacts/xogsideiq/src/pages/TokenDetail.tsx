import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useGetToken, getGetTokenQueryKey,
  useGetTokenScores, getGetTokenScoresQueryKey,
  useGetTokenAiResearch, getGetTokenAiResearchQueryKey,
  useGetTokenNews, getGetTokenNewsQueryKey,
} from "@workspace/api-client-react";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDownRight, ArrowUpRight, ArrowLeft, ExternalLink, FileText,
  BrainCircuit, Activity, AlertTriangle, Star, Clock, Globe,
  Twitter, Layers, ChevronDown, ChevronUp, ArrowUp, ArrowDown,
  BookOpen, BarChart2, Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useTokenChart, useTokenLive } from "@/hooks/use-coins";
import { useAddToWatchlist, useIsWatchlisted, useRemoveFromWatchlist } from "@/hooks/use-watchlist";
import { useWatchlist } from "@/hooks/use-watchlist";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(8)}`;
}
function fmtLarge(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}
function fmtDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const TIMEFRAMES = [
  { label: "1D", days: 1 },
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "1Y", days: 365 },
];

// ── Price Chart ────────────────────────────────────────────────────────────────

function PriceChart({ symbol }: { symbol: string }) {
  const [days, setDays] = useState(7);
  const { data: chart, isLoading } = useTokenChart(symbol, days);

  const chartData = chart?.prices?.map(([ts, price]) => ({
    time: ts,
    price,
    label: days <= 1 ? new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : fmtDate(ts),
  })) ?? [];

  const isUp = chartData.length >= 2 && chartData[chartData.length - 1].price >= chartData[0].price;
  const lineColor = isUp ? "#26a69a" : "#ef5350";
  const fillColor = isUp ? "rgba(38,166,154,0.12)" : "rgba(239,83,80,0.12)";

  const minPrice = chartData.length ? Math.min(...chartData.map(d => d.price)) : 0;
  const maxPrice = chartData.length ? Math.max(...chartData.map(d => d.price)) : 0;
  const pctChange = chartData.length >= 2
    ? ((chartData[chartData.length - 1].price - chartData[0].price) / chartData[0].price) * 100
    : 0;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(10,14,22,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-3">
          <BarChart2 className="h-4 w-4" style={{ color: "#4d7fff" }} />
          <span className="text-[13px] font-bold text-white">Price History</span>
          {chartData.length > 0 && (
            <span className={`text-[11px] font-bold ${pctChange >= 0 ? "text-[#26a69a]" : "text-[#ef5350]"}`}>
              {pctChange >= 0 ? "▲" : "▼"} {Math.abs(pctChange).toFixed(2)}%
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {TIMEFRAMES.map(tf => (
            <button key={tf.label} onClick={() => setDays(tf.days)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
              style={{
                background: days === tf.days ? "rgba(41,98,255,0.25)" : "rgba(255,255,255,0.03)",
                color: days === tf.days ? "#4d7fff" : "#5a6072",
                border: `1px solid ${days === tf.days ? "rgba(41,98,255,0.5)" : "rgba(255,255,255,0.06)"}`,
              }}>
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-2 py-4" style={{ height: 240 }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#4d7fff" }} />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[12px]" style={{ color: "#5a6072" }}>
            Chart data unavailable
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id={`fill-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={lineColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#3a4058" }} axisLine={false} tickLine={false}
                interval={Math.floor(chartData.length / 6)} />
              <YAxis domain={[minPrice * 0.998, maxPrice * 1.002]}
                tick={{ fontSize: 9, fill: "#3a4058" }} axisLine={false} tickLine={false}
                tickFormatter={(v: number) => fmtPrice(v)} width={64} />
              <Tooltip
                contentStyle={{ background: "#0d1119", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 11 }}
                labelStyle={{ color: "#5a6072", fontSize: 10 }}
                formatter={(value: number) => [fmtPrice(value), "Price"]}
              />
              <Area type="monotone" dataKey="price" stroke={lineColor} strokeWidth={1.5}
                fill={`url(#fill-${symbol})`} dot={false} activeDot={{ r: 3, fill: lineColor }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {chartData.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="text-[10px]" style={{ color: "#3a4058" }}>
            Low: <span className="text-white font-mono font-bold">{fmtPrice(minPrice)}</span>
          </div>
          <div className="text-[10px]" style={{ color: "#3a4058" }}>
            High: <span className="text-white font-mono font-bold">{fmtPrice(maxPrice)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Watchlist Button ───────────────────────────────────────────────────────────

function WatchlistButton({ symbol, name, image }: { symbol: string; name: string; image?: string | null }) {
  const { data: watchlist = [] } = useWatchlist();
  const isWatched = watchlist.some(w => w.symbol === symbol);
  const watchedItem = watchlist.find(w => w.symbol === symbol);
  const add = useAddToWatchlist();
  const remove = useRemoveFromWatchlist();

  if (isWatched && watchedItem) {
    return (
      <button onClick={() => remove.mutate(watchedItem.id)} disabled={remove.isPending}
        className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] font-bold transition-all"
        style={{ background: "rgba(247,147,26,0.2)", color: "#f7931a", border: "1px solid rgba(247,147,26,0.4)" }}>
        <Star className="h-3.5 w-3.5" style={{ fill: "#f7931a" }} />
        Watching
      </button>
    );
  }

  return (
    <button
      onClick={() => add.mutate({ coinId: symbol.toLowerCase(), symbol, name, image: image ?? undefined })}
      disabled={add.isPending}
      className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] font-bold transition-all"
      style={{ background: "rgba(255,255,255,0.05)", color: "#a0a8bc", border: "1px solid rgba(255,255,255,0.08)" }}>
      <Star className="h-3.5 w-3.5" />
      Watch
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TokenDetail({ params }: { params: { symbol: string } }) {
  const symbol = params.symbol.toUpperCase();
  const [, setLocation] = useLocation();
  const [showFullDesc, setShowFullDesc] = useState(false);

  const { data: token, isLoading: isTokenLoading } = useGetToken(symbol, {
    query: { enabled: !!symbol, queryKey: getGetTokenQueryKey(symbol) },
  });
  const { data: scores, isLoading: isScoresLoading } = useGetTokenScores(symbol, {
    query: { enabled: !!symbol, queryKey: getGetTokenScoresQueryKey(symbol) },
  });
  const { data: aiResearch, isLoading: isAiLoading } = useGetTokenAiResearch(symbol, {
    query: { enabled: !!symbol, queryKey: getGetTokenAiResearchQueryKey(symbol) },
  });
  const { data: news, isLoading: isNewsLoading } = useGetTokenNews(symbol, {
    query: { enabled: !!symbol, queryKey: getGetTokenNewsQueryKey(symbol) },
  });
  const { data: live } = useTokenLive(symbol);

  const price = live?.price ?? token?.price;
  const change24h = live?.priceChange24h ?? token?.priceChange24h ?? 0;
  const change7d = live?.priceChange7d;
  const marketCap = live?.marketCap ?? token?.marketCap;
  const volume24h = live?.volume24h ?? token?.volume24h;

  if (isTokenLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-24 mb-4" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 md:col-span-2 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <h2 className="text-2xl font-bold mb-2">Token not found</h2>
        <p className="text-muted-foreground mb-6">Could not find data for {symbol}</p>
        <button onClick={() => setLocation("/research")}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium">
          Back to Research
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12">
      {/* Back button */}
      <button onClick={() => setLocation("/research")}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Research
      </button>

      {/* Hero section */}
      <div className="rounded-2xl p-5" style={{ background: "rgba(10,14,22,0.85)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shrink-0"
              style={{ background: "linear-gradient(135deg,#2962ff22,#4d7fff11)", border: "1px solid rgba(41,98,255,0.2)", color: "#4d7fff" }}>
              {token.symbol.substring(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-[24px] font-black text-white tracking-tight">{token.name}</h1>
                <span className="text-[14px] font-bold" style={{ color: "#4a5068" }}>{token.symbol}</span>
                {token.chain && (
                  <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider"
                    style={{ background: "rgba(41,98,255,0.15)", color: "#4d7fff", border: "1px solid rgba(41,98,255,0.2)" }}>
                    {token.chain}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                {live?.links?.homepage && (
                  <a href={live.links.homepage} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 transition-colors hover:text-white" style={{ color: "#5a6072" }}>
                    <Globe className="h-3 w-3" /> Website
                  </a>
                )}
                {live?.links?.twitter && (
                  <a href={`https://twitter.com/${live.links.twitter}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 transition-colors hover:text-white" style={{ color: "#5a6072" }}>
                    <Twitter className="h-3 w-3" /> Twitter
                  </a>
                )}
                {token.websiteUrl && !live?.links?.homepage && (
                  <a href={token.websiteUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 transition-colors hover:text-white" style={{ color: "#5a6072" }}>
                    <ExternalLink className="h-3 w-3" /> Website
                  </a>
                )}
                {token.whitepaperUrl && (
                  <a href={token.whitepaperUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 transition-colors hover:text-white" style={{ color: "#5a6072" }}>
                    <FileText className="h-3 w-3" /> Whitepaper
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[28px] font-mono font-black tracking-tight text-white">{fmtPrice(price)}</div>
              <div className="flex items-center gap-1 justify-end mt-0.5">
                <span className="flex items-center gap-0.5 text-[13px] font-bold"
                  style={{ color: change24h >= 0 ? "#26a69a" : "#ef5350" }}>
                  {change24h >= 0 ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                  {Math.abs(change24h).toFixed(2)}% <span className="text-[10px] font-normal" style={{ color: "#4a5068" }}>24h</span>
                </span>
                {change7d != null && (
                  <span className="text-[11px] font-bold ml-2"
                    style={{ color: change7d >= 0 ? "#26a69a" : "#ef5350" }}>
                    {change7d >= 0 ? "+" : ""}{change7d.toFixed(1)}% 7d
                  </span>
                )}
                {live && <span className="text-[9px] ml-1 px-1.5 py-0.5 rounded-md font-bold animate-pulse"
                  style={{ background: "rgba(38,166,154,0.15)", color: "#26a69a" }}>LIVE</span>}
              </div>
            </div>
            <WatchlistButton symbol={symbol} name={token.name} image={null} />
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          {[
            { label: "Market Cap", value: fmtLarge(marketCap) },
            { label: "24h Volume", value: fmtLarge(volume24h) },
            { label: "FDV", value: fmtLarge(live?.fdv ?? token.fdv) },
            { label: "Circulating Supply", value: formatNumber(live?.circulatingSupply ?? token.circulatingSupply ?? 0) },
          ].map(m => (
            <div key={m.label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="text-[9px] uppercase tracking-wider font-semibold mb-1" style={{ color: "#4a5068" }}>{m.label}</div>
              <div className="text-[14px] font-mono font-bold text-white">{m.value}</div>
            </div>
          ))}
        </div>

        {/* Extra stats from live data */}
        {live && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            {[
              { label: "24h High", value: fmtPrice(live.high24h) },
              { label: "24h Low", value: fmtPrice(live.low24h) },
              { label: "ATH", value: fmtPrice(live.ath) },
              { label: "ATH Change", value: `${live.athChange?.toFixed(1)}%`, color: live.athChange != null && live.athChange >= 0 ? "#26a69a" : "#ef5350" },
            ].map(m => (
              <div key={m.label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="text-[9px] uppercase tracking-wider font-semibold mb-1" style={{ color: "#4a5068" }}>{m.label}</div>
                <div className="text-[13px] font-mono font-bold" style={{ color: m.color ?? "white" }}>{m.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Price chart */}
      <PriceChart symbol={symbol} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          <div className="rounded-2xl p-5" style={{ background: "rgba(10,14,22,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-4 w-4" style={{ color: "#4d7fff" }} />
              <h3 className="text-[13px] font-bold text-white">Overview</h3>
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: "#8a92a6" }}>
              {live?.description
                ? (showFullDesc ? live.description.replace(/<[^>]+>/g, "") : live.description.replace(/<[^>]+>/g, "").slice(0, 400) + (live.description.length > 400 ? "..." : ""))
                : token.description || "No description available."}
            </p>
            {(live?.description?.length ?? 0) > 400 && (
              <button onClick={() => setShowFullDesc(f => !f)}
                className="mt-2 flex items-center gap-1 text-[11px] font-semibold transition-colors hover:text-white"
                style={{ color: "#4d7fff" }}>
                {showFullDesc ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Show more</>}
              </button>
            )}

            {token.narratives && token.narratives.length > 0 && (
              <div className="mt-4">
                <div className="text-[9px] uppercase tracking-wider font-semibold mb-2" style={{ color: "#4a5068" }}>Narratives</div>
                <div className="flex flex-wrap gap-1.5">
                  {token.narratives.map(narrative => (
                    <Link key={narrative.id} href={`/narratives/${narrative.slug}`}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all hover:bg-white/5"
                      style={{ background: "rgba(41,98,255,0.1)", color: "#4d7fff", border: "1px solid rgba(41,98,255,0.2)" }}>
                      {narrative.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Contract addresses */}
            {live?.platforms && Object.keys(live.platforms).length > 0 && (
              <div className="mt-4">
                <div className="text-[9px] uppercase tracking-wider font-semibold mb-2 flex items-center gap-1" style={{ color: "#4a5068" }}>
                  <Layers className="h-3 w-3" /> Contract Addresses
                </div>
                <div className="space-y-1">
                  {Object.entries(live.platforms).filter(([, addr]) => addr).slice(0, 3).map(([chain, addr]) => (
                    <div key={chain} className="flex items-center gap-2 text-[10px]">
                      <span className="capitalize font-semibold w-20 truncate" style={{ color: "#5a6072" }}>{chain}</span>
                      <span className="font-mono text-white truncate max-w-[220px]">{addr}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Explorer links */}
            {live?.links?.explorers && live.links.explorers.length > 0 && (
              <div className="mt-4 flex gap-2 flex-wrap">
                {live.links.explorers.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all hover:bg-white/5"
                    style={{ background: "rgba(255,255,255,0.04)", color: "#5a6072", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <ExternalLink className="h-3 w-3" /> Explorer {i + 1}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* AI Research */}
          {isAiLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : aiResearch ? (
            <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(10,14,22,0.85)", border: "1px solid rgba(41,98,255,0.2)" }}>
              <div className="px-5 py-3 flex items-center gap-3" style={{ background: "rgba(41,98,255,0.08)", borderBottom: "1px solid rgba(41,98,255,0.15)" }}>
                <BrainCircuit className="h-4 w-4" style={{ color: "#4d7fff" }} />
                <span className="text-[13px] font-bold" style={{ color: "#4d7fff" }}>AI Research Summary</span>
                <span className="ml-auto px-2 py-0.5 rounded-lg text-[9px] font-bold"
                  style={{
                    background: aiResearch.opportunityLevel === "very_high" ? "rgba(38,166,154,0.2)" : aiResearch.opportunityLevel === "high" ? "rgba(41,98,255,0.2)" : aiResearch.opportunityLevel === "low" ? "rgba(239,83,80,0.2)" : "rgba(247,147,26,0.2)",
                    color: aiResearch.opportunityLevel === "very_high" ? "#26a69a" : aiResearch.opportunityLevel === "high" ? "#4d7fff" : aiResearch.opportunityLevel === "low" ? "#ef5350" : "#f7931a",
                  }}>
                  {aiResearch.opportunityLevel.toUpperCase()} OPPORTUNITY
                </span>
              </div>
              <div className="p-5 space-y-5">
                <p className="text-[12px] leading-relaxed" style={{ color: "#8a92a6" }}>{aiResearch.summary}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold mb-2 flex items-center gap-1" style={{ color: "#26a69a" }}>
                      <ArrowUpRight className="h-3 w-3" /> Strengths
                    </div>
                    <ul className="space-y-1.5">
                      {aiResearch.strengths.map((s, i) => (
                        <li key={i} className="text-[11px] flex items-start gap-2" style={{ color: "#8a92a6" }}>
                          <span style={{ color: "#26a69a" }} className="mt-0.5">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold mb-2 flex items-center gap-1" style={{ color: "#ef5350" }}>
                      <AlertTriangle className="h-3 w-3" /> Risks
                    </div>
                    <ul className="space-y-1.5">
                      {aiResearch.risks.map((s, i) => (
                        <li key={i} className="text-[11px] flex items-start gap-2" style={{ color: "#8a92a6" }}>
                          <span style={{ color: "#ef5350" }} className="mt-0.5">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* News */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(10,14,22,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <Activity className="h-4 w-4" style={{ color: "#4d7fff" }} />
              <span className="text-[13px] font-bold text-white">Related News</span>
            </div>
            {isNewsLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : news && news.length > 0 ? (
              <div>
                {news.map(item => (
                  <a key={item.id} href={item.url} target="_blank" rel="noreferrer"
                    className="block px-5 py-3 transition-all hover:bg-white/[0.02]"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold"
                        style={{
                          background: item.sentiment === "bullish" ? "rgba(38,166,154,0.15)" : item.sentiment === "bearish" ? "rgba(239,83,80,0.15)" : "rgba(255,255,255,0.06)",
                          color: item.sentiment === "bullish" ? "#26a69a" : item.sentiment === "bearish" ? "#ef5350" : "#5a6072",
                        }}>
                        {item.sentiment.toUpperCase()}
                      </span>
                      <span className="text-[9px]" style={{ color: "#4a5068" }}>{item.source}</span>
                    </div>
                    <p className="text-[12px] text-white line-clamp-2 group-hover:text-[#4d7fff] transition-colors">{item.title}</p>
                  </a>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-[12px]" style={{ color: "#5a6072" }}>No recent news for {symbol}.</div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Intelligence Scores */}
          <div className="rounded-2xl p-5" style={{ background: "rgba(10,14,22,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-[13px] font-bold text-white mb-1">Intelligence Scores</div>
            <div className="text-[10px] mb-4" style={{ color: "#5a6072" }}>Multi-factor fundamental analysis</div>
            {isScoresLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : scores ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="text-[13px] font-bold text-white">Final Grade</span>
                  <GradeBadge grade={scores.finalGrade} size="lg" />
                </div>
                <div className="space-y-3">
                  <ScoreBar label="Overall Score" score={scores.overallScore} />
                  <ScoreBar label="Fundamental" score={scores.fundamentalScore} />
                  <ScoreBar label="Technical" score={scores.technicalScore} />
                  <ScoreBar label="Sentiment" score={scores.sentimentScore} />
                  <ScoreBar label="Risk" score={scores.riskScore} inverted />
                  <ScoreBar label="Narrative" score={scores.narrativeMomentumScore} />
                </div>
              </div>
            ) : (
              <p className="text-[12px]" style={{ color: "#5a6072" }}>Scores unavailable.</p>
            )}
          </div>

          {/* Live Market Data card */}
          {live && (
            <div className="rounded-2xl p-5" style={{ background: "rgba(10,14,22,0.85)", border: "1px solid rgba(38,166,154,0.2)" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-[#26a69a] animate-pulse" />
                <span className="text-[12px] font-bold text-white">Live Market Data</span>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Price Change 7d", value: `${live.priceChange7d >= 0 ? "+" : ""}${live.priceChange7d?.toFixed(2)}%`, color: (live.priceChange7d ?? 0) >= 0 ? "#26a69a" : "#ef5350" },
                  { label: "Price Change 30d", value: `${live.priceChange30d >= 0 ? "+" : ""}${live.priceChange30d?.toFixed(2)}%`, color: (live.priceChange30d ?? 0) >= 0 ? "#26a69a" : "#ef5350" },
                  { label: "Price Change 1y", value: `${live.priceChange1y >= 0 ? "+" : ""}${live.priceChange1y?.toFixed(2)}%`, color: (live.priceChange1y ?? 0) >= 0 ? "#26a69a" : "#ef5350" },
                  { label: "Max Supply", value: live.maxSupply ? formatNumber(live.maxSupply) : "∞" },
                  { label: "Total Supply", value: live.totalSupply ? formatNumber(live.totalSupply) : "—" },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span className="text-[10px]" style={{ color: "#5a6072" }}>{row.label}</span>
                    <span className="text-[11px] font-bold font-mono" style={{ color: row.color ?? "white" }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ScoreBar({ label, score, inverted = false }: { label: string; score: number; inverted?: boolean }) {
  let barColor = "#2962ff";
  if (inverted) {
    barColor = score > 70 ? "#ef5350" : score > 40 ? "#f7931a" : "#26a69a";
  } else {
    barColor = score < 40 ? "#ef5350" : score < 70 ? "#f7931a" : "#26a69a";
  }
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span style={{ color: "#5a6072" }}>{label}</span>
        <span className="font-mono font-bold text-white">{score}</span>
      </div>
      <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: barColor }} />
      </div>
    </div>
  );
}

function GradeBadge({ grade, size = "md" }: { grade?: string | null; size?: "sm" | "md" | "lg" }) {
  if (!grade) return <span style={{ color: "#5a6072" }}>--</span>;

  const color = grade.startsWith("A") ? "#26a69a" : grade.startsWith("B") ? "#4d7fff" : grade.startsWith("C") ? "#f7931a" : "#ef5350";
  const sizeMap = { sm: "text-[10px] px-2 py-0.5", md: "text-[12px] px-2.5 py-1", lg: "text-[18px] px-3 py-1.5" };

  return (
    <span className={`inline-flex items-center justify-center rounded-xl font-black ${sizeMap[size]}`}
      style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
      {grade}
    </span>
  );
}
