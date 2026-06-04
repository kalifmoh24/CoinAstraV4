import { logger } from "./logger.js";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { paprikaMarkets, paprikaFindIdBySymbol, paprikaSearch, getAllCoinsFromPaprika } from "./coinpaprika.js";

const CG_BASE = "https://api.coingecko.com/api/v3";
const ALT_BASE = "https://api.alternative.me";

// ─────────────────────────────────────────────────────────────────────────────
// Stale-while-revalidate cache with disk persistence
//
// Two-tier model:
//   • `fresh` — within TTL: serve immediately, do nothing.
//   • `stale` — past TTL: serve immediately AND trigger background refresh.
//   • on upstream error: KEEP serving the stale value forever.
//
// This is the key reliability mechanism: even when CoinGecko returns 429 (very
// common from cloud IPs / dev preview), users never see a crash or an empty
// state — they see slightly older prices that the background refresher will
// catch up the next time the upstream is happy.
// ─────────────────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: unknown;
  fetchedAt: number;
  ttlMs: number;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

const CACHE_FILE = process.env["COINGECKO_CACHE_FILE"] ?? "/tmp/coinastra-cg-cache.json";

function loadDiskCache(): void {
  try {
    if (!existsSync(CACHE_FILE)) return;
    const raw = readFileSync(CACHE_FILE, "utf8");
    const obj = JSON.parse(raw) as Record<string, CacheEntry>;
    let count = 0;
    for (const [k, v] of Object.entries(obj)) {
      if (v && typeof v === "object" && "data" in v) {
        cache.set(k, v);
        count++;
      }
    }
    logger.info({ count, file: CACHE_FILE }, "CoinGecko cache restored from disk");
  } catch (err) {
    logger.warn({ err }, "Failed to restore CoinGecko cache");
  }
}

let saveTimer: NodeJS.Timeout | null = null;
function scheduleSave(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      mkdirSync(dirname(CACHE_FILE), { recursive: true });
      const obj: Record<string, CacheEntry> = {};
      for (const [k, v] of cache.entries()) obj[k] = v;
      writeFileSync(CACHE_FILE, JSON.stringify(obj));
    } catch (err) {
      logger.warn({ err }, "Failed to persist CoinGecko cache");
    }
  }, 2000); // debounce disk writes
}

loadDiskCache();

function isFresh(entry: CacheEntry): boolean {
  return Date.now() - entry.fetchedAt < entry.ttlMs;
}

// ─── Circuit breaker for CoinGecko ─────────────────────────────────────────
// Once we get 3 consecutive 429s, stop calling CG for `OPEN_MS` and let the
// fallback path (Coinpaprika) handle requests. This prevents 70 bg-sync
// requests from each waiting 30s of retries before falling back.
let cgFailureCount = 0;
let cgOpenUntil = 0;
const CG_FAILURE_THRESHOLD = 3;
const CG_OPEN_MS = 90_000; // skip CG for 90s after the breaker trips

function cgCircuitOpen(): boolean {
  return Date.now() < cgOpenUntil;
}
function recordCgFailure(): void {
  cgFailureCount++;
  if (cgFailureCount >= CG_FAILURE_THRESHOLD) {
    cgOpenUntil = Date.now() + CG_OPEN_MS;
    logger.warn({ openUntil: new Date(cgOpenUntil).toISOString() }, "CoinGecko circuit breaker OPEN — using fallback only");
  }
}
function recordCgSuccess(): void {
  if (cgFailureCount > 0 || cgOpenUntil > 0) {
    logger.info("CoinGecko circuit breaker CLOSED — upstream healthy again");
  }
  cgFailureCount = 0;
  cgOpenUntil = 0;
}

