import { Router, type IRouter } from "express";
import { db, userAlertsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

/** GET /api/alerts */
router.get("/alerts", async (_req, res, next): Promise<void> => {
  try {
    const alerts = await db.select().from(userAlertsTable).orderBy(desc(userAlertsTable.createdAt));
    res.json(alerts);
  } catch (err) {
    next(err);
  }
});

/** POST /api/alerts */
router.post("/alerts", async (req, res, next): Promise<void> => {
  try {
    const { type, coinId, coinSymbol, title, description, targetPrice, targetDirection, priority } = req.body as {
      type?: "price" | "ai" | "whale" | "portfolio";
      coinId?: string; coinSymbol?: string; title: string; description: string;
      targetPrice?: number; targetDirection?: "above" | "below";
      priority?: "HIGH" | "MEDIUM" | "LOW";
    };

    if (!title || !description) {
      res.status(400).json({ error: "title and description are required" });
      return;
    }

    const [alert] = await db.insert(userAlertsTable).values({
      type: type ?? "price", coinId, coinSymbol: coinSymbol?.toUpperCase(),
      title, description, targetPrice, targetDirection,
      priority: priority ?? "MEDIUM",
    }).returning();

    res.status(201).json(alert);
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/alerts/:id */
router.patch("/alerts/:id", async (req, res, next): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    const { status, targetPrice } = req.body as { status?: "ACTIVE" | "TRIGGERED" | "DISMISSED"; targetPrice?: number };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (status) { updates["status"] = status; if (status === "TRIGGERED") updates["triggeredAt"] = new Date(); }
    if (targetPrice !== undefined) updates["targetPrice"] = targetPrice;

    const [updated] = await db.update(userAlertsTable).set(updates).where(eq(userAlertsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/alerts/:id */
router.delete("/alerts/:id", async (req, res, next): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    await db.delete(userAlertsTable).where(eq(userAlertsTable.id, id));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
