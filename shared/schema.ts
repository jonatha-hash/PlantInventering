import { pgTable, text, serial, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const hyggen = pgTable("hyggen", {
  id: serial("id").primaryKey(),
  namn: text("namn").notNull(),
  hektar: real("hektar").notNull(),
  rekommenderadeProvytor: integer("rekommenderade_provytor").notNull(),
  anteckning: text("anteckning"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const provytor = pgTable("provytor", {
  id: serial("id").primaryKey(),
  hyggeId: integer("hygge_id").notNull().references(() => hyggen.id, { onDelete: "cascade" }),
  radieM: real("radie_m").notNull(),
  lat: real("lat"),
  lon: real("lon"),
  anteckning: text("anteckning"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tradposter = pgTable("tradposter", {
  id: serial("id").primaryKey(),
  provytaId: integer("provyta_id").notNull().references(() => provytor.id, { onDelete: "cascade" }),
  art: text("art").notNull(),
  antal: integer("antal").notNull(),
  skadade: integer("skadade").notNull().default(0),
  doda: integer("doda").notNull().default(0),
});

// === RELATIONS ===

export const hyggenRelations = relations(hyggen, ({ many }) => ({
  provytor: many(provytor),
}));

export const provytorRelations = relations(provytor, ({ one, many }) => ({
  hygge: one(hyggen, {
    fields: [provytor.hyggeId],
    references: [hyggen.id],
  }),
  tradposter: many(tradposter),
}));

export const tradposterRelations = relations(tradposter, ({ one }) => ({
  provyta: one(provytor, {
    fields: [tradposter.provytaId],
    references: [provytor.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertHyggeSchema = createInsertSchema(hyggen).omit({ id: true, createdAt: true });
export const insertProvytaSchema = createInsertSchema(provytor).omit({ id: true, createdAt: true });
export const insertTradpostSchema = createInsertSchema(tradposter).omit({ id: true });

// === EXPLICIT API CONTRACT TYPES ===

// Base Types
export type Hygge = typeof hyggen.$inferSelect;
export type Provyta = typeof provytor.$inferSelect;
export type Tradpost = typeof tradposter.$inferSelect;

// Request Types
export type CreateHyggeRequest = z.infer<typeof insertHyggeSchema> & { initialRadieM?: number };
export type UpdateHyggeRequest = Partial<z.infer<typeof insertHyggeSchema>>;

export type CreateProvytaRequest = Omit<z.infer<typeof insertProvytaSchema>, "hyggeId">;
export type UpdateProvytaRequest = Partial<z.infer<typeof insertProvytaSchema>>;

export type CreateTradpostRequest = Omit<z.infer<typeof insertTradpostSchema>, "provytaId">;
export type UpdateTradpostRequest = Partial<z.infer<typeof insertTradpostSchema>>;

// Nested Responses
export type TradpostResponse = Tradpost;
export type ProvytaWithTradposter = Provyta & { tradposter: Tradpost[] };
export type HyggeWithProvytor = Hygge & { provytor: ProvytaWithTradposter[] };

// Stats Response
export interface SpeciesStats {
  art: string;
  totalAntal: number;
  totalSkadade: number;
  totalDoda: number;
  medelPerProvyta: number;
  plantorPerHa: number;
  skadadePerHa: number;
  dodaPerHa: number;
}

export interface HyggeStatsResponse {
  hyggeId: number;
  totalAreaHa: number;
  antalProvytor: number;
  genomsnittligProvytaAreaHa: number;
  totalPlantor: number;
  totalSkadade: number;
  totalDoda: number;
  medelPlantorPerProvyta: number;
  sPlantor: number; // Standard deviation
  ci95Plantor: number; // 95% Confidence Interval half-width
  plantorPerHa: number;
  skadadePerHa: number;
  dodaPerHa: number;
  arter: SpeciesStats[];
}