async function doFetchJson(url: string): Promise<unknown> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(url, {
      signal: ac.signal,
      headers: {
        "Accept": "application/json",
        "User-Agent": "CoinAstra/1.0",
      },
    });
    if (!r.ok) throw new Error(`upstream ${r.status} ${url}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

async function doFetchJsonWithRetry(url: string): Promise<unknown> {
  // If the breaker is open for CoinGecko, fail FAST so the caller can fall
  // back to Coinpaprika without spending 30s on doomed retries.
  if (url.startsWith(CG_BASE) && cgCircuitOpen()) {
    throw new Error(`coingecko-circuit-open ${url}`);
  }
  try {
    const data = await doFetchJson(url);
    if (url.startsWith(CG_BASE)) recordCgSuccess();
    return data;
  } catch (err) {
    if (url.startsWith(CG_BASE)) recordCgFailure();
    throw err;
  }
}

async function swrFetch<T>(url: string, ttlMs: number): Promise<T> {
  const key = url;
  const existing = cache.get(key);

  // 1) Fresh hit — return immediately, no upstream call.
  if (existing && isFresh(existing)) {
    return existing.data as T;
  }

  // 2) Stale hit — return stale data NOW, refresh in background.
  if (existing) {
    void refreshInBackground<T>(key, url, ttlMs);
    return existing.data as T;
  }

  // 3) Cold cache — must fetch. Coalesce concurrent calls.
  const pending = inflight.get(key);
  if (pending) return (await pending) as T;

  const p = (async (): Promise<unknown> => {
    try {
      const data = await doFetchJsonWithRetry(url);
      cache.set(key, { data, fetchedAt: Date.now(), ttlMs });
      scheduleSave();
      return data;
    } catch (err) {
      logger.warn({ err, url }, "CoinGecko cold fetch failed after retries — trying neighbour cache");
      // Last-resort fallback: try to derive from an adjacent cache key.
      // If the request was /coins/markets?per_page=100, see if we have a
      // larger pre-warmed page (per_page=250) we can slice from.
      const neighbour = findNeighbourMarkets(url);
      if (neighbour) {
        return neighbour;
      }
      // Final fallback: return an empty array of the same shape so the
      // frontend's localStorage cache takes over and renders last-known data
      // instead of an error/skeleton.
      throw err;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return (await p) as T;
}

/** If we have a 250-per-page entry cached, slice it to satisfy a 100-per-page
 *  request for the same page (or page 1 if no exact page match). */
function findNeighbourMarkets(url: string): unknown | null {
  try {
    const u = new URL(url);
    if (!u.pathname.endsWith("/coins/markets")) return null;
    const wantPage = Number(u.searchParams.get("page") ?? "1");
    const wantPer = Number(u.searchParams.get("per_page") ?? "100");
    const category = u.searchParams.get("category");
    // Look for any cached markets call with per_page=250 that covers the range.
    for (const [k, entry] of cache.entries()) {
      if (!k.includes("/coins/markets")) continue;
      const ku = new URL(k);
      if ((ku.searchParams.get("category") ?? null) !== (category ?? null)) continue;
      const haveP = Number(ku.searchParams.get("page") ?? "1");
      const havePer = Number(ku.searchParams.get("per_page") ?? "100");
      if (havePer < wantPer) continue;
      // The 250-per-page page 1 covers 100-per-page pages 1+2.
      const startIdx = (wantPage - 1) * wantPer - (haveP - 1) * havePer;
      const endIdx = startIdx + wantPer;
      if (startIdx < 0) continue;
      const arr = entry.data as unknown[];
      if (!Array.isArray(arr) || endIdx > arr.length) continue;
      return arr.slice(startIdx, endIdx);
    }
    return null;
  } catch {
    return null;
  }
}

async function refreshInBackground<T>(key: string, url: string, ttlMs: number): Promise<void> {
  if (inflight.has(key)) return;
  const p = (async (): Promise<unknown> => {
    try {
      // Go through the breaker-aware fetch so a stale-revalidate cycle
      // doesn't hammer CoinGecko while the circuit is open.
      const data = await doFetchJsonWithRetry(url);
      cache.set(key, { data, fetchedAt: Date.now(), ttlMs });
      scheduleSave();
      return data;
    } catch (err) {
      // Upstream is rate-limited / down. Keep the stale entry — bump fetchedAt
      // a little so we don't hammer in a tight loop.
      const existing = cache.get(key);
      if (existing) {
        cache.set(key, { ...existing, fetchedAt: Date.now() - Math.floor(ttlMs * 0.8) });
      }
      logger.debug({ err, url }, "CoinGecko background refresh failed (serving stale)");
      return null;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  void p;
}

async function cgFetch<T>(path: string, ttlMs: number, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${CG_BASE}${path}`);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return swrFetch<T>(url.toString(), ttlMs);
}

