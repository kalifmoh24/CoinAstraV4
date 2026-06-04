import { useEffect, useState, useCallback } from "react";

export interface NewsArticle {
  id: string;
  title: string;
  body: string;
  url: string;
  imageurl: string;
  source: string;       // display name e.g. "CoinDesk"
  source_key: string;   // slug e.g. "coindesk"
  published_on: number; // unix seconds
  tags: string[];       // normalised tag list
  categories: string[]; // category strings
  lang: string;
  upvotes: number;
  downvotes: number;
}

// AI-style derived fields (deterministic per article)
export interface EnrichedNewsArticle extends NewsArticle {
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  sentimentScore: number;   // 0–100
  impact: "HIGH" | "MEDIUM" | "LOW";
  relatedCoins: string[];   // e.g. ["BTC","ETH"]
  aiCategory: NewsCategory;
}

export type NewsCategory =
  | "ALL" | "BTC" | "ETH" | "DEFI" | "REGULATION" | "ETF"
  | "INSTITUTIONAL" | "TECH" | "NFT" | "LAYER2" | "MEMES" | "AI";

// ────────────────────────────────────────────────────────────────────────────────
// Tag → category / coin mapping (CryptoCompare uses pipe-separated lowercase tags)
// ────────────────────────────────────────────────────────────────────────────────
const COIN_TAGS: Record<string, string> = {
  bitcoin: "BTC", btc: "BTC",
  ethereum: "ETH", eth: "ETH",
  solana: "SOL", sol: "SOL",
  ripple: "XRP", xrp: "XRP",
  cardano: "ADA", ada: "ADA",
  dogecoin: "DOGE", doge: "DOGE",
  polkadot: "DOT", dot: "DOT",
  avalanche: "AVAX", avax: "AVAX",
  chainlink: "LINK", link: "LINK",
  polygon: "MATIC", matic: "MATIC", pol: "POL",
  cosmos: "ATOM", atom: "ATOM",
  litecoin: "LTC", ltc: "LTC",
  binance: "BNB", bnb: "BNB",
  tron: "TRX", trx: "TRX",
  sui: "SUI", aptos: "APT", apt: "APT",
  near: "NEAR", arbitrum: "ARB", arb: "ARB",
  optimism: "OP", base: "BASE",
  uniswap: "UNI", uni: "UNI",
  aave: "AAVE", maker: "MKR", mkr: "MKR",
  pepe: "PEPE", shiba: "SHIB", shib: "SHIB",
};

const CAT_KEYWORDS: Array<{ cat: NewsCategory; words: RegExp }> = [
  { cat: "ETF",           words: /\b(etf|spot etf|ibit|fbtc|grayscale)\b/i },
  { cat: "REGULATION",    words: /\b(sec|cftc|regulat|lawsuit|court|sue|fine|approve|ban|congress|senate|government|treasury)\b/i },
  { cat: "DEFI",          words: /\b(defi|liquid|yield|tvl|lending|swap|amm|stable|stake)\b/i },
  { cat: "NFT",           words: /\b(nft|opensea|magic eden|pfp|collectible)\b/i },
  { cat: "LAYER2",        words: /\b(layer 2|l2|rollup|arbitrum|optimism|base|zk|scroll|linea|starknet)\b/i },
  { cat: "INSTITUTIONAL", words: /\b(microstrategy|blackrock|fidelity|jpmorgan|goldman|treasury|institutional|hedge fund)\b/i },
  { cat: "AI",            words: /\b(ai\b|artificial intelligence|machine learning|llm|gpt|openai)\b/i },
  { cat: "MEMES",         words: /\b(memecoin|meme coin|pepe|shiba|dogecoin|wif|bonk|popcat)\b/i },
  { cat: "TECH",          words: /\b(upgrade|fork|mainnet|testnet|client|protocol|node|validator)\b/i },
];

const BULL_RE = /\b(surge|soar|rally|rise|jump|gain|record|all-time high|ath|approv|inflow|bullish|adopt|launch|partner|integrat|breakout|pump|moon)\b/i;
const BEAR_RE = /\b(plunge|crash|drop|fall|tumble|slump|decline|sell-?off|outflow|bearish|hack|exploit|fraud|fine|sue|ban|halt|liquidat|collapse|dump|rug)\b/i;
const IMPACT_HIGH_RE = /\b(bitcoin|ethereum|btc|eth|sec|etf|blackrock|microstrategy|hack|approve|ban|launch|all-time high)\b/i;

function deriveCoinsAndCategory(art: NewsArticle): { coins: string[]; category: NewsCategory } {
  const text = `${art.title} ${art.body} ${art.tags.join(" ")} ${art.categories.join(" ")}`;
  const coins = new Set<string>();
  for (const t of art.tags) {
    const k = t.toLowerCase().trim();
    if (COIN_TAGS[k]) coins.add(COIN_TAGS[k]);
  }
  for (const [k, sym] of Object.entries(COIN_TAGS)) {
    if (new RegExp("\\b" + k + "\\b", "i").test(text)) coins.add(sym);
  }
  // Category — first match wins, then BTC/ETH dominant coin fallback
  let category: NewsCategory = "ALL";
  for (const r of CAT_KEYWORDS) {
    if (r.words.test(text)) { category = r.cat; break; }
  }
  if (category === "ALL") {
    if (coins.has("BTC")) category = "BTC";
    else if (coins.has("ETH")) category = "ETH";
  }
  return { coins: [...coins].slice(0, 5), category };
}

