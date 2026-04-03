import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import jStat from 'jstat';

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === HYGGEN ===

  app.get(api.hyggen.list.path, async (req, res) => {
    const result = await storage.getHyggen();
    res.json(result);
  });

  app.get(api.hyggen.get.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const result = await storage.getHygge(id);
    if (!result) {
      return res.status(404).json({ message: "Hygge not found" });
    }
    res.json(result);
  });

  app.post(api.hyggen.create.path, async (req, res) => {
    try {
      // Coerce numeric types that might come as strings from forms
      const schema = api.hyggen.create.input.extend({
        hektar: z.coerce.number(),
        rekommenderadeProvytor: z.coerce.number(),
        initialRadieM: z.coerce.number().optional(),
      });
      const { initialRadieM, ...input } = schema.parse(req.body);
      const result = await storage.createHygge(input);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.hyggen.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const schema = api.hyggen.update.input.extend({
        hektar: z.coerce.number().optional(),
        rekommenderadeProvytor: z.coerce.number().optional(),
      });
      const input = schema.parse(req.body);
      const result = await storage.updateHygge(id, input);
      if (!result) return res.status(404).json({ message: "Hygge not found" });
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.hyggen.delete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const hygge = await storage.getHygge(id);
      if (!hygge) return res.status(404).json({ message: "Hygge not found" });
      
      await storage.deleteHygge(id);
      res.status(204).send();
    } catch (err) {
      throw err;
    }
  });

  // Calculate statistics for a Hygge
  app.get(api.hyggen.stats.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const hygge = await storage.getHygge(id);
    if (!hygge) {
      return res.status(404).json({ message: "Hygge not found" });
    }

    const n = hygge.provytor.length;
    if (n === 0) {
      // Return empty stats
      return res.json({
        hyggeId: id,
        totalAreaHa: hygge.hektar,
        antalProvytor: 0,
        genomsnittligProvytaAreaHa: 0,
        totalPlantor: 0,
        totalSkadade: 0,
        totalDoda: 0,
        medelPlantorPerProvyta: 0,
        sPlantor: 0,
        ci95Plantor: 0,
        plantorPerHa: 0,
        skadadePerHa: 0,
        dodaPerHa: 0,
        arter: []
      });
    }

    // Calculate areas
    let sumAreaM2 = 0;
    let totalPlantor = 0;
    let totalSkadade = 0;
    let totalDoda = 0;
    const plantorPerProvyta: number[] = [];

    // Track per-species stats
    const artsStats: Record<string, { antal: number, skadade: number, doda: number, provytaCounts: number[] }> = {};

    hygge.provytor.forEach((provyta, i) => {
      const areaM2 = Math.PI * Math.pow(provyta.radieM, 2);
      sumAreaM2 += areaM2;

      let plotPlantor = 0;
      let plotSkadade = 0;
      let plotDoda = 0;

      provyta.tradposter.forEach(t => {
        plotPlantor += t.antal;
        plotSkadade += t.skadade;
        plotDoda += (t.doda ?? 0);

        if (!artsStats[t.art]) {
          artsStats[t.art] = { antal: 0, skadade: 0, doda: 0, provytaCounts: new Array(n).fill(0) };
        }
        artsStats[t.art].antal += t.antal;
        artsStats[t.art].skadade += t.skadade;
        artsStats[t.art].doda += (t.doda ?? 0);
        artsStats[t.art].provytaCounts[i] += t.antal;
      });

      plantorPerProvyta.push(plotPlantor);
      totalPlantor += plotPlantor;
      totalSkadade += plotSkadade;
      totalDoda += plotDoda;
    });

    const genomsnittligProvytaAreaHa = (sumAreaM2 / n) / 10000;
    const medelPlantorPerProvyta = jStat.mean(plantorPerProvyta);
    const sPlantorRaw = n > 1 ? jStat.stdev(plantorPerProvyta, true) : 0;
    const sPlantor = isFinite(sPlantorRaw) && sPlantorRaw !== null ? sPlantorRaw : 0;

    // 95% CI (two-tailed t-distribution)
    let ci95Plantor = 0;
    if (n > 1) {
      const tScore = Math.abs(jStat.studentt.inv(0.025, n - 1)); // alpha/2 = 0.025
      ci95Plantor = tScore * (sPlantor / Math.sqrt(n));
    }

    const plantorPerHa = genomsnittligProvytaAreaHa > 0 ? medelPlantorPerProvyta / genomsnittligProvytaAreaHa : 0;
    const skadadePerHa = genomsnittligProvytaAreaHa > 0 ? (totalSkadade / n) / genomsnittligProvytaAreaHa : 0;
    const dodaPerHa = genomsnittligProvytaAreaHa > 0 ? (totalDoda / n) / genomsnittligProvytaAreaHa : 0;

    const arterStats = Object.keys(artsStats).map(art => {
      const stats = artsStats[art];
      const medelPerP = jStat.mean(stats.provytaCounts);
      return {
        art,
        totalAntal: stats.antal,
        totalSkadade: stats.skadade,
        totalDoda: stats.doda,
        medelPerProvyta: medelPerP,
        plantorPerHa: genomsnittligProvytaAreaHa > 0 ? medelPerP / genomsnittligProvytaAreaHa : 0,
        skadadePerHa: genomsnittligProvytaAreaHa > 0 ? (stats.skadade / n) / genomsnittligProvytaAreaHa : 0,
        dodaPerHa: genomsnittligProvytaAreaHa > 0 ? (stats.doda / n) / genomsnittligProvytaAreaHa : 0,
      };
    });

    res.json({
      hyggeId: id,
      totalAreaHa: hygge.hektar,
      antalProvytor: n,
      genomsnittligProvytaAreaHa,
      totalPlantor,
      totalSkadade,
      totalDoda,
      medelPlantorPerProvyta,
      sPlantor,
      ci95Plantor,
      plantorPerHa,
      skadadePerHa,
      dodaPerHa,
      arter: arterStats
    });
  });

  // === PROVYTOR ===

  app.post(api.provytor.create.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid hygge ID" });

      const schema = api.provytor.create.input.extend({
        radieM: z.coerce.number(),
        lat: z.coerce.number().optional().nullable(),
        lon: z.coerce.number().optional().nullable(),
      });
      const input = schema.parse(req.body);
      const result = await storage.createProvyta(id, input);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.provytor.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const schema = api.provytor.update.input.extend({
        radieM: z.coerce.number().optional(),
        lat: z.coerce.number().optional().nullable(),
        lon: z.coerce.number().optional().nullable(),
      });
      const input = schema.parse(req.body);
      const result = await storage.updateProvyta(id, input);
      if (!result) return res.status(404).json({ message: "Provyta not found" });
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.provytor.delete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      
      await storage.deleteProvyta(id);
      res.status(204).send();
    } catch (err) {
      throw err;
    }
  });

  // === TRÄDPOSTER ===

  app.post(api.tradposter.create.path, async (req, res) => {
    try {
      const provytaId = parseInt(req.params.id);
      if (isNaN(provytaId)) return res.status(400).json({ message: "Invalid provyta ID" });

      const schema = api.tradposter.create.input.extend({
        antal: z.coerce.number(),
        skadade: z.coerce.number(),
      });
      const input = schema.parse(req.body);
      const result = await storage.createTradpost(provytaId, input);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.tradposter.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const schema = api.tradposter.update.input.extend({
        antal: z.coerce.number().optional(),
        skadade: z.coerce.number().optional(),
      });
      const input = schema.parse(req.body);
      const result = await storage.updateTradpost(id, input);
      if (!result) return res.status(404).json({ message: "Trädpost not found" });
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Call seed database just to have some initial data if empty
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  try {
    const existing = await storage.getHyggen();
    if (existing.length === 0) {
      // Create a test Hygge
      const hygge = await storage.createHygge({
        namn: "Testobjekt Söder",
        hektar: 5.5,
        rekommenderadeProvytor: 15
      });

      // Create a couple of provytor
      const p1 = await storage.createProvyta(hygge.id, {
        radieM: 2.83,
        anteckning: "Bra markberedning"
      });

      const p2 = await storage.createProvyta(hygge.id, {
        radieM: 2.83,
        anteckning: "Stenigt"
      });

      // Add tradposter
      await storage.createTradpost(p1.id, { art: "Tall", antal: 3, skadade: 0 });
      await storage.createTradpost(p1.id, { art: "Gran", antal: 1, skadade: 1 });
      
      await storage.createTradpost(p2.id, { art: "Tall", antal: 2, skadade: 0 });
      await storage.createTradpost(p2.id, { art: "Björk", antal: 4, skadade: 0 });
      
      console.log("Database seeded successfully");
    }
  } catch (error) {
    console.error("Failed to seed database:", error);
  }
}
