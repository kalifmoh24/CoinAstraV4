import { Router, type IRouter } from "express";
import { db, positionsTable, tokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreatePositionBody,
  UpdatePositionBody,
  UpdatePositionParams,
  DeletePositionParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichPosition(p: typeof positionsTable.$inferSelect) {
  const [token] = await db
    .select()
    .from(tokensTable)
    .where(eq(tokensTable.symbol, p.tokenSymbol));

  const currentPrice = token?.price ?? p.avgBuyPrice;
  const valueUsd = p.amount * currentPrice;
  const investedUsd = p.amount * p.avgBuyPrice;
  const pnlUsd = valueUsd - investedUsd;
  const pnlPercent = investedUsd > 0 ? (pnlUsd / investedUsd) * 100 : 0;

  let targetProgressPercent: number | null = null;
  if (p.targetPrice != null) {
    const range = p.targetPrice - p.avgBuyPrice;
    if (range !== 0) {
      targetProgressPercent = Math.max(0, Math.min(100, ((currentPrice - p.avgBuyPrice) / range) * 100));
      targetProgressPercent = Math.round(targetProgressPercent * 10) / 10;
    }
  }

  return {
    id: p.id,
    tokenSymbol: p.tokenSymbol,
    tokenName: p.tokenName,
    logoUrl: p.logoUrl ?? token?.logoUrl ?? null,
    amount: p.amount,
    avgBuyPrice: p.avgBuyPrice,
    currentPrice,
    valueUsd: Math.round(valueUsd * 100) / 100,
    investedUsd: Math.round(investedUsd * 100) / 100,
    pnlUsd: Math.round(pnlUsd * 100) / 100,
    pnlPercent: Math.round(pnlPercent * 100) / 100,
    targetPrice: p.targetPrice,
    targetProgressPercent,
    narrativeSlug: p.narrativeSlug,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/portfolio/positions", async (req, res): Promise<void> => {
  const positions = await db.select().from(positionsTable);
  const enriched = await Promise.all(positions.map(enrichPosition));
  res.json(enriched);
});

router.post("/portfolio/positions", async (req, res): Promise<void> => {
  const parsed = CreatePositionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [token] = await db
    .select()
    .from(tokensTable)
    .where(eq(tokensTable.symbol, parsed.data.tokenSymbol.toUpperCase()));

  const [position] = await db
    .insert(positionsTable)
    .values({
      tokenSymbol: parsed.data.tokenSymbol.toUpperCase(),
      tokenName: parsed.data.tokenName,
      logoUrl: token?.logoUrl ?? null,
      amount: parsed.data.amount,
      avgBuyPrice: parsed.data.avgBuyPrice,
      targetPrice: parsed.data.targetPrice ?? undefined,
      narrativeSlug: parsed.data.narrativeSlug ?? undefined,
    })
    .returning();

  const enriched = await enrichPosition(position);
  res.status(201).json(enriched);
});

router.patch("/portfolio/positions/:id", async (req, res): Promise<void> => {
  const params = UpdatePositionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePositionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, any> = {};
  if (parsed.data.amount != null) updates.amount = parsed.data.amount;
  if (parsed.data.avgBuyPrice != null) updates.avgBuyPrice = parsed.data.avgBuyPrice;
  if ("targetPrice" in parsed.data) updates.targetPrice = parsed.data.targetPrice;

  const [position] = await db
    .update(positionsTable)
    .set(updates)
    .where(eq(positionsTable.id, params.data.id))
    .returning();

  if (!position) {
    res.status(404).json({ error: "Position not found" });
    return;
  }

  const enriched = await enrichPosition(position);
  res.json(enriched);
});

router.delete("/portfolio/positions/:id", async (req, res): Promise<void> => {
  const params = DeletePositionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [position] = await db
    .delete(positionsTable)
    .where(eq(positionsTable.id, params.data.id))
    .returning();

  if (!position) {
    res.status(404).json({ error: "Position not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/portfolio/summary", async (req, res): Promise<void> => {
  const positions = await db.select().from(positionsTable);
  const enriched = await Promise.all(positions.map(enrichPosition));

  const totalValueUsd = enriched.reduce((s, p) => s + p.valueUsd, 0);
  const totalInvestedUsd = enriched.reduce((s, p) => s + p.investedUsd, 0);
  const totalPnlUsd = totalValueUsd - totalInvestedUsd;
  const totalPnlPercent = totalInvestedUsd > 0 ? (totalPnlUsd / totalInvestedUsd) * 100 : 0;

  const byNarrative: Record<string, number> = {};
  for (const p of enriched) {
    const label = p.narrativeSlug ?? "Other";
    byNarrative[label] = (byNarrative[label] ?? 0) + p.valueUsd;
  }

  const allocationByNarrative = Object.entries(byNarrative).map(([label, valueUsd]) => ({
    label,
    valueUsd: Math.round(valueUsd * 100) / 100,
    percent: totalValueUsd > 0 ? Math.round((valueUsd / totalValueUsd) * 1000) / 10 : 0,
  }));

  const sorted = [...enriched].sort((a, b) => b.pnlPercent - a.pnlPercent);

  res.json({
    totalValueUsd: Math.round(totalValueUsd * 100) / 100,
    totalInvestedUsd: Math.round(totalInvestedUsd * 100) / 100,
    totalPnlUsd: Math.round(totalPnlUsd * 100) / 100,
    totalPnlPercent: Math.round(totalPnlPercent * 100) / 100,
    positionCount: enriched.length,
    allocationByNarrative,
    topPerformer: sorted[0] ?? null,
    worstPerformer: sorted[sorted.length - 1] ?? null,
  });
});

router.get("/portfolio/insights", async (req, res): Promise<void> => {
  const positions = await db.select().from(positionsTable);
  const enriched = await Promise.all(positions.map(enrichPosition));

  const narrativeSlugs = [...new Set(enriched.map((p) => p.narrativeSlug ?? "Other"))];
  const overallPnl = enriched.reduce((s, p) => s + p.pnlPercent, 0) / (enriched.length || 1);

  const overallRisk =
    enriched.length <= 1
      ? "very_high"
      : enriched.length <= 3
      ? "high"
      : enriched.length <= 6
      ? "moderate"
      : "low";

  const diversificationScore = Math.min(100, Math.round((enriched.length / 10) * 100));

  res.json({
    overallRisk,
    diversificationScore,
    strengths:
      overallPnl > 0
        ? ["Portfolio is in overall profit", "Exposure to high-momentum narratives"]
        : ["Diversified across multiple assets"],
    weaknesses:
      enriched.length < 5
        ? ["Concentrated in few positions — consider diversifying"]
        : ["Some positions have low momentum scores"],
    overexposedSectors:
      narrativeSlugs.length === 1 && narrativeSlugs[0] !== "Other" ? [narrativeSlugs[0]] : [],
    opportunities: [
      "DePIN narrative showing strong momentum",
      "AI sector underrepresented in most portfolios",
      "L2 tokens trading at historical discount to ETH",
    ],
    rebalancingSuggestions:
      enriched.length < 5
        ? [
            "Consider adding 2-3 more positions for better diversification",
            "Allocate 10-15% to high-conviction narrative plays",
          ]
        : ["Review positions with >30% loss for stop-loss consideration"],
    generatedAt: new Date().toISOString(),
  });
});

export default router;
