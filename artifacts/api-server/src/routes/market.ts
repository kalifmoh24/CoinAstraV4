import { Router, type IRouter } from "express";
import { db, tokensTable } from "@workspace/db";
import { desc, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/market/overview", async (req, res): Promise<void> => {
  const tokens = await db.select().from(tokensTable);
  const btc = tokens.find((t) => t.symbol === "BTC");
  const eth = tokens.find((t) => t.symbol === "ETH");
  const totalMarketCap = tokens.reduce((sum, t) => sum + (t.marketCap ?? 0), 0);
  const totalVolume = tokens.reduce((sum, t) => sum + (t.volume24h ?? 0), 0);
  const btcMarketCap = btc?.marketCap ?? 0;
  const btcDominance = totalMarketCap > 0 ? (btcMarketCap / totalMarketCap) * 100 : 0;

  res.json({
    btcPrice: btc?.price ?? 67500,
    btcChange24h: btc?.priceChange24h ?? 2.4,
    ethPrice: eth?.price ?? 3250,
    ethChange24h: eth?.priceChange24h ?? 1.8,
    totalMarketCap: totalMarketCap || 2.45e12,
    totalVolume24h: totalVolume || 98e9,
    btcDominance: Math.round(btcDominance * 10) / 10 || 52.3,
    fearGreedIndex: 68,
    fearGreedLabel: "Greed",
    activeCoins: tokens.length,
  });
});

router.get("/market/movers", async (req, res): Promise<void> => {
  const tokens = await db.select().from(tokensTable);

  const withChange = tokens.filter((t) => t.priceChange24h != null && t.price != null);

  const gainers = [...withChange]
    .sort((a, b) => (b.priceChange24h ?? 0) - (a.priceChange24h ?? 0))
    .slice(0, 5)
    .map((t) => ({
      symbol: t.symbol,
      name: t.name,
      price: t.price ?? 0,
      priceChange24h: t.priceChange24h ?? 0,
      volume24h: t.volume24h ?? 0,
      logoUrl: t.logoUrl,
    }));

  const losers = [...withChange]
    .sort((a, b) => (a.priceChange24h ?? 0) - (b.priceChange24h ?? 0))
    .slice(0, 5)
    .map((t) => ({
      symbol: t.symbol,
      name: t.name,
      price: t.price ?? 0,
      priceChange24h: t.priceChange24h ?? 0,
      volume24h: t.volume24h ?? 0,
      logoUrl: t.logoUrl,
    }));

  const volumeLeaders = [...tokens.filter((t) => t.volume24h != null)]
    .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))
    .slice(0, 5)
    .map((t) => ({
      symbol: t.symbol,
      name: t.name,
      price: t.price ?? 0,
      priceChange24h: t.priceChange24h ?? 0,
      volume24h: t.volume24h ?? 0,
      logoUrl: t.logoUrl,
    }));

  res.json({ gainers, losers, volumeLeaders });
});

export default router;
