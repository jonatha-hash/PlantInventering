import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  api, 
  buildUrl,
  type HyggeWithProvytor,
  type HyggeStatsResponse
} from "@shared/routes";
import type { 
  Hygge, 
  CreateHyggeRequest, 
  CreateProvytaRequest, 
  CreateTradpostRequest,
  Provyta,
  Tradpost
} from "@shared/schema";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

// --- HYGGEN ---

export function useHyggen() {
  return useQuery({
    queryKey: [api.hyggen.list.path],
    queryFn: async () => {
      const res = await fetch(api.hyggen.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch hyggen");
      const data = await res.json();
      return parseWithLogging(api.hyggen.list.responses[200], data, "hyggen.list");
    },
  });
}

export function useHygge(id: number) {
  const url = buildUrl(api.hyggen.get.path, { id });
  return useQuery({
    queryKey: [api.hyggen.get.path, id],
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch hygge");
      const data = await res.json();
      return parseWithLogging(api.hyggen.get.responses[200], data, "hyggen.get");
    },
    enabled: !!id,
  });
}

export function useHyggeStats(id: number) {
  const url = buildUrl(api.hyggen.stats.path, { id });
  return useQuery({
    queryKey: [api.hyggen.stats.path, id],
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch hygge stats");
      const data = await res.json();
      return parseWithLogging(api.hyggen.stats.responses[200], data, "hyggen.stats");
    },
    enabled: !!id,
  });
}

export function useCreateHygge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateHyggeRequest) => {
      const validated = api.hyggen.create.input.parse(data);
      const res = await fetch(api.hyggen.create.path, {
        method: api.hyggen.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create hygge");
      return api.hyggen.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.hyggen.list.path] });
    },
  });
}

// --- PROVYTOR ---

export function useCreateProvyta(hyggeId: number) {
  const queryClient = useQueryClient();
  const url = buildUrl(api.provytor.create.path, { id: hyggeId });
  
  return useMutation({
    mutationFn: async (data: CreateProvytaRequest) => {
      const validated = api.provytor.create.input.parse(data);
      const res = await fetch(url, {
        method: api.provytor.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create provyta");
      return api.provytor.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.hyggen.get.path, hyggeId] });
      queryClient.invalidateQueries({ queryKey: [api.hyggen.stats.path, hyggeId] });
    },
  });
}

// --- TRÄDPOSTER ---

export function useCreateTradpost(provytaId: number, hyggeId: number) {
  const queryClient = useQueryClient();
  const url = buildUrl(api.tradposter.create.path, { id: provytaId });
  
  return useMutation({
    mutationFn: async (data: CreateTradpostRequest) => {
      const validated = api.tradposter.create.input.parse(data);
      const res = await fetch(url, {
        method: api.tradposter.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create trädpost");
      return api.tradposter.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      // Invalidate the parent hygge to refresh the nested tree data
      queryClient.invalidateQueries({ queryKey: [api.hyggen.get.path, hyggeId] });
      queryClient.invalidateQueries({ queryKey: [api.hyggen.stats.path, hyggeId] });
    },
  });
}
