import { logger } from "./logger.js";

const CG_BASE = "https://api.coingecko.com/api/v3";
const ALT_BASE = "https://api.alternative.me";

// ── In-memory cache ────────────────────────────────────────────────────────────

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

async function cgFetch<T>(path: string, ttlMs: number, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${CG_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  const key = url.toString();

  const cached = getCache<T>(key);
  if (cached !== null) return cached;

  const r = await fetch(url.toString(), {
    headers: {
      "Accept": "application/json",
      "User-Agent": "CoinAstra/1.0",
    },
  });

  if (!r.ok) {
    throw new Error(`CoinGecko ${r.status}: ${path}`);
  }

  const data = await r.json() as T;
  setCache(key, data, ttlMs);
  return data;
}

async function altFetch<T>(path: string, ttlMs: number): Promise<T> {
  const key = `alt:${path}`;
  const cached = getCache<T>(key);
  if (cached !== null) return cached;

  const r = await fetch(`${ALT_BASE}${path}`, {
    headers: { "Accept": "application/json" },
  });

  if (!r.ok) throw new Error(`alternative.me ${r.status}`);
  const data = await r.json() as T;
  setCache(key, data, ttlMs);
  return data;
}

// ── Public API ─────────────────────────────────────────────────────────────────

const TTL = {
  MARKETS: 30_000,       // 30s — live prices (pages 1-5)
  MARKETS_MID: 5 * 60_000,   // 5min — pages 6-20
  MARKETS_DEEP: 15 * 60_000, // 15min — pages 21+ (rank rarely changes)
  TRENDING: 300_000,     // 5min
  SEARCH: 300_000,       // 5min
  COIN: 60_000,          // 60s
  CHART: 300_000,        // 5min
  OHLC: 300_000,         // 5min
  FEAR_GREED: 600_000,   // 10min
  GLOBAL: 60_000,        // 60s
  CATEGORIES: 600_000,   // 10min — categories rarely change
  CAT_COINS: 60_000,     // 60s — coin prices update
};

export interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_30d_in_currency?: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  atl: number;
  last_updated: string;
  sparkline_in_7d?: { price: number[] };
}

