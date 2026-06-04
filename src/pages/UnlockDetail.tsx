import React, { useEffect, useMemo, useState } from "react";
import { useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft, Lock, Unlock, AlertTriangle, Brain, Clock, Calendar,
  TrendingUp, TrendingDown, Activity, Zap, Shield, Bell, Layers,
  BarChart3, ExternalLink, Sparkles, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { useAllCoins } from "@/hooks/use-all-coins";
import {
  buildUnlockEvent, impactColor, impactLabel, catColor, catLabel,
  fmtCompactUSD, fmtCompactNum, formatCountdown, vestingLabel,
} from "@/lib/unlocks";

function Countdown({ target, big = false }: { target: number; big?: boolean }) {
  const [, force] = useState(0);
  useEffect(() => { const t = setInterval(() => force(x => x + 1), 1000); return () => clearInterval(t); }, []);
  const { days, hours, minutes, seconds, expired } = formatCountdown(target);
  if (expired) return <span className="font-mono" style={{ color: "#ef5350" }}>UNLOCKING NOW</span>;
  const cls = big ? "text-[28px] md:text-[36px]" : "text-[11px]";
  const subCls = big ? "text-[10px]" : "text-[8px]";
  return (
    <div className="flex items-baseline gap-1 font-mono" style={{ color: "#fff" }}>
      <Box val={days} label="D" cls={cls} subCls={subCls} color="#c4b5fd" />
      <Box val={hours} label="H" cls={cls} subCls={subCls} color="#c4b5fd" />
      <Box val={minutes} label="M" cls={cls} subCls={subCls} color="#c4b5fd" />
      <Box val={seconds} label="S" cls={cls} subCls={subCls} color="#26a69a" />
    </div>
  );
}
function Box({ val, label, cls, subCls, color }: { val: number; label: string; cls: string; subCls: string; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`font-black tracking-tight tabular-nums ${cls}`} style={{ color }}>{String(val).padStart(2, "0")}</span>
      <span className={`uppercase tracking-widest font-bold ${subCls}`} style={{ color: "#5a6072" }}>{label}</span>
    </div>
  );
}

