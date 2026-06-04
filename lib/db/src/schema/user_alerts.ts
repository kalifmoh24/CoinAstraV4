import { pgTable, text, serial, timestamp, boolean, real } from "drizzle-orm/pg-core";

export const userAlertsTable = pgTable("user_alerts", {
  id: serial("id").primaryKey(),
  type: text("type", { enum: ["price", "ai", "whale", "portfolio"] }).notNull().default("price"),
  coinId: text("coin_id"),
  coinSymbol: text("coin_symbol"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  targetPrice: real("target_price"),
  targetDirection: text("target_direction", { enum: ["above", "below"] }),
  status: text("status", { enum: ["ACTIVE", "TRIGGERED", "DISMISSED"] }).notNull().default("ACTIVE"),
  priority: text("priority", { enum: ["HIGH", "MEDIUM", "LOW"] }).notNull().default("MEDIUM"),
  triggeredAt: timestamp("triggered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserAlert = typeof userAlertsTable.$inferSelect;
export type InsertUserAlert = typeof userAlertsTable.$inferInsert;
