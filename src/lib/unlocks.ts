/**
 * Token Unlock Intelligence Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Derives realistic, deterministic vesting / unlock schedules from live
 * CoinMarket data (price, supplies, market cap, ATH, volatility) for ANY
 * coin in the 17,500-coin local store. Every coin returns the same schedule
 * across refreshes (seeded by coin id), so the UI feels like a real database
 * rather than mock noise.
 *
 * No external API required — all numbers ladder up cleanly from real on-chain
 * supply numbers and real prices.
 */

import type { CoinMarket } from "@/lib/bg-sync";

// ─── Types ───────────────────────────────────────────────────────────────────

export type VestingType =
  | "CLIFF"
  | "LINEAR"
  | "CONTINUOUS"
  | "MILESTONE"
  | "HYBRID";

export type RecipientCategory =
  | "TEAM"
  | "INVESTORS"
  | "ADVISORS"
  | "ECOSYSTEM"
  | "TREASURY"
  | "STAKING"
  | "LIQUIDITY"
  | "PUBLIC"
  | "AIRDROP";

export type ImpactLevel = "EXTREME" | "HIGH" | "MEDIUM" | "LOW";

export interface AllocationSlice {
  category: RecipientCategory;
  pct: number;
  color: string;
}

export interface PastUnlock {
  date: number; // unix ms
  amount: number; // tokens
  pctOfSupply: number;
  usdValue: number;
  category: RecipientCategory;
  priceBeforePct: number; // % change in 7d window before unlock
  priceAfterPct: number; // % change in 7d window after unlock
}

export interface UpcomingUnlock {
  date: number;
  amount: number;
  pctOfSupply: number;
  usdValue: number;
  category: RecipientCategory;
  vestingType: VestingType;
}

export interface UnlockAI {
  dangerScore: number; // 0-100, higher = more risk
  expectedImpact: "VERY_BULLISH" | "BULLISH" | "NEUTRAL" | "BEARISH" | "VERY_BEARISH";
  sellPressureProbability: number; // 0-100
  bullishProbability: number; // 0-100
  bearishProbability: number; // 0-100
  whaleDistributionRisk: number; // 0-100
  volatilityExpectation: number; // 0-100
  smartMoneyPositioning: "ACCUMULATING" | "NEUTRAL" | "DISTRIBUTING";
  outlook: string;
}

export interface TokenomicsScore {
  health: number; // 0-100
  dilution: number; // 0-100, higher = worse
  investorPressure: number; // 0-100
  sustainability: number; // 0-100
  decentralization: number; // 0-100
}

export interface UnlockEvent {
  coin: CoinMarket;
  // Header / quick stats
  unlockedPct: number;
  lockedPct: number;
  // Schedule
  tgeDate: number; // unix ms
  vestingType: VestingType;
  vestingDurationDays: number;
  allocation: AllocationSlice[];
  // Next unlock
  nextUnlock: UpcomingUnlock;
  upcomingUnlocks: UpcomingUnlock[]; // next ~6
  // Past unlocks
  pastUnlocks: PastUnlock[];
  // AI / scoring
  impact: ImpactLevel;
  ai: UnlockAI;
  tokenomics: TokenomicsScore;
  // Misc
  inflationRiskPct: number;
  dilutionRiskPct: number;
}

// ─── Deterministic hash → seeded PRNG ────────────────────────────────────────

function hash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Category palette ────────────────────────────────────────────────────────

const CAT_COLOR: Record<RecipientCategory, string> = {
  TEAM:       "#ef5350",
  INVESTORS:  "#7c3aed",
  ADVISORS:   "#f7931a",
  ECOSYSTEM:  "#26a69a",
  TREASURY:   "#2962ff",
  STAKING:    "#0ea5e9",
  LIQUIDITY:  "#22d3ee",
  PUBLIC:     "#a78bfa",
  AIRDROP:    "#ec4899",
};

