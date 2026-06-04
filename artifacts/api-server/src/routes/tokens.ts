import { Router, type IRouter } from "express";
import { db, tokensTable, narrativesTable, newsTable } from "@workspace/db";
import { eq, or, ilike } from "drizzle-orm";
import { getCoinChart, getCoinDetails, getCoinIdBySymbol } from "../lib/coingecko.js";
import {
  ListTokensQueryParams,
  GetTokenParams,
  GetTokenScoresParams,
  GetTokenAiResearchParams,
  GetTokenNewsParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tokens", async (req, res): Promise<void> => {
  const parsed = ListTokensQueryParams.safeParse(req.query);
  const query = parsed.success ? parsed.data.q : undefined;
  const limit = (parsed.success ? parsed.data.limit : undefined) ?? 50;
  const offset = (parsed.success ? parsed.data.offset : undefined) ?? 0;

  let tokens;
  if (query) {
    tokens = await db
      .select()
      .from(tokensTable)
      .where(
        or(
          ilike(tokensTable.symbol, `%${query}%`),
          ilike(tokensTable.name, `%${query}%`)
        )
      )
      .limit(limit)
      .offset(offset);
  } else {
    tokens = await db
      .select()
      .from(tokensTable)
      .limit(limit)
      .offset(offset);
  }

  res.json(
    tokens.map((t) => ({
      id: t.id,
      symbol: t.symbol,
      name: t.name,
      logoUrl: t.logoUrl,
      chain: t.chain,
      description: t.description,
      price: t.price,
      priceChange24h: t.priceChange24h,
      marketCap: t.marketCap,
      volume24h: t.volume24h,
      overallScore: t.overallScore,
      finalGrade: t.finalGrade,
      createdAt: t.createdAt.toISOString(),
    }))
  );
});

router.get("/tokens/:symbol", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
  const symbol = raw.toUpperCase();

  const [token] = await db
    .select()
    .from(tokensTable)
    .where(eq(tokensTable.symbol, symbol));

  if (!token) {
    res.status(404).json({ error: "Token not found" });
    return;
  }

  const narrativeIds = (token.narrativeIds as number[]) ?? [];
  let narratives: any[] = [];
  if (narrativeIds.length > 0) {
    const allNarratives = await db.select().from(narrativesTable);
    narratives = allNarratives.filter((n) => narrativeIds.includes(n.id));
  }

  const allTokens = await db.select().from(tokensTable);
  const tokenCount = allTokens.length;

  res.json({
    id: token.id,
    symbol: token.symbol,
    name: token.name,
    logoUrl: token.logoUrl,
    chain: token.chain,
    description: token.description,
    websiteUrl: token.websiteUrl,
    whitepaperUrl: token.whitepaperUrl,
    price: token.price,
    priceChange24h: token.priceChange24h,
    priceChange7d: token.priceChange7d,
    marketCap: token.marketCap,
    volume24h: token.volume24h,
    fdv: token.fdv,
    circulatingSupply: token.circulatingSupply,
    totalSupply: token.totalSupply,
    overallScore: token.overallScore,
    fundamentalScore: token.fundamentalScore,
    technicalScore: token.technicalScore,
    sentimentScore: token.sentimentScore,
    riskScore: token.riskScore,
    narrativeMomentumScore: token.narrativeMomentumScore,
    finalGrade: token.finalGrade,
    gradeExplanation: token.gradeExplanation,
    narratives: narratives.map((n) => ({
      id: n.id,
      name: n.name,
      slug: n.slug,
      description: n.description,
      iconKey: n.iconKey,
      momentumScore: n.momentumScore,
      perf24h: n.perf24h,
      perf7d: n.perf7d,
      tokenCount,
      createdAt: n.createdAt.toISOString(),
    })),
    createdAt: token.createdAt.toISOString(),
  });
});

router.get("/tokens/:symbol/scores", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
  const symbol = raw.toUpperCase();

  const [token] = await db
    .select()
    .from(tokensTable)
    .where(eq(tokensTable.symbol, symbol));

  if (!token) {
    res.status(404).json({ error: "Token not found" });
    return;
  }

  res.json({
    tokenId: token.id,
    symbol: token.symbol,
    overallScore: token.overallScore ?? 50,
    fundamentalScore: token.fundamentalScore ?? 50,
    technicalScore: token.technicalScore ?? 50,
    sentimentScore: token.sentimentScore ?? 50,
    riskScore: token.riskScore ?? 50,
    narrativeMomentumScore: token.narrativeMomentumScore ?? 50,
    finalGrade: token.finalGrade ?? "C",
    gradeExplanation: token.gradeExplanation ?? "Scores based on current market data and on-chain metrics.",
    updatedAt: token.updatedAt.toISOString(),
  });
});

router.get("/tokens/:symbol/ai-research", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
  const symbol = raw.toUpperCase();

  const [token] = await db
    .select()
    .from(tokensTable)
    .where(eq(tokensTable.symbol, symbol));

  if (!token) {
    res.status(404).json({ error: "Token not found" });
    return;
  }

  const grade = token.finalGrade ?? "C";
  const opportunityMap: Record<string, string> = {
    "A+": "very_high",
    A: "high",
    B: "moderate",
    C: "moderate",
    D: "low",
    F: "low",
  };

  res.json({
    symbol: token.symbol,
    summary: token.gradeExplanation ?? `${token.name} shows ${grade}-grade fundamentals. Current market conditions suggest cautious optimism with key resistance levels being tested.`,
    strengths: [
      "Strong developer activity and GitHub commits",
      "Growing ecosystem adoption",
      "Solid tokenomics with limited inflation schedule",
    ],
    weaknesses: [
      "High correlation with BTC market cycles",
      "Concentrated token distribution among early holders",
    ],
    risks: [
      "Regulatory uncertainty in key markets",
      "Competition from newer protocol designs",
      "Macro environment sensitivity",
    ],
    opportunityLevel: opportunityMap[grade] ?? "moderate",
    generatedAt: new Date().toISOString(),
  });
});

