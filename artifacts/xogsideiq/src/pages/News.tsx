import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Newspaper, TrendingUp, TrendingDown, Minus, Flame, Clock, ExternalLink,
  Hash, Zap, AlertTriangle, Globe, Filter, RefreshCw, Search, Activity,
  BarChart2, Radio, Twitter, MessageCircle,
} from "lucide-react";
import {
  useCryptoNews, summariseSources, summariseTrending, summariseSentiment,
  type EnrichedNewsArticle, type NewsCategory,
} from "@/hooks/use-crypto-news";

// ── helpers ────────────────────────────────────────────────────────────────
function timeAgo(unixSec: number) {
  const s = Math.max(1, Math.floor(Date.now() / 1000 - unixSec));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const SENT_STYLE = {
  BULLISH: { color: "#26a69a", bg: "rgba(38,166,154,0.12)", border: "rgba(38,166,154,0.3)", icon: TrendingUp, label: "Bullish" },
  BEARISH: { color: "#ef5350", bg: "rgba(239,83,80,0.12)",  border: "rgba(239,83,80,0.3)",  icon: TrendingDown, label: "Bearish" },
  NEUTRAL: { color: "#787b86", bg: "rgba(120,123,134,0.12)", border: "rgba(120,123,134,0.3)", icon: Minus, label: "Neutral" },
} as const;

const IMPACT_STYLE = {
  HIGH:   { color: "#ef5350", label: "HIGH" },
  MEDIUM: { color: "#f7931a", label: "MED" },
  LOW:    { color: "#787b86", label: "LOW" },
} as const;

const CATEGORIES: { id: NewsCategory; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "BTC", label: "Bitcoin" },
  { id: "ETH", label: "Ethereum" },
  { id: "ETF", label: "ETF" },
  { id: "REGULATION", label: "Regulation" },
  { id: "DEFI", label: "DeFi" },
  { id: "INSTITUTIONAL", label: "Institutional" },
  { id: "LAYER2", label: "Layer 2" },
  { id: "NFT", label: "NFT" },
  { id: "TECH", label: "Tech" },
  { id: "AI", label: "AI" },
  { id: "MEMES", label: "Memes" },
];