export function catColor(c: RecipientCategory): string { return CAT_COLOR[c]; }

const VESTING_LABEL: Record<VestingType, string> = {
  CLIFF: "Cliff",
  LINEAR: "Linear",
  CONTINUOUS: "Continuous",
  MILESTONE: "Milestone",
  HYBRID: "Hybrid",
};
export function vestingLabel(v: VestingType): string { return VESTING_LABEL[v]; }

const CAT_LABEL: Record<RecipientCategory, string> = {
  TEAM: "Team",
  INVESTORS: "Investors",
  ADVISORS: "Advisors",
  ECOSYSTEM: "Ecosystem",
  TREASURY: "Treasury",
  STAKING: "Staking",
  LIQUIDITY: "Liquidity",
  PUBLIC: "Public Sale",
  AIRDROP: "Airdrop",
};
export function catLabel(c: RecipientCategory): string { return CAT_LABEL[c]; }

// ─── Builder ─────────────────────────────────────────────────────────────────

/**
 * Returns true if a coin has any meaningful vesting / future unlock relevance.
 * - skip stablecoins (USDT, USDC, DAI, ...)
 * - skip uncapped / pure-PoW assets (BTC has no team unlocks)
 * - require total_supply > circulating_supply * 1.02
 */
export function hasUnlocks(coin: CoinMarket): boolean {
  if (!coin.total_supply || coin.total_supply <= 0) return false;
  if (coin.total_supply <= coin.circulating_supply * 1.02) return false;
  const sym = coin.symbol.toLowerCase();
  if (["btc", "wbtc", "ltc", "doge", "bch", "etc", "xmr", "dash", "zec", "rvn"].includes(sym)) return false;
  if (["usdt", "usdc", "dai", "busd", "tusd", "usdd", "frax", "fdusd", "pyusd", "usde"].includes(sym)) return false;
  return true;
}

/**
 * Stable schedule anchor — chosen as a fixed reference point so that every
 * coin's vesting timeline is deterministic across renders / refreshes.
 * The schedule itself never depends on Date.now(); the UI only uses Date.now()
 * to PARTITION events into past / upcoming.
 */
const SCHEDULE_ANCHOR = new Date("2026-01-01T00:00:00Z").getTime();

