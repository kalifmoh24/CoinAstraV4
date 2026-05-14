import { Router, type IRouter } from "express";
import { db, watchlistTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

/** GET /api/watchlist */
router.get("/watchlist", async (_req, res, next): Promise<void> => {
  try {
    const items = await db.select().from(watchlistTable).orderBy(watchlistTable.addedAt);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

/** POST /api/watchlist */
router.post("/watchlist", async (req, res, next): Promise<void> => {
  try {
    const { coinId, symbol, name, image, targetPrice } = req.body as {
      coinId: string; symbol: string; name: string; image?: string; targetPrice?: number;
    };

    if (!coinId || !symbol || !name) {
      res.status(400).json({ error: "coinId, symbol, and name are required" });
      return;
    }

    const existing = await db.select().from(watchlistTable).where(eq(watchlistTable.coinId, coinId)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Coin already in watchlist", item: existing[0] });
      return;
    }

    const [item] = await db.insert(watchlistTable).values({
      coinId, symbol: symbol.toUpperCase(), name, image, targetPrice,
    }).returning();

    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/watchlist/:id */
router.patch("/watchlist/:id", async (req, res, next): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    const { targetPrice, alertEnabled } = req.body as { targetPrice?: number; alertEnabled?: boolean };

    const [updated] = await db
      .update(watchlistTable)
      .set({ ...(targetPrice !== undefined ? { targetPrice } : {}), ...(alertEnabled !== undefined ? { alertEnabled } : {}) })
      .where(eq(watchlistTable.id, id))
      .returning();

    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/watchlist/:id */
router.delete("/watchlist/:id", async (req, res, next): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    await db.delete(watchlistTable).where(eq(watchlistTable.id, id));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
