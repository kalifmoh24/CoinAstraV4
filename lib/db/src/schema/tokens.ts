import { pgTable, text, serial, timestamp, integer, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tokensTable = pgTable("tokens", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  chain: text("chain").notNull().default("Ethereum"),
  description: text("description"),
  websiteUrl: text("website_url"),
  whitepaperUrl: text("whitepaper_url"),
  coingeckoId: text("coingecko_id"),
  price: real("price"),
  priceChange24h: real("price_change_24h"),
  priceChange7d: real("price_change_7d"),
  marketCap: real("market_cap"),
  volume24h: real("volume_24h"),
  fdv: real("fdv"),
  circulatingSupply: real("circulating_supply"),
  totalSupply: real("total_supply"),
  overallScore: integer("overall_score"),
  fundamentalScore: integer("fundamental_score"),
  technicalScore: integer("technical_score"),
  sentimentScore: integer("sentiment_score"),
  riskScore: integer("risk_score"),
  narrativeMomentumScore: integer("narrative_momentum_score"),
  finalGrade: text("final_grade"),
  gradeExplanation: text("grade_explanation"),
  narrativeIds: jsonb("narrative_ids").$type<number[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTokenSchema = createInsertSchema(tokensTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertToken = z.infer<typeof insertTokenSchema>;
export type Token = typeof tokensTable.$inferSelect;
