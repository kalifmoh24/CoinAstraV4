import React, { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, Unlock, AlertTriangle, Calendar, Clock, TrendingUp, TrendingDown,
  Filter, Search, Zap, Brain, Flame, Shield, Activity, ChevronRight,
  Bell, BarChart3, LayoutGrid, List, Layers, Sparkles, RefreshCw,
} from "lucide-react";
import { useAllCoins } from "@/hooks/use-all-coins";
import {
  buildUnlockEvent, hasUnlocks, impactColor, impactLabel,
  fmtCompactUSD, fmtCompactNum, formatCountdown, catColor, catLabel,
  type UnlockEvent, type ImpactLevel,
} from "@/lib/unlocks";

// ─── Tab definitions ──────────────────────────────────────────────────────────
type TabId = "today" | "7d" | "30d" | "upcoming" | "large" | "high_risk" | "completed" | "historical";
const TABS: { id: TabId; label: string; icon: typeof Calendar }[] = [
  { id: "today",      label: "Today",          icon: Clock },
  { id: "7d",         label: "7 Days",         icon: Calendar },
  { id: "30d",        label: "30 Days",        icon: Calendar },
  { id: "upcoming",   label: "Upcoming",       icon: Unlock },
  { id: "large",      label: "Large Unlocks",  icon: Flame },
  { id: "high_risk",  label: "High Risk",      icon: AlertTriangle },
  { id: "completed",  label: "Completed",      icon: Shield },
  { id: "historical", label: "Historical",     icon: BarChart3 },
];

type ViewMode = "grid" | "list" | "calendar";

// ─── Tiny inline countdown ───────────────────────────────────────────────────
function Countdown({ target }: { target: number }) {
  const [, force] = useState(0);
  useEffect(() => { const t = setInterval(() => force(x => x + 1), 1000); return () => clearInterval(t); }, []);
  const { days, hours, minutes, seconds, expired } = formatCountdown(target);
  if (expired) return <span className="font-mono text-[10px]" style={{ color: "#ef5350" }}>UNLOCKING…</span>;
  return (
    <span className="font-mono text-[10px] tracking-tight" style={{ color: "#d1d4dc" }}>
      <span style={{ color: "#7c3aed" }}>{days}</span>d{" "}
      <span style={{ color: "#7c3aed" }}>{String(hours).padStart(2, "0")}</span>h{" "}
      <span style={{ color: "#7c3aed" }}>{String(minutes).padStart(2, "0")}</span>m{" "}
      <span style={{ color: "#26a69a" }}>{String(seconds).padStart(2, "0")}</span>s
    </span>
  );
}