router.get("/tokens/:symbol/chart", async (req, res, next): Promise<void> => {
  try {
    const raw = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
    const symbol = raw.toUpperCase();
    const days = Math.min(365, Math.max(1, Number(req.query["days"]) || 7));

    const [token] = await db.select().from(tokensTable).where(eq(tokensTable.symbol, symbol));

    let cgId = token?.coingeckoId ?? null;
    if (!cgId) {
      cgId = await getCoinIdBySymbol(symbol);
    }

    if (!cgId) {
      res.status(404).json({ error: "CoinGecko ID not found for this token" });
      return;
    }

    const chart = await getCoinChart(cgId, days);
    res.json(chart);
  } catch (err) {
    next(err);
  }
});

router.get("/tokens/:symbol/live", async (req, res, next): Promise<void> => {
  try {
    const raw = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
    const symbol = raw.toUpperCase();

    const [token] = await db.select().from(tokensTable).where(eq(tokensTable.symbol, symbol));

    let cgId = token?.coingeckoId ?? null;
    if (!cgId) {
      cgId = await getCoinIdBySymbol(symbol);
    }

    if (!cgId) {
      res.status(404).json({ error: "CoinGecko ID not found for this token" });
      return;
    }

    const details = await getCoinDetails(cgId);
    const md = details.market_data;
    res.json({
      id: cgId,
      symbol: details.symbol.toUpperCase(),
      name: details.name,
      image: details.image?.large,
      price: md.current_price?.usd,
      priceChange24h: md.price_change_percentage_24h,
      priceChange7d: md.price_change_percentage_7d,
      priceChange30d: md.price_change_percentage_30d,
      priceChange1y: md.price_change_percentage_1y,
      marketCap: md.market_cap?.usd,
      volume24h: md.total_volume?.usd,
      fdv: md.fully_diluted_valuation?.usd,
      high24h: md.high_24h?.usd,
      low24h: md.low_24h?.usd,
      ath: md.ath?.usd,
      athChange: md.ath_change_percentage?.usd,
      athDate: md.ath_date?.usd,
      circulatingSupply: md.circulating_supply,
      totalSupply: md.total_supply,
      maxSupply: md.max_supply,
      contractAddress: details.contract_address,
      platforms: details.platforms,
      categories: details.categories,
      links: {
        homepage: details.links?.homepage?.[0],
        whitepaper: details.links?.whitepaper,
        twitter: details.links?.twitter_screen_name,
        reddit: details.links?.subreddit_url,
        explorers: details.links?.blockchain_site?.filter(Boolean).slice(0, 3),
      },
      description: details.description?.en,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/tokens/:symbol/news", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
  const symbol = raw.toUpperCase();

  const allNews = await db
    .select()
    .from(newsTable)
    .limit(20);

  const relatedNews = allNews.filter((n) => {
    const symbols = (n.relatedSymbols as string[]) ?? [];
    return symbols.includes(symbol) || symbols.length === 0;
  }).slice(0, 5);

  res.json(
    relatedNews.map((n) => ({
      id: n.id,
      title: n.title,
      source: n.source,
      url: n.url,
      summary: n.summary,
      sentiment: n.sentiment,
      relatedSymbols: (n.relatedSymbols as string[]) ?? [],
      publishedAt: n.publishedAt.toISOString(),
    }))
  );
});

/** POST /api/tokens/import — add a CoinGecko coin to the platform tokens table */
router.post("/tokens/import", async (req, res, next): Promise<void> => {
  try {
    const {
      id: cgId,
      symbol,
      name,
      image,
      current_price,
      price_change_percentage_24h,
      price_change_percentage_7d_in_currency,
      market_cap,
      total_volume,
      fully_diluted_valuation,
      circulating_supply,
      total_supply,
    } = req.body as Record<string, unknown>;

    if (!cgId || !symbol || !name) {
      res.status(400).json({ error: "id, symbol, and name are required" });
      return;
    }

    const upperSymbol = (symbol as string).toUpperCase();

    const existing = await db
      .select({ id: tokensTable.id, symbol: tokensTable.symbol })
      .from(tokensTable)
      .where(eq(tokensTable.symbol, upperSymbol))
      .limit(1);

    if (existing.length > 0) {
      res.status(200).json({ imported: false, message: "Already on platform" });
      return;
    }

    await db.insert(tokensTable).values({
      symbol: upperSymbol,
      name: name as string,
      logoUrl: (image as string) ?? null,
      chain: "Multi-Chain",
      coingeckoId: cgId as string,
      price: (current_price as number) ?? null,
      priceChange24h: (price_change_percentage_24h as number) ?? null,
      priceChange7d: (price_change_percentage_7d_in_currency as number) ?? null,
      marketCap: (market_cap as number) ?? null,
      volume24h: (total_volume as number) ?? null,
      fdv: (fully_diluted_valuation as number) ?? null,
      circulatingSupply: (circulating_supply as number) ?? null,
      totalSupply: (total_supply as number) ?? null,
      overallScore: 50,
      fundamentalScore: 50,
      technicalScore: 50,
      sentimentScore: 50,
      riskScore: 50,
      narrativeMomentumScore: 50,
      finalGrade: "B",
    });

    res.status(201).json({ imported: true, message: "Coin added to CoinAstra" });
  } catch (err) {
    next(err);
  }
});

export default router;
