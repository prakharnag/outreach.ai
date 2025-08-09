import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const runs = pgTable("runs", {
  id: serial("id").primaryKey(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  company: text("company").notNull(),
  role: text("role").notNull(),
  research_json: jsonb("research_json"),
  verified_json: jsonb("verified_json"),
  linkedin: text("linkedin"),
  email: text("email"),
});

export type Run = typeof runs.$inferSelect;