export default function UnlockDetail() {
  const [, params] = useRoute<{ symbol: string }>("/unlocks/:symbol");
  const symbol = params?.symbol?.toLowerCase() ?? "";
  const { coins, ready } = useAllCoins();

  const coin = useMemo(
    () => coins.find(c => c.symbol.toLowerCase() === symbol) ?? null,
    [coins, symbol],
  );

  const evt = useMemo(() => coin ? buildUnlockEvent(coin) : null, [coin]);

  if (!ready) {
    return (
      <div className="p-6 space-y-3 max-w-[1400px] mx-auto">
        <div className="h-40 rounded-2xl animate-pulse" style={{ background: "rgba(13,17,26,0.6)" }} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: "rgba(13,17,26,0.6)" }} />
          ))}
        </div>
      </div>
    );
  }

  if (!coin || !evt) {
    return (
      <div className="p-6 text-center max-w-[800px] mx-auto">
        <AlertTriangle className="h-10 w-10 mx-auto mb-3" style={{ color: "#f7931a" }} />
        <div className="text-[16px] font-bold text-white mb-1">Token not found</div>
        <div className="text-[11px] mb-4" style={{ color: "#5a6072" }}>
          We couldn't find unlock data for "{symbol}". The token may not have vesting or may be outside the top tracked set.
        </div>
        <Link href="/unlocks" className="inline-block px-4 py-2 rounded-xl text-[11px] font-bold"
          style={{ background: "rgba(124,58,237,0.18)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.35)" }}>
          ← Back to Unlocks
        </Link>
      </div>
    );
  }

  const ic = impactColor(evt.impact);

  return (
    <div className="p-3 md:p-5 space-y-4 max-w-[1500px] mx-auto">
      {/* Back link */}
      <Link href="/unlocks" className="inline-flex items-center gap-1 text-[10px] font-bold transition-colors hover:text-white" style={{ color: "#5a6072" }}>
        <ChevronLeft className="h-3 w-3" /> All Unlocks
      </Link>

      {/* ── HEADER BANNER ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-5 md:p-6 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${ic}25 0%, rgba(124,58,237,0.18) 50%, rgba(41,98,255,0.12) 100%)`,
          border: `1px solid ${ic}40`,
          boxShadow: `0 8px 48px ${ic}25, inset 0 1px 0 rgba(255,255,255,0.06)`,
        }}>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full"
          style={{ background: `radial-gradient(circle, ${ic}28, transparent 70%)` }} />

        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {coin.image && <img src={coin.image} alt={coin.name} className="w-16 h-16 rounded-full shrink-0"
              style={{ boxShadow: `0 0 24px ${ic}40` }} />}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-[24px] md:text-[28px] font-black text-white">{coin.name}</h1>
                <span className="text-[14px] font-mono font-bold" style={{ color: "#5a6072" }}>{coin.symbol.toUpperCase()}</span>
                <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: "rgba(255,255,255,0.06)", color: "#5a6072" }}>
                  #{coin.market_cap_rank ?? "—"}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-[16px] font-black text-white">
                  ${coin.current_price < 1 ? coin.current_price.toFixed(6) : coin.current_price.toLocaleString("en", { maximumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] font-bold" style={{ color: coin.price_change_percentage_24h >= 0 ? "#26a69a" : "#ef5350" }}>
                  {coin.price_change_percentage_24h >= 0 ? "+" : ""}{coin.price_change_percentage_24h?.toFixed(2)}% (24h)
                </span>
                <div className="px-2.5 py-1 rounded-lg text-[9px] font-black"
                  style={{ background: `${ic}1f`, color: ic, border: `1px solid ${ic}40` }}>
                  {impactLabel(evt.impact)}
                </div>
              </div>
            </div>
          </div>

          {/* Countdown */}
          <div className="flex flex-col items-center md:items-end gap-1">
            <span className="text-[9px] uppercase tracking-widest font-black" style={{ color: ic + "cc" }}>Next Unlock In</span>
            <Countdown target={evt.nextUnlock.date} big />
            <span className="text-[10px]" style={{ color: "#5a6072" }}>
              {new Date(evt.nextUnlock.date).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </div>
        </div>

        {/* Stat grid */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mt-5">
          {[
            { l: "MCap",       v: fmtCompactUSD(coin.market_cap),                                                  c: "#26a69a" },
            { l: "FDV",        v: fmtCompactUSD(coin.fully_diluted_valuation ?? coin.market_cap * (100/Math.max(1,evt.unlockedPct))), c: "#f7931a" },
            { l: "Circulating",v: fmtCompactNum(coin.circulating_supply),                                          c: "#26a69a" },
            { l: "Total",      v: fmtCompactNum(coin.total_supply ?? 0),                                           c: "#c4b5fd" },
            { l: "Unlocked",   v: evt.unlockedPct.toFixed(1) + "%",                                                c: "#26a69a" },
            { l: "Locked",     v: evt.lockedPct.toFixed(1) + "%",                                                  c: "#ef5350" },
            { l: "Vol 24h",    v: fmtCompactUSD(coin.total_volume),                                                c: "#2962ff" },
          ].map(s => (
            <div key={s.l} className="rounded-xl p-2"
              style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${s.c}22` }}>
              <div className="text-[8px] uppercase tracking-wider font-black" style={{ color: s.c + "aa" }}>{s.l}</div>
              <div className="text-[12px] font-black font-mono" style={{ color: s.c }}>{s.v}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Vesting progress bar */}
      <div className="rounded-2xl p-4"
        style={{ background: "rgba(10,14,22,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-white">Vesting Progress</span>
          <span className="text-[9px]" style={{ color: "#5a6072" }}>
            {vestingLabel(evt.vestingType)} · {evt.vestingDurationDays}d total · TGE {new Date(evt.tgeDate).toLocaleDateString("en", { month: "short", year: "numeric" })}
          </span>
        </div>
        <div className="h-3 rounded-full overflow-hidden relative" style={{ background: "rgba(255,255,255,0.04)" }}>
          <motion.div className="h-full absolute left-0 top-0"
            initial={{ width: 0 }} animate={{ width: `${evt.unlockedPct}%` }} transition={{ duration: 1 }}
            style={{ background: "linear-gradient(90deg,#26a69a,#4dd0c5,#7dd3fc)" }} />
          {/* Upcoming markers */}
          {evt.upcomingUnlocks.slice(0, 6).map((u, i) => {
            const pct = Math.min(99.5, evt.unlockedPct + evt.upcomingUnlocks.slice(0, i + 1).reduce((s, x) => s + x.pctOfSupply, 0));
            return (
              <div key={i} className="absolute top-0 bottom-0 w-px" style={{ left: `${pct}%`, background: catColor(u.category), opacity: 0.7 }} />
            );
          })}
        </div>
      </div>

      {/* ── SECTIONS A–G ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* A. Upcoming */}
        <Panel title="A · Upcoming Unlocks" icon={Unlock} color="#7c3aed">
          <div className="space-y-2">
            {evt.upcomingUnlocks.map((u, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl"
                style={{ background: i === 0 ? `${ic}10` : "rgba(255,255,255,0.02)", border: `1px solid ${i === 0 ? ic + "30" : "rgba(255,255,255,0.04)"}` }}>
                <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0"
                  style={{ background: `${catColor(u.category)}15`, border: `1px solid ${catColor(u.category)}30` }}>
                  <span className="text-[7px] uppercase font-black" style={{ color: catColor(u.category) }}>
                    {new Date(u.date).toLocaleString("en", { month: "short" })}
                  </span>
                  <span className="text-[12px] font-black text-white -mt-0.5">{new Date(u.date).getDate()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-white">{catLabel(u.category)}</span>
                    {i === 0 && <span className="text-[7px] px-1 py-0.5 rounded font-black" style={{ background: ic + "30", color: ic }}>NEXT</span>}
                  </div>
                  <div className="text-[9px] font-mono" style={{ color: "#5a6072" }}>
                    {fmtCompactNum(u.amount)} {coin.symbol.toUpperCase()} · {u.pctOfSupply.toFixed(2)}% supply
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] font-mono font-black text-white">{fmtCompactUSD(u.usdValue)}</div>
                  <div className="text-[9px] font-mono" style={{ color: "#5a6072" }}>
                    {new Date(u.date).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })} UTC
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* B. Past unlocks */}
        <Panel title="B · Past Unlock History" icon={BarChart3} color="#2962ff">
          <div className="space-y-2">
            {evt.pastUnlocks.length === 0 && (
              <div className="text-center py-6 text-[10px]" style={{ color: "#5a6072" }}>No completed unlocks recorded yet.</div>
            )}
            {evt.pastUnlocks.map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="text-[9px] font-mono shrink-0 w-16" style={{ color: "#5a6072" }}>
                  {new Date(p.date).toLocaleDateString("en", { month: "short", day: "numeric", year: "2-digit" })}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-white">{catLabel(p.category)}</span>
                    <span className="text-[8px] px-1 py-0.5 rounded font-mono" style={{ background: `${catColor(p.category)}18`, color: catColor(p.category) }}>
                      {p.pctOfSupply.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[8px] mt-0.5">
                    <span style={{ color: p.priceBeforePct >= 0 ? "#26a69a" : "#ef5350" }}>
                      {p.priceBeforePct >= 0 ? <ArrowUpRight className="inline h-2.5 w-2.5" /> : <ArrowDownRight className="inline h-2.5 w-2.5" />}
                      Pre {p.priceBeforePct >= 0 ? "+" : ""}{p.priceBeforePct.toFixed(1)}%
                    </span>
                    <span style={{ color: p.priceAfterPct >= 0 ? "#26a69a" : "#ef5350" }}>
                      {p.priceAfterPct >= 0 ? <ArrowUpRight className="inline h-2.5 w-2.5" /> : <ArrowDownRight className="inline h-2.5 w-2.5" />}
                      Post {p.priceAfterPct >= 0 ? "+" : ""}{p.priceAfterPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] font-mono font-bold text-white">{fmtCompactUSD(p.usdValue)}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* C. Allocation breakdown */}
        <Panel title="C · Vesting Allocation Breakdown" icon={Layers} color="#26a69a">
          {/* Donut: simple stacked bar */}
          <div className="flex h-3 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.04)" }}>
            {evt.allocation.map(a => (
              <div key={a.category} style={{ width: `${a.pct}%`, background: a.color }} title={`${catLabel(a.category)} ${a.pct}%`} />
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {evt.allocation.map(a => (
              <div key={a.category} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: `${a.color}10`, border: `1px solid ${a.color}25` }}>
                <div className="w-2.5 h-2.5 rounded shrink-0" style={{ background: a.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-white truncate">{catLabel(a.category)}</div>
                  <div className="text-[9px] font-mono" style={{ color: a.color }}>{a.pct.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* D. Supply analytics */}
        <Panel title="D · Supply Analytics" icon={Activity} color="#0ea5e9">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Stat l="Inflation Risk (annualized)" v={evt.inflationRiskPct + "%"} c="#ef5350" />
            <Stat l="Dilution Risk" v={evt.dilutionRiskPct + "%"} c="#f7931a" />
            <Stat l="Locked Tokens" v={fmtCompactNum(Math.max(0, (coin.total_supply ?? 0) - coin.circulating_supply))} c="#a78bfa" />
            <Stat l="Locked Value" v={fmtCompactUSD(Math.max(0, (coin.total_supply ?? 0) - coin.circulating_supply) * coin.current_price)} c="#7c3aed" />
          </div>
          {/* Circulating vs locked visual */}
          <div className="text-[8px] uppercase tracking-wider font-black mb-1.5" style={{ color: "#5a6072" }}>Circulating vs Locked</div>
          <div className="flex h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div style={{ width: `${evt.unlockedPct}%`, background: "linear-gradient(90deg,#26a69a,#4dd0c5)" }} />
            <div style={{ width: `${evt.lockedPct}%`, background: "linear-gradient(90deg,#7c3aed,#c4b5fd)" }} />
          </div>
          <div className="flex justify-between text-[9px] mt-1">
            <span style={{ color: "#26a69a" }}>Circulating {evt.unlockedPct.toFixed(1)}%</span>
            <span style={{ color: "#c4b5fd" }}>Locked {evt.lockedPct.toFixed(1)}%</span>
          </div>
        </Panel>

        {/* E. AI Intelligence */}
        <Panel title="E · AI Intelligence" icon={Brain} color="#7c3aed">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Score l="Danger Score" v={evt.ai.dangerScore} max={100} bad />
            <Score l="Sell Pressure" v={evt.ai.sellPressureProbability} max={100} bad />
            <Score l="Bullish Probability" v={evt.ai.bullishProbability} max={100} />
            <Score l="Bearish Probability" v={evt.ai.bearishProbability} max={100} bad />
            <Score l="Whale Distribution Risk" v={evt.ai.whaleDistributionRisk} max={100} bad />
            <Score l="Volatility Expectation" v={evt.ai.volatilityExpectation} max={100} />
          </div>
          <div className="p-2.5 rounded-xl mb-2"
            style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)" }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="h-3 w-3" style={{ color: "#c4b5fd" }} />
              <span className="text-[9px] uppercase tracking-wider font-black" style={{ color: "#c4b5fd" }}>AI Outlook</span>
            </div>
            <p className="text-[10px] leading-relaxed text-white">{evt.ai.outlook}</p>
          </div>
          <div className="flex items-center justify-between p-2 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-[10px]" style={{ color: "#5a6072" }}>Smart Money Positioning</span>
            <span className="text-[10px] font-black"
              style={{ color: evt.ai.smartMoneyPositioning === "ACCUMULATING" ? "#26a69a" : evt.ai.smartMoneyPositioning === "DISTRIBUTING" ? "#ef5350" : "#787b86" }}>
              {evt.ai.smartMoneyPositioning}
            </span>
          </div>
        </Panel>

        {/* F. Interactive supply / unlock chart (SVG) */}
        <Panel title="F · Future Supply Expansion" icon={TrendingUp} color="#f7931a">
          <SupplyChart evt={evt} />
        </Panel>

        {/* G. Tokenomics Intelligence */}
        <Panel title="G · Tokenomics Intelligence" icon={Shield} color="#22d3ee">
          <div className="grid grid-cols-1 gap-2">
            {([
              { l: "Token Health Score", v: evt.tokenomics.health,           c: evt.tokenomics.health > 70 ? "#26a69a" : evt.tokenomics.health > 40 ? "#f7931a" : "#ef5350" },
              { l: "Dilution Score",     v: evt.tokenomics.dilution,         c: evt.tokenomics.dilution > 70 ? "#ef5350" : evt.tokenomics.dilution > 40 ? "#f7931a" : "#26a69a" },
              { l: "Investor Pressure",  v: evt.tokenomics.investorPressure, c: evt.tokenomics.investorPressure > 60 ? "#ef5350" : "#f7931a" },
              { l: "Sustainability",     v: evt.tokenomics.sustainability,   c: evt.tokenomics.sustainability > 60 ? "#26a69a" : "#f7931a" },
              { l: "Decentralization",   v: evt.tokenomics.decentralization, c: evt.tokenomics.decentralization > 60 ? "#26a69a" : "#f7931a" },
            ]).map(b => (
              <div key={b.l}>
                <div className="flex items-center justify-between text-[9px] mb-1">
                  <span style={{ color: "#5a6072" }}>{b.l}</span>
                  <span className="font-mono font-black" style={{ color: b.c }}>{b.v}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <motion.div className="h-full rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${b.v}%` }} transition={{ duration: 0.7 }}
                    style={{ background: b.c }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Smart Alerts CTA */}
      <div className="rounded-2xl p-4 flex items-center gap-3 flex-wrap"
        style={{ background: "linear-gradient(95deg, rgba(124,58,237,0.12), rgba(41,98,255,0.08))", border: "1px solid rgba(124,58,237,0.3)" }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)" }}>
          <Bell className="h-4 w-4" style={{ color: "#c4b5fd" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-bold text-white">Smart Alerts for {coin.symbol.toUpperCase()}</div>
          <div className="text-[10px]" style={{ color: "#5a6072" }}>
            Get notified before this token's next unlock · whale movements · dilution spikes
          </div>
        </div>
        <Link href="/alerts" className="inline-block px-3 py-1.5 rounded-xl text-[10px] font-bold"
          style={{ background: "rgba(124,58,237,0.25)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.5)" }}>
          Set Alert →
        </Link>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function Panel({ title, icon: Icon, color, children }: { title: string; icon: typeof Lock; color: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{ background: "rgba(10,14,22,0.85)", border: `1px solid ${color}22`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04)` }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-3.5 w-3.5" style={{ color }} />
        <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: color + "dd" }}>{title}</span>
      </div>
      {children}
    </motion.div>
  );
}

function Stat({ l, v, c }: { l: string; v: string; c: string }) {
  return (
    <div className="p-2 rounded-lg" style={{ background: `${c}10`, border: `1px solid ${c}22` }}>
      <div className="text-[8px] uppercase tracking-wider font-black" style={{ color: c + "aa" }}>{l}</div>
      <div className="text-[12px] font-black font-mono" style={{ color: c }}>{v}</div>
    </div>
  );
}

function Score({ l, v, max, bad }: { l: string; v: number; max: number; bad?: boolean }) {
  const pct = (v / max) * 100;
  const c = bad ? (v > 70 ? "#ef5350" : v > 40 ? "#f7931a" : "#26a69a")
                : (v > 70 ? "#26a69a" : v > 40 ? "#f7931a" : "#ef5350");
  return (
    <div className="p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[8px] uppercase tracking-wider font-black" style={{ color: "#5a6072" }}>{l}</span>
        <span className="text-[10px] font-black font-mono" style={{ color: c }}>{v}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
        <motion.div className="h-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} style={{ background: c }} />
      </div>
    </div>
  );
}

// Future supply expansion SVG (next 12 months)
function SupplyChart({ evt }: { evt: import("@/lib/unlocks").UnlockEvent }) {
  const W = 320, H = 130, P = 8;
  const months = 12;
  // Project unlocked % growth using upcoming unlock cadence
  const totalUnlocksAhead = evt.upcomingUnlocks.reduce((s, u) => s + u.pctOfSupply, 0);
  const monthlyDelta = totalUnlocksAhead / 4; // 4 months covered by 6 unlock cadence avg
  const points: number[] = [];
  let unlocked = evt.unlockedPct;
  for (let i = 0; i <= months; i++) {
    points.push(unlocked);
    unlocked = Math.min(100, unlocked + monthlyDelta * (0.8 + Math.sin(i / 2) * 0.2));
  }
  const min = points[0], max = 100;
  const xStep = (W - P * 2) / months;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${P + i * xStep},${H - P - ((p - min) / (max - min)) * (H - P * 2)}`).join(" ");
  const area = `${path} L ${P + months * xStep},${H - P} L ${P},${H - P} Z`;
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.04)" }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
        <defs>
          <linearGradient id="supArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f7931a" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f7931a" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#supArea)" />
        <path d={path} stroke="#f7931a" strokeWidth={2} fill="none" />
        {/* Today marker */}
        <line x1={P} x2={P} y1={P} y2={H - P} stroke="#26a69a" strokeWidth={1} strokeDasharray="2 2" opacity={0.6} />
        <text x={P + 4} y={P + 8} fill="#26a69a" fontSize="8" fontWeight="bold">TODAY · {evt.unlockedPct.toFixed(1)}%</text>
        <text x={W - 40} y={P + 8} fill="#f7931a" fontSize="8" fontWeight="bold">+12mo</text>
      </svg>
    </div>
  );
}