export interface TrendingItem {
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

export interface CoinDetails {
  id: string;
  symbol: string;
  name: string;
  description: { en: string };
  image: { thumb: string; small: string; large: string };
  market_cap_rank: number;
  links: {
    homepage: string[];
    whitepaper: string;
    blockchain_site: string[];
    twitter_screen_name: string;
    subreddit_url: string;
  };
  contract_address?: string;
  platforms?: Record<string, string>;
  market_data: {
    current_price: { usd: number };
    market_cap: { usd: number };
    fully_diluted_valuation: { usd: number };
    total_volume: { usd: number };
    high_24h: { usd: number };
    low_24h: { usd: number };
    price_change_24h: number;
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
    price_change_percentage_1y: number;
    ath: { usd: number };
    ath_change_percentage: { usd: number };
    ath_date: { usd: string };
    atl: { usd: number };
    circulating_supply: number;
    total_supply: number | null;
    max_supply: number | null;
  };
  categories: string[];
}

export interface GlobalData {
  data: {
    total_market_cap: { usd: number };
    total_volume: { usd: number };
    market_cap_percentage: { btc: number; eth: number };
    market_cap_change_percentage_24h_usd: number;
    active_cryptocurrencies: number;
  };
}

/** Top coins by market cap, paginated (max 250 per call on free tier) */
export async function getCoinsMarkets(page = 1, perPage = 100, category?: string, ids?: string): Promise<CoinMarket[]> {
  const params: Record<string, string> = {
    vs_currency: "usd",
    order: "market_cap_desc",
    per_page: String(Math.min(perPage, 250)),
    page: String(page),
    sparkline: "true",
    price_change_percentage: "7d,30d",
  };
  if (category) params.category = category;
  if (ids) params.ids = ids;
  // Tiered TTL: hot pages cached 30s, mid 5min, deep pages 15min
  const ttl = ids
    ? TTL.COIN
    : category
      ? TTL.MARKETS
      : page <= 5
        ? TTL.MARKETS
        : page <= 20
          ? TTL.MARKETS_MID
          : TTL.MARKETS_DEEP;
  return cgFetch<CoinMarket[]>("/coins/markets", ttl, params);
}

/** Full coin list (all 17k+ coins) — id/symbol/name only, for local search index */
export async function getCoinsList(): Promise<{ id: string; symbol: string; name: string }[]> {
  return cgFetch<{ id: string; symbol: string; name: string }[]>("/coins/list", 6 * 60 * 60 * 1000);
}

/** Search coins, exchanges, categories */
export async function searchCoins(query: string): Promise<{ coins: { id: string; name: string; symbol: string; market_cap_rank: number; thumb: string }[] }> {
  return cgFetch("/search", TTL.SEARCH, { query });
}

/** Single coin detailed data */
export async function getCoinDetails(id: string): Promise<CoinDetails> {
  return cgFetch<CoinDetails>(`/coins/${encodeURIComponent(id)}`, TTL.COIN, {
    localization: "false",
    tickers: "false",
    market_data: "true",
    community_data: "false",
    developer_data: "false",
    sparkline: "false",
  });
}

/** Price chart — [timestamp, price] pairs */
export async function getCoinChart(id: string, days: number): Promise<{ prices: [number, number][]; market_caps: [number, number][]; total_volumes: [number, number][] }> {
  return cgFetch(`/coins/${encodeURIComponent(id)}/market_chart`, TTL.CHART, {
    vs_currency: "usd",
    days: String(days),
    interval: days <= 1 ? "hourly" : days <= 90 ? "daily" : "daily",
  });
}

/** Trending coins */
export async function getTrending(): Promise<{ coins: { item: TrendingItem }[] }> {
  return cgFetch("/search/trending", TTL.TRENDING);
}

/** Global market data */
export async function getGlobal(): Promise<GlobalData> {
  return cgFetch<GlobalData>("/global", TTL.GLOBAL);
}

/** Fear & Greed index */
export async function getFearGreed(): Promise<{ data: { value: string; value_classification: string; timestamp: string }[] }> {
  return altFetch("/fng/?limit=7&format=json", TTL.FEAR_GREED);
}

/** OHLC candlestick data — [[timestamp_ms, open, high, low, close], ...] */
export async function getCoinOHLC(id: string, days: number): Promise<number[][]> {
  const validDays = [1, 7, 14, 30, 90, 180, 365].includes(days) ? days : 7;
  return cgFetch<number[][]>(`/coins/${encodeURIComponent(id)}/ohlc`, TTL.OHLC, {
    vs_currency: "usd",
    days: String(validDays),
  });
}

export interface CoinCategory {
  id: string;
  name: string;
  market_cap: number;
  market_cap_change_24h: number;
  content: string;
  top_3_coins: string[];
  top_3_coins_id?: string[];
  volume_24h: number;
  updated_at: string;
}

/** All CoinGecko categories with market data, sorted by market cap */
export async function getCoinCategories(): Promise<CoinCategory[]> {
  return cgFetch<CoinCategory[]>("/coins/categories", TTL.CATEGORIES, {
    order: "market_cap_desc",
  });
}

/** Coins in a specific CoinGecko category, paginated */
export async function getCoinsByCategory(categoryId: string, page = 1, perPage = 100): Promise<CoinMarket[]> {
  return cgFetch<CoinMarket[]>("/coins/markets", TTL.CAT_COINS, {
    vs_currency: "usd",
    category: categoryId,
    order: "market_cap_desc",
    per_page: String(Math.min(perPage, 250)),
    page: String(page),
    sparkline: "false",
    price_change_percentage: "7d",
  });
}

/** Find a coin ID by symbol (searches and picks best match) */
export async function getCoinIdBySymbol(symbol: string): Promise<string | null> {
  try {
    const result = await searchCoins(symbol);
    const match = result.coins.find(
      (c) => c.symbol.toLowerCase() === symbol.toLowerCase()
    );
    return match?.id ?? null;
  } catch (err) {
    logger.warn({ err, symbol }, "getCoinIdBySymbol failed");
    return null;
  }
}