// ─── Animated counter ────────────────────────────────────────────────────────
function AnimCount({ value, format = fmtCompactUSD, className = "", style }: {
  value: number; format?: (n: number) => string; className?: string; style?: React.CSSProperties;
}) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const start = display;
    const startT = performance.now();
    const dur = 600;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - startT) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(start + (value - start) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className} style={style}>{format(display)}</span>;
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function Unlocks() {
  const { coins, ready } = useAllCoins();
  const [tab, setTab] = useState<TabId>("upcoming");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [impactFilter, setImpactFilter] = useState<"ALL" | ImpactLevel>("ALL");
  const [mcapFilter, setMcapFilter] = useState<"ALL" | "MEGA" | "LARGE" | "MID" | "SMALL">("ALL");
  const [refreshTick, setRefreshTick] = useState(0);

  // Background refresh every 30s
  useEffect(() => { const t = setInterval(() => setRefreshTick(x => x + 1), 30_000); return () => clearInterval(t); }, []);

  // Build unlock events from real coin data (top 800, those that have vesting)
  const events: UnlockEvent[] = useMemo(() => {
    const pool = coins.slice(0, 800).filter(hasUnlocks);
    return pool.map(c => buildUnlockEvent(c)).sort((a, b) => a.nextUnlock.date - b.nextUnlock.date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coins, refreshTick]);

  // ── Aggregate analytics ─────────────────────────────────────────────────────
  const now = Date.now();
  const weekMs = 7 * 86_400_000;
  const dayMs = 86_400_000;
  const monthMs = 30 * 86_400_000;

  const analytics = useMemo(() => {
    const inWeek = events.filter(e => e.nextUnlock.date - now < weekMs && e.nextUnlock.date >= now);
    const today = events.filter(e => e.nextUnlock.date - now < dayMs && e.nextUnlock.date >= now);
    const totalValueWeek = inWeek.reduce((s, e) => s + e.nextUnlock.usdValue, 0);
    const largestToday = today.length ? today.reduce((a, b) => a.nextUnlock.usdValue > b.nextUnlock.usdValue ? a : b) : null;
    const highestRisk = events.length ? events.reduce((a, b) => a.ai.dangerScore > b.ai.dangerScore ? a : b) : null;
    const biggestCliff = events.filter(e => e.vestingType === "CLIFF" && e.nextUnlock.date < now + monthMs);
    const biggestCliffEvt = biggestCliff.length ? biggestCliff.reduce((a, b) => a.nextUnlock.usdValue > b.nextUnlock.usdValue ? a : b) : null;
    return { inWeek, today, totalValueWeek, largestToday, highestRisk, biggestCliffEvt };
  }, [events, now]);

  // ── Filter by tab + search + filters ────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = events;
    if (tab === "today")      list = list.filter(e => e.nextUnlock.date - now < dayMs && e.nextUnlock.date >= now);
    if (tab === "7d")         list = list.filter(e => e.nextUnlock.date - now < weekMs && e.nextUnlock.date >= now);
    if (tab === "30d")        list = list.filter(e => e.nextUnlock.date - now < monthMs && e.nextUnlock.date >= now);
    if (tab === "upcoming")   list = list.filter(e => e.nextUnlock.date >= now);
    if (tab === "large")      list = [...list].sort((a, b) => b.nextUnlock.usdValue - a.nextUnlock.usdValue).slice(0, 200);
    if (tab === "high_risk")  list = list.filter(e => e.impact === "EXTREME" || e.impact === "HIGH").sort((a, b) => b.ai.dangerScore - a.ai.dangerScore);
    if (tab === "completed")  list = events.flatMap(e => e.pastUnlocks.length ? [e] : []);
    if (tab === "historical") list = events.flatMap(e => e.pastUnlocks.length >= 3 ? [e] : []);

    if (impactFilter !== "ALL") list = list.filter(e => e.impact === impactFilter);
    if (mcapFilter !== "ALL") list = list.filter(e => {
      const m = e.coin.market_cap;
      if (mcapFilter === "MEGA")  return m > 10e9;
      if (mcapFilter === "LARGE") return m > 1e9 && m <= 10e9;
      if (mcapFilter === "MID")   return m > 100e6 && m <= 1e9;
      return m <= 100e6;
    });
    if (search) {
      const q = search.toLowerCase().trim();
      list = list.filter(e => e.coin.symbol.toLowerCase().includes(q) || e.coin.name.toLowerCase().includes(q));
    }
    return list;
  }, [events, tab, impactFilter, mcapFilter, search, now]);

  // Top 5 AI high-risk for the alert strip
  const aiHighRisk = useMemo(() => [...events].sort((a, b) => b.ai.dangerScore - a.ai.dangerScore).slice(0, 5), [events]);

  return (
    <div className="space-y-4 p-3 md:p-5 max-w-[1600px] mx-auto">
      {/* ── HERO HEADER ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-5 md:p-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(41,98,255,0.12) 50%, rgba(239,68,68,0.08) 100%)",
          border: "1px solid rgba(124,58,237,0.28)",
          boxShadow: "0 8px 48px rgba(124,58,237,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}>
        {/* Bg glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(239,68,68,0.18), transparent 70%)" }} />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.16), transparent 70%)" }} />

        <div className="relative flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <motion.div
                animate={{ rotate: [0, 8, 0, -6, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="w-9 h-9 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#7c3aed,#2962ff)", boxShadow: "0 0 24px rgba(124,58,237,0.5)" }}>
                <Unlock className="h-4 w-4 text-white" />
              </motion.div>
              <h1 className="text-[22px] md:text-[26px] font-black tracking-tight"
                style={{ background: "linear-gradient(130deg,#fff 0%,#c4b5fd 50%,#7c3aed 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Token Unlock Intelligence
              </h1>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                style={{ background: "rgba(38,166,154,0.15)", color: "#26a69a", border: "1px solid rgba(38,166,154,0.3)" }}>
                <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.6, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-[#26a69a]" />
                LIVE · 30s
              </div>
            </div>
            <p className="text-[12px]" style={{ color: "#5a6072" }}>
              {ready ? `Tracking ${events.length} tokens · ${analytics.inWeek.length} unlocks this week · $${(analytics.totalValueWeek / 1e6).toFixed(0)}M total` : "Loading unlock intelligence engine…"}
            </p>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl w-full sm:w-72"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Search className="h-3.5 w-3.5" style={{ color: "#5a6072" }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search token, ticker, narrative…"
              className="flex-1 bg-transparent text-[11px] outline-none text-foreground"
              style={{ caretColor: "#7c3aed" }} />
            {search && <button onClick={() => setSearch("")} className="text-[10px]" style={{ color: "#5a6072" }}>×</button>}
          </div>
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5 relative">
          {[
            { label: "Unlocks Today",      val: analytics.today.length,   color: "#7c3aed", icon: Clock,         fmt: (n: number) => Math.round(n).toString() },
            { label: "This Week",          val: analytics.inWeek.length,  color: "#2962ff", icon: Calendar,      fmt: (n: number) => Math.round(n).toString() },
            { label: "Weekly Value",       val: analytics.totalValueWeek, color: "#26a69a", icon: TrendingUp,    fmt: fmtCompactUSD },
            { label: "High Risk",          val: events.filter(e => e.impact === "HIGH" || e.impact === "EXTREME").length, color: "#ef5350", icon: AlertTriangle, fmt: (n: number) => Math.round(n).toString() },
            { label: "Largest Today",      val: analytics.largestToday?.nextUnlock.usdValue ?? 0,                color: "#f7931a", icon: Flame, fmt: fmtCompactUSD },
            { label: "Biggest Cliff",      val: analytics.biggestCliffEvt?.nextUnlock.usdValue ?? 0,             color: "#ec4899", icon: Layers, fmt: fmtCompactUSD },
          ].map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-2xl p-3 backdrop-blur-sm"
              style={{
                background: "rgba(13,17,26,0.65)",
                border: `1px solid ${s.color}22`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px ${s.color}11`,
              }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[8px] font-black uppercase tracking-wider" style={{ color: s.color + "aa" }}>{s.label}</span>
                <s.icon className="h-3 w-3" style={{ color: s.color }} />
              </div>
              <AnimCount value={s.val} format={s.fmt} className="text-[15px] md:text-[17px] font-black font-mono" style={{ color: s.color }} />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── AI HIGH-RISK STRIP ─────────────────────────────────────────────── */}
      {aiHighRisk.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}
          className="rounded-2xl p-3.5"
          style={{
            background: "linear-gradient(95deg, rgba(239,68,68,0.12) 0%, rgba(247,147,26,0.10) 100%)",
            border: "1px solid rgba(239,68,68,0.28)",
          }}>
          <div className="flex items-center gap-2 mb-2.5">
            <Brain className="h-3.5 w-3.5" style={{ color: "#ef4444" }} />
            <span className="text-[12px] font-black text-white">AI Detected High-Risk Unlocks</span>
            <div className="px-1.5 py-0.5 rounded-md text-[8px] font-black"
              style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.35)" }}>
              ALERT
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {aiHighRisk.map((e, i) => (
              <Link key={e.coin.id} href={`/unlocks/${e.coin.symbol.toLowerCase()}`}>
                <motion.div
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="p-2.5 rounded-xl cursor-pointer"
                  style={{ background: "rgba(0,0,0,0.35)", border: `1px solid ${impactColor(e.impact)}40` }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    {e.coin.image && <img src={e.coin.image} alt={e.coin.symbol} className="w-6 h-6 rounded-full" />}
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-black text-white truncate uppercase">{e.coin.symbol}</div>
                      <div className="text-[8px] truncate" style={{ color: "#5a6072" }}>{e.coin.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[12px] font-black" style={{ color: impactColor(e.impact) }}>{e.ai.dangerScore}</div>
                      <div className="text-[7px]" style={{ color: "#5a6072" }}>DANGER</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="font-mono" style={{ color: "#d1d4dc" }}>{fmtCompactUSD(e.nextUnlock.usdValue)}</span>
                    <Countdown target={e.nextUnlock.date} />
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── TABS + VIEW SWITCH ─────────────────────────────────────────────── */}
      <div className="rounded-2xl p-2.5 sticky top-0 z-20"
        style={{ background: "rgba(7,10,18,0.92)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(16px)" }}>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap"
                style={{
                  background: active ? "linear-gradient(135deg,rgba(124,58,237,0.25),rgba(41,98,255,0.18))" : "rgba(255,255,255,0.03)",
                  color: active ? "#c4b5fd" : "#5a6072",
                  border: active ? "1px solid rgba(124,58,237,0.5)" : "1px solid rgba(255,255,255,0.06)",
                  boxShadow: active ? "0 0 16px rgba(124,58,237,0.25)" : "none",
                }}>
                <t.icon className="h-3 w-3" />
                {t.label}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-1 shrink-0">
            {/* Impact filter */}
            <select aria-label="Filter by impact level" value={impactFilter} onChange={e => setImpactFilter(e.target.value as "ALL" | ImpactLevel)}
              className="bg-transparent text-[10px] px-2 py-1.5 rounded-lg outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#d1d4dc" }}>
              <option value="ALL">All Impact</option>
              <option value="EXTREME">Extreme</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <select aria-label="Filter by market cap" value={mcapFilter} onChange={e => setMcapFilter(e.target.value as typeof mcapFilter)}
              className="bg-transparent text-[10px] px-2 py-1.5 rounded-lg outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#d1d4dc" }}>
              <option value="ALL">All MCap</option>
              <option value="MEGA">$10B+</option>
              <option value="LARGE">$1B–$10B</option>
              <option value="MID">$100M–$1B</option>
              <option value="SMALL">&lt;$100M</option>
            </select>
            <div className="flex items-center rounded-lg overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {([
                { id: "grid" as ViewMode, icon: LayoutGrid },
                { id: "list" as ViewMode, icon: List },
                { id: "calendar" as ViewMode, icon: Calendar },
              ]).map(v => (
                <button key={v.id} onClick={() => setView(v.id)}
                  className="px-2 py-1.5 transition-all"
                  style={{
                    background: view === v.id ? "rgba(124,58,237,0.2)" : "transparent",
                    color: view === v.id ? "#c4b5fd" : "#5a6072",
                  }}>
                  <v.icon className="h-3 w-3" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── RESULTS ──────────────────────────────────────────────────────────── */}
      {!ready && filtered.length === 0 ? (
        <SkeletonGrid />
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : view === "grid" ? (
        <UnlockGrid events={filtered.slice(0, 60)} />
      ) : view === "list" ? (
        <UnlockList events={filtered.slice(0, 150)} />
      ) : (
        <CalendarView events={filtered.slice(0, 80)} />
      )}
    </div>
  );
}