async function altFetch<T>(path: string, ttlMs: number): Promise<T> {
  return swrFetch<T>(`${ALT_BASE}${path}`, ttlMs);
}

// ─────────────────────────────────────────────────────────────────────────────
// TTLs — generous, because freshness is "background refresh cadence",
// not "data expiry". Stale data is ALWAYS served if upstream is unavailable.
// ─────────────────────────────────────────────────────────────────────────────
const TTL = {
  MARKETS: 30_000,           // 30s — hot pages
  MARKETS_MID: 5 * 60_000,   // 5min
  MARKETS_DEEP: 15 * 60_000, // 15min
  TRENDING: 300_000,         // 5min
  SEARCH: 600_000,           // 10min
  COIN: 60_000,
  CHART: 300_000,
  OHLC: 300_000,
  FEAR_GREED: 600_000,
  GLOBAL: 60_000,
  CATEGORIES: 600_000,
  CAT_COINS: 60_000,
  COIN_LIST: 6 * 60 * 60_000, // 6h — 17k coin ID list
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

// ── Public API ─────────────────────────────────────────────────────────────

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
  const ttl = ids
    ? TTL.COIN
    : category
      ? TTL.MARKETS
      : page <= 5
        ? TTL.MARKETS
        : page <= 20
          ? TTL.MARKETS_MID
          : TTL.MARKETS_DEEP;
  try {
    return await cgFetch<CoinMarket[]>("/coins/markets", ttl, params);
  } catch (err) {
    // CoinGecko is rate-limiting us. Fall back to Coinpaprika which returns
    // ALL ~3000 coins in a single, key-less call.
    logger.warn({ err, page, perPage, category }, "CoinGecko markets failed → Coinpaprika fallback");
    return paprikaMarkets(page, perPage, category, ids);
  }
}

export async function getCoinsList(): Promise<{ id: string; symbol: string; name: string }[]> {
  try {
    return await cgFetch<{ id: string; symbol: string; name: string }[]>("/coins/list", TTL.COIN_LIST);
  } catch (err) {
    logger.warn({ err }, "CoinGecko /coins/list failed → Coinpaprika fallback");
    const { paprikaMarkets } = await import("./coinpaprika.js");
    const all = await paprikaMarkets(1, 5000);
    return all.map(c => ({ id: c.id, symbol: c.symbol, name: c.name }));
  }
}

export async function searchCoins(query: string): Promise<{ coins: { id: string; name: string; symbol: string; market_cap_rank: number; thumb: string }[] }> {
  try {
    return await cgFetch("/search", TTL.SEARCH, { query });
  } catch (err) {
    logger.warn({ err, query }, "CoinGecko search failed → Coinpaprika fallback");
    return paprikaSearch(query);
  }
}

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

export async function getCoinChart(id: string, days: number): Promise<{ prices: [number, number][]; market_caps: [number, number][]; total_volumes: [number, number][] }> {
  try {
    return await cgFetch(`/coins/${encodeURIComponent(id)}/market_chart`, TTL.CHART, {
      vs_currency: "usd",
      days: String(days),
      interval: days <= 1 ? "hourly" : "daily",
    });
  } catch (err) {
    logger.warn({ err, id, days }, "CoinGecko chart failed → synthesize from OHLC");
    // OHLC is more reliably cached. Derive line/area points from the close
    // of each OHLC candle — same shape the frontend expects.
    try {
      const ohlc = await getCoinOHLC(id, days);
      const prices: [number, number][] = ohlc.map(c => [c[0]!, c[4]!]);
      return { prices, market_caps: [], total_volumes: [] };
    } catch (err2) {
      logger.warn({ err: err2, id, days }, "OHLC fallback also failed");
      throw err;
    }
  }
}

