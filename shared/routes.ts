import { z } from 'zod';
import { 
  insertHyggeSchema, 
  insertProvytaSchema, 
  insertTradpostSchema,
  hyggen,
  provytor,
  tradposter
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// Response models for the nested structures
const tradpostResponseSchema = z.custom<typeof tradposter.$inferSelect>();
const provytaResponseSchema = z.custom<typeof provytor.$inferSelect>();
const hyggeResponseSchema = z.custom<typeof hyggen.$inferSelect>();

const provytaWithTradposterSchema = provytaResponseSchema.and(
  z.object({ tradposter: z.array(tradpostResponseSchema) })
);

const hyggeWithProvytorSchema = hyggeResponseSchema.and(
  z.object({ provytor: z.array(provytaWithTradposterSchema) })
);

const statsResponseSchema = z.object({
  hyggeId: z.number(),
  totalAreaHa: z.number(),
  antalProvytor: z.number(),
  genomsnittligProvytaAreaHa: z.number(),
  totalPlantor: z.number(),
  totalSkadade: z.number(),
  medelPlantorPerProvyta: z.number(),
  sPlantor: z.number(),
  ci95Plantor: z.number(),
  plantorPerHa: z.number(),
  skadadePerHa: z.number(),
  arter: z.array(z.object({
    art: z.string(),
    totalAntal: z.number(),
    totalSkadade: z.number(),
    medelPerProvyta: z.number(),
    plantorPerHa: z.number(),
    skadadePerHa: z.number()
  }))
});

export const api = {
  hyggen: {
    list: {
      method: 'GET' as const,
      path: '/api/hyggen' as const,
      responses: {
        200: z.array(hyggeResponseSchema),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/hyggen/:id' as const,
      responses: {
        200: hyggeWithProvytorSchema,
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/hyggen' as const,
      input: insertHyggeSchema.extend({
        initialRadieM: z.coerce.number().optional(),
      }),
      responses: {
        201: hyggeResponseSchema,
        400: errorSchemas.validation,
      },
    },
    stats: {
      method: 'GET' as const,
      path: '/api/hyggen/:id/stats' as const,
      responses: {
        200: statsResponseSchema,
        404: errorSchemas.notFound,
      }
    }
  },
  provytor: {
    create: {
      method: 'POST' as const,
      path: '/api/hyggen/:id/provytor' as const,
      input: insertProvytaSchema.omit({ hyggeId: true }), // hyggeId is passed in URL
      responses: {
        201: provytaResponseSchema,
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/provytor/:id' as const,
      input: insertProvytaSchema.partial(),
      responses: {
        200: provytaResponseSchema,
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      }
    }
  },
  tradposter: {
    create: {
      method: 'POST' as const,
      path: '/api/provytor/:id/tradposter' as const,
      input: insertTradpostSchema.omit({ provytaId: true }),
      responses: {
        201: tradpostResponseSchema,
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/tradposter/:id' as const,
      input: insertTradpostSchema.partial(),
      responses: {
        200: tradpostResponseSchema,
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
