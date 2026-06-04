import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const narrativesTable = pgTable("narratives", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  iconKey: text("icon_key").notNull().default("trending"),
  momentumScore: integer("momentum_score").notNull().default(50),
  perf24h: real("perf_24h").notNull().default(0),
  perf7d: real("perf_7d").notNull().default(0),
  aiCommentary: text("ai_commentary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNarrativeSchema = createInsertSchema(narrativesTable).omit({ id: true, createdAt: true });
export type InsertNarrative = z.infer<typeof insertNarrativeSchema>;
export type Narrative = typeof narrativesTable.$inferSelect;