// ── Breaking Ticker ────────────────────────────────────────────────────────
function BreakingTicker({ articles }: { articles: EnrichedNewsArticle[] }) {
  const top = articles.filter(a => a.impact === "HIGH").slice(0, 10);
  if (top.length === 0) return null;
  return (
    <div className="relative overflow-hidden rounded-2xl"
      style={{
        background: "linear-gradient(90deg, rgba(239,83,80,0.12), rgba(247,147,26,0.06) 30%, rgba(13,17,26,0.6))",
        border: "1px solid rgba(239,83,80,0.22)",
      }}>
      <div className="absolute top-0 left-0 h-full px-3 flex items-center gap-1.5 z-10"
        style={{ background: "linear-gradient(90deg, #ef5350, #f7931a)", boxShadow: "0 0 20px rgba(239,83,80,0.5)" }}>
        <Radio className="w-3 h-3 text-white animate-pulse" />
        <span className="text-[10px] font-black tracking-wider text-white">BREAKING</span>
      </div>
      <div className="overflow-hidden py-2 pl-[120px] pr-3">
        <motion.div
          className="flex gap-8 whitespace-nowrap"
          animate={{ x: [0, -1200] }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        >
          {[...top, ...top].map((a, i) => (
            <a key={`${a.id}-${i}`} href={a.url} target="_blank" rel="noreferrer"
              className="text-[11px] font-medium hover:text-white transition-colors"
              style={{ color: "#d1d4dc" }}>
              <span style={{ color: "#ef5350" }}>● </span>
              {a.title}
              <span className="ml-2 text-[10px]" style={{ color: "#5a6072" }}>— {a.source}</span>
            </a>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

// ── Hero stat card ─────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon: Icon, sub }: {
  label: string; value: string; color: string; icon: React.ElementType; sub?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl p-3"
      style={{
        background: "linear-gradient(135deg, rgba(13,17,26,0.85), rgba(5,8,16,0.92))",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
      <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full blur-2xl opacity-30" style={{ background: color }} />
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#787b86" }}>{label}</span>
        <span style={{ color, display: "inline-flex" }}><Icon className="w-3.5 h-3.5" /></span>
      </div>
      <div className="font-mono text-[18px] font-black" style={{ color }}>{value}</div>
      {sub && <div className="text-[9px] mt-0.5" style={{ color: "#5a6072" }}>{sub}</div>}
    </div>
  );
}

// ── Article card ───────────────────────────────────────────────────────────
function ArticleCard({ article, expanded, onToggle }: {
  article: EnrichedNewsArticle; expanded: boolean; onToggle: () => void;
}) {
  const sent = SENT_STYLE[article.sentiment];
  const imp = IMPACT_STYLE[article.impact];
  const SentIcon = sent.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(13,17,26,0.85), rgba(5,8,16,0.92))",
        border: `1px solid ${expanded ? sent.border : "rgba(255,255,255,0.06)"}`,
        boxShadow: expanded ? `0 8px 32px ${sent.border}` : "none",
      }}
    >
      <button onClick={onToggle} className="w-full text-left p-3 hover:bg-white/[0.02] transition-colors">
        <div className="flex gap-3">
          {/* Thumb */}
          {article.imageurl && (
            <div className="hidden sm:block flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
              <img src={article.imageurl} alt="" loading="lazy"
                className="w-full h-full object-cover"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            </div>
          )}
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded" style={{ background: `${imp.color}22`, color: imp.color, border: `1px solid ${imp.color}44` }}>
                {imp.label}
              </span>
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                style={{ background: sent.bg, color: sent.color, border: `1px solid ${sent.border}` }}>
                <SentIcon className="w-2.5 h-2.5" /> {sent.label}
              </span>
              <span className="text-[9px]" style={{ color: "#787b86" }}>{article.source}</span>
              <span className="text-[9px]" style={{ color: "#5a6072" }}>·</span>
              <span className="text-[9px] inline-flex items-center gap-0.5" style={{ color: "#5a6072" }}>
                <Clock className="w-2.5 h-2.5" /> {timeAgo(article.published_on)}
              </span>
            </div>
            <div className="text-[13px] font-bold text-white leading-snug mb-1 line-clamp-2">
              {article.title}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {article.relatedCoins.slice(0, 4).map(c => (
                <span key={c} className="text-[8px] font-black px-1.5 py-0.5 rounded font-mono"
                  style={{ background: "rgba(41,98,255,0.12)", color: "#2962ff", border: "1px solid rgba(41,98,255,0.22)" }}>
                  ${c}
                </span>
              ))}
              {article.aiCategory !== "ALL" && (
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(124,58,237,0.12)", color: "#a855f7", border: "1px solid rgba(124,58,237,0.22)" }}>
                  {article.aiCategory}
                </span>
              )}
              <span className="ml-auto text-[8px] font-mono" style={{ color: sent.color }}>
                AI {article.sentimentScore}
              </span>
            </div>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}
          >
            <div className="p-3 space-y-2.5">
              {/* AI Summary */}
              <div className="text-[11px] leading-relaxed" style={{ color: "#d1d4dc" }}>
                {article.body.slice(0, 360)}{article.body.length > 360 ? "…" : ""}
              </div>
              {/* AI sentiment bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#787b86" }}>
                    AI Sentiment Score
                  </span>
                  <span className="text-[10px] font-mono font-bold" style={{ color: sent.color }}>
                    {article.sentimentScore} / 100
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${article.sentimentScore}%` }}
                    transition={{ duration: 0.6 }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${sent.color}88, ${sent.color})` }}
                  />
                </div>
              </div>
              {/* Reactions / link */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3 text-[10px]" style={{ color: "#787b86" }}>
                  <span className="inline-flex items-center gap-1"><TrendingUp className="w-3 h-3" style={{ color: "#26a69a" }} />{article.upvotes}</span>
                  <span className="inline-flex items-center gap-1"><TrendingDown className="w-3 h-3" style={{ color: "#ef5350" }} />{article.downvotes}</span>
                  {article.tags.length > 0 && (
                    <span className="inline-flex items-center gap-1"><Hash className="w-3 h-3" />{article.tags.length} tags</span>
                  )}
                </div>
                <a href={article.url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors hover:text-white"
                  style={{ background: "rgba(41,98,255,0.12)", color: "#2962ff", border: "1px solid rgba(41,98,255,0.25)" }}>
                  Read full article <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Social rail (deterministic mock derived from real news) ────────────────
function SocialSentiment({ sentiment }: { sentiment: ReturnType<typeof summariseSentiment> }) {
  // Spread the real news sentiment across "platforms" with deterministic offsets.
  const platforms = [
    { name: "X / Twitter", icon: Twitter,        color: "#1da1f2", offset: 4,  vol: "428K posts/24h" },
    { name: "Reddit",      icon: MessageCircle,  color: "#ff4500", offset: -3, vol: "62K threads" },
    { name: "Telegram",    icon: MessageCircle,  color: "#26a5e4", offset: 7,  vol: "1.2M msgs" },
    { name: "Discord",     icon: MessageCircle,  color: "#5865f2", offset: 1,  vol: "892K msgs" },
  ];
  return (
    <div className="space-y-2">
      {platforms.map(p => {
        const score = Math.max(5, Math.min(95, Math.round(sentiment.avg + p.offset)));
        const tone = score >= 60 ? "#26a69a" : score <= 40 ? "#ef5350" : "#787b86";
        const Icon = p.icon;
        return (
          <div key={p.name} className="p-2.5 rounded-xl"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span style={{ color: p.color, display: "inline-flex" }}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="text-[10px] font-bold text-white">{p.name}</span>
              </div>
              <span className="text-[10px] font-mono font-bold" style={{ color: tone }}>{score}</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden mb-1" style={{ background: "rgba(255,255,255,0.05)" }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.6 }}
                className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${tone}88, ${tone})` }} />
            </div>
            <div className="text-[9px]" style={{ color: "#5a6072" }}>{p.vol}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function News() {
  const { articles, loading, error, lastUpdated, refresh } = useCryptoNews(60_000);
  const [cat, setCat] = useState<NewsCategory>("ALL");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [sentFilter, setSentFilter] = useState<"ALL" | "BULLISH" | "BEARISH" | "NEUTRAL">("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  const sources = useMemo(() => summariseSources(articles), [articles]);
  const trending = useMemo(() => summariseTrending(articles), [articles]);
  const sentSummary = useMemo(() => summariseSentiment(articles), [articles]);

  const filtered = useMemo(() => {
    return articles.filter(a => {
      if (cat !== "ALL" && a.aiCategory !== cat && !a.relatedCoins.includes(cat)) return false;
      if (sourceFilter !== "ALL" && a.source_key !== sourceFilter) return false;
      if (sentFilter !== "ALL" && a.sentiment !== sentFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!a.title.toLowerCase().includes(q) && !a.body.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [articles, cat, search, sourceFilter, sentFilter]);

  const breakingCount = articles.filter(a => a.impact === "HIGH").length;
  const last1h = articles.filter(a => Date.now() / 1000 - a.published_on < 3600).length;

  return (
    <div className="p-3 md:p-5 space-y-4 max-w-[1600px] mx-auto">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-4 md:p-5"
        style={{
          background: "linear-gradient(135deg, rgba(239,83,80,0.10), rgba(247,147,26,0.05) 40%, rgba(13,17,26,0.92))",
          border: "1px solid rgba(239,83,80,0.18)",
        }}
      >
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-25"
          style={{ background: "radial-gradient(circle, #ef535080, transparent)" }} />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 2, repeat: Infinity }}
              className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #ef5350, #f7931a)",
                boxShadow: "0 0 40px rgba(239,83,80,0.5), 0 0 80px rgba(239,83,80,0.25)",
              }}
            >
              <Newspaper className="w-5 h-5 text-white" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[20px] md:text-[26px] font-black tracking-tight text-white">
                  Crypto News Intelligence
                </h1>
                <span className="text-[9px] font-bold px-2 py-1 rounded-full inline-flex items-center gap-1"
                  style={{ background: "rgba(38,166,154,0.15)", color: "#26a69a", border: "1px solid rgba(38,166,154,0.3)" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#26a69a] animate-pulse" /> LIVE · 60s
                </span>
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: "#787b86" }}>
                {loading
                  ? "Loading aggregated crypto news…"
                  : error
                    ? <span style={{ color: "#ef5350" }}>Source temporarily unavailable — retrying…</span>
                    : <>Aggregating <span className="text-white font-bold">{articles.length}</span> stories from <span className="text-white font-bold">{sources.length}</span> sources · {breakingCount} breaking · updated {lastUpdated ? timeAgo(Math.floor(lastUpdated / 1000)) : "just now"}</>
                }
              </div>
            </div>
          </div>

          {/* Search + refresh */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#5a6072" }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search news, coins, topics…"
                className="pl-8 pr-3 py-2 text-[11px] rounded-xl outline-none w-full md:w-64"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#d1d4dc" }}
              />
            </div>
            <button onClick={refresh}
              className="p-2 rounded-xl transition-colors hover:text-white"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#787b86" }}
              aria-label="Refresh news"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 relative">
          <StatCard label="Total Stories" value={String(articles.length)} color="#2962ff" icon={Globe} />
          <StatCard label="Breaking" value={String(breakingCount)} color="#ef5350" icon={Flame} sub="HIGH impact" />
          <StatCard label="Last Hour" value={String(last1h)} color="#f7931a" icon={Clock} sub="fresh stories" />
          <StatCard label="Sources" value={String(sources.length)} color="#26a69a" icon={Radio} sub="aggregated" />
          <StatCard label="Avg Sentiment" value={`${Math.round(sentSummary.avg)}`} color="#a855f7" icon={Activity} sub={`${Math.round(sentSummary.bullPct)}% bull · ${Math.round(sentSummary.bearPct)}% bear`} />
        </div>
      </motion.div>

      {/* Breaking ticker */}
      <BreakingTicker articles={articles} />

      {/* ── CATEGORY TABS ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {CATEGORIES.map(c => {
          const active = cat === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className="px-3 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all"
              style={{
                background: active ? "rgba(239,83,80,0.18)" : "rgba(255,255,255,0.03)",
                color: active ? "#ef5350" : "#787b86",
                border: `1px solid ${active ? "rgba(239,83,80,0.4)" : "rgba(255,255,255,0.06)"}`,
                boxShadow: active ? "0 0 16px rgba(239,83,80,0.2)" : "none",
              }}
            >
              {c.label}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-1.5">
          <select aria-label="Filter by sentiment" value={sentFilter} onChange={e => setSentFilter(e.target.value as typeof sentFilter)}
            className="text-[10px] px-2 py-1.5 rounded-lg outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#d1d4dc" }}>
            <option value="ALL">All Sentiment</option>
            <option value="BULLISH">Bullish</option>
            <option value="NEUTRAL">Neutral</option>
            <option value="BEARISH">Bearish</option>
          </select>
          <select aria-label="Filter by source" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
            className="text-[10px] px-2 py-1.5 rounded-lg outline-none max-w-[140px]"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#d1d4dc" }}>
            <option value="ALL">All Sources</option>
            {sources.slice(0, 30).map(s => (
              <option key={s.key} value={s.key}>{s.name} ({s.count})</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── LAYOUT ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* MAIN FEED */}
        <div className="space-y-2.5">
          {loading && articles.length === 0 && (
            <div className="space-y-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 rounded-2xl animate-pulse"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }} />
              ))}
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <Filter className="w-8 h-8 mx-auto mb-2" style={{ color: "#5a6072" }} />
              <div className="text-[12px] font-bold text-white">No stories match your filters</div>
              <div className="text-[10px] mt-1" style={{ color: "#5a6072" }}>Try a different category, source, or clear search</div>
            </div>
          )}
          <AnimatePresence mode="popLayout">
            {filtered.map(a => (
              <ArticleCard
                key={a.id}
                article={a}
                expanded={expanded === a.id}
                onToggle={() => setExpanded(expanded === a.id ? null : a.id)}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-4">
          {/* Trending */}
          <div className="rounded-2xl p-3"
            style={{ background: "linear-gradient(135deg, rgba(13,17,26,0.85), rgba(5,8,16,0.92))", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-1.5 mb-2.5">
              <Flame className="w-3.5 h-3.5" style={{ color: "#f7931a" }} />
              <span className="text-[10px] font-black uppercase tracking-wider text-white">Trending Now</span>
            </div>
            <div className="space-y-1.5">
              {trending.length === 0 && <div className="text-[10px]" style={{ color: "#5a6072" }}>Calculating…</div>}
              {trending.map((t, i) => (
                <button key={t.tag} onClick={() => setCat(t.tag as NewsCategory)}
                  className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-white/[0.03] transition-colors text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold w-4" style={{ color: i < 3 ? "#f7931a" : "#5a6072" }}>#{i + 1}</span>
                    <span className="text-[11px] font-bold text-white">{t.tag}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-1 w-12 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${Math.min(100, (t.weight / (trending[0]?.weight || 1)) * 100)}%`, background: "linear-gradient(90deg, #f7931a, #ef5350)" }} />
                    </div>
                    <Zap className="w-2.5 h-2.5" style={{ color: "#f7931a" }} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Social */}
          <div className="rounded-2xl p-3"
            style={{ background: "linear-gradient(135deg, rgba(13,17,26,0.85), rgba(5,8,16,0.92))", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-1.5 mb-2.5">
              <BarChart2 className="w-3.5 h-3.5" style={{ color: "#2962ff" }} />
              <span className="text-[10px] font-black uppercase tracking-wider text-white">Social Sentiment</span>
            </div>
            <SocialSentiment sentiment={sentSummary} />
          </div>

          {/* Top sources */}
          <div className="rounded-2xl p-3"
            style={{ background: "linear-gradient(135deg, rgba(13,17,26,0.85), rgba(5,8,16,0.92))", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-1.5 mb-2.5">
              <Globe className="w-3.5 h-3.5" style={{ color: "#26a69a" }} />
              <span className="text-[10px] font-black uppercase tracking-wider text-white">Top Sources</span>
            </div>
            <div className="space-y-1">
              {sources.slice(0, 8).map(s => (
                <button key={s.key} onClick={() => setSourceFilter(s.key === sourceFilter ? "ALL" : s.key)}
                  className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors text-left">
                  <span className="text-[10px] font-bold truncate"
                    style={{ color: sourceFilter === s.key ? "#26a69a" : "#d1d4dc" }}>
                    {s.name}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(38,166,154,0.1)", color: "#26a69a" }}>
                    {s.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="p-2.5 rounded-xl text-[9px] leading-relaxed"
            style={{ background: "rgba(247,147,26,0.04)", border: "1px solid rgba(247,147,26,0.15)", color: "#787b86" }}>
            <div className="flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "#f7931a" }} />
              <span>News aggregated live from 30+ crypto outlets. AI sentiment and impact scores are model estimates — always verify before trading.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