export async function getTrending(): Promise<{ coins: { item: TrendingItem }[] }> {
  return cgFetch("/search/trending", TTL.TRENDING);
}

export async function getGlobal(): Promise<GlobalData> {
  try {
    return await cgFetch<GlobalData>("/global", TTL.GLOBAL);
  } catch (err) {
    logger.warn({ err }, "CoinGecko global failed → Coinpaprika fallback");
    const { getPaprikaGlobal } = await import("./coinpaprika.js");
    return await getPaprikaGlobal();
  }
}

export async function getFearGreed(): Promise<{ data: { value: string; value_classification: string; timestamp: string }[] }> {
  return altFetch("/fng/?limit=7&format=json", TTL.FEAR_GREED);
}

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

export async function getCoinCategories(): Promise<CoinCategory[]> {
  return cgFetch<CoinCategory[]>("/coins/categories", TTL.CATEGORIES, { order: "market_cap_desc" });
}

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

export async function getCoinIdBySymbol(symbol: string): Promise<string | null> {
  try {
    const result = await searchCoins(symbol);
    const match = result.coins.find((c) => c.symbol.toLowerCase() === symbol.toLowerCase());
    if (match?.id) return match.id;
  } catch (err) {
    logger.warn({ err, symbol }, "getCoinIdBySymbol via search failed, trying Coinpaprika");
  }
  try {
    return await paprikaFindIdBySymbol(symbol);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-warmer + background refresher
//
// • On boot, sequentially fetch the most-used data so the cache is hot from
//   request #1 (top 1000 coins across 4 pages of 250, trending, global,
//   fear-greed, full coin list for search).
// • Then keep refreshing every 30s so prices stay current without blocking
//   any user request.
// ─────────────────────────────────────────────────────────────────────────────

let prewarmStarted = false;

async function sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }

async function prewarm(): Promise<void> {
  // Step 1: Coinpaprika first — one call, all ~3000 coins, never rate-limited.
  // This guarantees we have *something* live to serve within ~1 second of boot.
  try {
    await getAllCoinsFromPaprika();
  } catch (err) {
    logger.warn({ err }, "Coinpaprika pre-warm failed");
  }

  // Step 2: CoinGecko endpoints we can't get from Coinpaprika (trending,
  // global, fear-greed, categories, OHLC list). Spread out the calls — CG
  // free tier is ~10-30 req/min from a single IP. If any fail, the Coinpaprika
  // data already loaded above will keep the app fully usable.
  const tasks: Array<() => Promise<unknown>> = [
    () => getCoinsMarkets(1, 250).catch(() => null),
    () => getCoinsMarkets(2, 250).catch(() => null),
    () => getTrending().catch(() => null),
    () => getGlobal().catch(() => null),
    () => getFearGreed().catch(() => null),
    () => getCoinCategories().catch(() => null),
  ];
  for (const t of tasks) {
    await t();
    await sleep(3000);
  }
  logger.info({ cacheSize: cache.size }, "CoinGecko pre-warm complete");
}

export function startBackgroundRefresh(): void {
  if (prewarmStarted) return;
  prewarmStarted = true;

  // Kick off pre-warm immediately (non-blocking).
  void prewarm();

  // Every 30s, mark hot keys stale so the next request triggers SWR refresh.
  // We don't refresh proactively to avoid wasting upstream quota when nobody
  // is using the app — SWR will refresh on first access.
  setInterval(() => {
    // Refresh ALL coin data every 30s via Coinpaprika (single reliable call).
    void getAllCoinsFromPaprika().catch(() => null);
  }, 30_000);

  setInterval(() => {
    // Slower re-fetch of CG-only endpoints (trending, global) every 2 min.
    void (async () => {
      try {
        await getGlobal();
        await sleep(2000);
        await getTrending();
      } catch {
        // ignore — SWR will keep serving stale.
      }
    })();
  }, 120_000);
}
