import { Router, type IRouter } from "express";
import {
  getCoinsMarkets,
  searchCoins,
  getCoinDetails,
  getCoinChart,
  getCoinOHLC,
  getTrending,
  getFearGreed,
  getGlobal,
} from "../lib/coingecko.js";

const router: IRouter = Router();

/** GET /api/coins/markets?page=1&per_page=100 */
router.get("/coins/markets", async (req, res, next): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query["page"]) || 1);
    const perPage = Math.min(250, Math.max(10, Number(req.query["per_page"]) || 100));
    const data = await getCoinsMarkets(page, perPage);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** GET /api/coins/trending */
router.get("/coins/trending", async (_req, res, next): Promise<void> => {
  try {
    const data = await getTrending();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** GET /api/coins/search?q=bitcoin */
router.get("/coins/search", async (req, res, next): Promise<void> => {
  try {
    const q = String(req.query["q"] ?? "").trim();
    if (!q) {
      res.json({ coins: [] });
      return;
    }
    const data = await searchCoins(q);
    res.json({ coins: data.coins.slice(0, 20) });
  } catch (err) {
    next(err);
  }
});

/** GET /api/coins/fear-greed */
router.get("/coins/fear-greed", async (_req, res, next): Promise<void> => {
  try {
    const data = await getFearGreed();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** GET /api/coins/global */
router.get("/coins/global", async (_req, res, next): Promise<void> => {
  try {
    const data = await getGlobal();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** GET /api/coins/:id — full coin detail */
router.get("/coins/:id", async (req, res, next): Promise<void> => {
  try {
    const id = String(req.params["id"]).toLowerCase();
    const data = await getCoinDetails(id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** GET /api/coins/:id/chart?days=7 */
router.get("/coins/:id/chart", async (req, res, next): Promise<void> => {
  try {
    const id = String(req.params["id"]).toLowerCase();
    const days = Math.min(365, Math.max(1, Number(req.query["days"]) || 7));
    const data = await getCoinChart(id, days);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** GET /api/coins/:id/ohlc?days=7 — candlestick OHLC data */
router.get("/coins/:id/ohlc", async (req, res, next): Promise<void> => {
  try {
    const id = String(req.params["id"]).toLowerCase();
    const days = Math.min(365, Math.max(1, Number(req.query["days"]) || 7));
    const data = await getCoinOHLC(id, days);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
