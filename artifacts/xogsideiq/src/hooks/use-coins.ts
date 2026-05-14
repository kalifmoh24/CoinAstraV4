import { useQuery } from "@tanstack/react-query";

// ── Coin search ────────────────────────────────────────────────────────────────

export interface CoinSearchResult {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number;
  thumb: string;
}

export function useCoinSearch(query: string) {
  return useQuery<{ coins: CoinSearchResult[] }>({
    queryKey: ["ca-coin-search", query],
    queryFn: async () => {
      if (!query.trim()) return { coins: [] };
      const r = await fetch(`/api/coins/search?q=${encodeURIComponent(query)}`);
      if (!r.ok) throw new Error(`search ${r.status}`);
      return r.json();
    },
    enabled: query.trim().length > 0,
    staleTime: 300_000,
    retry: 1,
  });
}

// ── Single coin live data ──────────────────────────────────────────────────────

export interface CoinLiveData {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  price: number;
  priceChange24h: number;
  priceChange7d: number;
  priceChange30d: number;
  priceChange1y: number;
  marketCap: number;
  volume24h: number;
  fdv: number;
  high24h: number;
  low24h: number;
  ath: number;
  athChange: number;
  athDate: string;
  circulatingSupply: number;
  totalSupply: number | null;
  maxSupply: number | null;
  contractAddress?: string;
  platforms?: Record<string, string>;
  categories?: string[];
  links?: {
    homepage?: string;
    whitepaper?: string;
    twitter?: string;
    reddit?: string;
    explorers?: string[];
  };
  description?: string;
}

export function useTokenLive(symbol: string | undefined) {
  return useQuery<CoinLiveData>({
    queryKey: ["ca-token-live", symbol],
    queryFn: async () => {
      const r = await fetch(`/api/tokens/${symbol}/live`);
      if (!r.ok) throw new Error(`token live ${r.status}`);
      return r.json();
    },
    enabled: !!symbol,
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: 2,
  });
}

// ── CoinGecko coin details (by CoinGecko ID) ──────────────────────────────────

export function useCoinById(coinId: string | undefined) {
  return useQuery({
    queryKey: ["ca-coin-by-id", coinId],
    queryFn: async () => {
      const r = await fetch(`/api/coins/${coinId}`);
      if (!r.ok) throw new Error(`coin ${r.status}`);
      return r.json();
    },
    enabled: !!coinId,
    staleTime: 60_000,
    retry: 2,
  });
}

// ── Price chart ────────────────────────────────────────────────────────────────

export interface ChartData {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

/** Fetch chart via backend token endpoint (resolves coingeckoId automatically) */
export function useTokenChart(symbol: string | undefined, days: number) {
  return useQuery<ChartData>({
    queryKey: ["ca-token-chart", symbol, days],
    queryFn: async () => {
      const r = await fetch(`/api/tokens/${symbol}/chart?days=${days}`);
      if (!r.ok) throw new Error(`chart ${r.status}`);
      return r.json();
    },
    enabled: !!symbol,
    staleTime: 300_000,
    retry: 2,
  });
}

/** Fetch chart directly by CoinGecko ID */
export function useCoinChart(coinId: string | undefined, days: number) {
  return useQuery<ChartData>({
    queryKey: ["ca-coin-chart", coinId, days],
    queryFn: async () => {
      const r = await fetch(`/api/coins/${coinId}/chart?days=${days}`);
      if (!r.ok) throw new Error(`chart ${r.status}`);
      return r.json();
    },
    enabled: !!coinId,
    staleTime: 300_000,
    retry: 2,
  });
}

// ── Market overview ────────────────────────────────────────────────────────────

export function useMarketOverview() {
  return useQuery({
    queryKey: ["ca-market-overview"],
    queryFn: async () => {
      const r = await fetch("/api/market/overview");
      if (!r.ok) throw new Error(`overview ${r.status}`);
      return r.json();
    },
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: 2,
  });
}
