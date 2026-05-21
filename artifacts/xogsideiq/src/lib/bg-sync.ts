/**
 * CoinAstra Background Sync Engine
 *
 * Progressively downloads all 17,500+ coins from CoinGecko (via backend),
 * stores them in IndexedDB, and keeps prices silently refreshed every 30s.
 * Completely independent of any React component lifecycle.
 */

import { idbGet, idbSet } from "./idb-cache";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  sparkline_in_7d?: { price: number[] };
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
}

export interface SyncProgress {
  pagesLoaded: number;
  totalPages: number;
  totalCoins: number;
  lastRefreshedAt: number | null;
  isSyncing: boolean;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TOTAL_PAGES = 70; // 70 × 250 = 17,500 coins

/** IndexedDB TTL by page tier — deep pages change rank rarely */
function idbTtl(page: number): number {
  if (page <= 5)  return 45_000;          // 45 seconds
  if (page <= 20) return  5 * 60_000;     // 5 minutes
  return                 15 * 60_000;     // 15 minutes
}

/** Delay between API fetches to stay within CoinGecko free tier (~10 req/min) */
function fetchDelay(page: number): number {
  if (page <= 5)  return 1_500;
  if (page <= 20) return 3_500;
  return                 5_000;
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ─── State (module-level singleton) ──────────────────────────────────────────

let _started   = false;
let _progress: SyncProgress = {
  pagesLoaded: 0,
  totalPages: TOTAL_PAGES,
  totalCoins: 0,
  lastRefreshedAt: null,
  isSyncing: false,
};

type SyncCallback = (coins: CoinMarket[], page: number) => void;
const _listeners = new Set<SyncCallback>();

// ─── Public API ───────────────────────────────────────────────────────────────

/** Subscribe to price/coin updates. Returns an unsubscribe function. */
export function onCoinUpdate(cb: SyncCallback): () => void {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

export function getSyncProgress(): SyncProgress {
  return { ..._progress };
}

/** Load all coins already in IndexedDB — used for instant mount hydration. */
export async function getStoredCoins(): Promise<CoinMarket[]> {
  const all: CoinMarket[] = [];
  for (let page = 1; page <= TOTAL_PAGES; page++) {
    const cached = await idbGet<CoinMarket[]>(`coinastra:markets:p${page}`);
    if (!cached || cached.length === 0) break; // first gap → stop
    all.push(...cached);
  }
  return all;
}

/** Force-refresh the hot pages (1-5) immediately — called by the refresh button. */
export async function forceRefreshHot(): Promise<void> {
  for (let page = 1; page <= 5; page++) {
    const coins = await _fetchPage(page, true);
    if (coins) _emit(coins, page);
    await sleep(1_200);
  }
}

/** Start the background engine. Idempotent — safe to call multiple times. */
export function startBgSync(): void {
  if (_started) return;
  _started = true;
  _progress.isSyncing = true;

  // Run entirely detached — never awaited
  _runSync().catch(() => {});
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function _emit(coins: CoinMarket[], page: number): void {
  _listeners.forEach(cb => { try { cb(coins, page); } catch { /* ignore */ } });
}

async function _fetchPage(page: number, forceRefresh = false): Promise<CoinMarket[] | null> {
  const key = `coinastra:markets:p${page}`;

  if (!forceRefresh) {
    // Serve from IDB if still fresh
    const cached = await idbGet<CoinMarket[]>(key);
    if (cached && cached.length > 0) return cached;
  }

  try {
    const res = await fetch(
      `/api/coins/markets?per_page=250&page=${page}&sparkline=true&price_change_percentage=1h,7d`
    );
    if (!res.ok) {
      // On error, return stale IDB data rather than null
      const stale = await idbGet<CoinMarket[]>(key);
      return stale ?? null;
    }
    const data = (await res.json()) as CoinMarket[];
    if (data.length > 0) {
      await idbSet(key, data, idbTtl(page));
    }
    return data.length > 0 ? data : null;
  } catch {
    const stale = await idbGet<CoinMarket[]>(key);
    return stale ?? null;
  }
}

async function _runSync(): Promise<void> {
  // ── Phase 1: Progressive initial load ────────────────────────────────────
  for (let page = 1; page <= TOTAL_PAGES; page++) {
    const coins = await _fetchPage(page);

    if (coins && coins.length > 0) {
      _progress.pagesLoaded++;
      _progress.totalCoins = _progress.pagesLoaded * 250;
      if (page === 1) _progress.lastRefreshedAt = Date.now();
      _emit(coins, page);
    }

    // IDB cache hit = no API call made, no delay needed
    const wasCached = (await idbGet<CoinMarket[]>(`coinastra:markets:p${page}`)) !== null;
    if (!wasCached) {
      await sleep(fetchDelay(page));
    }
  }

  _progress.isSyncing = false;
  _progress.lastRefreshedAt = Date.now();

  // ── Phase 2: Ongoing live refresh ────────────────────────────────────────

  // Pages 1-5: refresh every 30 seconds (live prices)
  setInterval(async () => {
    for (let page = 1; page <= 5; page++) {
      const coins = await _fetchPage(page, true);
      if (coins) {
        _emit(coins, page);
        if (page === 1) _progress.lastRefreshedAt = Date.now();
      }
      await sleep(1_500);
    }
  }, 30_000);

  // Pages 6-20: refresh every 10 minutes
  setInterval(async () => {
    for (let page = 6; page <= 20; page++) {
      const coins = await _fetchPage(page, true);
      if (coins) _emit(coins, page);
      await sleep(3_500);
    }
  }, 10 * 60_000);

  // Pages 21-70: refresh every 30 minutes
  setInterval(async () => {
    for (let page = 21; page <= TOTAL_PAGES; page++) {
      const coins = await _fetchPage(page, true);
      if (coins) _emit(coins, page);
      await sleep(5_000);
    }
  }, 30 * 60_000);
}
