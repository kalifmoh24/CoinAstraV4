import { Router, type IRouter } from "express";

// ─────────────────────────────────────────────────────────────────────────────
// Live news aggregator
// Fetches multiple public RSS feeds in parallel, parses them with a minimal
// regex extractor, normalises, deduplicates, and returns the most recent
// articles. No API keys required.
// ─────────────────────────────────────────────────────────────────────────────

interface LiveNewsItem {
  id: string;
  title: string;
  body: string;
  url: string;
  imageurl: string;
  source: string;
  source_key: string;
  published_on: number; // unix seconds
  tags: string[];
  categories: string[];
  lang: string;
  upvotes: number;
  downvotes: number;
}

interface Feed {
  key: string;
  name: string;
  url: string;
}

const FEEDS: Feed[] = [
  { key: "coindesk",       name: "CoinDesk",         url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { key: "cointelegraph",  name: "Cointelegraph",    url: "https://cointelegraph.com/rss" },
  { key: "decrypt",        name: "Decrypt",          url: "https://decrypt.co/feed" },
  { key: "bitcoinmagazine",name: "Bitcoin Magazine", url: "https://bitcoinmagazine.com/.rss/full/" },
  { key: "newsbtc",        name: "NewsBTC",          url: "https://www.newsbtc.com/feed/" },
  { key: "cryptoslate",    name: "CryptoSlate",      url: "https://cryptoslate.com/feed/" },
  { key: "cryptobriefing", name: "Crypto Briefing",  url: "https://cryptobriefing.com/feed/" },
  { key: "beincrypto",     name: "BeInCrypto",       url: "https://beincrypto.com/feed/" },
  { key: "bitcoinist",     name: "Bitcoinist",       url: "https://bitcoinist.com/feed/" },
  { key: "ambcrypto",      name: "AMBCrypto",        url: "https://ambcrypto.com/feed/" },
];

// ── Tiny HTML / RSS helpers ────────────────────────────────────────────────
function stripCdata(s: string): string {
  return s.replace(/^\s*<!\[CDATA\[/, "").replace(/\]\]>\s*$/, "").trim();
}
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)));
}
function stripHtml(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}
function pick(item: string, tag: string): string {
  // Matches <tag ...>...</tag> with non-greedy capture, including CDATA.
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i");
  const m = re.exec(item);
  return m ? stripCdata(m[1]!) : "";
}
function pickAttr(item: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]+)"`, "i");
  const m = re.exec(item);
  return m ? m[1]! : "";
}
function extractFirstImage(item: string, htmlBody: string): string {
  return (
    pickAttr(item, "media:content", "url") ||
    pickAttr(item, "media:thumbnail", "url") ||
    pickAttr(item, "enclosure", "url") ||
    (/<img[^>]+src="([^"]+)"/i.exec(htmlBody)?.[1] ?? "")
  );
}
function hashId(s: string): string {
  // FNV-1a 32-bit
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(36);
}

function parseFeed(xml: string, feed: Feed): LiveNewsItem[] {
  const items: LiveNewsItem[] = [];
  // Support both <item> (RSS 2.0) and <entry> (Atom) blocks.
  const blockRe = /<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(xml)) !== null) {
    const block = m[2]!;
    const title = stripHtml(pick(block, "title"));
    if (!title) continue;
    const link = stripHtml(pick(block, "link")) || pickAttr(block, "link", "href");
    const desc = pick(block, "description") || pick(block, "content:encoded") || pick(block, "summary") || pick(block, "content");
    const body = stripHtml(desc).slice(0, 1200);
    const pubRaw = pick(block, "pubDate") || pick(block, "published") || pick(block, "updated") || pick(block, "dc:date");
    const pub = pubRaw ? Math.floor(new Date(pubRaw).getTime() / 1000) : Math.floor(Date.now() / 1000);
    const img = extractFirstImage(block, desc);
    const cats: string[] = [];
    const catRe = /<category(?:\s[^>]*)?>([\s\S]*?)<\/category>/gi;
    let cm: RegExpExecArray | null;
    while ((cm = catRe.exec(block)) !== null) {
      const v = stripHtml(stripCdata(cm[1]!));
      if (v) cats.push(v);
    }
    items.push({
      id: hashId(`${feed.key}:${link || title}`),
      title,
      body,
      url: link,
      imageurl: img,
      source: feed.name,
      source_key: feed.key,
      published_on: isNaN(pub) ? Math.floor(Date.now() / 1000) : pub,
      tags: cats,
      categories: cats,
      lang: "EN",
      upvotes: 0,
      downvotes: 0,
    });
  }
  return items;
}

async function fetchFeed(feed: Feed, timeoutMs: number): Promise<LiveNewsItem[]> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(feed.url, {
      signal: ac.signal,
      headers: {
        "User-Agent": "CoinAstraNewsBot/1.0 (+https://coinastra.io)",
        "Accept": "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8",
      },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseFeed(xml, feed);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// ── In-memory cache (60s) — RSS feeds don't need to be hit every request ────
let cache: { ts: number; items: LiveNewsItem[] } | null = null;
const CACHE_MS = 60_000;

async function loadAll(): Promise<LiveNewsItem[]> {
  if (cache && Date.now() - cache.ts < CACHE_MS) return cache.items;
  const results = await Promise.all(FEEDS.map(f => fetchFeed(f, 6000)));
  // Merge + de-dup by URL/title
  const seen = new Set<string>();
  const merged: LiveNewsItem[] = [];
  for (const list of results) {
    for (const it of list) {
      const key = (it.url || it.title).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(it);
    }
  }
  merged.sort((a, b) => b.published_on - a.published_on);
  const trimmed = merged.slice(0, 120);
  cache = { ts: Date.now(), items: trimmed };
  return trimmed;
}

const router: IRouter = Router();

router.get("/news/live", async (_req, res) => {
  try {
    const items = await loadAll();
    res.set("Cache-Control", "public, max-age=30");
    res.json({
      ok: true,
      count: items.length,
      sources: FEEDS.map(f => ({ key: f.key, name: f.name })),
      cachedAt: cache?.ts ?? Date.now(),
      Data: items, // CryptoCompare-compatible field name
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