// ─── Grid card ───────────────────────────────────────────────────────────────
function UnlockGrid({ events }: { events: UnlockEvent[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      <AnimatePresence>
        {events.map((e, i) => (
          <motion.div key={e.coin.id}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ delay: Math.min(0.3, i * 0.015) }}
            whileHover={{ y: -3 }}
            layout>
            <Link href={`/unlocks/${e.coin.symbol.toLowerCase()}`}>
              <UnlockCard evt={e} />
            </Link>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function UnlockCard({ evt }: { evt: UnlockEvent }) {
  const c = evt.coin;
  const ic = impactColor(evt.impact);
  return (
    <div className="rounded-2xl p-3.5 cursor-pointer relative overflow-hidden h-full"
      style={{
        background: "rgba(10,14,22,0.85)",
        border: `1px solid ${ic}33`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px ${ic}10`,
      }}>
      <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full opacity-30"
        style={{ background: `radial-gradient(circle, ${ic}55, transparent 70%)` }} />

      <div className="flex items-center gap-2.5 mb-3 relative">
        {c.image && <img src={c.image} alt={c.symbol} className="w-9 h-9 rounded-full shrink-0" loading="lazy" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-black text-white uppercase">{c.symbol}</span>
            <span className="text-[8px] px-1 py-0.5 rounded font-mono" style={{ background: "rgba(255,255,255,0.06)", color: "#5a6072" }}>
              #{c.market_cap_rank ?? "—"}
            </span>
          </div>
          <div className="text-[10px] truncate" style={{ color: "#5a6072" }}>{c.name}</div>
        </div>
        <div className="px-2 py-1 rounded-lg text-[8px] font-black"
          style={{ background: `${ic}1f`, color: ic, border: `1px solid ${ic}40` }}>
          {evt.impact}
        </div>
      </div>

      {/* Price row */}
      <div className="flex items-center justify-between mb-2.5 text-[10px]">
        <div>
          <div className="text-[7px] uppercase tracking-wider" style={{ color: "#3a4058" }}>Price</div>
          <div className="font-mono font-bold text-white">${c.current_price < 1 ? c.current_price.toFixed(5) : c.current_price.toLocaleString("en", { maximumFractionDigits: 2 })}</div>
        </div>
        <div>
          <div className="text-[7px] uppercase tracking-wider" style={{ color: "#3a4058" }}>MCap</div>
          <div className="font-mono font-bold" style={{ color: "#26a69a" }}>{fmtCompactUSD(c.market_cap)}</div>
        </div>
        <div>
          <div className="text-[7px] uppercase tracking-wider" style={{ color: "#3a4058" }}>FDV</div>
          <div className="font-mono font-bold" style={{ color: "#f7931a" }}>{fmtCompactUSD(c.fully_diluted_valuation ?? c.market_cap * (100 / Math.max(1, evt.unlockedPct)))}</div>
        </div>
      </div>

      {/* Vesting progress */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between mb-1 text-[9px]">
          <span style={{ color: "#5a6072" }}>Unlocked {evt.unlockedPct.toFixed(1)}%</span>
          <span style={{ color: "#5a6072" }}>Locked {evt.lockedPct.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.04)" }}>
          <motion.div className="h-full" style={{ background: "linear-gradient(90deg,#26a69a,#4dd0c5)" }}
            initial={{ width: 0 }} animate={{ width: `${evt.unlockedPct}%` }} transition={{ duration: 0.8 }} />
        </div>
      </div>

      {/* Supply mini-row (circulating / total) */}
      <div className="grid grid-cols-2 gap-1.5 mb-2 text-[9px]">
        <div className="px-1.5 py-1 rounded-md" style={{ background: "rgba(38,166,154,0.06)", border: "1px solid rgba(38,166,154,0.15)" }}>
          <div className="text-[7px] uppercase tracking-wider" style={{ color: "#26a69a99" }}>Circulating</div>
          <div className="font-mono font-bold" style={{ color: "#26a69a" }}>{fmtCompactNum(c.circulating_supply)}</div>
        </div>
        <div className="px-1.5 py-1 rounded-md" style={{ background: "rgba(196,181,253,0.06)", border: "1px solid rgba(196,181,253,0.15)" }}>
          <div className="text-[7px] uppercase tracking-wider" style={{ color: "#c4b5fd99" }}>Total Supply</div>
          <div className="font-mono font-bold" style={{ color: "#c4b5fd" }}>{fmtCompactNum(c.total_supply ?? 0)}</div>
        </div>
      </div>

      {/* Next unlock block */}
      <div className="p-2.5 rounded-xl mb-2.5"
        style={{ background: `${ic}0c`, border: `1px solid ${ic}24` }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[8px] font-black uppercase tracking-wider" style={{ color: ic + "cc" }}>Next Unlock</span>
          <span className="text-[8px] px-1 py-0.5 rounded font-bold" style={{ background: `${catColor(evt.nextUnlock.category)}22`, color: catColor(evt.nextUnlock.category) }}>
            {catLabel(evt.nextUnlock.category)}
          </span>
        </div>
        <div className="flex items-center justify-between mb-1">
          <div className="font-mono text-[13px] font-black text-white">{fmtCompactUSD(evt.nextUnlock.usdValue)}</div>
          <div className="text-[9px] font-mono" style={{ color: "#d1d4dc" }}>{evt.nextUnlock.pctOfSupply.toFixed(2)}% supply</div>
        </div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px]" style={{ color: "#5a6072" }}>
            {fmtCompactNum(evt.nextUnlock.amount)} {c.symbol.toUpperCase()}
          </span>
          <Countdown target={evt.nextUnlock.date} />
        </div>
        <div className="flex items-center justify-between pt-1 mt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <span className="text-[8px] font-mono" style={{ color: "#5a6072" }}>
            {new Date(evt.nextUnlock.date).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="text-[8px] font-bold" style={{ color: "#f7931a" }}>
            Dilution {evt.dilutionRiskPct}% · Infl. {evt.inflationRiskPct}%
          </span>
        </div>
      </div>

      {/* AI scores mini-row */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: "Danger",     v: evt.ai.dangerScore,            c: "#ef5350" },
          { label: "Sell P.",    v: evt.ai.sellPressureProbability, c: "#f7931a" },
          { label: "Volatility", v: evt.ai.volatilityExpectation,   c: "#7c3aed" },
        ].map(m => (
          <div key={m.label} className="px-1.5 py-1 rounded-md" style={{ background: `${m.c}10`, border: `1px solid ${m.c}22` }}>
            <div className="text-[7px] uppercase tracking-wider" style={{ color: m.c + "aa" }}>{m.label}</div>
            <div className="text-[11px] font-black font-mono" style={{ color: m.c }}>{m.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── List view ───────────────────────────────────────────────────────────────
function UnlockList({ events }: { events: UnlockEvent[] }) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(10,14,22,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="hidden md:grid grid-cols-[1.8fr_1fr_1fr_1.4fr_1.4fr_1fr_1fr_0.5fr] gap-2 px-4 py-2 text-[8px] font-black uppercase tracking-wider"
        style={{ color: "#3a4058", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div>Token</div>
        <div>Price</div>
        <div>MCap</div>
        <div>Next Unlock</div>
        <div>Value · % Supply</div>
        <div>Countdown</div>
        <div>AI Risk</div>
        <div></div>
      </div>
      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {events.map((e, i) => {
          const ic = impactColor(e.impact);
          return (
            <Link key={e.coin.id} href={`/unlocks/${e.coin.symbol.toLowerCase()}`}>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(0.3, i * 0.01) }}
                className="grid grid-cols-[1.8fr_1fr_1fr_1.4fr_1.4fr_1fr_1fr_0.5fr] gap-2 px-4 py-2.5 items-center cursor-pointer hover:bg-white/[0.03] transition-colors text-[10px]"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <div className="flex items-center gap-2 min-w-0">
                  {e.coin.image && <img src={e.coin.image} alt="" className="w-6 h-6 rounded-full shrink-0" loading="lazy" />}
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate uppercase">{e.coin.symbol}</div>
                    <div className="text-[8px] truncate" style={{ color: "#5a6072" }}>{e.coin.name}</div>
                  </div>
                </div>
                <div className="font-mono" style={{ color: "#d1d4dc" }}>${e.coin.current_price < 1 ? e.coin.current_price.toFixed(5) : e.coin.current_price.toLocaleString("en", { maximumFractionDigits: 2 })}</div>
                <div className="font-mono" style={{ color: "#26a69a" }}>{fmtCompactUSD(e.coin.market_cap)}</div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ background: `${catColor(e.nextUnlock.category)}22`, color: catColor(e.nextUnlock.category) }}>
                    {catLabel(e.nextUnlock.category)}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ background: `${ic}22`, color: ic }}>{e.impact}</span>
                </div>
                <div>
                  <div className="font-mono font-bold text-white">{fmtCompactUSD(e.nextUnlock.usdValue)}</div>
                  <div className="text-[8px]" style={{ color: "#5a6072" }}>{e.nextUnlock.pctOfSupply.toFixed(2)}% supply</div>
                </div>
                <div><Countdown target={e.nextUnlock.date} /></div>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <div className="h-full rounded-full" style={{ width: `${e.ai.dangerScore}%`, background: e.ai.dangerScore > 70 ? "#ef5350" : e.ai.dangerScore > 40 ? "#f7931a" : "#26a69a" }} />
                  </div>
                  <span className="font-mono font-bold text-[9px]" style={{ color: e.ai.dangerScore > 70 ? "#ef5350" : "#d1d4dc" }}>{e.ai.dangerScore}</span>
                </div>
                <ChevronRight className="h-3 w-3" style={{ color: "#3a4058" }} />
              </motion.div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Calendar view ───────────────────────────────────────────────────────────
function CalendarView({ events }: { events: UnlockEvent[] }) {
  const buckets = useMemo(() => {
    const map = new Map<string, UnlockEvent[]>();
    for (const e of events) {
      const d = new Date(e.nextUnlock.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(0, 30);
  }, [events]);

  return (
    <div className="space-y-2">
      {buckets.map(([key, list]) => {
        const totalUsd = list.reduce((s, e) => s + e.nextUnlock.usdValue, 0);
        const date = new Date(key);
        return (
          <div key={key} className="rounded-2xl p-3"
            style={{ background: "rgba(10,14,22,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center"
                  style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.2),rgba(41,98,255,0.15))", border: "1px solid rgba(124,58,237,0.3)" }}>
                  <div className="text-[7px] uppercase font-black" style={{ color: "#c4b5fd" }}>{date.toLocaleString("en", { month: "short" })}</div>
                  <div className="text-[12px] font-black text-white -mt-0.5">{date.getDate()}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-white">{date.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}</div>
                  <div className="text-[9px]" style={{ color: "#5a6072" }}>{list.length} unlocks · {fmtCompactUSD(totalUsd)} total value</div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {list.slice(0, 9).map(e => (
                <Link key={e.coin.id} href={`/unlocks/${e.coin.symbol.toLowerCase()}`}>
                  <div className="flex items-center gap-2 p-2 rounded-xl cursor-pointer hover:bg-white/[0.03] transition-colors"
                    style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${impactColor(e.impact)}1f` }}>
                    {e.coin.image && <img src={e.coin.image} alt="" className="w-6 h-6 rounded-full shrink-0" loading="lazy" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-white uppercase">{e.coin.symbol}</div>
                      <div className="text-[8px] truncate" style={{ color: "#5a6072" }}>{catLabel(e.nextUnlock.category)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-mono font-bold text-white">{fmtCompactUSD(e.nextUnlock.usdValue)}</div>
                      <div className="text-[8px]" style={{ color: impactColor(e.impact) }}>{e.nextUnlock.pctOfSupply.toFixed(2)}%</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Skeleton / Empty ────────────────────────────────────────────────────────
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div key={i}
          animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
          className="rounded-2xl h-56"
          style={{ background: "rgba(13,17,26,0.6)", border: "1px solid rgba(255,255,255,0.04)" }} />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl p-12 text-center"
      style={{ background: "rgba(10,14,22,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <Unlock className="h-8 w-8 mx-auto mb-3" style={{ color: "#3a4058" }} />
      <div className="text-[14px] font-bold text-white mb-1">No unlocks match the current filters</div>
      <div className="text-[11px]" style={{ color: "#5a6072" }}>Try widening the time window, clearing the search, or selecting a different impact level.</div>
    </div>
  );
}
