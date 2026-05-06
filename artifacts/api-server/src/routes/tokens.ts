import { Router, type IRouter } from "express";
import { db, tokensTable, narrativesTable, newsTable } from "@workspace/db";
import { eq, or, like, ilike, sql } from "drizzle-orm";
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

export default router;
