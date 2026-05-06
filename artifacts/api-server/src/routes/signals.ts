import { Router, type IRouter } from "express";
import { db, signalsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListSignalsQueryParams,
  CreateSignalBody,
  UpdateSignalBody,
  UpdateSignalParams,
  DeleteSignalParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function computeProgress(entryPrice: number, currentPrice: number, targetPrice: number, action: string): number {
  if (action === "SELL") {
    const range = entryPrice - targetPrice;
    if (range === 0) return 0;
    return Math.max(0, Math.min(100, ((entryPrice - currentPrice) / range) * 100));
  }
  const range = targetPrice - entryPrice;
  if (range === 0) return 0;
  return Math.max(0, Math.min(100, ((currentPrice - entryPrice) / range) * 100));
}

function formatSignal(s: typeof signalsTable.$inferSelect) {
  const currentPrice = s.entryPrice;
  const progress = computeProgress(s.entryPrice, currentPrice, s.targetPrice, s.action);
  return {
    id: s.id,
    tokenSymbol: s.tokenSymbol,
    tokenName: s.tokenName,
    action: s.action,
    entryPrice: s.entryPrice,
    targetPrice: s.targetPrice,
    stopLossPrice: s.stopLossPrice,
    confidence: s.confidence,
    timeframe: s.timeframe,
    status: s.status,
    progressPercent: Math.round(progress * 10) / 10,
    createdAt: s.createdAt.toISOString(),
    expiresAt: s.expiresAt ? s.expiresAt.toISOString() : null,
  };
}

router.get("/signals", async (req, res): Promise<void> => {
  const parsed = ListSignalsQueryParams.safeParse(req.query);
  const status = parsed.success ? parsed.data.status : undefined;

  const signals = await db.select().from(signalsTable);
  const filtered = status ? signals.filter((s) => s.status === status) : signals;

  const now = new Date();
  const updated = filtered.map((s) => {
    let updatedStatus = s.status;
    if (s.expiresAt && s.expiresAt < now && s.status === "active") {
      updatedStatus = "expired";
    }
    return { ...s, status: updatedStatus };
  });

  res.json(updated.sort((a, b) => b.id - a.id).map(formatSignal));
});

router.post("/signals", async (req, res): Promise<void> => {
  const parsed = CreateSignalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [signal] = await db
    .insert(signalsTable)
    .values({
      tokenSymbol: parsed.data.tokenSymbol,
      tokenName: parsed.data.tokenName,
      action: parsed.data.action as "BUY" | "SELL" | "WATCH",
      entryPrice: parsed.data.entryPrice,
      targetPrice: parsed.data.targetPrice,
      stopLossPrice: parsed.data.stopLossPrice ?? undefined,
      confidence: parsed.data.confidence,
      timeframe: parsed.data.timeframe as "scalp" | "swing" | "position",
      status: "active",
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
    })
    .returning();

  res.status(201).json(formatSignal(signal));
});

router.patch("/signals/:id", async (req, res): Promise<void> => {
  const params = UpdateSignalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSignalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, any> = {};
  if (parsed.data.status != null) updates.status = parsed.data.status;
  if (parsed.data.targetPrice != null) updates.targetPrice = parsed.data.targetPrice;
  if (parsed.data.confidence != null) updates.confidence = parsed.data.confidence;
  if ("stopLossPrice" in parsed.data) updates.stopLossPrice = parsed.data.stopLossPrice;

  const [signal] = await db
    .update(signalsTable)
    .set(updates)
    .where(eq(signalsTable.id, params.data.id))
    .returning();

  if (!signal) {
    res.status(404).json({ error: "Signal not found" });
    return;
  }

  res.json(formatSignal(signal));
});

router.delete("/signals/:id", async (req, res): Promise<void> => {
  const params = DeleteSignalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [signal] = await db
    .delete(signalsTable)
    .where(eq(signalsTable.id, params.data.id))
    .returning();

  if (!signal) {
    res.status(404).json({ error: "Signal not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