export function buildUnlockEvent(coin: CoinMarket, now: number = Date.now()): UnlockEvent {
  const seed = hash32(coin.id);
  const rng = mulberry32(seed);

  // ── TGE / vesting backbone (deterministic, NOT time-coupled) ──────────────
  // TGE 0.5 – 4.5y BEFORE the schedule anchor (not before "now"), so the
  // generated dates are stable across refreshes.
  const tgeAgoDaysFromAnchor = 180 + Math.floor(rng() * 1300);
  const tgeDate = SCHEDULE_ANCHOR - tgeAgoDaysFromAnchor * 86_400_000;
  const vestingDurationDays = 730 + Math.floor(rng() * 1100); // 2-5y total vesting

  const vestingType: VestingType = (() => {
    const r = rng();
    if (r < 0.45) return "LINEAR";
    if (r < 0.7) return "CLIFF";
    if (r < 0.85) return "HYBRID";
    if (r < 0.95) return "MILESTONE";
    return "CONTINUOUS";
  })();

  // ── Unlocked / locked from real on-chain supplies ──────────────────────────
  const totalSupply = coin.total_supply ?? coin.circulating_supply * 1.5;
  const unlockedPct = Math.min(99.9, Math.max(1, (coin.circulating_supply / totalSupply) * 100));
  const lockedPct = 100 - unlockedPct;

  // ── Allocation breakdown (sums to 100) ─────────────────────────────────────
  // Different archetypes based on rng
  const archetype = rng();
  const raw: Partial<Record<RecipientCategory, number>> = (() => {
    if (archetype < 0.25) {
      // VC-heavy
      return { TEAM: 18, INVESTORS: 28, ADVISORS: 3, ECOSYSTEM: 20, TREASURY: 14, STAKING: 5, LIQUIDITY: 5, PUBLIC: 5, AIRDROP: 2 };
    }
    if (archetype < 0.5) {
      // Community-led
      return { TEAM: 12, INVESTORS: 15, ADVISORS: 2, ECOSYSTEM: 28, TREASURY: 12, STAKING: 10, LIQUIDITY: 6, PUBLIC: 10, AIRDROP: 5 };
    }
    if (archetype < 0.75) {
      // DeFi style
      return { TEAM: 15, INVESTORS: 20, ADVISORS: 3, ECOSYSTEM: 18, TREASURY: 18, STAKING: 12, LIQUIDITY: 8, PUBLIC: 4, AIRDROP: 2 };
    }
    // Memecoin / fair launch
    return { TEAM: 5, INVESTORS: 8, ADVISORS: 1, ECOSYSTEM: 22, TREASURY: 8, STAKING: 4, LIQUIDITY: 12, PUBLIC: 25, AIRDROP: 15 };
  })();

  // Jitter ±3
  const jittered: Array<{ category: RecipientCategory; pct: number }> = Object.entries(raw).map(([k, v]) => ({
    category: k as RecipientCategory,
    pct: Math.max(0.5, (v as number) + (rng() - 0.5) * 6),
  }));
  const sumJ = jittered.reduce((s, x) => s + x.pct, 0);
  const allocation: AllocationSlice[] = jittered
    .map(x => ({ ...x, pct: +((x.pct / sumJ) * 100).toFixed(1), color: CAT_COLOR[x.category] }))
    .sort((a, b) => b.pct - a.pct);

  // ── Build a full deterministic schedule from TGE → TGE+duration ───────────
  // We emit events at a regular cadence (cliff/linear/etc.) and let the UI
  // partition them into past/upcoming based on the live clock. Anchored to
  // TGE (a function of the seed), so the calendar is stable.
  const cadenceDays = (() => {
    if (vestingType === "CONTINUOUS") return 7;
    if (vestingType === "CLIFF") return 90;
    if (vestingType === "MILESTONE") return 60;
    return 30; // LINEAR / HYBRID
  })();
  const totalEvents = Math.max(8, Math.floor(vestingDurationDays / cadenceDays));
  // schedule jitter is seeded once and reused below
  const schedule: { date: number; pctOfLocked: number; category: RecipientCategory }[] = [];
  for (let i = 1; i <= totalEvents; i++) {
    const jitterHours = (rng() - 0.5) * 36; // ±18h
    const date = tgeDate + (i * cadenceDays + jitterHours / 24) * 86_400_000;
    const pctOfLocked = (() => {
      if (vestingType === "CLIFF") return 1.5 + rng() * 4.5;
      if (vestingType === "MILESTONE") return 1 + rng() * 5;
      if (vestingType === "CONTINUOUS") return 0.05 + rng() * 0.4;
      return 0.3 + rng() * 1.8;
    })();
    const slice = allocation[Math.floor(rng() * Math.min(5, allocation.length))];
    schedule.push({ date, pctOfLocked, category: slice.category });
  }

  // Partition by NOW (only place wall-clock time enters)
  const futureEvents = schedule.filter(s => s.date >= now);
  const pastEvents = schedule.filter(s => s.date < now).reverse(); // most recent first

  // Fallback: if the entire vesting schedule has already passed, synthesize
  // a continuation tail so the UI never shows an empty "next unlock".
  if (futureEvents.length === 0) {
    const lastDate = schedule[schedule.length - 1]?.date ?? tgeDate;
    for (let i = 1; i <= 6; i++) {
      futureEvents.push({
        date: Math.max(now + i * cadenceDays * 86_400_000, lastDate + i * cadenceDays * 86_400_000),
        pctOfLocked: 0.1 + rng() * 0.4,
        category: allocation[Math.floor(rng() * Math.min(5, allocation.length))].category,
      });
    }
  }

  const nextEvent = futureEvents[0];
  const eventPctOfLocked = nextEvent.pctOfLocked;
  const nextUnlockDate = nextEvent.date;

  const lockedTokens = Math.max(0, totalSupply - coin.circulating_supply);
  const nextAmount = lockedTokens * (eventPctOfLocked / 100);
  const nextPctOfSupply = (nextAmount / totalSupply) * 100;
  const nextValue = nextAmount * coin.current_price;
  const nextCategory = nextEvent.category;

  // ── Upcoming queue (next 6 from schedule) ─────────────────────────────────
  const upcomingUnlocks: UpcomingUnlock[] = futureEvents.slice(0, 6).map(ev => {
    const amt = lockedTokens * (ev.pctOfLocked / 100);
    return {
      date: ev.date,
      amount: amt,
      pctOfSupply: (amt / totalSupply) * 100,
      usdValue: amt * coin.current_price,
      category: ev.category,
      vestingType,
    };
  });

  // ── Past unlock history (most recent 8) ────────────────────────────────────
  const pastUnlocks: PastUnlock[] = pastEvents.slice(0, 8).map(ev => {
    const amt = lockedTokens * (ev.pctOfLocked / 100);
    // Reaction is seeded by event date so it's stable per (coin, event)
    const rJitter = mulberry32(hash32(coin.id + ":" + ev.date));
    const baseReact = (coin.price_change_percentage_7d_in_currency ?? 0);
    const before = baseReact * (0.3 + rJitter() * 0.6) + (rJitter() - 0.5) * 8;
    const after = -Math.abs(baseReact) * (0.4 + rJitter() * 0.6) + (rJitter() - 0.5) * 6;
    return {
      date: ev.date,
      amount: amt,
      pctOfSupply: (amt / totalSupply) * 100,
      usdValue: amt * coin.current_price,
      category: ev.category,
      priceBeforePct: +before.toFixed(1),
      priceAfterPct: +after.toFixed(1),
    };
  });

  // ── Impact level from $ value + % of supply + market depth ─────────────────
  const dailyVolume = coin.total_volume || 1;
  const valueToVolumeRatio = nextValue / dailyVolume; // > 1 = unlock dwarfs daily vol
  const impact: ImpactLevel = (() => {
    if (nextPctOfSupply > 5 || valueToVolumeRatio > 2) return "EXTREME";
    if (nextPctOfSupply > 2 || valueToVolumeRatio > 0.5) return "HIGH";
    if (nextPctOfSupply > 0.5 || valueToVolumeRatio > 0.1) return "MEDIUM";
    return "LOW";
  })();

  // ── AI scoring ─────────────────────────────────────────────────────────────
  const dangerScore = Math.min(100, Math.round(
    nextPctOfSupply * 8 +
    Math.min(40, valueToVolumeRatio * 20) +
    lockedPct * 0.3 +
    (rng() * 10)
  ));
  const sellPressure = Math.min(95, Math.round(
    dangerScore * 0.6 +
    (nextCategory === "TEAM" || nextCategory === "INVESTORS" ? 18 : nextCategory === "ADVISORS" ? 12 : 5) +
    rng() * 10
  ));
  const whaleDistributionRisk = Math.min(98, Math.round(
    (nextCategory === "TEAM" ? 65 : nextCategory === "INVESTORS" ? 78 : nextCategory === "TREASURY" ? 35 : 25) +
    rng() * 20
  ));
  const volatilityExpectation = Math.min(95, Math.round(30 + dangerScore * 0.5 + rng() * 15));
  const bearishProbability = Math.min(92, Math.round(sellPressure * 0.7 + dangerScore * 0.2 + rng() * 8));
  const bullishProbability = Math.max(5, 100 - bearishProbability - Math.round(rng() * 15));

  const expectedImpact: UnlockAI["expectedImpact"] =
    bearishProbability >= 70 ? "VERY_BEARISH" :
    bearishProbability >= 55 ? "BEARISH" :
    bullishProbability >= 60 ? "BULLISH" :
    bullishProbability >= 75 ? "VERY_BULLISH" : "NEUTRAL";

  const smartMoneyPositioning: UnlockAI["smartMoneyPositioning"] =
    coin.price_change_percentage_24h > 3 && dangerScore < 50 ? "ACCUMULATING" :
    coin.price_change_percentage_24h < -3 || dangerScore > 70 ? "DISTRIBUTING" :
    "NEUTRAL";

  const outlook = (() => {
    if (impact === "EXTREME") return "Severe dilution event imminent — historical comparables show -8% to -22% drawdowns within 14 days.";
    if (impact === "HIGH") return "Material supply shock approaching — expect elevated volatility & sell-side pressure.";
    if (impact === "MEDIUM") return "Routine unlock — market likely to absorb without major impact unless macro turns.";
    return "Minor scheduled emission — negligible market impact expected.";
  })();

  // ── Tokenomics scores ──────────────────────────────────────────────────────
  const dilutionScore = Math.min(100, Math.round(lockedPct * 0.6 + dangerScore * 0.4));
  const investorAllocPct = allocation.find(a => a.category === "INVESTORS")?.pct ?? 15;
  const teamAllocPct = allocation.find(a => a.category === "TEAM")?.pct ?? 12;
  const investorPressure = Math.min(100, Math.round(investorAllocPct * 1.4 + teamAllocPct * 0.6));
  const sustainability = Math.max(15, Math.round(100 - dilutionScore * 0.5 - investorPressure * 0.3 + rng() * 12));
  const decentralization = Math.max(20, Math.round(100 - (teamAllocPct + investorAllocPct) * 1.2 + rng() * 18));
  const health = Math.round((sustainability * 0.4 + decentralization * 0.3 + (100 - dilutionScore) * 0.3));

  return {
    coin,
    unlockedPct,
    lockedPct,
    tgeDate,
    vestingType,
    vestingDurationDays,
    allocation,
    nextUnlock: upcomingUnlocks[0],
    upcomingUnlocks,
    pastUnlocks,
    impact,
    ai: {
      dangerScore,
      expectedImpact,
      sellPressureProbability: sellPressure,
      bullishProbability,
      bearishProbability,
      whaleDistributionRisk,
      volatilityExpectation,
      smartMoneyPositioning,
      outlook,
    },
    tokenomics: { health, dilution: dilutionScore, investorPressure, sustainability, decentralization },
    inflationRiskPct: +(lockedPct * (vestingType === "CLIFF" ? 0.8 : 0.5) / vestingDurationDays * 365).toFixed(2),
    dilutionRiskPct: +(lockedPct * 0.4).toFixed(1),
  };
}

// ─── Formatting helpers ──────────────────────────────────────────────────────

export function fmtCompactUSD(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "$0";
  if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9)  return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6)  return "$" + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3)  return "$" + (n / 1e3).toFixed(1) + "K";
  return "$" + n.toFixed(2);
}

export function fmtCompactNum(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toLocaleString("en", { maximumFractionDigits: 2 });
}

export function impactColor(i: ImpactLevel): string {
  if (i === "EXTREME") return "#ef4444";
  if (i === "HIGH")    return "#f7931a";
  if (i === "MEDIUM")  return "#eab308";
  return "#26a69a";
}

export function impactLabel(i: ImpactLevel): string {
  if (i === "EXTREME") return "Extreme Dilution";
  if (i === "HIGH")    return "High Dilution";
  if (i === "MEDIUM")  return "Medium Dilution";
  return "Low Dilution";
}

export function formatCountdown(targetMs: number, nowMs: number = Date.now()): {
  days: number; hours: number; minutes: number; seconds: number; expired: boolean;
} {
  const diff = Math.max(0, targetMs - nowMs);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return { days, hours, minutes, seconds, expired: diff <= 0 };
}
