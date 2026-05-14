import { pgTable, text, serial, timestamp, real, boolean } from "drizzle-orm/pg-core";

export const watchlistTable = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  coinId: text("coin_id").notNull(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  image: text("image"),
  targetPrice: real("target_price"),
  alertEnabled: boolean("alert_enabled").notNull().default(false),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export type WatchlistItem = typeof watchlistTable.$inferSelect;
export type InsertWatchlistItem = typeof watchlistTable.$inferInsert;
