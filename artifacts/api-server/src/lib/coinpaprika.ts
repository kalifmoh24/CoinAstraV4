import { logger } from "./logger.js";
import type { CoinMarket, GlobalData } from "./coingecko.js";

// ─────────────────────────────────────────────────────────────────────────────
// Coinpaprika fallback provider
//
// Coinpaprika's /v1/tickers endpoint returns ~3000 coins (ALL of them) in a
// single ~3 MB call with no API key and no aggressive rate limiting. We use
// this as a 100%-reliable fallback whenever CoinGecko returns 429 from the
// Replit IP — which, in our experience, is most of the time.
//
// Normalised to the same `CoinMarket` shape the frontend already consumes,
// so callers don't need to know the data came from Coinpaprika.
// ─────────────────────────────────────────────────────────────────────────────

const CP_BASE = "https://api.coinpaprika.com/v1";

interface CpTicker {
  id: string;            // "btc-bitcoin"
  name: string;          // "Bitcoin"
  symbol: string;        // "BTC"
  rank: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  last_updated: string;
  quotes: {
    USD: {
      price: number;
      volume_24h: number;
      market_cap: number;
      percent_change_24h: number;
      percent_change_7d: number;
      percent_change_30d: number;
      ath_price: number;
      ath_date: string;
    };
  };
}

// Map Coinpaprika ids to CoinGecko-compatible ids so frontend deep-links work.
const ID_OVERRIDES: Record<string, string> = {
  "btc-bitcoin": "bitcoin",
  "eth-ethereum": "ethereum",
  "usdt-tether": "tether",
  "bnb-binance-coin": "binancecoin",
  "sol-solana": "solana",
  "usdc-usd-coin": "usd-coin",
  "xrp-xrp": "ripple",
  "doge-dogecoin": "dogecoin",
  "ada-cardano": "cardano",
  "trx-tron": "tron",
  "avax-avalanche": "avalanche-2",
  "shib-shiba-inu": "shiba-inu",
  "dot-polkadot": "polkadot",
  "link-chainlink": "chainlink",
  "matic-polygon": "matic-network",
  "ton-toncoin": "the-open-network",
  "wbtc-wrapped-bitcoin": "wrapped-bitcoin",
  "bch-bitcoin-cash": "bitcoin-cash",
  "ltc-litecoin": "litecoin",
  "near-near-protocol": "near",
  "uni-uniswap": "uniswap",
  "icp-internet-computer": "internet-computer",
  "etc-ethereum-classic": "ethereum-classic",
  "apt-aptos": "aptos",
  "atom-cosmos": "cosmos",
  "fil-filecoin": "filecoin",
  "imx-immutable-x": "immutable-x",
  "stx-stacks": "blockstack",
  "hbar-hedera": "hedera-hashgraph",
  "vet-vechain": "vechain",
  "op-optimism": "optimism",
  "arb-arbitrum": "arbitrum",
  "pepe-pepe": "pepe",
  "wif-dogwifhat": "dogwifhat",
  "bonk-bonk": "bonk",
  "floki-floki": "floki",
};

function normaliseId(cpId: string): string {
  return ID_OVERRIDES[cpId] ?? cpId.replace(/^[a-z0-9]+-/, "");
}

function toCoinMarket(t: CpTicker): CoinMarket {
  const usd = t.quotes.USD;
  const id = normaliseId(t.id);
  const price = usd.price ?? 0;
  const change = usd.percent_change_24h ?? 0;
  return {
    id,
    symbol: (t.symbol ?? "").toLowerCase(),
    name: t.name,
    image: `https://static.coinpaprika.com/coin/${t.id}/logo.png`,
    current_price: price,
    market_cap: usd.market_cap ?? 0,
    market_cap_rank: t.rank ?? 9999,
    fully_diluted_valuation: null,
    total_volume: usd.volume_24h ?? 0,
    high_24h: price * (1 + Math.max(0, change) / 100),
    low_24h: price * (1 + Math.min(0, change) / 100),
    price_change_24h: (price * change) / 100,
    price_change_percentage_24h: change,
    price_change_percentage_7d_in_currency: usd.percent_change_7d ?? 0,
    price_change_percentage_30d_in_currency: usd.percent_change_30d ?? 0,
    circulating_supply: t.circulating_supply ?? 0,
    total_supply: t.total_supply ?? null,
    max_supply: t.max_supply ?? null,
    ath: usd.ath_price ?? price,
    ath_change_percentage: usd.ath_price ? ((price - usd.ath_price) / usd.ath_price) * 100 : 0,
    atl: 0,
    last_updated: t.last_updated,
  };
}

// ── Cache ─────────────────────────────────────────────────────────────────
let cache: { data: CoinMarket[]; ts: number } | null = null;
let inflight: Promise<CoinMarket[]> | null = null;

const TTL_MS = 60_000; // refresh every 60s

