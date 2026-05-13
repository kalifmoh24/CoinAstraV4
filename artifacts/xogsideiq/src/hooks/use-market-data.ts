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
  time_until_update: string;
}

// ── Core fetchers ──────────────────────────────────────────────────────────────

const CG = "https://api.coingecko.com/api/v3";

async function fetchLiveCoins(page = 1): Promise<LiveCoin[]> {
  const r = await fetch(
    `${CG}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=${page}&sparkline=true&price_change_percentage=7d`
  );
  if (!r.ok) throw new Error(`CG ${r.status}`);
  return r.json();
}

async function fetchTrending(): Promise<{ coins: { item: TrendingCoinItem }[] }> {
  const r = await fetch(`${CG}/search/trending`);
  if (!r.ok) throw new Error(`CG trending ${r.status}`);
  return r.json();
}

async function fetchFearGreed(): Promise<{ data: FearGreedEntry[] }> {
  const r = await fetch("https://api.alternative.me/fng/?limit=1&format=json");
  if (!r.ok) throw new Error("Fear & Greed unavailable");
  return r.json();
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

/** Live top-100 coins, auto-refreshed every 15 s */
export function useLiveCoins(page = 1) {
  return useQuery<LiveCoin[]>({
    queryKey: ["ca-live-coins", page],
    queryFn: () => fetchLiveCoins(page),
    refetchInterval: 15_000,
    staleTime: 12_000,
    retry: 1,
    placeholderData: (prev) => prev,
  });
}

/** Derived: top N gainers / losers from the live top-100 list */
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

/** Trending coins from CoinGecko /search/trending — refreshes every 5 min */
export function useTrendingCoins() {
  return useQuery({
    queryKey: ["ca-trending"],
    queryFn: fetchTrending,
    refetchInterval: 300_000,
    staleTime: 295_000,
    retry: 1,
  });
}

/** Fear & Greed Index from alternative.me — refreshes every 10 min */
export function useFearGreedLive() {
  return useQuery<{ data: FearGreedEntry[] }>({
    queryKey: ["ca-fear-greed"],
    queryFn: fetchFearGreed,
    refetchInterval: 600_000,
    staleTime: 595_000,
    retry: 2,
  });
}

/** Meme coins from live top-100 filtered by known IDs */
const MEME_IDS = ["dogecoin", "shiba-inu", "pepe", "bonk", "floki", "dogwifhat", "brett", "mog-coin"];

export function useMemeCoinLive() {
  const { data: coins } = useLiveCoins();
  return useMemo(
    () => coins?.filter(c => MEME_IDS.includes(c.id)).slice(0, 6) ?? [],
    [coins]
  );
}

/** Prefetch coins on mount to warm the cache */
export function usePrefetchCoins() {
  const qc = useQueryClient();
  useEffect(() => {
    qc.prefetchQuery({ queryKey: ["ca-live-coins", 1], queryFn: () => fetchLiveCoins(1) });
  }, [qc]);
}
