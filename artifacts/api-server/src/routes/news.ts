import { Router, type IRouter } from "express";
import { db, newsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { ListNewsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/news", async (req, res): Promise<void> => {
  const parsed = ListNewsQueryParams.safeParse(req.query);
  const limit = (parsed.success ? parsed.data.limit : undefined) ?? 20;

  const news = await db
    .select()
    .from(newsTable)
    .orderBy(desc(newsTable.publishedAt))
    .limit(limit);

  res.json(
    news.map((n) => ({
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