export async function getAllCoinsFromPaprika(): Promise<CoinMarket[]> {
  if (cache && Date.now() - cache.ts < TTL_MS) return cache.data;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const r = await fetch(`${CP_BASE}/tickers`, {
        headers: { "Accept": "application/json", "User-Agent": "CoinAstra/1.0" },
      });
      if (!r.ok) throw new Error(`coinpaprika ${r.status}`);
      const raw = (await r.json()) as CpTicker[];
      const normalised = raw
        .filter(t => t && t.quotes && t.quotes.USD && t.rank > 0)
        .map(toCoinMarket)
        .sort((a, b) => a.market_cap_rank - b.market_cap_rank);
      // Dedupe by id (some Coinpaprika ids collapse to the same normalised id) —
      // keep the higher-ranked (lower number) entry. Also dedupe by symbol so
      // React keys stay unique across the table.
      const byId = new Map<string, CoinMarket>();
      const seenSymbols = new Set<string>();
      for (const c of normalised) {
        if (byId.has(c.id)) continue;
        // Skip symbols already used by a higher-ranked coin to avoid React key clashes.
        if (seenSymbols.has(c.symbol)) {
          // give it a unique id suffix so it doesn't collide
          c.id = `${c.id}-${c.market_cap_rank}`;
        }
        byId.set(c.id, c);
        seenSymbols.add(c.symbol);
      }
      const deduped = [...byId.values()];
      cache = { data: deduped, ts: Date.now() };
      logger.info({ count: deduped.length }, "Coinpaprika tickers refreshed");
      return deduped;
    } catch (err) {
      logger.warn({ err }, "Coinpaprika fetch failed");
      if (cache) return cache.data; // keep stale data
      throw err;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Paginate the full coin list to satisfy a `/coins/markets?page=&per_page=` request. */
export async function paprikaMarkets(page: number, perPage: number, category?: string, ids?: string): Promise<CoinMarket[]> {
  const all = await getAllCoinsFromPaprika();
  // Coinpaprika has no category data; if a category filter is requested, we
  // simply return an empty result so the caller can decide what to do.
  if (category) return [];
  if (ids) {
    const wanted = new Set(ids.split(",").map(s => s.trim().toLowerCase()));
    return all.filter(c => wanted.has(c.id.toLowerCase()) || wanted.has(c.symbol.toLowerCase()));
  }
  const start = (page - 1) * perPage;
  return all.slice(start, start + perPage);
}

/** Find a coin id (CG-style) by symbol from the Coinpaprika list. */
export async function paprikaFindIdBySymbol(symbol: string): Promise<string | null> {
  const all = await getAllCoinsFromPaprika();
  const s = symbol.toLowerCase();
  const match = all.find(c => c.symbol === s);
  return match?.id ?? null;
}

/** Search across the full Coinpaprika list by name or symbol. */
export async function paprikaSearch(query: string, limit = 20): Promise<{ coins: { id: string; name: string; symbol: string; market_cap_rank: number; thumb: string }[] }> {
  const all = await getAllCoinsFromPaprika();
  const q = query.toLowerCase();
  const scored = all
    .map(c => {
      const sym = c.symbol;
      const name = c.name.toLowerCase();
      let score = 0;
      if (sym === q) score = 100;
      else if (name === q) score = 95;
      else if (sym.startsWith(q)) score = 80;
      else if (name.startsWith(q)) score = 70;
      else if (sym.includes(q)) score = 50;
      else if (name.includes(q)) score = 40;
      return { c, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || a.c.market_cap_rank - b.c.market_cap_rank)
    .slice(0, limit);
  return {
    coins: scored.map(({ c }) => ({
      id: c.id,
      name: c.name,
      symbol: c.symbol,
      market_cap_rank: c.market_cap_rank,
      thumb: c.image,
    })),
  };
}

// ── Global market data fallback ───────────────────────────────────────────
interface CpGlobal {
  market_cap_usd: number;
  volume_24h_usd: number;
  bitcoin_dominance_percentage: number;
  cryptocurrencies_number: number;
  market_cap_change_24h: number;
}

let globalCache: { data: GlobalData; ts: number } | null = null;
const GLOBAL_TTL_MS = 60_000;

export async function getPaprikaGlobal(): Promise<GlobalData> {
  if (globalCache && Date.now() - globalCache.ts < GLOBAL_TTL_MS) {
    return globalCache.data;
  }
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 6000);
  try {
    const r = await fetch(`${CP_BASE}/global`, {
      signal: ac.signal,
      headers: { "Accept": "application/json", "User-Agent": "CoinAstra/1.0" },
    });
    if (!r.ok) throw new Error(`coinpaprika global ${r.status}`);
    const g = (await r.json()) as CpGlobal;
    const normalised: GlobalData = {
      data: {
        total_market_cap: { usd: g.market_cap_usd },
        total_volume: { usd: g.volume_24h_usd },
        market_cap_percentage: { btc: g.bitcoin_dominance_percentage, eth: 0 },
        market_cap_change_percentage_24h_usd: g.market_cap_change_24h,
        active_cryptocurrencies: g.cryptocurrencies_number,
      },
    };
    globalCache = { data: normalised, ts: Date.now() };
    return normalised;
  } catch (err) {
    if (globalCache) return globalCache.data;
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
