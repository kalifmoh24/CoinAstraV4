import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface LiveCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation?: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_30d_in_currency?: number;
  circulating_supply: number;
  total_supply?: number | null;
  max_supply?: number | null;
  ath: number;
  atl: number;
  last_updated: string;
  sparkline_in_7d?: { price: number[] };
}

export interface TrendingCoinItem {
  id: string;
  coin_id: number;
  name: string;
  symbol: string;
  market_cap_rank: number;
  thumb: string;
  price_btc: number;
  data: {
    price: string;
    price_change_percentage_24h?: { usd: number };
    market_cap: string;
  };
}

export interface FearGreedEntry {
  value: string;
  value_classification: string;
  timestamp: string;
  time_until_update?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Browser-side stale-while-revalidate
//
// The api-server already does aggressive caching + stale-on-error, but we
// also keep the LAST GOOD response in localStorage so:
//   • Hard refresh / new tab → instant render, no skeleton.
//   • If the api-server is restarting → instant render of last seen prices.
//   • The fetcher never throws when it has a fallback → React Query never
//     enters error state, no crash UI.
// ─────────────────────────────────────────────────────────────────────────────

const LS_PREFIX = "coinastra-cache:";
const LS_TTL_MS = 24 * 60 * 60_000; // 24h hard cap

function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; data: T };
    if (Date.now() - parsed.ts > LS_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function lsSet<T>(key: string, data: T): void {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // Storage full / disabled — ignore, in-memory cache still works.
  }
}

async function resilientJson<T>(url: string, cacheKey: string): Promise<T> {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`${url} ${r.status}`);
    const json = (await r.json()) as T;
    lsSet(cacheKey, json);
    return json;
  } catch (err) {
    const fallback = lsGet<T>(cacheKey);
    if (fallback !== null) return fallback;
    throw err;
  }
}

// ── Core fetchers via backend proxy ──────────────────────────────────────────

async function fetchLiveCoins(page = 1, perPage = 100): Promise<LiveCoin[]> {
  return resilientJson<LiveCoin[]>(
    `/api/coins/markets?page=${page}&per_page=${perPage}`,
    `markets:${page}:${perPage}`,
  );
}

async function fetchTrending(): Promise<{ coins: { item: TrendingCoinItem }[] }> {
  return resilientJson<{ coins: { item: TrendingCoinItem }[] }>(
    "/api/coins/trending",
    "trending",
  );
}

async function fetchFearGreed(): Promise<{ data: FearGreedEntry[] }> {
  return resilientJson<{ data: FearGreedEntry[] }>(
    "/api/coins/fear-greed",
    "fear-greed",
  );
}

// ── Hooks ──────────────────────────────────────────────────────────────────

const COMMON: { refetchInterval: number; staleTime: number; retry: number; retryDelay: (i: number) => number } = {
  refetchInterval: 30_000,
  staleTime: 25_000,
  retry: 5,
  retryDelay: (i: number) => Math.min(1000 * 2 ** i, 15_000),
};

/** Top 100 coins, auto-refreshed every 30s. Initialised from localStorage so
 *  the page renders instantly — never a permanent skeleton. */
export function useLiveCoins(page = 1, perPage = 100) {
  return useQuery<LiveCoin[]>({
    queryKey: ["ca-live-coins", page, perPage],
    queryFn: () => fetchLiveCoins(page, perPage),
    initialData: () => lsGet<LiveCoin[]>(`markets:${page}:${perPage}`) ?? undefined,
    ...COMMON,
    placeholderData: (prev) => prev,
  });
}

/** Live top 1000 coins (4 pages of 250 merged). All preloaded by the backend
 *  pre-warmer so they're available immediately. */
export function useLiveCoins250() {
  const p1 = useQuery<LiveCoin[]>({
    queryKey: ["ca-live-coins", 1, 250],
    queryFn: () => fetchLiveCoins(1, 250),
    initialData: () => lsGet<LiveCoin[]>(`markets:1:250`) ?? undefined,
    ...COMMON,
    placeholderData: (prev) => prev,
  });
  const p2 = useQuery<LiveCoin[]>({
    queryKey: ["ca-live-coins", 2, 250],
    queryFn: () => fetchLiveCoins(2, 250),
    initialData: () => lsGet<LiveCoin[]>(`markets:2:250`) ?? undefined,
    ...COMMON,
    placeholderData: (prev) => prev,
  });
  const p3 = useQuery<LiveCoin[]>({
    queryKey: ["ca-live-coins", 3, 250],
    queryFn: () => fetchLiveCoins(3, 250),
    initialData: () => lsGet<LiveCoin[]>(`markets:3:250`) ?? undefined,
    ...COMMON,
    refetchInterval: 60_000,
    placeholderData: (prev) => prev,
  });
  const p4 = useQuery<LiveCoin[]>({
    queryKey: ["ca-live-coins", 4, 250],
    queryFn: () => fetchLiveCoins(4, 250),
    initialData: () => lsGet<LiveCoin[]>(`markets:4:250`) ?? undefined,
    ...COMMON,
    refetchInterval: 90_000,
    placeholderData: (prev) => prev,
  });
  const merged = useMemo(
    () => [...(p1.data ?? []), ...(p2.data ?? []), ...(p3.data ?? []), ...(p4.data ?? [])],
    [p1.data, p2.data, p3.data, p4.data],
  );
  return {
    data: merged,
    // Only "loading" when we have nothing at all to render. Once we have any
    // data (even stale from localStorage), report ready — no skeleton flash.
    isLoading: merged.length === 0 && p1.isLoading,
    isError: false,
  };
}

/** Derived: top N gainers / losers from the live list */
export function useGainersLosers(n = 7) {
  const { data: coins, isLoading } = useLiveCoins();
  const gainers = useMemo(
    () => coins ? [...coins].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h).slice(0, n) : [],
    [coins, n]
  );
  const losers = useMemo(
    () => coins ? [...coins].sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h).slice(0, n) : [],
    [coins, n]
  );
  return { gainers, losers, isLoading };
}

/** Trending coins, refreshes every 5 min */
export function useTrendingCoins() {
  return useQuery({
    queryKey: ["ca-trending"],
    queryFn: fetchTrending,
    initialData: () => lsGet<{ coins: { item: TrendingCoinItem }[] }>("trending") ?? undefined,
    refetchInterval: 300_000,
    staleTime: 295_000,
    retry: 3,
  });
}

/** Fear & Greed Index, refreshes every 10 min */
export function useFearGreedLive() {
  return useQuery<{ data: FearGreedEntry[] }>({
    queryKey: ["ca-fear-greed"],
    queryFn: fetchFearGreed,
    initialData: () => lsGet<{ data: FearGreedEntry[] }>("fear-greed") ?? undefined,
    refetchInterval: 600_000,
    staleTime: 595_000,
    retry: 3,
  });
}

/** Meme coins from live list filtered by known IDs */
const MEME_IDS = ["dogecoin","shiba-inu","pepe","bonk","floki","dogwifhat","brett","mog-coin","book-of-meme","popcat"];

export function useMemeCoinLive() {
  const { data: coins } = useLiveCoins(1, 250);
  return useMemo(
    () => coins?.filter(c => MEME_IDS.includes(c.id)).slice(0, 6) ?? [],
    [coins]
  );
}

/** Prefetch coins on mount to warm the cache */
export function usePrefetchCoins() {
  const qc = useQueryClient();
  useEffect(() => {
    void qc.prefetchQuery({ queryKey: ["ca-live-coins", 1, 100], queryFn: () => fetchLiveCoins(1) });
  }, [qc]);
}
