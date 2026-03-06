import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import {
  hyggen,
  provytor,
  tradposter,
  type Hygge,
  type Provyta,
  type Tradpost,
  type CreateHyggeRequest,
  type UpdateHyggeRequest,
  type CreateProvytaRequest,
  type UpdateProvytaRequest,
  type CreateTradpostRequest,
  type UpdateTradpostRequest,
  type HyggeWithProvytor,
  type ProvytaWithTradposter
} from "@shared/schema";

export interface IStorage {
  // Hyggen
  getHyggen(): Promise<Hygge[]>;
  getHygge(id: number): Promise<HyggeWithProvytor | undefined>;
  createHygge(hygge: CreateHyggeRequest): Promise<Hygge>;
  updateHygge(id: number, updates: UpdateHyggeRequest): Promise<Hygge | undefined>;
  deleteHygge(id: number): Promise<void>;

  // Provytor
  createProvyta(hyggeId: number, provyta: CreateProvytaRequest): Promise<Provyta>;
  updateProvyta(id: number, updates: UpdateProvytaRequest): Promise<Provyta | undefined>;
  deleteProvyta(id: number): Promise<void>;

  // Trädposter
  createTradpost(provytaId: number, tradpost: CreateTradpostRequest): Promise<Tradpost>;
  updateTradpost(id: number, updates: UpdateTradpostRequest): Promise<Tradpost | undefined>;
  deleteTradpost(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // === HYGGEN ===
  
  async getHyggen(): Promise<Hygge[]> {
    return await db.select().from(hyggen).orderBy(hyggen.id);
  }

  async getHygge(id: number): Promise<HyggeWithProvytor | undefined> {
    const h = await db.select().from(hyggen).where(eq(hyggen.id, id));
    if (h.length === 0) return undefined;

    const p = await db.select().from(provytor).where(eq(provytor.hyggeId, id));
    
    // Fetch all tradposter for all provytor in this hygge
    const provytaIds = p.map(provyta => provyta.id);
    let allTradposter: Tradpost[] = [];
    if (provytaIds.length > 0) {
      // Drizzle 'inArray' handles this well, but we can also just fetch them and group
      const tp = await db.select().from(tradposter).where(sql`${tradposter.provytaId} IN ${provytaIds}`);
      allTradposter = tp;
    }

    const provytorWithTradposter = p.map(provyta => ({
      ...provyta,
      tradposter: allTradposter.filter(t => t.provytaId === provyta.id)
    }));

    return {
      ...h[0],
      provytor: provytorWithTradposter
    };
  }

  async createHygge(hyggeData: CreateHyggeRequest): Promise<Hygge> {
    const [h] = await db.insert(hyggen).values(hyggeData).returning();
    return h;
  }

  async updateHygge(id: number, updates: UpdateHyggeRequest): Promise<Hygge | undefined> {
    const [updated] = await db.update(hyggen)
      .set(updates)
      .where(eq(hyggen.id, id))
      .returning();
    return updated;
  }

  async deleteHygge(id: number): Promise<void> {
    await db.delete(hyggen).where(eq(hyggen.id, id));
  }

  // === PROVYTOR ===

  async createProvyta(hyggeId: number, provytaData: CreateProvytaRequest): Promise<Provyta> {
    const [p] = await db.insert(provytor).values({ ...provytaData, hyggeId }).returning();
    return p;
  }

  async updateProvyta(id: number, updates: UpdateProvytaRequest): Promise<Provyta | undefined> {
    const [updated] = await db.update(provytor)
      .set(updates)
      .where(eq(provytor.id, id))
      .returning();
    return updated;
  }

  async deleteProvyta(id: number): Promise<void> {
    await db.delete(provytor).where(eq(provytor.id, id));
  }

  // === TRÄDPOSTER ===

  async createTradpost(provytaId: number, tradpostData: CreateTradpostRequest): Promise<Tradpost> {
    const [t] = await db.insert(tradposter).values({ ...tradpostData, provytaId }).returning();
    return t;
  }

  async updateTradpost(id: number, updates: UpdateTradpostRequest): Promise<Tradpost | undefined> {
    const [updated] = await db.update(tradposter)
      .set(updates)
      .where(eq(tradposter.id, id))
      .returning();
    return updated;
  }

  async deleteTradpost(id: number): Promise<void> {
    await db.delete(tradposter).where(eq(tradposter.id, id));
  }
}

export const storage = new DatabaseStorage();
