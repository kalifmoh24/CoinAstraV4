import { Router, type IRouter } from "express";
import { db, narrativesTable, tokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/narratives", async (req, res): Promise<void> => {
  const narratives = await db.select().from(narrativesTable);
  const allTokens = await db.select().from(tokensTable);

  res.json(
    narratives.map((n) => {
      const tokenIds = allTokens.filter((t) => {
        const ids = (t.narrativeIds as number[]) ?? [];
        return ids.includes(n.id);
      });
      return {
        id: n.id,
        name: n.name,
        slug: n.slug,
        description: n.description,
        iconKey: n.iconKey,
        momentumScore: n.momentumScore,
        perf24h: n.perf24h,
        perf7d: n.perf7d,
        tokenCount: tokenIds.length,
        createdAt: n.createdAt.toISOString(),
      };
    })
  );
});

router.get("/narratives/:slug", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;

  const [narrative] = await db
    .select()
    .from(narrativesTable)
    .where(eq(narrativesTable.slug, raw));

  if (!narrative) {
    res.status(404).json({ error: "Narrative not found" });
    return;
  }

  const allTokens = await db.select().from(tokensTable);
  const topTokens = allTokens
    .filter((t) => {
      const ids = (t.narrativeIds as number[]) ?? [];
      return ids.includes(narrative.id);
    })
    .sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0))
    .slice(0, 10)
    .map((t) => ({
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
    }));

  res.json({
    id: narrative.id,
    name: narrative.name,
    slug: narrative.slug,
    description: narrative.description,
    iconKey: narrative.iconKey,
    momentumScore: narrative.momentumScore,
    perf24h: narrative.perf24h,
    perf7d: narrative.perf7d,
    aiCommentary: narrative.aiCommentary,
    topTokens,
    createdAt: narrative.createdAt.toISOString(),
  });
});

export default router;