function deriveSentiment(text: string): { sentiment: EnrichedNewsArticle["sentiment"]; score: number } {
  const bull = (text.match(BULL_RE) || []).length;
  const bear = (text.match(BEAR_RE) || []).length;
  const diff = bull - bear;
  // Map diff into 0–100 (50 = neutral)
  const score = Math.max(5, Math.min(95, 50 + diff * 9 + (bull > 0 ? 4 : 0) - (bear > 0 ? 4 : 0)));
  const sentiment: EnrichedNewsArticle["sentiment"] =
    score >= 62 ? "BULLISH" : score <= 38 ? "BEARISH" : "NEUTRAL";
  return { sentiment, score };
}

function deriveImpact(art: NewsArticle, text: string): EnrichedNewsArticle["impact"] {
  if (IMPACT_HIGH_RE.test(text)) return "HIGH";
  const ageMin = (Date.now() / 1000 - art.published_on) / 60;
  if (ageMin < 60 && (art.upvotes ?? 0) > 5) return "HIGH";
  if (ageMin < 240) return "MEDIUM";
  return "LOW";
}

function enrich(article: NewsArticle): EnrichedNewsArticle {
  const { coins, category } = deriveCoinsAndCategory(article);
  const text = `${article.title} ${article.body}`;
  const { sentiment, score } = deriveSentiment(text);
  const impact = deriveImpact(article, text);
  return {
    ...article,
    sentiment,
    sentimentScore: score,
    impact,
    relatedCoins: coins,
    aiCategory: category,
  };
}

// ────────────────────────────────────────────────────────────────────────────────
// Network fetch — CryptoCompare free news API (no key required)
// Aggregates from 30+ crypto outlets: CoinDesk, Cointelegraph, Decrypt, The Block,
// CryptoSlate, Bitcoin Magazine, NewsBTC, CryptoPotato, CryptoBriefing, etc.
// ────────────────────────────────────────────────────────────────────────────────
// Same-origin backend route that aggregates 10+ crypto RSS feeds server-side.
// Uses relative URL so it works through the Replit proxy in dev and prod.
const NEWS_URL = "/api/news/live";

interface RawCCArticle {
  id: string;
  title: string;
  body: string;
  url: string;
  imageurl: string;
  source: string;
  source_key: string;
  published_on: number;
  tags: string[] | string;
  categories: string[] | string;
  lang: string;
  upvotes: number | string;
  downvotes: number | string;
}

function toList(v: string[] | string | undefined): string[] {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  return String(v).split("|").map(s => s.trim()).filter(Boolean);
}

async function fetchCryptoCompareNews(): Promise<NewsArticle[]> {
  const res = await fetch(NEWS_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`news ${res.status}`);
  const json = await res.json() as { Data: RawCCArticle[] };
  return (json.Data || []).map(a => ({
    id: a.id,
    title: a.title,
    body: a.body,
    url: a.url,
    imageurl: a.imageurl,
    source: a.source,
    source_key: (a.source_key || a.source || "").toLowerCase(),
    published_on: a.published_on,
    tags: toList(a.tags),
    categories: toList(a.categories),
    lang: a.lang,
    upvotes: Number(a.upvotes || 0),
    downvotes: Number(a.downvotes || 0),
  }));
}

// ────────────────────────────────────────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────────────────────────────────────────
export function useCryptoNews(refreshMs = 60_000) {
  const [articles, setArticles] = useState<EnrichedNewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);

  const load = useCallback(async () => {
    try {
      const raw = await fetchCryptoCompareNews();
      const enriched = raw.map(enrich).sort((a, b) => b.published_on - a.published_on);
      setArticles(enriched);
      setError(null);
      setLastUpdated(Date.now());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = window.setInterval(load, refreshMs);
    return () => window.clearInterval(t);
  }, [load, refreshMs]);

  return { articles, loading, error, lastUpdated, refresh: load };
}

// ────────────────────────────────────────────────────────────────────────────────
// Derived aggregates
// ────────────────────────────────────────────────────────────────────────────────
export function summariseSources(articles: EnrichedNewsArticle[]) {
  const m = new Map<string, { count: number; name: string }>();
  for (const a of articles) {
    const k = a.source_key || a.source.toLowerCase();
    const prev = m.get(k) || { count: 0, name: a.source };
    prev.count += 1;
    m.set(k, prev);
  }
  return [...m.entries()].map(([k, v]) => ({ key: k, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count);
}

export function summariseTrending(articles: EnrichedNewsArticle[]) {
  // Top tags weighted by recency + impact
  const w = new Map<string, number>();
  const now = Date.now() / 1000;
  for (const a of articles) {
    const recency = Math.max(0, 1 - (now - a.published_on) / 86_400); // 1 day window
    const boost = a.impact === "HIGH" ? 2 : a.impact === "MEDIUM" ? 1.2 : 1;
    for (const c of a.relatedCoins) {
      w.set(c, (w.get(c) || 0) + recency * boost);
    }
    if (a.aiCategory !== "ALL") {
      w.set(a.aiCategory, (w.get(a.aiCategory) || 0) + recency * boost * 0.6);
    }
  }
  return [...w.entries()].map(([tag, weight]) => ({ tag, weight }))
    .sort((a, b) => b.weight - a.weight).slice(0, 12);
}

export function summariseSentiment(articles: EnrichedNewsArticle[]) {
  let bull = 0, bear = 0, neu = 0, totalScore = 0;
  for (const a of articles) {
    if (a.sentiment === "BULLISH") bull++;
    else if (a.sentiment === "BEARISH") bear++;
    else neu++;
    totalScore += a.sentimentScore;
  }
  const n = articles.length || 1;
  return {
    bull, bear, neutral: neu,
    avg: totalScore / n,
    bullPct: (bull / n) * 100,
    bearPct: (bear / n) * 100,
    neutralPct: (neu / n) * 100,
  };
}
